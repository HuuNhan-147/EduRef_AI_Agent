// scratch/test_graduation_flow.js
// Kiểm thử toàn diện 4 trường hợp thẩm định của 1 AI DUY NHẤT:
// 1. Chuẩn 100%
// 2. Ảnh mờ (BLURRY)
// 3. Nhập số lệch so với ảnh (MISMATCH)
// 4. Sai tên sinh viên (WRONG_NAME)

import { graduationAssessmentHandler } from '../modules/petition-core/handlers/GraduationAssessmentHandler.js';
import petitionWorkflowCore from '../modules/petition-core/PetitionWorkflowCore.js';

async function runTests() {
  console.log('================================================================');
  console.log('TEST 1: Thẩm định Hợp lệ 100% (Ảnh rõ nét, Khớp Text và Tên SV)');
  console.log('================================================================');
  const validPayload = {
    phone: '0901234567',
    birthPlace: 'TP. Hồ Chí Minh',
    reason: 'Hoàn thành chương trình đào tạo, xin xét tốt nghiệp',
    certificates: [
      {
        certType: 'Chứng chỉ Ngoại ngữ: Tiếng Anh B1 (HUTECH)',
        certNumber: '0042066',
        bookNumber: 'DKC24B102677',
        issueDate: '2024-06-24',
      },
      {
        certType: 'Chứng chỉ Kỹ năng: Giao tiếp & Làm việc nhóm (HUTECH)',
        certNumber: 'CC/ 0056999',
        bookNumber: 'DKC25KR07358',
        issueDate: '2025-09-19',
      }
    ],
    attachedCerts: {
      b1: { attached: true, fileName: 'HUTECH_Chung_Chi_Tieng_Anh_B1.png', previewUrl: '/demo_certs/hutech_b1_english.png' },
      teamwork: { attached: true, fileName: 'HUTECH_Chung_Chi_Ky_Nang_Nhom.png', previewUrl: '/demo_certs/hutech_teamwork_skills.png' }
    }
  };

  const res1 = await graduationAssessmentHandler.validateRequirements({ student: { fullName: 'Cao Hữu Nhân' } }, validPayload);
  console.log('Kết quả Test 1:', {
    complete: res1.complete,
    passedCount: res1.passed.length,
    missingCount: res1.missing.length,
  });

  console.log('\n================================================================');
  console.log('TEST 2: Phát hiện Ảnh Bị Mờ (Blurry Image)');
  console.log('================================================================');
  const blurryPayload = {
    ...validPayload,
    attachedCerts: {
      b1: { attached: true, fileName: 'Anh_Chung_Chi_Bi_Mo.png', previewUrl: '/demo_certs/hutech_b1_english.png', isBlurry: true },
    }
  };

  const res2 = await graduationAssessmentHandler.validateRequirements({ student: { fullName: 'Cao Hữu Nhân' } }, blurryPayload);
  console.log('Kết quả Test 2 (Bắt lỗi ảnh mờ):', {
    complete: res2.complete,
    missing: res2.missing.map(m => ({ code: m.code, desc: m.description })),
    aiResponse: graduationAssessmentHandler.getClarificationQuestion(res2.missing),
  });

  console.log('\n================================================================');
  console.log('TEST 3: Đối soát chéo phát hiện Số hiệu nhập Lệch so với Ảnh');
  console.log('================================================================');
  const mismatchPayload = {
    ...validPayload,
    certificates: [
      {
        certType: 'Chứng chỉ Ngoại ngữ: Tiếng Anh B1 (HUTECH)',
        certNumber: '0042999', // Cố tình gõ sai lệch (ảnh là 0042066)
        bookNumber: 'DKC24B102677',
        issueDate: '2024-06-24',
      }
    ]
  };

  const res3 = await graduationAssessmentHandler.validateRequirements({ student: { fullName: 'Cao Hữu Nhân' } }, mismatchPayload);
  console.log('Kết quả Test 3 (Bắt lỗi số nhập không khớp ảnh):', {
    complete: res3.complete,
    missing: res3.missing.map(m => ({ code: m.code, desc: m.description })),
    aiResponse: graduationAssessmentHandler.getClarificationQuestion(res3.missing),
  });

  console.log('\n================================================================');
  console.log('TEST 4: Phát hiện Họ tên trên chứng chỉ không phải của sinh viên');
  console.log('================================================================');
  const wrongNamePayload = {
    ...validPayload,
    attachedCerts: {
      b1: { attached: true, fileName: 'Nguyen_Van_An_B1.png', previewUrl: '/demo_certs/hutech_b1_english.png', fakeOwner: 'NGUYỄN VĂN AN' },
    }
  };

  const res4 = await graduationAssessmentHandler.validateRequirements({ student: { fullName: 'Cao Hữu Nhân' } }, wrongNamePayload);
  console.log('Kết quả Test 4 (Guardrail tên người khác):', {
    complete: res4.complete,
    missing: res4.missing.map(m => ({ code: m.code, desc: m.description })),
    aiResponse: graduationAssessmentHandler.getClarificationQuestion(res4.missing),
  });

  console.log('\n================================================================');
  console.log('TEST 5: Chạy quy trình Workflow hoàn chỉnh khi hồ sơ đạt chuẩn');
  console.log('================================================================');
  const wf = await petitionWorkflowCore.processPetitionWorkflow({
    studentCode: '2280602154',
    requestTypeCode: 'GRADUATION_ASSESSMENT',
    inputData: validPayload,
    actorType: 'AI_AGENT',
  });

  console.log('Kết quả Workflow đầy đủ:', {
    decision: wf.decision,
    status: wf.status || wf.request?.status,
  });

  process.exit(0);
}

runTests().catch(err => {
  console.error('Lỗi kiểm thử:', err);
  process.exit(1);
});
