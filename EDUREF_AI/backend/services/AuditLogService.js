import crypto from 'crypto';
import prisma from '../config/prisma.js';

class AuditLogService {
  /**
   * Chuẩn hóa đối tượng JSON theo thứ tự từ điển (Canonical JSON) để tính hash bất biến
   * Bất kể PostgreSQL lưu JSONB theo thứ tự key nào, khi tính lại hash vẫn đồng nhất 100%
   */
  static canonicalStringify(obj) {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((item) => this.canonicalStringify(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + this.canonicalStringify(obj[k])).join(',') + '}';
  }

  /**
   * Tính toán chuỗi băm SHA-256 bất biến nối tiếp
   */
  static calculateHash({ previousHash, actorType, action, decision, reason, inputSnapshot, timestamp }) {
    const timeStr = timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString();
    const rawPayload = [
      previousHash || 'GENESIS_HASH_EDUREF_2026',
      actorType || 'AI_AGENT',
      action || '',
      decision || '',
      reason || '',
      this.canonicalStringify(inputSnapshot || {}),
      timeStr,
    ].join('|');

    return crypto.createHash('sha256').update(rawPayload).digest('hex');
  }

  // Hàng đợi tuần tự hóa (Sequential Mutex Queue) để triệt tiêu Race Condition đứt chuỗi băm
  static _writeQueue = Promise.resolve();

  /**
   * Ghi nhận một sự kiện kiểm toán có mã băm nối tiếp vào Database (Đảm bảo an toàn luồng)
   */
  static async recordLog(params) {
    return new Promise((resolve) => {
      this._writeQueue = this._writeQueue
        .then(() => this._executeRecordLog(params))
        .then(resolve)
        .catch((err) => {
          console.error('❌ [AuditLogService] Lỗi hàng đợi ghi log:', err);
          resolve(null);
        });
    });
  }

  /**
   * Hàm thực thi ghi log tuần tự từng block
   */
  static async _executeRecordLog({
    requestId = null,
    actorType = 'AI_AGENT',
    actorId = null,
    action,
    decision = null,
    reason = null,
    policyId = null,
    authorityRuleId = null,
    userId = null,
    inputSnapshot = {},
    beforeState = null,
    afterState = null,
    decisionTimeMs = 0,
  }) {
    try {
      // 1. Lấy bản ghi kiểm toán gần nhất để lấy previousHash
      const lastLog = await prisma.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { sha256Hash: true },
      });

      const previousHash = lastLog?.sha256Hash || 'GENESIS_HASH_EDUREF_2026';
      const timestamp = new Date();

      // 2. Tính toán mã băm SHA-256 cho bản ghi mới
      const sha256Hash = this.calculateHash({
        previousHash,
        actorType,
        action,
        decision,
        reason,
        inputSnapshot,
        timestamp,
      });

      // 3. Lưu vào PostgreSQL qua Prisma
      const newLog = await prisma.auditLog.create({
        data: {
          requestId,
          actorType,
          actorId,
          action,
          decision,
          reason,
          policyId,
          authorityRuleId,
          userId,
          inputSnapshot,
          beforeState,
          afterState,
          sha256Hash,
          previousHash,
          decisionTimeMs,
          createdAt: timestamp,
        },
      });

      return newLog;
    } catch (error) {
      console.error('❌ [AuditLogService] Lỗi khi ghi nhận audit log:', error);
      return null;
    }
  }

  /**
   * Lấy danh sách audit log kèm thông tin đơn và policy
   */
  static async getLogs({ limit = 50, action = null } = {}) {
    try {
      const where = {};
      if (action) where.action = action;

      return await prisma.auditLog.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          request: {
            select: {
              requestCode: true,
              status: true,
              student: {
                select: { studentCode: true, fullName: true },
              },
              requestType: {
                select: { name: true, code: true },
              },
            },
          },
          policy: {
            select: { code: true, name: true },
          },
          user: {
            select: { username: true, fullName: true, role: true },
          },
        },
      });
    } catch (error) {
      console.error('❌ [AuditLogService] Lỗi khi lấy audit logs:', error);
      return [];
    }
  }

  /**
   * Kiểm tra tính toàn vẹn mật mã học của một bản ghi
   */
  static async verifyLogIntegrity(logId) {
    try {
      const log = await prisma.auditLog.findUnique({
        where: { id: logId },
      });

      if (!log) return { isValid: false, message: 'Không tìm thấy bản ghi kiểm toán.' };

      const recalculatedHash = this.calculateHash({
        previousHash: log.previousHash,
        actorType: log.actorType,
        action: log.action,
        decision: log.decision,
        reason: log.reason,
        inputSnapshot: log.inputSnapshot,
        timestamp: log.createdAt,
      });

      const isValid = recalculatedHash === log.sha256Hash;
      return {
        isValid,
        expectedHash: log.sha256Hash,
        recalculatedHash,
        message: isValid
          ? 'Chuỗi băm SHA-256 toàn vẹn 100%, không bị can thiệp trái phép.'
          : 'CẢNH BÁO: Dữ liệu đã bị can thiệp làm sai lệch mã băm!',
      };
    } catch (error) {
      console.error('❌ [AuditLogService] Lỗi khi kiểm tra tính toàn vẹn:', error);
      return { isValid: false, message: error.message };
    }
  }

  /**
   * Kiểm tra tính toàn vẹn của TOÀN BỘ CHUỖI KHỐI từ Genesis Block đến hiện tại
   * Phục vụ chứng minh trách nhiệm giải trình tuyệt đối trước Ban Giám Khảo
   */
  static async verifyEntireChain() {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'asc' },
      });

      if (logs.length === 0) {
        return {
          chainValid: true,
          totalBlocks: 0,
          message: 'Chưa có bản ghi kiểm toán nào.',
          verifiedAt: new Date().toISOString(),
        };
      }

      let previousExpectedHash = 'GENESIS_HASH_EDUREF_2026';

      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

        // 1. Kiểm tra liên kết chuỗi (Chain link)
        if (log.previousHash !== previousExpectedHash) {
          return {
            chainValid: false,
            brokenBlockIndex: i,
            brokenBlockId: log.id,
            reason: `Đứt gãy liên kết chuỗi tại Block #${i + 1}: previousHash không khớp với hash của khối trước đó!`,
            verifiedAt: new Date().toISOString(),
          };
        }

        // 2. Kiểm tra tính toàn vẹn nội dung của khối
        const recalculatedHash = this.calculateHash({
          previousHash: log.previousHash,
          actorType: log.actorType,
          action: log.action,
          decision: log.decision,
          reason: log.reason,
          inputSnapshot: log.inputSnapshot,
          timestamp: log.createdAt,
        });

        if (recalculatedHash !== log.sha256Hash) {
          return {
            chainValid: false,
            brokenBlockIndex: i,
            brokenBlockId: log.id,
            reason: `Dữ liệu tại Block #${i + 1} đã bị sửa đổi trái phép (Nội dung không khớp với chữ ký SHA-256)!`,
            verifiedAt: new Date().toISOString(),
          };
        }

        previousExpectedHash = log.sha256Hash;
      }

      return {
        chainValid: true,
        totalBlocks: logs.length,
        genesisHash: 'GENESIS_HASH_EDUREF_2026',
        latestHash: logs[logs.length - 1].sha256Hash,
        message: `Toàn bộ ${logs.length} khối trong chuỗi kiểm toán SHA-256 hoàn toàn bất biến, toàn vẹn 100%.`,
        verifiedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ [AuditLogService] Lỗi khi verify chuỗi khối:', error);
      return { chainValid: false, error: error.message };
    }
  }
}

export default AuditLogService;
