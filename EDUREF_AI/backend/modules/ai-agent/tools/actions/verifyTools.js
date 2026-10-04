import { petitionWorkflowCore } from '../../../petition-core/PetitionWorkflowCore.js';
import { agentTerminalLogger } from '../../core/AgentTerminalLogger.js';
import { GENERAL_VERIFY_CASES, TRACK_A_VERIFY_CASES } from '../../../../fixtures/trackAVerifyCases.js';
import {
  inferStudentConfirmationInput,
  STUDENT_CONFIRMATION_POLICY_VERSION,
} from '../../../../services/StudentConfirmationDecisionService.js';

function toPublicCase(testCase) {
  return {
    id: testCase.id,
    petitionType: 'STUDENT_CONFIRMATION',
    petitionName: 'Giấy Xác Nhận Sinh Viên',
    title: testCase.title,
    prompt: testCase.prompt,
    category: testCase.category,
    expectedDecision: testCase.expectedDecision,
    policyRef: `Policy ${STUDENT_CONFIRMATION_POLICY_VERSION}`,
    judgeNotes: testCase.expectedDecision === 'ASK_CLARIFICATION'
      ? 'Ca thiếu dữ kiện phải hỏi sinh viên bằng một câu hỏi cụ thể.'
      : 'AI phải phân loại, chuẩn bị ngữ cảnh và chuyển con người đưa ra quyết định cuối cùng.',
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function executeSuite({ mode, cases }) {
  const startedAt = new Date();
  const results = [];

  agentTerminalLogger.log({
    step: 'START',
    type: 'START',
    text: `[Verify:${mode}] 🚀 Bắt đầu phân loại và định tuyến ${cases.length} ca (Policy: ${STUDENT_CONFIRMATION_POLICY_VERSION}).`,
  });

  for (let i = 0; i < cases.length; i++) {
    const testCase = cases[i];
    const caseStartedAt = new Date();
    const caseStartMs = Date.now();

    agentTerminalLogger.log({
      step: `CA ${testCase.id}`,
      type: 'INFO',
      text: `▶ [${i + 1}/${cases.length}] ${testCase.id}: "${testCase.title}" (MSSV: ${testCase.studentCode})`,
    });

    await sleep(60);

    try {
      const response = await petitionWorkflowCore.processPetitionWorkflow({
        studentCode: testCase.studentCode,
        requestTypeCode: 'STUDENT_CONFIRMATION',
        inputData: testCase.inputData,
        forceNewRequest: true,
        actorType: 'AI_AGENT',
      });
      const durationMs = Date.now() - caseStartMs;
      const actionableQuestion =
        response.question || response.actionableQuestion || response.contextCapsule?.actionableQuestion || null;
      const decisionMatched = response.decision === testCase.expectedDecision;
      const questionRequired = testCase.expectedDecision.startsWith('ESCALATE_')
        || testCase.expectedDecision === 'ASK_CLARIFICATION';
      const passed = decisionMatched && (!questionRequired || Boolean(actionableQuestion));

      if (response.decision === 'ASK_CLARIFICATION') {
        agentTerminalLogger.log({
          step: 'CHỐT 1',
          type: 'TOOL_CALL',
          text: `  🟡 [${testCase.id}] Chốt 1 (Dữ kiện): Thiếu mục đích sử dụng (UNKNOWN_FACT). Dừng tự động hóa.`,
        });
        agentTerminalLogger.log({
          step: 'DECISION',
          type: 'DECISION',
          text: `  ⚡ [${testCase.id}] ASK_CLARIFICATION (${durationMs}ms) -> Đặt câu hỏi bổ sung: "${actionableQuestion}"`,
        });
      } else if (response.decision?.startsWith('ESCALATE_')) {
        const categoryLabels = {
          ROUTINE: 'ROUTINE (Đủ thông tin để cán bộ xem xét)',
          ROUTINE_POLICY_DENY: 'POLICY_FLAG (Có điều kiện cần cán bộ xác nhận)',
          BEYOND_AUTHORITY: 'BEYOND_AUTHORITY (Yêu cầu ngoại lệ)',
          OUTSIDE_POLICY: 'OUTSIDE_POLICY (Mục đích ngoài danh mục chính sách)',
        };
        const catName = categoryLabels[testCase.category] || testCase.category;
        agentTerminalLogger.log({
          step: 'CHỐT 3',
          type: 'TOOL_CALL',
          text: `  🔒 [${testCase.id}] Chốt 3 (Thẩm quyền): Phân loại [${catName}]. AI không đưa ra quyết định cuối cùng.`,
        });
        agentTerminalLogger.log({
          step: 'DECISION',
          type: 'DECISION',
          text: `  ⚡ [${testCase.id}] ESCALATE_TO_STAFF (${durationMs}ms) -> Đóng gói Context Capsule + Câu hỏi hành động cho Cán bộ: "${actionableQuestion}"`,
        });
      } else {
        agentTerminalLogger.log({
          step: 'DECISION',
          type: 'ERROR',
          text: `  ❌ [${testCase.id}] Kết quả không hợp lệ: ${response.decision || 'UNKNOWN'}. AI không được tự phê duyệt hoặc từ chối.`,
        });
      }

      await sleep(100);

      results.push({
        ...toPublicCase(testCase),
        actualDecision: response.decision,
        classification: response.classification || response.uncertaintyType || null,
        uncertaintyType: response.uncertaintyType || null,
        passed,
        durationMs,
        startedAt: caseStartedAt.toISOString(),
        completedAt: new Date().toISOString(),
        requestCode: response.requestCode || null,
        actionableQuestion,
        message: response.message || response.reason || '',
        sha256Proof: response.sha256Proof || null,
      });
    } catch (error) {
      agentTerminalLogger.log({
        step: 'ERROR',
        type: 'ERROR',
        text: `  ❌ [${testCase.id}] Lỗi xử lý: ${error.message}`,
      });
      results.push({
        ...toPublicCase(testCase),
        actualDecision: 'ERROR',
        passed: false,
        durationMs: Date.now() - caseStartMs,
        startedAt: caseStartedAt.toISOString(),
        completedAt: new Date().toISOString(),
        actionableQuestion: null,
        message: error.message,
        sha256Proof: null,
      });
    }
  }

  const completedAt = new Date();
  const passedCases = results.filter((result) => result.passed).length;
  const escalationCount = results.filter((result) => result.actualDecision?.startsWith('ESCALATE_')).length;
  const clarificationCount = results.filter((result) => result.actualDecision === 'ASK_CLARIFICATION').length;
  const distributionPassed = mode !== 'TRACK_A_ESCALATION' || escalationCount === cases.length;
  const allPassed = passedCases === cases.length && distributionPassed;

  agentTerminalLogger.log({
    step: 'COMPLETE',
    type: 'COMPLETE',
    text: `[Verify:${mode}] 🏁 Hoàn tất: ${passedCases}/${cases.length} PASS (HUMAN_REVIEW=${escalationCount}) trong ${completedAt.getTime() - startedAt.getTime()}ms.`,
  });

  return {
    success: true,
    mode,
    policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    totalDurationMs: completedAt.getTime() - startedAt.getTime(),
    totalCases: cases.length,
    passedCases,
    failedCases: cases.length - passedCases,
    escalationCount,
    clarificationCount,
    distributionPassed,
    allPassed,
    summary: `${passedCases}/${cases.length} PASS | HUMAN_REVIEW=${escalationCount}`,
    results,
  };
}

export const verifyTools = {
  async run_general_verify() {
    return executeSuite({ mode: 'GENERAL', cases: GENERAL_VERIFY_CASES });
  },

  async run_verify_90s() {
    return executeSuite({ mode: 'TRACK_A_ESCALATION', cases: TRACK_A_VERIFY_CASES });
  },

  async run_custom_verify({ studentCode = '2280602154', requestTypeCode = 'STUDENT_CONFIRMATION', inputData = {}, documents = [] }) {
    const startedAt = new Date();
    try {
      const data = await petitionWorkflowCore.processPetitionWorkflow({
        studentCode,
        requestTypeCode,
        inputData,
        documents,
        forceNewRequest: true,
        actorType: 'AI_AGENT',
      });
      return {
        success: true,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt.getTime(),
        data,
      };
    } catch (error) {
      return {
        success: false,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt.getTime(),
        error: error.message,
      };
    }
  },

  async run_custom_prompt({ prompt, studentCode = null }) {
    const codeFromPrompt = String(prompt || '').match(/\b\d{7,10}\b/)?.[0];
    const resolvedStudentCode = studentCode || codeFromPrompt || '2280602154';
    const inputData = inferStudentConfirmationInput(prompt);

    agentTerminalLogger.log({
      step: 'CUSTOM_CASE',
      type: 'START',
      text: `[Ca Giám Khảo] 🛡️ Nhận yêu cầu: "${prompt}" (MSSV: ${resolvedStudentCode})`,
    });

    const result = await verifyTools.run_custom_verify({
      studentCode: resolvedStudentCode,
      requestTypeCode: 'STUDENT_CONFIRMATION',
      inputData,
    });

    if (result.success && result.data) {
      const d = result.data;
      const q = d.question || d.actionableQuestion || d.contextCapsule?.actionableQuestion;
      const icon = d.decision?.startsWith('ESCALATE_') ? '⚡' : d.decision === 'ASK_CLARIFICATION' ? '🟡' : '🔴';
      agentTerminalLogger.log({
        step: 'DECISION',
        type: 'DECISION',
        text: `  ${icon} [Ca Giám Khảo] Kết luận: ${d.decision} (${result.durationMs}ms) | Phân loại: ${d.classification || d.uncertaintyType || 'ROUTINE'}${q ? ` | Câu hỏi: "${q}"` : ''}`,
      });
    }

    return {
      ...result,
      prompt,
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  },
};

export default verifyTools;
