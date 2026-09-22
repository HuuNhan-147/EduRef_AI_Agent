// scratch/test_real_vision_teamwork.js
import fs from 'fs';
import path from 'path';
import certificateVisionService from '../services/CertificateVisionService.js';

async function testTeamworkVision() {
  console.log('🔍 Đọc file ảnh Kỹ năng nhóm thật hutech_teamwork_skills.png...');
  const imgPath = path.resolve(process.cwd(), 'public/demo_certs/hutech_teamwork_skills.png');
  const buffer = fs.readFileSync(imgPath);
  const base64Data = buffer.toString('base64');

  console.log('🤖 Gọi Gemini 2.0 Flash Vision đọc trực tiếp ảnh Kỹ năng nhóm...');
  const startTime = Date.now();
  const result = await certificateVisionService.verifyCertificate({
    imageBase64: base64Data,
    expectedType: 'TEAMWORK',
    studentName: 'Cao Hữu Nhân'
  });

  console.log(`⏱️ Thời gian Gemini đọc: ${Date.now() - startTime}ms`);
  console.log('✨ KẾT QUẢ BÓC TÁCH:');
  console.log(JSON.stringify(result, null, 2));

  process.exit(0);
}

testTeamworkVision().catch(err => {
  console.error('Lỗi gọi Gemini Vision:', err);
  process.exit(1);
});
