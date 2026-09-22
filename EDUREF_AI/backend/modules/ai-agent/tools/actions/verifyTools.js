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
    judgeNotes:
      testCase.expectedDecision === 'AUTO_APPROVED'
        ? 'Ca thường quy phải hoàn tất tự động, không chuyển người xử lý.'
        : 'Ca không chắc chắn phải dừng tự động hóa, phân loại đúng và cung cấp câu hỏi có thể trả lời trực tiếp.',
  };
}

async function executeSuite({ mode, cases }) {
  const startedAt = new Date();
  const results = [];

  agentTerminalLogger.log({
    step: 'START',
    type: 'START',
    text: `[Verify:${mode}] Bắt đầu ${cases.length} ca với policy ${STUDENT_CONFIRMATION_POLICY_VERSION}.`,
  });

  for (const testCase of cases) {
    const caseStartedAt = new Date();
    const caseStartMs = Date.now();
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
  const autoCount = results.filter((result) => result.actualDecision === 'AUTO_APPROVED').length;
  const escalationCount = results.filter((result) => result.actualDecision?.startsWith('ESCALATE_')).length;
  const distributionPassed = mode !== 'TRACK_A_ESCALATION' || (autoCount === 3 && escalationCount === 2);
  const allPassed = passedCases === cases.length && distributionPassed;

  agentTerminalLogger.log({
    step: 'COMPLETE',
    type: 'COMPLETE',
    text: `[Verify:${mode}] ${passedCases}/${cases.length} PASS; AUTO=${autoCount}; ESCALATE=${escalationCount}.`,
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
    autoCount,
    escalationCount,
    distributionPassed,
    allPassed,
    summary: `${passedCases}/${cases.length} PASS | AUTO=${autoCount} | ESCALATE=${escalationCount}`,
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
    const result = await verifyTools.run_custom_verify({
      studentCode: resolvedStudentCode,
      requestTypeCode: 'STUDENT_CONFIRMATION',
      inputData,
    });

    return {
      ...result,
      prompt,
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  },
};

export default verifyTools;
