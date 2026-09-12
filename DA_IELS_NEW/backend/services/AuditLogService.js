import AuditLog from '../models/AuditLog.js';

export class AuditLogService {
  /**
   * Ghi nhận một sự kiện kiểm toán bất biến
   * @param {Object} entry
   * @param {string} entry.eventType
   * @param {string} entry.actor
   * @param {string} entry.actorId
   * @param {string} entry.decision
   * @param {string} entry.policyRuleId
   * @param {Object} entry.factsSnapshot
   * @param {string} entry.reason
   */
  static async record({
    eventType,
    actor = 'AI_AGENT',
    actorId = 'SYSTEM_AGENT',
    decision,
    policyRuleId = '',
    factsSnapshot = {},
    reason
  }) {
    try {
      // Lấy bản ghi cuối cùng để nối chuỗi Hash
      const lastLog = await AuditLog.findOne().sort({ timestamp: -1 });
      const prevHash = lastLog ? lastLog.tamperHash : 'GENESIS_HASH_IELS_2026';

      const logId = `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const tamperHash = AuditLog.generateHash(
        {
          logId,
          eventType,
          actor,
          decision,
          policyRuleId,
          factsSnapshot,
          reason
        },
        prevHash
      );

      const auditRecord = await AuditLog.create({
        logId,
        timestamp: new Date(),
        eventType,
        actor,
        actorId,
        decision,
        policyRuleId,
        factsSnapshot,
        reason,
        prevHash,
        tamperHash
      });

      console.log(`[AuditTrail] Immutable log created: [${decision}] by [${actor}] - Hash: ${tamperHash.slice(0, 12)}...`);
      return auditRecord;
    } catch (error) {
      console.error('[AuditTrail] Error recording audit log:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách audit trail gần nhất
   */
  static async getRecentLogs(limit = 50) {
    return AuditLog.find().sort({ timestamp: -1 }).limit(limit).lean();
  }
}

export default AuditLogService;
