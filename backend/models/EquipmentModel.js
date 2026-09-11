import mongoose from "mongoose";

/* =========================================================
   EQUIPMENT SCHEMA — Quản lý Thiết bị & Tài sản Nội bộ
   ========================================================= */
const equipmentSchema = new mongoose.Schema(
  {
    assetCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // Ví dụ: TB-CAM-001, TB-MIC-002
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },

    categoryName: {
      type: String,
      default: "Thiết bị chung",
    },

    value: {
      type: Number,
      required: true, // Giá trị thẩm định VNĐ (làm căn cứ xét thẩm quyền > 20M)
      min: 0,
    },

    countInStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    location: {
      type: String,
      required: true,
      default: "Kho Thiết bị Trung tâm", // Ví dụ: "Tủ A2 - Lab 502", "Kho IT Tầng 3"
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "MAINTENANCE", "DECOMMISSIONED"],
      default: "AVAILABLE",
    },

    image: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    specifications: [
      {
        name: { type: String },
        value: { type: String },
      },
    ],

    // Cờ đánh dấu tài sản đặc biệt / giá trị cao để truy vấn nhanh
    isHighValue: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Tự động gán isHighValue nếu value > 20,000,000 VND
equipmentSchema.pre("save", function (next) {
  if (this.value !== undefined) {
    this.isHighValue = this.value > 20000000;
  }
  next();
});

const Equipment = mongoose.model("Equipment", equipmentSchema);
export default Equipment;
