import prisma from '../config/prisma.js';
import AuditLogService from '../services/AuditLogService.js';

async function checkNewBlocks() {
  const newLogs = await prisma.auditLog.findMany({
    where: { action: { startsWith: 'MUTEX_CONCURRENT_WRITE_' } },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Tìm thấy ${newLogs.length} logs mới tạo.`);
  let allValid = true;

  for (let i = 0; i < newLogs.length; i++) {
    const log = newLogs[i];
    const recalc = AuditLogService.calculateHash({
      previousHash: log.previousHash,
      actorType: log.actorType,
      action: log.action,
      decision: log.decision,
      reason: log.reason,
      inputSnapshot: log.inputSnapshot,
      timestamp: log.createdAt
    });

    const isMatch = recalc === log.sha256Hash;
    console.log(`Block ${i + 1} (${log.action}): ${isMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    if (!isMatch) {
      allValid = false;
      console.log('Stored: ', log.sha256Hash);
      console.log('Recalc: ', recalc);
    }
  }

  // Kiểm tra chain linkage giữa các block mới
  for (let i = 1; i < newLogs.length; i++) {
    const prev = newLogs[i - 1];
    const curr = newLogs[i];
    const linkMatch = curr.previousHash === prev.sha256Hash;
    console.log(`Link ${i} -> ${i + 1}: ${linkMatch ? '✅ LINKED' : '❌ BROKEN'}`);
    if (!linkMatch) allValid = false;
  }

  console.log('Toàn bộ 10 block mới với canonicalStringify:', allValid ? 'HOÀN TOÀN HỢP LỆ!' : 'CÓ LỖI');
}

checkNewBlocks().catch(console.error);
