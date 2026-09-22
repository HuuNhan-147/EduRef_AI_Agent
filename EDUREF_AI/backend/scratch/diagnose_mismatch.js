import prisma from '../config/prisma.js';
import crypto from 'crypto';

async function diagnoseMismatch() {
  const log = await prisma.auditLog.findUnique({
    where: { id: 'cmuaxum0m000f3nx06vls87k7' }
  });

  // Kiểm tra xem liệu trong Database inputSnapshot có bị biến đổi gì không
  console.log('Stored sha256Hash: ', log.sha256Hash);
  console.log('Stored previousHash: ', log.previousHash);
  console.log('actorType: ', log.actorType);
  console.log('action: ', log.action);
  console.log('decision: ', log.decision);
  console.log('reason: ', log.reason);
  console.log('inputSnapshot: ', JSON.stringify(log.inputSnapshot));
  console.log('createdAt: ', log.createdAt);

  // Thử các biến thể payload để xem cái nào sinh ra 29306050d0ccb2e1b29e5faf923c69b9f97f143cbaac8a9f755d24871d985b42
  const targetHash = log.sha256Hash;

  const timeStr = log.createdAt.toISOString();
  
  // Biến thể 1: actorType là AI_AGENT thay vì STUDENT
  for (const act of ['STUDENT', 'AI_AGENT', 'SYSTEM']) {
    for (const snap of [
      JSON.stringify(log.inputSnapshot),
      JSON.stringify(log.inputSnapshot, Object.keys(log.inputSnapshot).sort()),
    ]) {
      const p = [
        log.previousHash,
        act,
        log.action,
        log.decision,
        log.reason,
        snap,
        timeStr
      ].join('|');
      const h = crypto.createHash('sha256').update(p).digest('hex');
      if (h === targetHash) {
        console.log(`🎯 TÌM THẤY BIẾN THỂ KHỚP! act=${act}`);
      }
    }
  }
}

diagnoseMismatch().catch(console.error);
