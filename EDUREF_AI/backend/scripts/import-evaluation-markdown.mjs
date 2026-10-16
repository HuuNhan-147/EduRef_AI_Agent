import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// A lossless candidate import, deliberately never fabricates snapshots or labelers.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const source = path.join(root, 'docs/datasets/TAP_KIEM_THU_100_INPUT_THUC_TE.md');
const output = path.join(root, 'docs/datasets/SPRINT2_100_CASES_CANDIDATE.json');
const bytes = fs.readFileSync(source); const markdown = bytes.toString('utf8');
const cases = markdown.split(/\r?\n/).filter((line) => /^\|\s*\*\*TC-\d+\*\*/.test(line)).map((line) => {
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
  const id = cells[0].match(/TC-\d+/)[0];
  const labels = [...cells[3].matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  const normalized = labels.length === 1 ? ({ AUTO_REJECT: 'REJECTED_POLICY' }[labels[0]] || labels[0]) : null;
  const decision = ['AUTO_APPROVED', 'REJECTED_POLICY', 'ASK_CLARIFICATION', 'ESCALATE_TO_STAFF'].includes(normalized) ? normalized : null;
  return { id, split: null, originalPrompt: cells[1], originalContext: cells[2], originalExpected: cells[3], originalNotes: cells.slice(4).join('|'),
    expectedDecision: decision, expectedClassification: decision ? ({ AUTO_APPROVED: 'ROUTINE', REJECTED_POLICY: 'ROUTINE_POLICY_DENY', ASK_CLARIFICATION: 'UNKNOWN_FACT' }[decision] || null) : null,
    label: { labeledBy: null, labeledAt: null, sourceRef: `docs/datasets/TAP_KIEM_THU_100_INPUT_THUC_TE.md#${id}` }, snapshot: null };
});
if (cases.length !== 100 || new Set(cases.map((c) => c.id)).size !== 100) throw new Error('Expected exactly 100 distinct source rows; no output written.');
const candidate = { name: 'Repository 100 cases — pending independent review', version: 'source-import-v1',
  origin: 'INTERNAL', sourceRef: 'docs/datasets/TAP_KIEM_THU_100_INPUT_THUC_TE.md',
  sourceSha256: createHash('sha256').update(bytes).digest('hex'), referenceDate: '', policyAuthorIds: [], independenceDeclaration: '',
  importNote: 'Source-preserving candidate only. Complete snapshots, single labels, split and actual labeler provenance; do not claim independent measurement from this import.', cases };
fs.writeFileSync(output, JSON.stringify(candidate, null, 2) + '\n');
console.log(`Imported ${cases.length} distinct source cases. No official metrics. Output: ${output}`);
