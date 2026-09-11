import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Equipment from "../models/EquipmentModel.js";
import LoanRequest from "../models/LoanRequestModel.js";
import AuditLog from "../models/AuditLogModel.js";
import User from "../models/UserModel.js";
import * as equipmentService from "../services/EquipmentService.js";
import * as loanService from "../services/LoanService.js";
import * as auditLogService from "../services/AuditLogService.js";
import { seedEquipments } from "../scripts/seedEquipmentData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/equipment_agent";

async function runPhase1Tests() {
  console.log("=============================================================");
  console.log("🧪 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG PHASE 1: DOMAIN & DATABASE FOUNDATION");
  console.log("=============================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, testName, detail = "") {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} -> ${detail}`);
      process.exitCode = 1;
    }
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("📦 Kết nối MongoDB thành công.\n");

    // 1. Nạp seed data nếu chưa có
    const countEquip = await Equipment.countDocuments();
    if (countEquip < 10) {
      console.log("🌱 Kho chưa đủ thiết bị, tiến hành seed data...");
      await seedEquipments();
      await mongoose.connect(MONGO_URI);
    }

    // -------------------------------------------------------------
    // TEST 1: Kiểm tra ranh giới thẩm quyền 20M (Boundary Tests)
    // -------------------------------------------------------------
    console.log("--- TEST 1: KIỂM TRA RANH GIỚI THẨM QUYỀN 20M (BOUNDARY ANALYSIS) ---");
    const mouse = await Equipment.findOne({ assetCode: "TB-MOU-001" });
    const bound20M = await Equipment.findOne({ assetCode: "TB-PROJ-020M" });
    const bound20M1 = await Equipment.findOne({ assetCode: "TB-LAP-020M1" });
    const sonyA7 = await Equipment.findOne({ assetCode: "TB-CAM-001" });

    assert(mouse && mouse.value === 300000 && !mouse.isHighValue, "Thiết bị 300k không phải là tài sản giá trị cao (isHighValue = false)");
    assert(bound20M && bound20M.value === 20000000 && bound20M.isHighValue === false, "Thiết bị đúng 20.000.000đ KHÔNG vượt quyền (isHighValue = false, threshold là > 20M)");
    assert(bound20M1 && bound20M1.value === 20000001 && bound20M1.isHighValue === true, "Thiết bị 20.000.001đ BẮT BUỘC vượt quyền (isHighValue = true, > 20M)");
    assert(sonyA7 && sonyA7.value === 50000000 && sonyA7.isHighValue === true, "Thiết bị 50.000.000đ vượt quyền (isHighValue = true)");

    // -------------------------------------------------------------
    // TEST 2: Tra cứu và kiểm tra tồn kho (EquipmentService)
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: KIỂM TRA TỒN KHO & TÌM KIẾM (EQUIPMENT SERVICE) ---");
    const searchRes = await equipmentService.searchEquipment("HDMI");
    assert(searchRes.length > 0 && searchRes[0].name.includes("HDMI"), "Tìm kiếm từ khóa 'HDMI' trả về thiết bị chính xác");

    const availOk = await equipmentService.checkAvailability(mouse._id, 2);
    assert(availOk.available === true && availOk.countInStock >= 2, "Kiểm tra chuột Logitech còn đủ tồn kho khả dụng");

    const outItem = await Equipment.findOne({ assetCode: "TB-FLY-OUT" });
    if (outItem) {
      const availOut = await equipmentService.checkAvailability(outItem._id, 1);
      assert(availOut.available === false && availOut.countInStock === 0, "Kiểm tra thiết bị hết hàng (Stock = 0) báo không khả dụng chính xác");
    }

    // -------------------------------------------------------------
    // TEST 3: Tạo LoanRequest và kiểm tra trạng thái
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: TẠO PHIẾU MƯỢN (LOAN REQUEST FLOW) ---");
    const testLoan = await loanService.createLoanRequest({
      equipmentId: mouse._id,
      requesterName: "Kỹ sư Kiểm Thử",
      department: "Phòng R&D",
      purpose: "Kiểm thử hệ thống tự động Phase 1",
      durationDays: 2,
      quantity: 1,
      status: "AUTO_APPROVED",
    });

    assert(testLoan && testLoan.requestCode.startsWith("LR"), "Mã phiếu mượn sinh tự động chuẩn định dạng (LR...)");
    assert(testLoan.status === "AUTO_APPROVED", "Phiếu thường quy được lưu với trạng thái AUTO_APPROVED");
    assert(testLoan.durationDays === 2, "Thời gian mượn lưu chính xác (2 ngày)");
    assert(testLoan.expectedReturnDate > testLoan.startDate, "Ngày hẹn trả được tính toán tự động sau ngày mượn");

    // -------------------------------------------------------------
    // TEST 4: Dispatch (Trừ kho an toàn qua Transaction)
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: XUẤT KHO TRỪ TỒN KHO AN TOÀN (TRANSACTION DISPATCH) ---");
    const stockBeforeDispatch = (await Equipment.findById(mouse._id)).countInStock;
    const dispatchedLoan = await loanService.dispatchEquipment(testLoan._id, {
      id: "tester",
      name: "Thủ kho Test",
      role: "STOREKEEPER",
    });

    const stockAfterDispatch = (await Equipment.findById(mouse._id)).countInStock;
    assert(dispatchedLoan.status === "DISPATCHED", "Phiếu chuyển trạng thái DISPATCHED thành công");
    assert(dispatchedLoan.stockDeducted === true, "Cờ stockDeducted được bật thành true");
    assert(dispatchedLoan.pickupCode && dispatchedLoan.pickupCode.startsWith("PIN-"), "Sinh mã PIN nhận đồ tại tủ thành công");
    assert(stockAfterDispatch === stockBeforeDispatch - 1, `Tồn kho trừ chính xác 1 món (${stockBeforeDispatch} -> ${stockAfterDispatch})`);

    // -------------------------------------------------------------
    // TEST 5: Rollback hoàn tác và khôi phục tồn kho (Compensating Rollback)
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: HOÀN TÁC THỰC TẾ & KHÔI PHỤC KHO (ROLLBACK ENGINE) ---");
    const rollbackResult = await loanService.rollbackLoanAction(
      testLoan._id,
      { id: "judge", name: "Giám khảo Chấm thi", role: "MANAGER" },
      "Kiểm tra chức năng hoàn tác trong bài thi"
    );

    const stockAfterRollback = (await Equipment.findById(mouse._id)).countInStock;
    assert(rollbackResult.success === true, "Hàm rollback trả về success = true");
    assert(rollbackResult.loan.status === "CANCELLED", "Trạng thái phiếu chuyển thành CANCELLED sau hoàn tác");
    assert(stockAfterRollback === stockBeforeDispatch, `Tồn kho được khôi phục nguyên vẹn về mốc ban đầu (${stockAfterRollback} === ${stockBeforeDispatch})`);

    // -------------------------------------------------------------
    // TEST 6: Audit Trail bất biến (Fact-based không CoT)
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: NHẬT KÝ KIỂM TOÁN FACT-BASED (AUDIT TRAIL) ---");
    const recentLogs = await auditLogService.getAuditLogs({ targetId: testLoan._id.toString() });
    assert(recentLogs.length >= 3, `Đầy đủ vết kiểm toán qua các bước (${recentLogs.length} logs: CREATE -> DISPATCH -> ROLLBACK)`);

    const rollbackLog = recentLogs.find((l) => l.action === "ROLLBACK");
    assert(rollbackLog && rollbackLog.decision === "ROLLED_BACK", "Ghi nhận bản ghi kiểm toán cho thao tác ROLLBACK");
    assert(rollbackLog && rollbackLog.reason.includes("Hoàn tác"), "Lý do kiểm toán được ghi rõ ràng cho con người tra cứu");

    // Kiểm tra không để lộ CoT nhạy cảm
    const anyCotLeaked = recentLogs.some((l) => {
      const txt = JSON.stringify(l);
      return txt.includes("thought:") || txt.includes("chain_of_thought") || txt.includes("tôi nghĩ rằng");
    });
    assert(!anyCotLeaked, "Tuyệt đối không lưu trữ hoặc để lộ Chain-of-Thought trong Audit Trail");

    console.log("\n=============================================================");
    console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passed}/${total} assertions PASSED`);
    console.log("=============================================================\n");

    // Dọn dẹp test loan
    await LoanRequest.deleteOne({ _id: testLoan._id });
    await AuditLog.deleteMany({ targetId: testLoan._id.toString() });

    await mongoose.disconnect();
    return { passed, total, success: passed === total };
  } catch (error) {
    console.error("❌ Lỗi trong quá trình chạy kiểm thử Phase 1:", error);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exitCode = 1;
    return { passed, total, success: false, error };
  }
}

runPhase1Tests()
  .then((res) => {
    if (!res.success) process.exit(1);
    process.exit(0);
  })
  .catch(() => process.exit(1));
