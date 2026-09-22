import crypto from 'crypto';
import prisma from '../config/prisma.js';

async function testLegacy() {
  const log = await prisma.auditLog.findUnique({
    where: { id: 'cmuaxum0m000f3nx06vls87k7' }
  });

  const timeStr = log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date(log.createdAt).toISOString();
  const legacyRawPayload = [
    log.previousHash || 'GENESIS_HASH_EDUREF_2026',
    log.actorType || 'AI_AGENT',
    log.action || '',
    log.decision || '',
    log.reason || '',
    JSON.stringify(log.inputSnapshot || {}),
    timeStr,
  ].join('|');

  const legacyHash = crypto.createHash('sha256').update(legacyRawPayload).digest('hex');
  console.log('Legacy hash: ', legacyHash);
  console.log('Stored hash: ', log.sha256Hash);
  console.log('Match legacy?', legacyHash === log.sha256Hash);
}

testLegacy().catch(console.error);
