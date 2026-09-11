import mongoose from "mongoose";

/* =========================================================
   AUDIT LOG SCHEMA — Nhật Ký Kiểm Toán Bất Biến (Fact-Based)
   ========================================================= */
const auditLogSchema = new mongoose.Schema(
  {
    logId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: function () {
        return `AUD-${Date.now().toString().slice(-6)}-${Math.floor(
          1000 + Math.random() * 9000
        )}`;
      },
    },

    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
    },

    actor: {
      id: { type: String, default: "system" },
      name: { type: String, default: "EquipReferee AI Agent" },
      role: {
        type: String,
        enum: ["AI_AGENT", "STOREKEEPER", "MANAGER", "EMPLOYEE", "SYSTEM"],
        default: "AI_AGENT",
      },
    },

    action: {
      type: String,
      required: true,
      enum: [
        "EVALUATE_REQUEST",
        "AUTO_APPROVE",
        "ESCALATE",
        "APPROVE_LOAN",
        "REJECT_LOAN",
        "DISPATCH",
        "RETURN",
        "ROLLBACK",
      ],
    },

    targetId: {
      type: String, // ID của LoanRequest hoặc Equipment
      required: false,
    },

    targetType: {
      type: String,
      default: "LoanRequest",
    },

    // Dữ liệu đầu vào ban đầu (Raw User Prompt & Parsed Entities)
    inputPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Các điều khoản quy chế được so khớp (Căn cứ quyết định)
    matchedRules: [
      {
        type: String,
      },
    ],

    // Kết quả phán quyết của Agent hoặc Con người
    decision: {
      type: String,
      required: true,
      enum: [
        "AUTO_APPROVED",
        "ESCALATED",
        "APPROVED",
        "REJECTED",
        "DISPATCHED",
        "RETURNED",
        "ROLLED_BACK",
      ],
    },

    // Giải thích ngắn gọn, minh bạch cho người không chuyên
    // TUYỆT ĐỐI KHÔNG LƯU CHAIN-OF-THOUGHT NỘI TÂM
    reason: {
      type: String,
      required: true,
    },

    // Trạng thái hệ thống trước và sau khi thực thi
    beforeState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    afterState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Thông tin hoàn tác (Rollback Management)
    rollbackInfo: {
      isRollbackable: {
        type: Boolean,
        default: false,
      },
      isRolledBack: {
        type: Boolean,
        default: false,
      },
      rolledBackAt: {
        type: Date,
      },
      rolledBackBy: {
        type: String,
      },
      rollbackReason: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
