// scratch/test_full_workflow.js
import dotenv from 'dotenv';
dotenv.config();

import petitionWorkflowCore from '../modules/petition-core/PetitionWorkflowCore.js';

async function runTests() {
  console.log('===============================================================');
  console.log('TEST 1: Nộp đúng 100% (Ảnh thật HUTECH + Text chuẩn Cao Hữu Nhân)');
  console.log('===============================================================');
  const validPayload = {
    phone: '0901234567',
    birthPlace: 'TP. Hồ Chí Minh',
    reason: 'Đã hoàn thành toàn bộ 135 tín chỉ và chuẩn đầu ra.',
    certificates: [
      {
        certType: 'Chuẩn Ngoại ngữ: Tiếng Anh B1 (CEFR / HUTECH)',
        certNumber: '0042066',
        bookNumber: 'DKC24B102677',
        issueDate: '2024-06-24',
      },
      {
        certType: 'Chuẩn Kỹ năng: Giao tiếp & Làm việc nhóm (HUTECH)',
        certNumber: 'CC/ 0056999',
        bookNumber: 'DKC25KR07358',
        issueDate: '2025-09-19',
      },
    ],
    attachedCerts: {
      b1: { previewUrl: '/demo_certs/hutech_b1_english.png' },
      teamwork: { previewUrl: '/demo_certs/hutech_teamwork_skills.png' },
    },
  };

  const res1 = await petitionWorkflowCore.processPetitionWorkflow({
    studentCode: '2280602154',
    requestTypeCode: 'GRADUATION_ASSESSMENT',
    inputData: validPayload,
  });

  console.log('-> Kết quả Test 1:', {
    success: res1.success,
    decision: res1.decision,
    status: res1.status || res1.request?.status,
    role: res1.authorityResult?.role,
    message: res1.message,
  });

  console.log('\n===============================================================');
  console.log('TEST 2: Sửa số hiệu trên form thành 0042099 (lệch với ảnh 0042066)');
  console.log('===============================================================');
  const mismatchPayload = {
    ...validPayload,
    certificates: [
      {
        certType: 'Chuẩn Ngoại ngữ: Tiếng Anh B1 (CEFR / HUTECH)',
        certNumber: '0042099', // SỬA KHÁC VỚI ẢNH THẬT
        bookNumber: 'DKC24B102677',
        issueDate: '2024-06-24',
      },
      {
        certType: 'Chuẩn Kỹ năng: Giao tiếp & Làm việc nhóm (HUTECH)',
        certNumber: 'CC/ 0056999',
        bookNumber: 'DKC25KR07358',
        issueDate: '2025-09-19',
      },
    ],
  };

  const res2 = await petitionWorkflowCore.processPetitionWorkflow({
    studentCode: '2280602154',
    requestTypeCode: 'GRADUATION_ASSESSMENT',
    inputData: mismatchPayload,
  });

  console.log('-> Kết quả Test 2:', {
    success: res2.success,
    decision: res2.decision,
    status: res2.status,
    actionableQuestion: res2.actionableQuestion,
  });

  console.log('\n===============================================================');
  console.log('TEST 3: Tải ảnh mờ / không nhận diện được');
  console.log('===============================================================');
  const blurryPayload = {
    ...validPayload,
    attachedCerts: {
      b1: { previewUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' },
      teamwork: { previewUrl: '/demo_certs/hutech_teamwork_skills.png' },
    },
  };

  const res3 = await petitionWorkflowCore.processPetitionWorkflow({
    studentCode: '2280602154',
    requestTypeCode: 'GRADUATION_ASSESSMENT',
    inputData: blurryPayload,
  });

  console.log('-> Kết quả Test 3:', {
    success: res3.success,
    decision: res3.decision,
    status: res3.status,
    actionableQuestion: res3.actionableQuestion,
  });
}

runTests().catch(console.error);
