import mongoose from "mongoose";

/* =========================================================
   LOAN REQUEST SCHEMA — Quản lý Phiếu Mượn Thiết Bị
   ========================================================= */
const loanRequestSchema = new mongoose.Schema(
  {
    requestCode: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: function () {
        return `LR${Date.now().toString().slice(-6)}-${Math.floor(
          100 + Math.random() * 900
        )}`;
      },
    },

    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Cho phép null khi chạy chế độ demo công khai không cần login
    },

    requesterName: {
      type: String,
      required: true,
      default: "Nhân viên / Sinh viên nội bộ",
    },

    department: {
      type: String,
      default: "Khoa Công Nghệ Thông Tin",
    },

    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },

    equipmentName: {
      type: String,
      default: "",
    },

    equipmentValue: {
      type: Number,
      default: 0,
    },

    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    purpose: {
      type: String,
      required: true,
      trim: true,
    },

    durationDays: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    expectedReturnDate: {
      type: Date,
      required: true,
    },

    actualReturnDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: [
        "AUTO_APPROVED",     // Tự động duyệt thành công bởi AI
        "ESCALATED_PENDING", // Chờ con người phê duyệt (Vượt thẩm quyền/Mờ thông tin/Sai quy chế)
        "APPROVED",          // Đã được Quản lý phê duyệt thủ công
        "DISPATCHED",        // Đã xuất kho / bàn giao thiết bị
        "RETURNED",          // Đã hoàn trả kho nguyên vẹn
        "REJECTED",          // Bị Quản lý từ chối
        "CANCELLED",         // Bị hủy hoặc Hoàn tác (Rollback)
      ],
      default: "ESCALATED_PENDING",
    },

    // Chi tiết chuyển tiếp (Escalation Metadata)
    escalationDetails: {
      category: {
        type: String,
        enum: ["NONE", "UNCERTAIN_INFO", "OUT_OF_POLICY", "HIGH_AUTHORITY_REQUIRED"],
        default: "NONE",
      },
      reason: {
        type: String,
        default: "",
      },
      escalationQuestion: {
        type: String,
        default: "", // Câu hỏi sắc bén hướng đến người duyệt
      },
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      decidedByName: {
        type: String,
      },
      decidedAt: {
        type: Date,
      },
      decisionNote: {
        type: String,
      },
    },

    // Cờ kiểm soát trừ kho (Atomic Stock Reduction Tracking)
    stockDeducted: {
      type: Boolean,
      default: false,
    },

    // Mã PIN / QR xuất kho nhận thiết bị tại tủ
    pickupCode: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Tự động tính expectedReturnDate nếu chưa có
loanRequestSchema.pre("validate", function (next) {
  if (!this.expectedReturnDate && this.durationDays) {
    const start = this.startDate ? new Date(this.startDate) : new Date();
    const returnDate = new Date(start);
    returnDate.setDate(returnDate.getDate() + Number(this.durationDays));
    this.expectedReturnDate = returnDate;
  }
  next();
});

const LoanRequest = mongoose.model("LoanRequest", loanRequestSchema);
export default LoanRequest;
