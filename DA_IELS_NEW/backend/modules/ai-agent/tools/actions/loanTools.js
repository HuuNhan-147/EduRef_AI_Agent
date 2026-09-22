// backend/modules/ai-agent/tools/actions/loanTools.js
import LoanRequest from "../../../../models/LoanRequest.js";
import LoanItem from "../../../../models/LoanItem.js";
import EquipmentModel from "../../../../models/EquipmentModel.js";
import Equipment from "../../../../models/Equipment.js";
import User from "../../../../models/User.js";
import AuditLogService from "../../../../services/AuditLogService.js";

const generatePickupCode = () => `EQ-${Math.floor(1000 + Math.random() * 9000)}`;

/**
 * resolveModelId — Tự động tìm EquipmentModel từ:
 *   - modelId (trực tiếp, ưu tiên cao nhất)
 *   - equipmentId (có thể là Equipment._id hoặc EquipmentModel._id)
 *   - equipmentName (tìm theo tên fuzzy)
 * Trả về { model, error }
 */
async function resolveModelId({ modelId, equipmentId, equipmentName } = {}) {
  // 1. Ưu tiên modelId trực tiếp
  if (modelId) {
    try {
      const m = await EquipmentModel.findById(modelId);
      if (m) return { model: m, error: null };
    } catch (_) {}
  }

  // 2. equipmentId: thử tìm Equipment trước → lấy model, nếu không thì thử trực tiếp EquipmentModel
  if (equipmentId) {
    try {
      const eq = await Equipment.findById(equipmentId).populate("model");
      if (eq?.model) return { model: eq.model, error: null };
    } catch (_) {}
    try {
      const m = await EquipmentModel.findById(equipmentId);
      if (m) return { model: m, error: null };
    } catch (_) {}
  }

  // 3. equipmentName: fuzzy search bằng regex
  if (equipmentName && typeof equipmentName === "string" && equipmentName.trim()) {
    const kw = equipmentName.trim();
    // Bỏ dấu để tìm linh hoạt hơn
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    const found = await EquipmentModel.findOne({
      $or: [{ name: regex }, { brand: regex }, { modelCode: regex }, { description: regex }],
    });
    if (found) return { model: found, error: null };

    // Thử tìm không dấu
    const noAccent = kw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const noAccentRegex = new RegExp(noAccent, "i");
    const found2 = await EquipmentModel.findOne({
      $or: [{ name: noAccentRegex }, { brand: noAccentRegex }, { description: noAccentRegex }],
    });
    if (found2) return { model: found2, error: null };
  }

  return {
    model: null,
    error: `Không tìm thấy thiết bị trong kho. Vui lòng kiểm tra lại tên hoặc mã thiết bị (modelId=${modelId}, equipmentId=${equipmentId}, name=${equipmentName}).`,
  };
}



export async function createAutoLoan({
  modelId,
  equipmentId,
  equipmentName,
  quantity = 1,
  durationDays = null,
  locationOfUse = "Phòng họp / Lab công ty",
  purpose = null,
  userId = null,
}) {
  try {
    // 1. Thắt chặt ràng buộc: Bắt buộc phải có số ngày mượn cụ thể
    if (!durationDays || isNaN(Number(durationDays)) || Number(durationDays) <= 0) {
      return {
        success: false,
        requiresClarification: true,
        message: "Yêu cầu mượn thiết bị chưa nêu rõ thời hạn mượn (số ngày). Bạn vui lòng cho biết bạn cần mượn trong bao nhiêu ngày để hệ thống hoàn tất tạo phiếu mượn nhé!",
      };
    }

    // 2. Thắt chặt ràng buộc: Bắt buộc phải có mục đích sử dụng cụ thể
    const genericPurposes = ["mượn", "muon", "sử dụng", "su dung", "dùng", "dung", "công vụ", "cong vu", "máy chiếu", "may chieu", "thiết bị", "thiet bi"];
    if (!purpose || typeof purpose !== "string" || purpose.trim().length < 3 || genericPurposes.includes(purpose.trim().toLowerCase())) {
      return {
        success: false,
        requiresClarification: true,
        message: "Yêu cầu mượn thiết bị chưa nêu rõ mục đích sử dụng cụ thể. Bạn vui lòng cho biết bạn mượn để làm gì (ví dụ: họp, giảng dạy, làm việc, sự kiện...) để hệ thống hoàn tất tạo phiếu mượn nhé!",
      };
    }

    console.log("[createAutoLoan] Resolve model từ:", { modelId, equipmentId, equipmentName });

    // Resolve EquipmentModel từ bất kỳ tham số nào LLM gửi
    const { model, error: resolveErr } = await resolveModelId({ modelId, equipmentId, equipmentName });
    if (!model) {
      console.warn("[createAutoLoan] Không resolve được model:", resolveErr);
      return { success: false, message: resolveErr || "Không tìm thấy thiết bị trong kho." };
    }
    console.log("[createAutoLoan] ✅ Resolved model:", model.name, "| ID:", model._id);

    let borrower = null;
    if (userId) borrower = await User.findById(userId);
    if (!borrower) borrower = await User.findOne({ role: "EMPLOYEE" });
    if (!borrower) borrower = await User.findOne(); // fallback bất kỳ user nào
    if (!borrower) return { success: false, message: "Không tìm thấy người dùng trong hệ thống." };

    const reqQty = Math.max(1, Number(quantity) || 1);
    const loanDays = Math.max(1, Number(durationDays) || 2);

    // Kiểm tra quy chế thường quy
    if (model.estimatedValue > 20000000 || loanDays > 7) {
      console.log(`[createAutoLoan] Vượt ngưỡng → chuyển sang escalate: value=${model.estimatedValue}, days=${loanDays}`);
      return {
        success: false,
        requiresEscalation: true,
        message: `Yêu cầu này vượt ngưỡng tự động (Giá trị ${model.estimatedValue.toLocaleString("vi-VN")}đ > 20M hoặc thời gian ${loanDays} ngày > 7 ngày). Phải chuyển tiếp Quản lý duyệt.`,
      };
    }

    // Tìm máy khả dụng
    const availableItems = await Equipment.find({ model: model._id, status: "AVAILABLE" }).limit(reqQty);
    if (availableItems.length < reqQty) {
      return { success: false, message: `Kho "${model.name}" chỉ còn ${availableItems.length} máy khả dụng, không đủ số lượng yêu cầu (${reqQty})!` };
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

    // Tính toán số lượng tồn kho khả dụng còn lại sau khi vừa trừ
    const remainingStock = await Equipment.countDocuments({ model: model._id, status: "AVAILABLE" });

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
      modelId: model._id.toString(),
      remainingStock,
      message: `✅ AI Agent đã TỰ ĐỘNG PHÊ DUYỆT 100%! Mã nhận đồ của bạn là [${pickupCode}]. Vui lòng đến ${loan.pickupLockerSlot} để nhận máy.`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function escalateToManager({
  modelId,
  equipmentId,
  equipmentName,
  quantity = 1,
  durationDays = 10,
  locationOfUse = "Phòng sự kiện / Công tác",
  purpose = "Nhiệm vụ cấp cao",
  reason = "Giá trị tài sản lớn hoặc thời gian mượn dài ngày",
  userId = null,
}) {
  try {
    console.log("[escalateToManager] Resolve model từ:", { modelId, equipmentId, equipmentName });

    const { model, error: resolveErr } = await resolveModelId({ modelId, equipmentId, equipmentName });
    if (!model) {
      console.warn("[escalateToManager] Không resolve được model:", resolveErr);
      return { success: false, message: resolveErr || "Không tìm thấy thiết bị trong kho." };
    }
    console.log("[escalateToManager] ✅ Resolved model:", model.name, "| ID:", model._id);

    let borrower = null;
    if (userId) borrower = await User.findById(userId);
    if (!borrower) borrower = await User.findOne({ role: "EMPLOYEE" });
    if (!borrower) borrower = await User.findOne();
    if (!borrower) return { success: false, message: "Không tìm thấy người dùng trong hệ thống." };

    const reqQty = Math.max(1, Number(quantity) || 1);
    const loanDays = Math.max(1, Number(durationDays) || 10);

    const availableItems = await Equipment.find({ model: model._id, status: "AVAILABLE" }).limit(reqQty);
    if (availableItems.length < reqQty) {
      return { success: false, message: `Kho "${model.name}" chỉ còn ${availableItems.length} máy khả dụng!` };
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
    const loan = await LoanRequest.findOne({
      $or: [
        { _id: typeof loanId === 'string' && loanId.match(/^[a-f\d]{24}$/i) ? loanId : null },
        { requestCode: loanId }
      ]
    });
    if (!loan) return { success: false, message: `Không tìm thấy phiếu mượn với mã "${loanId}".` };

    if (loan.status === "DISPATCHED" || loan.status === "RETURNED") {
      return { success: false, message: "Thiết bị đã xuất kho ngoài thực tế, không thể hoàn tác! Vui lòng làm thủ tục thu hồi." };
    }
    if (loan.status === "CANCELLED") {
      return { success: false, message: "Phiếu mượn này đã bị hủy trước đó." };
    }

    const prevStatus = loan.status;
    const items = await LoanItem.find({ loanRequest: loan._id });
    let restoredCount = 0;
    for (const it of items) {
      if (it.equipment) {
        await Equipment.findByIdAndUpdate(it.equipment, { status: "AVAILABLE" });
        restoredCount++;
      }
      it.itemStatus = "CANCELLED";
      await it.save();

      if (it.equipmentModel) {
        const qty = it.requestedQuantity || 1;
        await EquipmentModel.findByIdAndUpdate(it.equipmentModel, {
          $inc: { countInStock: qty }
        });
      }
    }

    loan.status = "CANCELLED";
    loan.pickupCode = "";
    loan.notes = `[HOÀN TÁC ROLLBACK] ${reason}. (Trạng thái trước: ${prevStatus})`;
    await loan.save();

    await AuditLogService.record({
      eventType: "LOAN_ROLLED_BACK",
      actor: "AI_AGENT",
      actorId: "HUMAN_OVERRIDE",
      decision: "ROLLED_BACK",
      policyRuleId: "HUMAN_ROLLBACK_1_CLICK",
      factsSnapshot: {
        loanDays: loan.loanDays,
        prevStatus
      },
      reason: `Hoàn tác thành công phiếu ${loan.requestCode}: ${reason}. Khôi phục ${restoredCount} thiết bị về AVAILABLE.`,
    });

    return {
      success: true,
      requestCode: loan.requestCode,
      message: `Đã hoàn tác phiếu mượn ${loan.requestCode}. Thu hồi mã nhận đồ và giải phóng ${restoredCount} thiết bị về kho thành công!`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
