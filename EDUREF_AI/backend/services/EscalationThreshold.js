import { ROUTINE_PURPOSE_RULES } from './StudentConfirmationDecisionService.js';

export const SCORER_VERSION = 'PURPOSE_EVIDENCE_V1';
export const BASELINE_THRESHOLD = Object.freeze({ id: 'BASELINE', version: 'THRESHOLD_BASELINE_V1',
  minEvidenceScore: 0, status: 'BASELINE', scorerVersion: SCORER_VERSION });

// An explainable lexical evidence score, NOT a probability or LLM confidence.
// A threshold may only add review after every mandatory policy guard passes.
export function scorePurposeEvidence(inputData = {}) {
  const purpose = String(inputData.purpose || inputData.reason || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const matches = ROUTINE_PURPOSE_RULES.flatMap((rule) => {
    const keywords = rule.keywords.filter((word) => purpose.includes(word));
    return keywords.length ? [{ rule: rule.code, keywords }] : [];
  });
  const broad = new Set(['bổ sung', 'bo sung ho so', 'giao thông', 'giao thong', 'tạm hoãn', 'tam hoan']);
  const specific = matches.some((match) => match.keywords.some((word) => !broad.has(word)));
  let score = specific ? 95 : matches.length ? 55 : 35;
  const signals = [specific ? 'SPECIFIC_PURPOSE_KEYWORD' : matches.length ? 'BROAD_PURPOSE_KEYWORD' : 'FORM_CONTEXT_ONLY'];
  if (matches.length > 1) { score -= 20; signals.push('MULTIPLE_PURPOSE_CATEGORIES'); }
  if (/(?:không|chưa|ko|not)\s+(?:phải\s+)?(?:để\s+)?(?:vay|xin visa|làm vé|học bổng|giảm thuế)/i.test(purpose)) {
    score -= 30; signals.push('NEGATED_PURPOSE');
  }
  return { score: Math.max(0, score), signals, matchedRules: matches.map((match) => match.rule), scorerVersion: SCORER_VERSION };
}

export function assessThreshold(baseResult, inputData, policy = BASELINE_THRESHOLD) {
  if (baseResult.decision !== 'AUTO_APPROVED') return { result: baseResult, assessment: null };
  const evidence = scorePurposeEvidence(inputData);
  const assessment = { ...evidence, policyId: policy.id, version: policy.version,
    minEvidenceScore: policy.minEvidenceScore, baseDecision: baseResult.decision,
    applied: evidence.score < policy.minEvidenceScore };
  if (!assessment.applied) return { result: baseResult, assessment };
  return { assessment, result: { ...baseResult, decision: 'ESCALATE_TO_STAFF',
    classification: 'OUTSIDE_POLICY', uncertaintyType: 'OUTSIDE_POLICY', rule: 'PURPOSE_EVIDENCE_THRESHOLD',
    reason: `Bằng chứng mục đích đạt ${evidence.score}/100, dưới ngưỡng ${policy.minEvidenceScore} của ${policy.version}. Đây là điểm heuristic, không phải xác suất.`,
    actionableQuestion: `Cán bộ có xác minh mục đích “${String(inputData.purpose || inputData.reason || '').slice(0, 500)}” thuộc phạm vi được cấp và chấp thuận hồ sơ này không?`,
  } };
}
