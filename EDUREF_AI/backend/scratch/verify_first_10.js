import prisma from '../config/prisma.js';
import AuditLogService from '../services/AuditLogService.js';

async function verifyEach() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'asc' },
    take: 10
  });

  logs.forEach((log, idx) => {
    const recalc = AuditLogService.calculateHash({
      previousHash: log.previousHash,
      actorType: log.actorType,
      action: log.action,
      decision: log.decision,
      reason: log.reason,
      inputSnapshot: log.inputSnapshot,
      timestamp: log.createdAt
    });

    console.log(`#${idx + 1} action=${log.action}: ${recalc === log.sha256Hash ? 'MATCH' : 'MISMATCH'}`);
  });
}

verifyEach().catch(console.error);
