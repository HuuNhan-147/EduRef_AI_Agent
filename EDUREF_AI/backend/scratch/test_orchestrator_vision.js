// scratch/test_orchestrator_vision.js
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

import { runAgent } from '../modules/ai-agent/index.js';

async function test() {
  const imagePath = 'C:/Users/acer/.gemini/antigravity-ide/brain/f5b4f889-9667-4724-b885-907d6c4b3b39/.user_uploaded/media_1789985904747.png';
  const buffer = fs.readFileSync(imagePath);
  const base64Blackout = buffer.toString('base64');

  console.log('=====================================================================');
  console.log('TEST A: Người dùng nộp qua Chat kèm ẢNH BỊ BÔI ĐEN');
  console.log('=====================================================================');
  const resA = await runAgent({
    message: 'Em là Cao Hữu Nhân (2280602154), nộp đơn đề nghị xét tốt nghiệp.',
    currentUser: { studentCode: '2280602154', name: 'Cao Hữu Nhân' },
    attachments: {
      b1: { previewUrl: base64Blackout },
    },
  });

  console.log('\n[Kết quả Test A]:');
  console.log('Decision:', resA.decision);
  console.log('Reply của AI:', resA.reply);

  console.log('\n=====================================================================');
  console.log('TEST B: Người dùng nộp qua Chat kèm ẢNH MẪU HUTECH THẬT CHUẨN');
  console.log('=====================================================================');
  const resB = await runAgent({
    message: 'Em là Cao Hữu Nhân (2280602154), nộp đơn đề nghị xét tốt nghiệp.',
    currentUser: { studentCode: '2280602154', name: 'Cao Hữu Nhân' },
    attachments: {
      b1: { previewUrl: '/demo_certs/hutech_b1_english.png' },
      teamwork: { previewUrl: '/demo_certs/hutech_teamwork_skills.png' },
    },
  });

  console.log('\n[Kết quả Test B]:');
  console.log('Decision:', resB.decision);
  console.log('Reply của AI:', resB.reply);
}

test().catch(console.error);
