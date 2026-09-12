// tests/ai_agent_module.test.js
// ============================================
// TEST AUTOMATION: THE ESCALATION REFEREE AI MODULE
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { IntentRouter } from '../modules/ai-agent/core/IntentRouter.js';
import { PromptEngine } from '../modules/ai-agent/core/PromptEngine.js';
import { normalizeSlang } from '../modules/ai-agent/memory/ContextResolver.js';
import { ToolRegistry } from '../modules/ai-agent/tools/ToolRegistry.js';
import { runVerify90s } from '../modules/ai-agent/tools/actions/verifyTools.js';

dotenv.config();

async function runTests() {
  console.log("==========================================================");
  console.log("🧪 BẮT ĐẦU TEST TOÀN BỘ SƯỜN THE ESCALATION REFEREE AI");
  console.log("==========================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // TEST 1: Normalize Slang tiếng Việt
  console.log("\n1. Kiểm tra ContextResolver (Normalize Slang):");
  const slang1 = normalizeSlang("cho e mượn con lap 3 ngày vs");
  assert(slang1.includes("em") && slang1.includes("laptop") && slang1.includes("với"), "Chuẩn hóa từ lóng 'e', 'lap', 'vs'");

  // TEST 2: Intent Router
  console.log("\n2. Kiểm tra IntentRouter:");
  const intent1 = IntentRouter.detectIntent("Tôi muốn tìm chuột máy tính");
  assert(intent1.toolSet.includes("search_equipment"), "Nhận diện intent tìm kiếm thiết bị");

  const intent2 = IntentRouter.detectIntent("Mượn máy quay Sony A7IV 10 ngày");
  assert(intent2.toolSet.includes("escalate_to_manager") || intent2.toolSet.includes("create_auto_loan"), "Nhận diện intent mượn / chuyển tiếp");

  // TEST 3: Prompt Engine
  console.log("\n3. Kiểm tra PromptEngine:");
  const prompt = PromptEngine.buildSystemInstruction(["LOAN", "POLICY_RULES"]);
  assert(prompt.includes("The Escalation Referee") && prompt.includes("20.000.000"), "System Prompt chứa quy chế The Escalation Referee và mốc 20M");

  // TEST 4: Tool Registry Declarations
  console.log("\n4. Kiểm tra ToolRegistry Declarations:");
  const declarations = ToolRegistry.getDeclarations();
  const toolNames = declarations.map(d => d.name);
  assert(toolNames.includes("search_equipment"), "Có tool search_equipment");
  assert(toolNames.includes("create_auto_loan"), "Có tool create_auto_loan");
  assert(toolNames.includes("escalate_to_manager"), "Có tool escalate_to_manager");
  assert(toolNames.includes("rollback_loan"), "Có tool rollback_loan");
  assert(toolNames.includes("run_verify_90s"), "Có tool run_verify_90s");

  // TEST 5: Kết nối DB và chạy Verify Harness 90s (5 Scenarios)
  console.log("\n5. Kiểm tra Verify Harness 90s (Kết nối MongoDB):");
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("  📦 MongoDB Connected for Testing");

    const verifyResult = await runVerify90s();
    assert(verifyResult.totalScenarios === 5, "Tổng số kịch bản kiểm thử là 5");
    assert(verifyResult.passedScenarios === 5, "Cả 5 kịch bản đều PASSED (12/12 điểm Barem)");

    console.log("\n  📋 Kết quả 5 Scenarios:");
    verifyResult.scenarios.forEach(sc => {
      console.log(`    - [${sc.passed ? "PASS" : "FAIL"}] ${sc.name}: ${sc.description}`);
    });

  } catch (err) {
    console.error("  ❌ Lỗi khi test Verify 90s:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("  📦 MongoDB Disconnected");
  }

  console.log("\n==========================================================");
  console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passed}/${total} TESTS PASSED`);
  console.log("==========================================================");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
