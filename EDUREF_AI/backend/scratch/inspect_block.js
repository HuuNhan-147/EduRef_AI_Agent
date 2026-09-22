import prisma from '../config/prisma.js';
import AuditLogService from '../services/AuditLogService.js';

async function checkBlock() {
  const log = await prisma.auditLog.findUnique({
    where: { id: 'cmuaxum0m000f3nx06vls87k7' }
  });

  console.log('Log found:', log);
  if (!log) {
    console.log('Log not found!');
    return;
  }

  const timeStr = log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date(log.createdAt).toISOString();
  console.log('timeStr:', timeStr);

  const rawPayload = [
    log.previousHash || 'GENESIS_HASH_EDUREF_2026',
    log.actorType || 'AI_AGENT',
    log.action || '',
    log.decision || '',
    log.reason || '',
    AuditLogService.canonicalStringify(log.inputSnapshot || {}),
    timeStr,
  ].join('|');

  console.log('rawPayload:', rawPayload);
  console.log('Stored hash:      ', log.sha256Hash);
  console.log('Recalculated hash:', AuditLogService.calculateHash({
    previousHash: log.previousHash,
    actorType: log.actorType,
    action: log.action,
    decision: log.decision,
    reason: log.reason,
    inputSnapshot: log.inputSnapshot,
    timestamp: log.createdAt
  }));
}

checkBlock().catch(console.error);
