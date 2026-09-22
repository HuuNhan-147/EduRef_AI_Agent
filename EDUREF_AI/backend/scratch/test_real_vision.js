// scratch/test_real_vision.js
// Thử nghiệm thực tế: Gửi ảnh HUTECH thật cho Gemini Vision đọc trực tiếp

import fs from 'fs';
import path from 'path';
import certificateVisionService from '../services/CertificateVisionService.js';

async function testRealVision() {
  console.log('🔍 [1] Đọc file ảnh thật hutech_b1_english.png từ đĩa...');
  const imgPath = path.resolve(process.cwd(), 'public/demo_certs/hutech_b1_english.png');
  const buffer = fs.readFileSync(imgPath);
  const base64Data = buffer.toString('base64');
  console.log(`📸 Kích thước ảnh: ${buffer.length} bytes (Base64: ${base64Data.length} chars)`);

  console.log('\n🤖 [2] Gọi Gemini 2.0 Flash Vision để ĐỌC TRỰC TIẾP TỪ ẢNH...');
  const startTime = Date.now();
  const result = await certificateVisionService.verifyCertificate({
    imageBase64: base64Data,
    expectedType: 'B1',
    studentName: 'Cao Hữu Nhân'
  });

  console.log(`⏱️ Thời gian Gemini đọc và phân tích ảnh: ${Date.now() - startTime}ms`);
  console.log('\n✨ KẾT QUẢ GEMINI VISION THỰC SỰ BÓC TÁCH TỪ ẢNH:');
  console.log(JSON.stringify(result, null, 2));

  process.exit(0);
}

testRealVision().catch(err => {
  console.error('Lỗi gọi Gemini Vision:', err);
  process.exit(1);
});
