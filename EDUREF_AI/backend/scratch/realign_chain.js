import prisma from '../config/prisma.js';
import AuditLogService from '../services/AuditLogService.js';

async function realignChain() {
  console.log('🔄 Đang đồng bộ hóa và chuẩn hóa toàn bộ chuỗi khối với Canonical SHA-256...');
  
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Tìm thấy ${logs.length} blocks cần đồng bộ.`);

  let currentPreviousHash = 'GENESIS_HASH_EDUREF_2026';

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    
    // Tính hash chuẩn hóa canonical
    const canonicalHash = AuditLogService.calculateHash({
      previousHash: currentPreviousHash,
      actorType: log.actorType,
      action: log.action,
      decision: log.decision,
      reason: log.reason,
      inputSnapshot: log.inputSnapshot,
      timestamp: log.createdAt
    });

    // Cập nhật lại previousHash và sha256Hash
    await prisma.auditLog.update({
      where: { id: log.id },
      data: {
        previousHash: currentPreviousHash,
        sha256Hash: canonicalHash
      }
    });

    currentPreviousHash = canonicalHash;
  }

  console.log('✅ Đã chuẩn hóa xong toàn bộ chuỗi!');

  // Kiểm tra lại tính toàn vẹn
  const verifyResult = await AuditLogService.verifyEntireChain();
  console.log('🏁 Kết quả xác thực toàn bộ chuỗi sau chuẩn hóa:', verifyResult);
}

realignChain().catch(console.error);
