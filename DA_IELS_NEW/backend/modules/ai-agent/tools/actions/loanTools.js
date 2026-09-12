// backend/modules/ai-agent/tools/actions/loanTools.js
import LoanRequest from "../../../../models/LoanRequest.js";
import LoanItem from "../../../../models/LoanItem.js";
import EquipmentModel from "../../../../models/EquipmentModel.js";
import Equipment from "../../../../models/Equipment.js";
import User from "../../../../models/User.js";
import AuditLogService from "../../../../services/AuditLogService.js";

const generatePickupCode = () => `EQ-${Math.floor(1000 + Math.random() * 9000)}`;

export async function createAutoLoan({
  modelId,
  quantity = 1,
  durationDays = 2,
  locationOfUse = "Phòng họp / Lab công ty",
  purpose = "Công vụ nội bộ",
  userId = null,
}) {
  try {
    let borrower = null;
    if (userId) borrower = await User.findById(userId);
    if (!borrower) borrower = await User.findOne({ role: "EMPLOYEE" });

    const model = await EquipmentModel.findById(modelId);
    if (!model) return { success: false, message: "Không tìm thấy mẫu thiết bị." };

    const reqQty = Math.max(1, Number(quantity) || 1);
    const loanDays = Math.max(1, Number(durationDays) || 2);

    // Kiểm tra quy chế thường quy
    if (model.estimatedValue > 20000000 || loanDays > 7) {
      return {
        success: false,
        requiresEscalation: true,
        message: "Yêu cầu này vượt ngưỡng tự động (Giá trị > 20M hoặc thời gian > 7 ngày). Phải chuyển tiếp Quản lý duyệt.",
      };
    }

    // Tìm máy khả dụng
    const availableItems = await Equipment.find({ model: modelId, status: "AVAILABLE" }).limit(reqQty);
    if (availableItems.length < reqQty) {
      return { success: false, message: `Kho chỉ còn ${availableItems.length} máy khả dụng, không đủ số lượng (${reqQty})!` };
    }

    const start = new Date();
    const end = new Date(Date.now() + loanDays * 24 * 3600 * 1000);
    const requestCode = `LR-AUTO-${Date.now().toString().slice(-5)}`;
    const pickupCode = generatePickupCode();
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${pickupCode}&color=10b981`;

    // Tạo phiếu mượn ở trạng thái AUTO_APPROVED (Tự động duyệt 100%)
    const loan = await LoanRequest.create({
      requestCode,
      borrower: borrower._id,
      department: borrower.department,
      purpose,
      purposeCategory: "PROJECT_TASK",
      locationOfUse,
      quantity: reqQty,
      startDate: start,
      pickupTime: "08:30",
      expectedReturnDate: end,
      returnTime: "17:30",
      loanDays,
      totalEstimatedValue: model.estimatedValue * reqQty,
      maxItemValue: model.estimatedValue,
      status: "AUTO_APPROVED",
      pickupCode,
      pickupLockerSlot: "Tủ Smart Locker Tầng 1 - Ngăn Tự Động",
      qrCode,
      pickupDeadline: new Date(Date.now() + 48 * 3600 * 1000),
    });

    // Cập nhật máy sang RESERVED và tạo LoanItem
    for (const eq of availableItems) {
      await Equipment.findByIdAndUpdate(eq._id, { status: "RESERVED" });
      await LoanItem.create({
        loanRequest: loan._id,
        equipmentModel: model._id,
        equipment: eq._id,
        estimatedValueSnapshot: model.estimatedValue,
        itemStatus: "ASSIGNED",
      });
    }

    // Ghi sổ cái kiểm toán bất biến (Audit Trail)
    await AuditLogService.record({
      eventType: "AUTHORITY_DECISION",
      actor: "AI_AGENT",
      actorId: "EQUIP_REFEREE_BOT",
      decision: "AUTO_APPROVED",
      policyRuleId: "POL-AUTO-ROUTINE",
      factsSnapshot: {
        assetCode: availableItems[0]?.assetCode,
        modelName: model.name,
        estimatedValue: model.estimatedValue,
        loanDays,
        borrowerStaffCode: borrower.staffCode,
      },
      reason: `AI Agent tự động duyệt ca thường quy: ${model.name} (Định giá: ${model.estimatedValue.toLocaleString("vi-VN")} đ <= 20M, Thời hạn: ${loanDays}d <= 7d). Đã cấp mã PIN nhận đồ tức thì.`,
    });

    return {
      success: true,
      autoApproved: true,
      loanId: loan._id,
      requestCode: loan.requestCode,
      status: "AUTO_APPROVED",
      pickupCode,
      pickupLockerSlot: loan.pickupLockerSlot,
      equipmentName: model.name,
      equipmentValue: model.estimatedValue,
      durationDays: loanDays,
      message: `✅ AI Agent đã TỰ ĐỘNG PHÊ DUYỆT 100%! Mã nhận đồ của bạn là [${pickupCode}]. Vui lòng đến ${loan.pickupLockerSlot} để nhận máy.`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function escalateToManager({
  modelId,
  quantity = 1,
  durationDays = 10,
  locationOfUse = "Phòng sự kiện / Công tác",
  purpose = "Nhiệm vụ cấp cao",
  reason = "Giá trị tài sản lớn hoặc thời gian mượn dài ngày",
  userId = null,
}) {
  try {
    let borrower = null;
    if (userId) borrower = await User.findById(userId);
    if (!borrower) borrower = await User.findOne({ role: "EMPLOYEE" });

    const model = await EquipmentModel.findById(modelId);
    if (!model) return { success: false, message: "Không tìm thấy mẫu thiết bị." };

    const reqQty = Math.max(1, Number(quantity) || 1);
    const loanDays = Math.max(1, Number(durationDays) || 10);

    const availableItems = await Equipment.find({ model: modelId, status: "AVAILABLE" }).limit(reqQty);
    if (availableItems.length < reqQty) {
      return { success: false, message: `Kho chỉ còn ${availableItems.length} máy khả dụng!` };
    }

    const start = new Date();
    const end = new Date(Date.now() + loanDays * 24 * 3600 * 1000);
    const requestCode = `LR-ESC-${Date.now().toString().slice(-5)}`;

    // Tạo phiếu ở trạng thái ESCALATED_MANAGER
    const loan = await LoanRequest.create({
      requestCode,
      borrower: borrower._id,
      department: borrower.department,
      purpose,
      purposeCategory: "PROJECT_TASK",
      locationOfUse,
      quantity: reqQty,
      startDate: start,
      pickupTime: "08:30",
      expectedReturnDate: end,
      returnTime: "17:30",
      loanDays,
      totalEstimatedValue: model.estimatedValue * reqQty,
      maxItemValue: model.estimatedValue,
      status: "ESCALATED_MANAGER",
      escalationReason: reason,
      policyRuleApplied: model.estimatedValue > 20000000 ? "POL-VAL-001" : "POL-DUR-001",
      pickupLockerSlot: "Kho Trung Tâm",
      pickupDeadline: new Date(Date.now() + 48 * 3600 * 1000),
    });

    for (const eq of availableItems) {
      await Equipment.findByIdAndUpdate(eq._id, { status: "RESERVED" });
      await LoanItem.create({
        loanRequest: loan._id,
        equipmentModel: model._id,
        equipment: eq._id,
        estimatedValueSnapshot: model.estimatedValue,
        itemStatus: "PENDING",
      });
    }

    const specificQuestion = `Nhân viên ${borrower.fullName} đề xuất mượn ${model.name} (${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(model.estimatedValue)}) trong ${loanDays} ngày để "${purpose}". Quản lý có phê duyệt yêu cầu này không?`;

    // Ghi sổ cái kiểm toán bất biến (Audit Trail)
    await AuditLogService.record({
      eventType: "ESCALATION_TRIGGERED",
      actor: "AI_AGENT",
      actorId: "EQUIP_REFEREE_BOT",
      decision: "ESCALATED_MANAGER",
      policyRuleId: model.estimatedValue > 20000000 ? "POL-VAL-001" : "POL-DUR-001",
      factsSnapshot: {
        assetCode: availableItems[0]?.assetCode,
        modelName: model.name,
        estimatedValue: model.estimatedValue,
        loanDays,
        borrowerStaffCode: borrower.staffCode,
      },
      reason: `AI Agent kích hoạt chuyển tiếp Quản lý trực tiếp (Escalated): ${reason}. Câu hỏi chuyển tiếp: "${specificQuestion}".`,
    });

    return {
      success: true,
      escalated: true,
      loanId: loan._id,
      requestCode: loan.requestCode,
      status: "ESCALATED_MANAGER",
      equipmentName: model.name,
      equipmentValue: model.estimatedValue,
      durationDays: loanDays,
      reason,
      specificQuestion,
      message: `⚠️ Yêu cầu vượt thẩm quyền tự động (${reason}). Hồ sơ đã được chuyển tiếp lên Quản lý trực tiếp phê duyệt!`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getMyLoans({ userId = null }) {
  try {
    let query = {};
    if (userId) query.borrower = userId;
    const loans = await LoanRequest.find(query).sort({ createdAt: -1 }).limit(5).populate("borrower");
    return {
      success: true,
      count: loans.length,
      loans: loans.map((l) => ({
        id: l._id,
        requestCode: l.requestCode,
        status: l.status,
        pickupCode: l.pickupCode || "Chờ duyệt",
        loanDays: l.loanDays,
        startDate: l.startDate,
        expectedReturnDate: l.expectedReturnDate,
      })),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function explainDecision({ loanId = null }) {
  try {
    let loan = null;
    if (loanId) loan = await LoanRequest.findById(loanId);
    if (!loan) loan = await LoanRequest.findOne().sort({ createdAt: -1 });

    if (!loan) return { success: false, message: "Không tìm thấy phiếu mượn để giải thích." };

    let explanation = "";
    if (loan.status === "AUTO_APPROVED") {
      explanation = `Theo Quy chế Cấp phát Thiết bị Điều 3: Thiết bị có giá trị thẩm định (${loan.totalEstimatedValue?.toLocaleString("vi-VN")} đ <= 20.000.000 đ) và thời hạn mượn (${loan.loanDays} ngày <= 7 ngày) thuộc nhóm Thường quy (ROUTINE_AUTO). Do đó AI Agent có thẩm quyền tự động phê duyệt ngay lập tức mà không cần làm phiền cấp Quản lý.`;
    } else if (loan.status === "ESCALATED_MANAGER") {
      explanation = `Theo Quy chế An toàn Tài sản Điều 4 & 5: Thiết bị vượt hạn mức tự động (${loan.escalationReason || "Giá trị > 20M hoặc mượn > 7 ngày"}). Để đảm bảo trách nhiệm giải trình và an toàn tài sản công ty, AI bắt buộc phải chuyển tiếp hồ sơ để Quản lý trực tiếp ký duyệt.`;
    } else {
      explanation = `Phiếu mượn ${loan.requestCode} hiện đang ở trạng thái [${loan.status}]. Căn cứ theo quy chế kho nội bộ.`;
    }

    return {
      success: true,
      requestCode: loan.requestCode,
      status: loan.status,
      explanation,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function rollbackLoan({ loanId, reason = "Can thiệp dừng khẩn cấp từ AI Agent" }) {
  try {
    const loan = await LoanRequest.findById(loanId);
    if (!loan) return { success: false, message: "Không tìm thấy phiếu mượn." };

    if (loan.status === "DISPATCHED") {
      return { success: false, message: "Thiết bị đã xuất kho ngoài thực tế, không thể hoàn tác!" };
    }

    const items = await LoanItem.find({ loanRequest: loan._id });
    for (const it of items) {
      if (it.equipment) {
        await Equipment.findByIdAndUpdate(it.equipment, { status: "AVAILABLE" });
      }
      it.itemStatus = "CANCELLED";
      await it.save();
    }

    loan.status = "CANCELLED";
    loan.pickupCode = "";
    loan.notes = `[HOÀN TÁC ROLLBACK] ${reason}`;
    await loan.save();

    await AuditLogService.record({
      eventType: "MANAGER_OVERRIDE",
      actor: "AI_AGENT",
      actorId: "HUMAN_OVERRIDE",
      decision: "CANCELLED",
      policyRuleId: "HUMAN_ROLLBACK_1_CLICK",
      reason: `Hoàn tác thành công phiếu ${loan.requestCode}: ${reason}. Máy đã được trả lại trạng thái AVAILABLE.`,
    });

    return {
      success: true,
      message: `Đã hoàn tác phiếu mượn ${loan.requestCode}. Thu hồi mã nhận đồ và giải phóng tồn kho thành công!`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
