import AuditLog from "../models/AuditLogModel.js";

/**
 * Ghi nhận một bản ghi kiểm toán mới (Fact-Based Audit Trail)
 * Đảm bảo tính bất biến và không lộ Chain-of-Thought
 */
export const recordAudit = async ({
  action,
  actor = { id: "system", name: "EquipReferee AI Agent", role: "AI_AGENT" },
  targetId = null,
  targetType = "LoanRequest",
  inputPayload = {},
  matchedRules = [],
  decision,
  reason,
  beforeState = null,
  afterState = null,
  isRollbackable = false,
}) => {
  try {
    const auditRecord = new AuditLog({
      action,
      actor,
      targetId: targetId ? targetId.toString() : null,
      targetType,
      inputPayload,
      matchedRules,
      decision,
      reason,
      beforeState,
      afterState,
      rollbackInfo: {
        isRollbackable,
        isRolledBack: false,
      },
    });

    const saved = await auditRecord.save();
    console.log(`📜 [AuditLog] Đã ghi log [${saved.logId}]: ${action} -> ${decision}`);
    return saved;
  } catch (error) {
    console.error("❌ [AuditLog] Lỗi ghi nhận nhật ký kiểm toán:", error.message);
    // Không throw lỗi làm sập flow chính nhưng log ra console
    return null;
  }
};

/**
 * Tra cứu danh sách nhật ký kiểm toán gần nhất
 */
export const getAuditLogs = async (filter = {}, limit = 20, skip = 0) => {
  return await AuditLog.find(filter)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Lấy chi tiết một bản ghi kiểm toán
 */
export const getAuditLogById = async (idOrLogId) => {
  if (/^[0-9a-fA-F]{24}$/.test(idOrLogId)) {
    return await AuditLog.findById(idOrLogId);
  }
  return await AuditLog.findOne({ logId: idOrLogId });
};

/**
 * Cập nhật trạng thái đã hoàn tác cho một bản ghi kiểm toán
 */
export const markAsRolledBack = async (logId, rolledBackBy = "Quản lý", reason = "Hoàn tác thủ công") => {
  return await AuditLog.findOneAndUpdate(
    { logId },
    {
      $set: {
        "rollbackInfo.isRolledBack": true,
        "rollbackInfo.rolledBackAt": new Date(),
        "rollbackInfo.rolledBackBy": rolledBackBy,
        "rollbackInfo.rollbackReason": reason,
      },
    },
    { new: true }
  );
};
