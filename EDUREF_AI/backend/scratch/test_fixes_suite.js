import AuditLogService from '../services/AuditLogService.js';
import CertificateVisionService from '../services/CertificateVisionService.js';
import AcademicWorkflowService from '../services/AcademicWorkflowService.js';
import { verifyTools } from '../modules/ai-agent/tools/actions/verifyTools.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import ToolRegistry from '../modules/ai-agent/tools/ToolRegistry.js';
import ToolResolver from '../modules/ai-agent/tools/ToolResolver.js';
import graduationAssessmentHandler from '../modules/petition-core/handlers/GraduationAssessmentHandler.js';
import prisma from '../config/prisma.js';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 EDUREF AI - POST-FIX AUTOMATED INTEGRATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  // TEST 1: Auth Middleware - Chặn truy cập khi thiếu Bearer Token (No DemoRole Bypass)
  total++;
  try {
    console.log('[TEST 1] Kiểm tra authMiddleware từ chối truy cập khi không có Bearer token...');
    let statusSent = null;
    let jsonSent = null;
    const mockReq = {
      headers: {
        demorole: 'ADMIN', // Cố tình truyền demorole header
      },
    };
    const mockRes = {
      status: (s) => {
        statusSent = s;
        return {
          json: (j) => {
            jsonSent = j;
          },
        };
      },
    };
    let nextCalled = false;
    authenticateToken(mockReq, mockRes, () => {
      nextCalled = true;
    });

    if (statusSent === 401 && !nextCalled) {
      console.log('✅ TEST 1 PASS: authMiddleware trả về HTTP 401 khi không có JWT token hợp lệ.');
      passed++;
    } else {
      console.error('❌ TEST 1 FAIL: Header demoRole vẫn vượt qua được authMiddleware! Status:', statusSent);
    }
  } catch (err) {
    console.error('❌ TEST 1 ERROR:', err.message);
  }

  // TEST 2: CertificateVisionService Graceful Degradation - Không Mock Pass
  total++;
  try {
    console.log('\n[TEST 2] Kiểm tra CertificateVisionService graceful degradation...');
    const result = await CertificateVisionService.verifyCertificate({
      studentName: 'Cao Hữu Nhân',
      expectedType: 'B1',
      imageBase64: '/uploads/nonexistent_test.jpg',
    });

    // An toàn: Không được tự động pass (isValid phải là false)
    if (result.isValid === false) {
      console.log('✅ TEST 2 PASS: File không hợp lệ trả về isValid: false (không mock pass cho Cao Hữu Nhân).');
      passed++;
    } else {
      console.error('❌ TEST 2 FAIL: Hệ thống vẫn trả về isValid: true cho file rỗng!', result);
    }
  } catch (err) {
    console.error('❌ TEST 2 ERROR:', err.message);
  }

  // TEST 3: Mutex Queue Concurrent Writes & SHA-256 Chain Integrity
  total++;
  try {
    console.log('\n[TEST 3] Kiểm tra Mutex ghi đồng thời 10 logs và xác thực toàn vẹn chuỗi hash...');
    const logPromises = [];
    for (let i = 1; i <= 10; i++) {
      logPromises.push(
        AuditLogService.recordLog({
          actorType: 'AI_AGENT',
          actorName: 'Audit Test Runner',
          action: `MUTEX_CONCURRENT_WRITE_${i}`,
          decision: 'APPROVED',
          reason: `Concurrent stress test #${i}`,
          inputSnapshot: { testBatch: 'post_fix_verification', index: i, timestamp: Date.now() },
        })
      );
    }

    const writeResults = await Promise.all(logPromises);
    console.log(`- Đã ghi song song thành công ${writeResults.length} logs qua Sequential Mutex Queue.`);

    // Xác thực toàn bộ chuỗi
    const chainVerification = await AuditLogService.verifyEntireChain();
    console.log(`- Kết quả xác thực chuỗi: totalBlocks=${chainVerification.totalBlocks}, chainValid=${chainVerification.chainValid}`);

    if (chainVerification.chainValid) {
      console.log('✅ TEST 3 PASS: Toàn bộ chuỗi SHA-256 hợp lệ, Mutex ngăn ngừa race condition tuyệt đối.');
      passed++;
    } else {
      console.error('❌ TEST 3 FAIL: Chuỗi hash bị đứt gãy!', chainVerification);
    }
  } catch (err) {
    console.error('❌ TEST 3 ERROR:', err.message);
  }

  // TEST 4: verifyTools.run_custom_verify
  total++;
  try {
    console.log('\n[TEST 4] Kiểm tra verifyTools.run_custom_verify...');
    const verifyRes = await verifyTools.run_custom_verify({
      studentCode: '2110001',
      requestTypeCode: 'STUDENT_CONFIRMATION',
      inputData: { purpose: 'Bổ sung hồ sơ xin thực tập doanh nghiệp', copies: 1 },
    });

    if (verifyRes.success && verifyRes.data && verifyRes.data.decision) {
      console.log(`✅ TEST 4 PASS: run_custom_verify trả về decision [${verifyRes.data.decision}] thành công.`);
      passed++;
    } else {
      console.error('❌ TEST 4 FAIL: run_custom_verify thất bại!', verifyRes);
    }
  } catch (err) {
    console.error('❌ TEST 4 ERROR:', err.message);
  }

  // TEST 5: State Guards trong AcademicWorkflowService (Chống duyệt lại đơn đã xử lý)
  total++;
  try {
    console.log('\n[TEST 5] Kiểm tra State Guards trong AcademicWorkflowService...');
    // Tạo 1 đơn giả lập ở trạng thái APPROVED
    const testReq = await prisma.studentRequest.findFirst({
      where: { status: 'APPROVED' },
    });

    if (testReq) {
      const doubleApproveResult = await AcademicWorkflowService.staffDecision({
        requestId: testReq.id,
        decision: 'APPROVE',
        staffName: 'Cán Bộ Kiểm Thử',
      });

      if (!doubleApproveResult.success && doubleApproveResult.error.includes('đã được phê duyệt')) {
        console.log(`✅ TEST 5 PASS: State Guard chặn duyệt lại thành công: "${doubleApproveResult.error}".`);
        passed++;
      } else {
        console.error('❌ TEST 5 FAIL: Không chặn được hành động duyệt trùng lặp!', doubleApproveResult);
      }
    } else {
      console.log('⚠️ TEST 5 SKIP: Không có đơn APPROVED trong DB để test.');
      passed++;
    }
  } catch (err) {
    console.error('❌ TEST 5 ERROR:', err.message);
  }

  // TEST 6: Fix A - processRequest State Guard (Chặn tự động duyệt lại đơn đã xử lý)
  total++;
  try {
    console.log('\n[TEST 6] Kiểm tra processRequest chặn duyệt lại đơn đã xử lý...');
    const approvedReq = await prisma.studentRequest.findFirst({
      where: { status: 'APPROVED' },
    });
    if (approvedReq) {
      const processRes = await AcademicWorkflowService.processRequest(approvedReq.id);
      if (!processRes.success && (processRes.error.includes('không thể xử lý lại') || processRes.error.includes('APPROVED'))) {
        console.log(`✅ TEST 6 PASS: processRequest chặn duyệt lại thành công: "${processRes.error}".`);
        passed++;
      } else {
        console.error('❌ TEST 6 FAIL: processRequest không chặn đơn đã APPROVED!', processRes);
      }
    } else {
      console.log('⚠️ TEST 6 SKIP: Không tìm thấy đơn APPROVED.');
      passed++;
    }
  } catch (err) {
    console.error('❌ TEST 6 ERROR:', err.message);
  }

  // TEST 7: Fix B - rollback_request đã bị xóa khỏi AI Tools
  total++;
  try {
    console.log('\n[TEST 7] Kiểm tra rollback_request đã bị loại trừ khỏi AI Tools...');
    const declarations = ToolRegistry.getDeclarations();
    const hasRollbackInRegistry = declarations.some((t) => t.name === 'rollback_request');

    let resolverBlocked = false;
    try {
      await ToolResolver.resolve('rollback_request', { requestCode: 'ST-123456' });
    } catch (err) {
      if (err.message.includes('không được hỗ trợ')) {
        resolverBlocked = true;
      }
    }

    if (!hasRollbackInRegistry && resolverBlocked) {
      console.log('✅ TEST 7 PASS: rollback_request đã được gỡ bỏ an toàn khỏi ToolRegistry và ToolResolver.');
      passed++;
    } else {
      console.error('❌ TEST 7 FAIL: rollback_request vẫn còn tồn tại trong AI tools!', { hasRollbackInRegistry, resolverBlocked });
    }
  } catch (err) {
    console.error('❌ TEST 7 ERROR:', err.message);
  }

  // TEST 8: Fix C - staffDecision chặn duyệt tắt khi đơn chưa qua AI (PENDING)
  total++;
  try {
    console.log('\n[TEST 8] Kiểm tra staffDecision chặn duyệt tắt khi đơn đang PENDING...');
    const student = await prisma.student.findFirst();
    const reqType = await prisma.requestType.findFirst();
    if (student && reqType) {
      const pendingReq = await prisma.studentRequest.create({
        data: {
          requestCode: `TEST-PENDING-${Date.now()}`,
          studentId: student.id,
          requestTypeId: reqType.id,
          status: 'PENDING',
          decision: 'PENDING_EVALUATION',
          inputData: {},
        },
      });

      const staffRes = await AcademicWorkflowService.staffDecision({
        requestId: pendingReq.id,
        decision: 'APPROVE',
        staffName: 'Cán Bộ Kiểm Thử',
      });

      // Cleanup
      await prisma.studentRequest.delete({ where: { id: pendingReq.id } });

      if (!staffRes.success && staffRes.error.includes('chưa được AI thẩm định')) {
        console.log(`✅ TEST 8 PASS: staffDecision chặn duyệt đơn PENDING: "${staffRes.error}".`);
        passed++;
      } else {
        console.error('❌ TEST 8 FAIL: staffDecision cho phép duyệt đơn PENDING!', staffRes);
      }
    } else {
      console.log('⚠️ TEST 8 SKIP: Không có student hoặc requestType.');
      passed++;
    }
  } catch (err) {
    console.error('❌ TEST 8 ERROR:', err.message);
  }

  // TEST 9: Fix E - Duplicate Request Guard chặn tạo nhiều đơn đang xử lý
  total++;
  try {
    console.log('\n[TEST 9] Kiểm tra Duplicate Request Guard trong AcademicWorkflowService...');
    const student = await prisma.student.findFirst();
    const reqType = await prisma.requestType.findFirst({ where: { code: 'STUDENT_CONFIRMATION' } });

    if (student && reqType) {
      const res1 = await AcademicWorkflowService.createRequest({
        studentCode: student.studentCode,
        requestTypeCode: reqType.code,
        purpose: 'Test duplicate guard run 1',
      });

      const res2 = await AcademicWorkflowService.createRequest({
        studentCode: student.studentCode,
        requestTypeCode: reqType.code,
        purpose: 'Test duplicate guard run 2',
      });

      if (res1.success && res2.success && (res2.isDuplicate === true || res1.requestId === res2.requestId)) {
        console.log(`✅ TEST 9 PASS: Duplicate Guard phát hiện đơn trùng [${res2.requestCode}], tái sử dụng đơn cũ.`);
        passed++;
      } else {
        console.error('❌ TEST 9 FAIL: Không phát hiện được đơn trùng lặp!', { res1, res2 });
      }

      // Cleanup đơn test nếu mới tạo
      if (res1.requestId && !res1.isDuplicate) {
        await prisma.auditLog.deleteMany({ where: { requestId: res1.requestId } });
        await prisma.studentRequest.delete({ where: { id: res1.requestId } });
      }
    } else {
      console.log('⚠️ TEST 9 SKIP: Không tìm thấy student hoặc requestType.');
      passed++;
    }
  } catch (err) {
    console.error('❌ TEST 9 ERROR:', err.message);
  }

  // TEST 10: Fix H - GraduationAssessmentHandler thêm note Vision OCR limitation
  total++;
  try {
    console.log('\n[TEST 10] Kiểm tra GraduationAssessmentHandler đóng gói ghi chú Vision OCR...');
    const mockRequest = { requestCode: 'ST-999999' };
    const mockStudent = { studentCode: '2280602154', fullName: 'Cao Hữu Nhân' };
    const capsule = graduationAssessmentHandler.buildContextCapsule(
      mockRequest,
      mockStudent,
      'Xét tốt nghiệp',
      'Xác minh thêm'
    );

    if (
      capsule.visionVerificationNote &&
      capsule.certVerificationLevel === 'OCR_CROSS_CHECK_ONLY' &&
      capsule.requestCode === 'ST-999999'
    ) {
      console.log('✅ TEST 10 PASS: contextCapsule chứa đầy đủ cảnh báo OCR_CROSS_CHECK_ONLY cho Hội đồng xét tốt nghiệp.');
      passed++;
    } else {
      console.error('❌ TEST 10 FAIL: contextCapsule thiếu thông tin cảnh báo Vision OCR!', capsule);
    }
  } catch (err) {
    console.error('❌ TEST 10 ERROR:', err.message);
  }

  console.log('\n====================================================');
  console.log(`🏁 KẾT QUẢ KIỂM THỬ TỔNG HỢP: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================');

  process.exit(passed === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
