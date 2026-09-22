// scratch/test_flow_validation.js
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import certificateVisionService from '../services/CertificateVisionService.js';

async function test() {
  console.log('--- TEST 1: Đọc ảnh thật B1 bằng Gemini Vision ---');
  const b1Res = await certificateVisionService.verifyCertificate({
    imageBase64: '/demo_certs/hutech_b1_english.png',
    expectedType: 'B1',
    studentName: 'Cao Hữu Nhân',
  });
  console.log('Kết quả B1:', JSON.stringify(b1Res, null, 2));

  console.log('\n--- TEST 2: Đọc ảnh thật Teamwork bằng Gemini Vision ---');
  const twRes = await certificateVisionService.verifyCertificate({
    imageBase64: '/demo_certs/hutech_teamwork_skills.png',
    expectedType: 'TEAMWORK',
    studentName: 'Cao Hữu Nhân',
  });
  console.log('Kết quả Teamwork:', JSON.stringify(twRes, null, 2));
}

test().catch(console.error);
