import mongoose from "mongoose";
import LoanRequest from "../models/LoanRequestModel.js";
import Equipment from "../models/EquipmentModel.js";
import User from "../models/UserModel.js";
import { recordAudit } from "./AuditLogService.js";

/**
 * Tạo một Phiếu Mượn Thiết Bị mới (Loan Request)
 */
export const createLoanRequest = async (data) => {
  const {
    equipmentId,
    requesterId = null,
    requesterName = "Nhân viên / Sinh viên",
    department = "Khoa CNTT",
    purpose,
    durationDays = 1,
    quantity = 1,
    status = "ESCALATED_PENDING",
    escalationDetails = {},
  } = data;

  const equipment = await Equipment.findById(equipmentId);
  if (!equipment) {
    throw new Error("Thiết bị yêu cầu không tồn tại trong hệ thống kho!");
  }

  const start = new Date();
  const returnDate = new Date(start);
  returnDate.setDate(returnDate.getDate() + Number(durationDays));

  const loan = new LoanRequest({
    requester: requesterId,
    requesterName,
    department,
    equipment: equipment._id,
    equipmentName: equipment.name,
    equipmentValue: equipment.value,
    quantity: Number(quantity),
    purpose: purpose?.trim() || "Phục vụ công việc / học tập",
    durationDays: Number(durationDays),
    startDate: start,
    expectedReturnDate: returnDate,
    status,
    escalationDetails: {
      category: escalationDetails.category || "NONE",
      reason: escalationDetails.reason || "",
      escalationQuestion: escalationDetails.escalationQuestion || "",
      decidedBy: escalationDetails.decidedBy || null,
      decidedByName: escalationDetails.decidedByName || null,
      decidedAt: escalationDetails.decidedAt || null,
    },
    stockDeducted: false,
  });

  const saved = await loan.save();

  // Ghi nhật ký kiểm toán cho thao tác tạo phiếu / tự duyệt / chuyển tiếp
  await recordAudit({
    action: status === "AUTO_APPROVED" ? "AUTO_APPROVE" : "EVALUATE_REQUEST",
    actor: { id: "system", name: "EquipReferee AI Agent", role: "AI_AGENT" },
    targetId: saved._id,
    targetType: "LoanRequest",
    inputPayload: {
      equipment: equipment.name,
      value: equipment.value,
      durationDays,
      purpose,
    },
    matchedRules:
      status === "AUTO_APPROVED"
        ? ["RULE_ROUTINE_AUTO_APPROVED (Value <= 20M, Duration <= 7d)"]
        : [escalationDetails.category || "RULE_ESCALATED"],
    decision: status,
    reason:
      status === "AUTO_APPROVED"
        ? `Thiết bị ${equipment.name} có giá trị ${equipment.value.toLocaleString("vi-VN")}đ (<= 20M) và thời hạn mượn ${durationDays} ngày (<= 7d), đủ điều kiện tự động cấp phát 100%.`
        : escalationDetails.reason || "Cần ý kiến người có thẩm quyền.",
    beforeState: { countInStock: equipment.countInStock, loanStatus: "NEW" },
    afterState: { countInStock: equipment.countInStock, loanStatus: saved.status },
    isRollbackable: status === "AUTO_APPROVED",
  });

  return await LoanRequest.findById(saved._id).populate("equipment").populate("requester", "name email");
};

/**
 * Xuất kho thiết bị (Dispatch & Deduct Stock) sử dụng MongoDB Transaction
 */
export const dispatchEquipment = async (requestId, actorInfo = { id: "system", name: "Thủ kho", role: "STOREKEEPER" }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const loan = await LoanRequest.findById(requestId).session(session);
    if (!loan) throw new Error("Phiếu mượn không tồn tại!");

    if (loan.status === "DISPATCHED" && loan.stockDeducted) {
      // Idempotency: Không trừ kho 2 lần
      await session.commitTransaction();
      session.endSession();
      return loan;
    }

    const equipment = await Equipment.findById(loan.equipment).session(session);
    if (!equipment) throw new Error("Thiết bị không tồn tại trong kho!");

    if (equipment.countInStock < loan.quantity) {
      throw new Error(`Kho không đủ số lượng thiết bị (Hiện còn ${equipment.countInStock}, yêu cầu ${loan.quantity})`);
    }

    const beforeStock = equipment.countInStock;
    equipment.countInStock -= loan.quantity;
    await equipment.save({ session });

    const pickupCode = `PIN-${Math.floor(1000 + Math.random() * 9000)}`;
    loan.status = "DISPATCHED";
    loan.stockDeducted = true;
    loan.pickupCode = pickupCode;
    const updatedLoan = await loan.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Ghi nhận Audit Log
    await recordAudit({
      action: "DISPATCH",
      actor: actorInfo,
      targetId: loan._id,
      targetType: "LoanRequest",
      decision: "DISPATCHED",
      reason: `Đã xuất kho ${loan.quantity}x ${equipment.name}. Cấp mã nhận tủ: ${pickupCode}`,
      beforeState: { countInStock: beforeStock, status: loan.status },
      afterState: { countInStock: equipment.countInStock, status: "DISPATCHED", pickupCode },
      isRollbackable: true,
    });

    return updatedLoan;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Hoàn trả thiết bị về kho (Return Equipment)
 */
export const returnEquipment = async (requestId, actorInfo = { id: "system", name: "Thủ kho", role: "STOREKEEPER" }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const loan = await LoanRequest.findById(requestId).session(session);
    if (!loan) throw new Error("Phiếu mượn không tồn tại!");

    if (loan.status === "RETURNED") {
      await session.commitTransaction();
      session.endSession();
      return loan;
    }

    const equipment = await Equipment.findById(loan.equipment).session(session);
    if (!equipment) throw new Error("Thiết bị không tồn tại!");

    const beforeStock = equipment.countInStock;

    if (loan.stockDeducted) {
      equipment.countInStock += loan.quantity;
      await equipment.save({ session });
    }

    loan.status = "RETURNED";
    loan.actualReturnDate = new Date();
    const updatedLoan = await loan.save({ session });

    await session.commitTransaction();
    session.endSession();

    await recordAudit({
      action: "RETURN",
      actor: actorInfo,
      targetId: loan._id,
      targetType: "LoanRequest",
      decision: "RETURNED",
      reason: `Đã nhận lại thiết bị ${equipment.name} vào kho nguyên vẹn.`,
      beforeState: { countInStock: beforeStock, status: "DISPATCHED" },
      afterState: { countInStock: equipment.countInStock, status: "RETURNED" },
      isRollbackable: false,
    });

    return updatedLoan;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Hoàn tác hành động thực tế (Real Compensating Rollback Engine)
 * Khôi phục số lượng tồn kho chính xác và chuyển trạng thái phiếu
 */
export const rollbackLoanAction = async (
  requestId,
  actorInfo = { id: "manager", name: "Quản lý / Giám khảo", role: "MANAGER" },
  reason = "Hoàn tác theo yêu cầu can thiệp của Quản trị viên"
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const loan = await LoanRequest.findById(requestId).session(session);
    if (!loan) throw new Error("Phiếu mượn cần hoàn tác không tồn tại!");

    if (loan.status === "CANCELLED") {
      await session.commitTransaction();
      session.endSession();
      return { success: true, message: "Phiếu đã ở trạng thái hủy trước đó.", loan };
    }

    const equipment = await Equipment.findById(loan.equipment).session(session);
    const beforeStock = equipment ? equipment.countInStock : 0;
    let restoredStock = beforeStock;

    // Nếu hành động trước đó đã trừ tồn kho -> Phục hồi cộng lại
    if (loan.stockDeducted && equipment) {
      equipment.countInStock += loan.quantity;
      await equipment.save({ session });
      loan.stockDeducted = false;
      restoredStock = equipment.countInStock;
    }

    const previousStatus = loan.status;
    loan.status = "CANCELLED";
    const updatedLoan = await loan.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Ghi vết Rollback vào Audit Trail
    await recordAudit({
      action: "ROLLBACK",
      actor: actorInfo,
      targetId: loan._id,
      targetType: "LoanRequest",
      decision: "ROLLED_BACK",
      reason: `Hoàn tác quyết định cho phiếu ${loan.requestCode}: ${reason}. Đã khôi phục tồn kho từ ${beforeStock} -> ${restoredStock}.`,
      beforeState: { countInStock: beforeStock, status: previousStatus },
      afterState: { countInStock: restoredStock, status: "CANCELLED" },
      isRollbackable: false,
    });

    return {
      success: true,
      message: `Đã hoàn tác thành công phiếu ${loan.requestCode}. Tồn kho ${equipment?.name || "thiết bị"} đã được khôi phục về ${restoredStock}.`,
      restoredStock,
      loan: updatedLoan,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Lấy chi tiết phiếu mượn theo ID hoặc RequestCode
 */
export const getLoanRequestById = async (idOrCode) => {
  const populateObj = [
    { path: "equipment" },
    { path: "requester", select: "name email phone" },
    { path: "escalationDetails.decidedBy", select: "name role" },
  ];

  if (/^[0-9a-fA-F]{24}$/.test(idOrCode)) {
    return await LoanRequest.findById(idOrCode).populate(populateObj);
  }
  return await LoanRequest.findOne({ requestCode: idOrCode }).populate(populateObj);
};

/**
 * Lấy danh sách toàn bộ phiếu mượn
 */
export const getAllLoans = async (filter = {}) => {
  return await LoanRequest.find(filter)
    .populate("equipment")
    .populate("requester", "name email")
    .sort({ createdAt: -1 });
};

/**
 * Lấy danh sách phiếu mượn của một người dùng
 */
export const getUserLoans = async (userId) => {
  return await LoanRequest.find({ requester: userId })
    .populate("equipment")
    .sort({ createdAt: -1 });
};
