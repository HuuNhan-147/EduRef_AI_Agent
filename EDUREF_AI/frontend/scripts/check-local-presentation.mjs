import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { displayLabel, toDisplayText } from '../src/config/displayText.js';
import { reconcileWorkflowMessages, isOpenWorkflow } from '../src/config/workflowTimeline.js';
import { chatSuggestions } from '../src/config/chatSuggestions.js';

// Read-only local readiness and presentation contracts. No LLM call, draft write,
// petition submission or external AI provider request is made by this script.
const base = 'http://localhost:5000';
const report = { checkedAt: new Date().toISOString(), frontend: 'http://localhost:8080', backend: base,
  passed: false, businessRecordsCreated: 0, externalAICalls: 0 };
async function api(path, token, body) {
  const response = await fetch(`${base}/api${path}`, { method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal(response.status, 200, `local API ${path}`);
  const data = await response.json(); assert.equal(data.success, true); return data;
}
try {
  const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(20000) });
  report.backendHealth = health.status; assert.equal(health.status, 200);
  const page = await fetch(report.frontend); report.frontendStatus = page.status; assert.equal(page.status, 200);
  const html = await page.text(); const asset = html.match(/src="([^"]+\.js)"/)[1];
  const bundle = await fetch(new URL(asset, report.frontend)); report.assetStatus = bundle.status; assert.equal(bundle.status, 200);
  const source = await bundle.text();
  for (const marker of ['retry-auto', 'FOCUS_WORKFLOW', 'VIEW_PETITIONS', 'workflow_', 'Agent Execution Terminal']) assert.ok(source.includes(marker), `production asset missing ${marker}`);
  const accounts = [];
  for (const accountKey of ['STUDENT_ACTIVE', 'STUDENT_OVERDUE_2022']) {
    const { token } = await api('/auth/demo-login', null, { accountKey });
    const { data: draft } = await api('/drafts/active', token);
    const { data: petitions } = await api('/petitions?limit=10', token);
    const { data: terminal } = await api('/agent/terminal-logs?limit=10', token);
    const row = { account: accountKey, requestStatuses: [...new Set(petitions.map(p => displayLabel(p.status)))],
      terminalReadAllowed: Array.isArray(terminal), latestTask: draft ? displayLabel(draft.state) : null };
    if (draft) {
      let messages = reconcileWorkflowMessages([], draft);
      assert.equal(messages.length, 1);
      const suggestions = chatSuggestions(messages[0], { currentDraft: isOpenWorkflow(draft) ? draft : null });
      assert.ok(suggestions.length >= 2 && suggestions.length <= 3);
      messages = [...messages, { id: 'qa-followup', sender: 'user', text: 'hello' }];
      const updated = reconcileWorkflowMessages(messages, structuredClone(draft));
      assert.equal(updated.at(-1).id, 'qa-followup');
      assert.doesNotMatch(toDisplayText(draft.notice || ''), /\b(?:COURSE_DEBT|UNKNOWN_FACT|ASK_CLARIFICATION)\b/);
      Object.assign(row, { staysInHistoryAfterFollowup: true, fixedFormVisible: isOpenWorkflow(draft), suggestionCount: suggestions.length });
    }
    accounts.push(row);
  }
  Object.assign(report, { passed: true, productionAssetHasChanges: true, accounts });
} catch (error) { report.error = error.message; process.exitCode = 1; }
await fs.writeFile(new URL('../../qa/automation-audit-2026-10-17/local-presentation-readiness.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
