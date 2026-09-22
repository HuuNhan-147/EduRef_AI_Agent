// scratch/test_blurry.js
import dotenv from 'dotenv';
dotenv.config();

import certificateVisionService from '../services/CertificateVisionService.js';

async function test() {
  // 1 pixel transparent PNG
  const dummy1px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  console.log('--- TEST ẢNH RÁC / MỜ ---');
  const res = await certificateVisionService.verifyCertificate({
    imageBase64: dummy1px,
    expectedType: 'B1',
    studentName: 'Cao Hữu Nhân',
  });
  console.log('Kết quả ảnh mờ/rác:', JSON.stringify(res, null, 2));
}

test().catch(console.error);
