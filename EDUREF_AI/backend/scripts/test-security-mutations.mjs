// Targeted mutation checks for the security regression suite. Mutate ONLY a temporary
// copy of application code; node_modules is shared read-only through a junction/symlink.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const backend = fileURLToPath(new URL('../', import.meta.url));
const reportPath = path.join(backend, '../docs/SECURITY_MUTATION_RESULTS.json');
const args = process.argv.slice(2);
const filter = args.find((a) => a.startsWith('--only='))?.slice(7);
const mutants = [];
const add = (id, file, from, to, expectedMatches = 1) => mutants.push({ id, file, from, to, expectedMatches });

add('input-authoritative-fields', 'services/ClientInputGuard.js', 'delete clean[key];', 'void clean[key];');
add('document-url-scheme', 'services/ClientInputGuard.js', "if (!value || value.length > 2048) return fallback;", "if (value.startsWith('javascript:')) return value;\n  if (!value || value.length > 2048) return fallback;");
add('session-owner-isolation', 'modules/ai-agent/memory/sessionScope.js', 'const prefix = `${owner}::`;', "const prefix = 'shared::';");
add('jwt-public-secret', 'config/jwtSecret.js', 'KNOWN_PUBLIC_JWT_SECRETS.includes(secret) || String(secret).length < 32', 'String(secret).length < 32');
add('error-classification', 'services/ErrorShield.js', 'if (INTERNAL_ERROR_NAMES.has(err.name)) return true;', 'if (INTERNAL_ERROR_NAMES.has(err.name)) return false;');
add('error-redaction', 'services/ErrorShield.js', 'if (!isInternalError(err)) return err?.message || GENERIC_ERROR_MESSAGE;', 'if (true) return err?.message || GENERIC_ERROR_MESSAGE;');
add('http-error-redaction', 'services/ErrorShield.js', 'errorId: id,', 'errorId: id, leakedDetail: err.message,');
add('rate-limit-boundary', 'middlewares/rateLimit.js', 'allowed: bucket.count <= max,', 'allowed: bucket.count <= max + 1,');
add('rate-limit-key-isolation', 'middlewares/rateLimit.js', 'const now = Date.now();\n  let bucket = buckets.get(key);', "key = 'shared';\n  const now = Date.now();\n  let bucket = buckets.get(key);");
add('memory-size-cap', 'modules/ai-agent/memory/ConversationMemory.js', 'this.maxMessagesPerSession = 200;', 'this.maxMessagesPerSession = 1000;');
add('memory-expiry', 'modules/ai-agent/memory/ConversationMemory.js', 'if (now - session.lastActive > this.sessionTTL)', 'if (false)');
add('terminal-socket-isolation', 'modules/ai-agent/core/AgentTerminalLogger.js', "this.io.to(`user:${ownerKey}`).to('staff').emit('agent_terminal_log', logEntry);", "this.io.emit('agent_terminal_log', logEntry);");
add('terminal-history-isolation', 'modules/ai-agent/core/AgentTerminalLogger.js', 'this.buffer.filter((e) => !e.ownerKey || viewer.isStaff || (viewer.key && e.ownerKey === viewer.key))', 'this.buffer');
add('tool-request-owner', 'modules/ai-agent/tools/ToolResolver.js', 'if (!caller.studentCode || owned.student?.studentCode !== caller.studentCode)', 'if (false)');
add('tool-verify-rate-limit', 'modules/ai-agent/tools/ToolResolver.js', 'if (!gate.allowed)', 'if (false)');
add('ask-terminal-state', 'services/AcademicWorkflowService.js', "if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(request.status)) {\n        return { success: false, error: `Hồ sơ [${request.requestCode}] đã ở trạng thái [${request.status}], không thể yêu cầu bổ sung.` };", "if (false) {\n        return { success: false, error: `Hồ sơ [${request.requestCode}] đã ở trạng thái [${request.status}], không thể yêu cầu bổ sung.` };");
add('escalate-terminal-state', 'services/AcademicWorkflowService.js', "if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(request.status)) {\n        return { success: false, error: `Hồ sơ [${request.requestCode}] đã ở trạng thái [${request.status}], không thể chuyển tiếp.` };", "if (false) {\n        return { success: false, error: `Hồ sơ [${request.requestCode}] đã ở trạng thái [${request.status}], không thể chuyển tiếp.` };");
add('staff-compare-and-set', 'services/AcademicWorkflowService.js', 'if (updated.count !== 1)', 'if (false)');
add('staff-confirm-decision-adapter', 'modules/ai-agent/tools/actions/petitionTools.js', "decision: approved ? 'APPROVE' : 'REJECT',", "decision: 'REJECT',");
add('approval-history-owner', 'services/AcademicWorkflowService.js', 'studentId: resolvedId,', "studentId: 'other-student',");
add('agent-student-identity', 'modules/ai-agent/core/AgentOrchestrator.js', '(currentUser?.studentCode || currentUser?.code || null)', '(toolArgs.studentCode || null)');
add('agent-client-input-filter', 'modules/ai-agent/core/AgentOrchestrator.js', '...stripServerAuthoritativeFields(inputData),', '...(inputData || {}),');
add('agent-llm-input-filter', 'modules/ai-agent/core/AgentOrchestrator.js', '...stripServerAuthoritativeFields(toolArgs.inputData),', '...(toolArgs.inputData || {}),');
add('vision-empty-response', 'services/CertificateVisionService.js', 'requiresManualReview: true,', 'requiresManualReview: false,', 2);
add('verify-custom-target-owner', 'routes/agentRoutes.js', "if (!requested || (requested !== ownCode && !RESERVED_BENCHMARK_STUDENT_CODES.includes(requested)))", 'if (false)');
add('http-chat-identity', 'routes/agentRoutes.js', '? req.user?.studentCode\n        : (explicitStudentCode || req.user?.studentCode)', '? explicitStudentCode\n        : (explicitStudentCode || req.user?.studentCode)');
add('http-chat-size-limit', 'routes/agentRoutes.js', 'if (String(message).length > 4000)', 'if (false)');
add('audit-query-owner', 'services/AuditLogService.js', 'if (studentId) where.request = { studentId };', 'if (false) where.request = { studentId };');
add('audit-query-limit', 'routes/auditRoutes.js', 'Math.min(parsedLimit, 200)', 'parsedLimit');
add('demo-login-gate', 'controllers/authController.js', "if (!isDemoRoleSwitchEnabled()) {\n        return res.status(403).json({", "if (false) {\n        return res.status(403).json({");
add('staff-default-password', 'controllers/authController.js', "if (!isDemoRoleSwitchEnabled() && KNOWN_DEFAULT_PASSWORDS.includes(String(password)))", 'if (false)');
add('demo-account-allowlist', 'controllers/authController.js', 'where: { studentCode: { in: benchmarkCodes } },', 'where: {},');
add('petition-input-filter', 'routes/petitionRoutes.js', 'inputData = stripServerAuthoritativeFields(inputData);', 'inputData = { ...inputData };');
add('petition-resume-filter', 'routes/petitionRoutes.js', 'const additionalData = stripServerAuthoritativeFields(req.body.additionalData);', 'const additionalData = req.body.additionalData || {};');
add('petition-list-owner', 'routes/petitionRoutes.js', "if (req.user?.role === 'STUDENT') where.studentId = req.user.id;", 'if (false) where.studentId = req.user.id;');
add('stream-idle-deadline', 'modules/ai-agent/llm/GeminiStreamClient.js', '              STREAM_IDLE_TIMEOUT_MS\n', '              STREAM_MAX_DURATION_MS\n');
add('stream-total-deadline', 'modules/ai-agent/llm/GeminiStreamClient.js', '            STREAM_MAX_DURATION_MS\n', '            STREAM_MAX_DURATION_MS * 3\n');
add('stream-close-detection', 'modules/ai-agent/llm/GeminiStreamClient.js', "closedError.code = 'ESTREAMCLOSED';", "closedError.code = 'BROKEN_CLOSE';");
add('stream-abort-result', 'modules/ai-agent/llm/GeminiStreamClient.js', '              isAborted: true,\n', '              isAborted: false,\n');

const selected = filter ? mutants.filter((m) => filter.split(',').includes(m.id)) : mutants;
if (!selected.length) throw new Error('No matching mutations');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'eduref-security-mutations-'));
const tests = fs.readdirSync(path.join(backend, 'test')).filter((f) => /^security-.*\.test\.js$/.test(f)).sort().map((f) => `test/${f}`);
const env = {
  ...process.env,
  DATABASE_URL: 'postgresql://eduref_test:none@127.0.0.1:1/eduref_test_blackhole?connect_timeout=1',
  DIRECT_URL: 'postgresql://eduref_test:none@127.0.0.1:1/eduref_test_blackhole?connect_timeout=1',
  GEMINI_API_KEY: 'test-key-not-real', NODE_ENV: 'test', ALLOW_DEMO_ROLE_SWITCH: 'true',
};
const report = { generatedAt: new Date().toISOString(), scope: 'Targeted security regression mutations; not exhaustive mutation coverage', testFiles: tests, results: [] };

function runTests() {
  const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', ...tests], {
    cwd: temp, env, encoding: 'utf8', timeout: 20_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
  });
  const output = `${r.stdout || ''}\n${r.stderr || ''}`;
  return {
    exitCode: r.status, error: r.error?.code || null,
    tests: Number(output.match(/^# tests (\d+)$/m)?.[1] || 0),
    failedTests: [...output.matchAll(/^not ok \d+ - (.+)$/gm)].map((m) => m[1]),
    assertionFailure: output.includes('ERR_ASSERTION'),
    output,
  };
}

try {
  // Never copy .env or dependencies. All edits stay in this disposable directory.
  for (const dir of ['config', 'controllers', 'fixtures', 'middlewares', 'modules', 'routes', 'services', 'test', 'testSupport']) {
    fs.cpSync(path.join(backend, dir), path.join(temp, dir), { recursive: true });
  }
  fs.copyFileSync(path.join(backend, 'package.json'), path.join(temp, 'package.json'));
  fs.symlinkSync(path.join(backend, 'node_modules'), path.join(temp, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const baseline = runTests();
  report.baseline = { exitCode: baseline.exitCode, tests: baseline.tests };
  if (baseline.exitCode !== 0 || baseline.tests !== 52) throw new Error(`Baseline must pass all 52 tests:\n${baseline.output}`);
  console.log('Baseline: 52/52 PASS in isolated copy');

  for (const m of selected) {
    const target = path.join(temp, m.file);
    const original = fs.readFileSync(target, 'utf8');
    const normalized = original.replace(/\r\n/g, '\n');
    const matches = normalized.split(m.from).length - 1;
    if (matches !== m.expectedMatches) throw new Error(`${m.id}: expected ${m.expectedMatches} matches, got ${matches}`);
    try {
      fs.writeFileSync(target, normalized.replaceAll(m.from, m.to));
      const syntax = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8', windowsHide: true });
      if (syntax.status !== 0) throw new Error(`${m.id}: invalid mutation syntax: ${syntax.stderr}`);
      const r = runTests();
      const status = r.error ? 'RUN_ERROR' : r.exitCode === 0 ? 'SURVIVED' : r.assertionFailure ? 'KILLED' : 'UNEXPECTED_FAILURE';
      report.results.push({ id: m.id, file: m.file, status, exitCode: r.exitCode, tests: r.tests, failedTests: r.failedTests, error: r.error });
      if (status !== 'KILLED') fs.writeFileSync(path.join(temp, `${m.id}.log`), r.output);
      console.log(`${m.id}: ${status}${r.failedTests.length ? ` (${r.failedTests.length} failing tests)` : ''}`);
    } finally {
      fs.writeFileSync(target, original);
    }
  }
  const restored = runTests();
  report.restoredBaseline = { exitCode: restored.exitCode, tests: restored.tests };
  report.killed = report.results.filter((r) => r.status === 'KILLED').length;
  report.total = selected.length;
  report.allDetected = report.killed === report.total && restored.exitCode === 0 && restored.tests === 52;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`Mutations: ${report.killed}/${report.total} killed. Restored baseline: ${restored.tests} tests, exit ${restored.exitCode}`);
  console.log(`Report: ${reportPath}`);
  if (!report.allDetected) process.exitCode = 1;
} finally {
  // Verify the absolute deletion target is a task-created child of the OS temp directory.
  const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(temp));
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(temp).startsWith('eduref-security-mutations-')) {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
