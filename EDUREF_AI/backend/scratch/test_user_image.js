// scratch/test_user_image.js
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

import certificateVisionService from '../services/CertificateVisionService.js';

async function test() {
  const imagePath = 'C:/Users/acer/.gemini/antigravity-ide/brain/f5b4f889-9667-4724-b885-907d6c4b3b39/.user_uploaded/media_1789985904747.png';
  if (!fs.existsSync(imagePath)) {
    console.error('File không tồn tại:', imagePath);
    return;
  }
  const buffer = fs.readFileSync(imagePath);
  const base64 = buffer.toString('base64');

  console.log('--- ĐANG GỌI GEMINI VISION VỚI ẢNH NGƯỜI DÙNG BỊ BÔI ĐEN ---');
  const res = await certificateVisionService.verifyCertificate({
    imageBase64: base64,
    expectedType: 'B1',
    studentName: 'Cao Hữu Nhân',
  });

  console.log('KẾT QUẢ GEMINI VISION:', JSON.stringify(res, null, 2));
}

test().catch(console.error);
