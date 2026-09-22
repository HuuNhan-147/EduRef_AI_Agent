import prisma from '../config/prisma.js';

async function listAllLogs() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      action: true,
      decision: true,
      actorType: true,
      sha256Hash: true,
      previousHash: true,
      createdAt: true
    }
  });

  console.log(`Tổng cộng ${logs.length} logs:`);
  logs.slice(0, 10).forEach((l, idx) => {
    console.log(`#${idx + 1} [${l.id}] action=${l.action}, actor=${l.actorType}, prev=${l.previousHash.slice(0, 8)}..., hash=${l.sha256Hash.slice(0, 8)}...`);
  });
}

listAllLogs().catch(console.error);
