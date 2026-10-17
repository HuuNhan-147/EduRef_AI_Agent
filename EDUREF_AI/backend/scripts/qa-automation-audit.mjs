import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// Explicit QA tool for the public demo. Tokens stay in memory. No reset/delete,
// profile updates, policy changes, or decisions on pre-existing requests.
const root = fileURLToPath(new URL('../../', import.meta.url));
const outputDirectory = path.join(root, 'qa/automation-audit-2026-10-17');
const base = 'https://eduref-ai-agent-1.onrender.com';
const mode = process.argv[2] || 'inventory';
const runId = `QA_AUTOMATION_${new Date().toISOString().replace(/[:.]/g, '-')}`;
const evidence = { runId, mode, base, startedAt: new Date().toISOString(), results: [] };
await fs.mkdir(outputDirectory, { recursive: true });
const outFile = path.join(outputDirectory, `${runId}-${mode}.json`);
const record = async (id, details) => {
  const row = { id, ...details };
  evidence.results.push(row);
  await fs.writeFile(outFile, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(row));
};

async function api(endpoint, { token, body, method = body ? 'POST' : 'GET' } = {}) {
  const started = Date.now();
  const response = await fetch(`${base}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(90000),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { nonJsonBody: text.slice(0, 300) }; }
  return { status: response.status, durationMs: Date.now() - started, data };
}

async function login(accountKey) {
  const result = await api('/api/auth/demo-login', { body: { accountKey } });
  if (!result.data.success || !result.data.token) throw new Error(`Demo login failed: HTTP ${result.status}, ${result.data.message}`);
  return { token: result.data.token, user: result.data.user };
}

const summary = (response) => {
  const result = response.data?.data || response.data;
  const tool = result.toolResult || result;
  return { httpStatus: response.status, durationMs: response.durationMs,
    success: response.data.success, decision: result.decision, status: tool.status,
    requestId: tool.requestId, requestCode: tool.requestCode, rule: tool.rule,
    missing: tool.missing, reply: result.reply || result.message,
    question: tool.question || tool.actionableQuestion, modelUsed: result.modelUsed,
    executionEvidence: result.executionEvidence,
    hasDraft: Boolean(tool.draft), hasActions: Boolean(tool.actions?.length),
    error: result.error || response.data.error };
};

async function priorEvidence() {
  const files = (await fs.readdir(outputDirectory)).filter((name) => name.endsWith('.json') && name.startsWith('QA_AUTOMATION_'));
  return Promise.all(files.sort().map(async (name) => JSON.parse(await fs.readFile(path.join(outputDirectory, name), 'utf8'))));
}

async function socketChat(token, body) {
  const { io } = await import('../../frontend/node_modules/socket.io-client/build/esm/index.js');
  const started = Date.now();
  const socket = io(base, { auth: { token }, transports: ['websocket', 'polling'], timeout: 15000, reconnection: false });
  return new Promise((resolve, reject) => {
    let chunks = 0;
    const timer = setTimeout(() => {
      socket.emit('client_stop_generation', { sessionId: body.sessionId });
      socket.disconnect();
      reject(new Error('Socket response timed out; inspect created-requests before retrying'));
    }, 90000);
    const finish = (data) => {
      clearTimeout(timer); socket.disconnect();
      resolve({ status: 200, durationMs: Date.now() - started, chunks, data: { success: true, data } });
    };
    socket.on('connect', () => socket.emit('client_send_message', { ...body, token, clientRequestId: runId + body.sessionId }));
    socket.on('agent_response_chunk', () => chunks++);
    socket.on('agent_response_end', finish);
    socket.on('agent_error', finish);
    socket.on('connect_error', (error) => { clearTimeout(timer); socket.disconnect(); reject(error); });
  });
}

async function observeStatusEvents(token) {
  const { io } = await import('../../frontend/node_modules/socket.io-client/build/esm/index.js');
  const socket = io(base, { auth: { token }, transports: ['websocket', 'polling'], timeout: 15000, reconnection: false });
  const events = [];
  for (const name of ['petition_status_updated', 'petition_escalated']) socket.on(name, (data) => {
    events.push({ name, requestId: data.requestId, requestCode: data.requestCode, status: data.status });
  });
  await new Promise((resolve, reject) => { socket.on('connect', resolve); socket.on('connect_error', reject); });
  return { events, close: () => socket.disconnect() };
}

async function exactModalSubmission(formCode, confirmData, buildConfirmationInput) {
  const { parse } = await import('../../frontend/node_modules/@babel/parser/lib/index.js');
  const traverse = (await import('../../frontend/node_modules/@babel/traverse/lib/index.js')).default.default;
  const source = await fs.readFile(path.join(root, 'frontend/src/components/forms/DynamicPetitionModal.jsx'), 'utf8');
  let callback;
  traverse(parse(source, { sourceType: 'module', plugins: ['jsx'] }), {
    VariableDeclarator({ node }) { if (node.id.name === 'handleSubmitToAgent') callback = source.slice(node.init.start, node.init.end); },
  });
  let result;
  const context = vm.createContext({ isConfirmForm: true, activeFormCode: formCode, confirmData,
    buildConfirmationInput, petitionType: { code: 'STUDENT_CONFIRMATION' }, onClose() {},
    onSubmitToChat(message, data) { result = { message, ...data }; } });
  vm.runInContext(`(${callback})()`, context);
  return result;
}

try {
  const student = await login('STUDENT_ACTIVE');
  const inventory = await api('/api/petitions?limit=200', { token: student.token });
  const existing = inventory.data.data || [];
  const baselineIds = new Set(existing.map((row) => row.id));
  const previousRuns = await priorEvidence();
  const ownedIds = new Set(previousRuns.flatMap((run) => run.results
    .filter((row) => row.id !== 'baseline' && row.requestId).map((row) => row.requestId)));
  const { CONFIRMATION_FORMS, buildConfirmationInput } = await import('../../frontend/src/config/confirmationForms.js');
  const formInput = (code, changes = {}) => buildConfirmationInput(code, {
    fullName: 'Nguyễn Văn An', studentCode: '2380600001', birthDate: '15/03/2004', gender: 'Nam',
    studentClass: '23DTHE1', faculty: 'Khoa Công Nghệ Thông Tin', major: 'Công nghệ thông tin',
    phone: '0901234567', idCard: '079204001234', idCardDate: '2021-05-15',
    idCardPlace: 'Cục Cảnh sát QLHC về TTXH', ...changes,
  });
  const chat = async (id, message, inputData, transport = 'http', sessionId = `${runId}-${id}`) => {
    const body = { message, sessionId, studentCode: '2380600001', requestedModel: 'auto', inputData };
    const response = transport === 'socket' ? await socketChat(student.token, body)
      : await api('/api/agent/chat', { token: student.token, body });
    const result = summary(response);
    if (result.requestId && !baselineIds.has(result.requestId)) ownedIds.add(result.requestId);
    await record(id, { transport, sessionId, message, inputKeys: Object.keys(inputData || {}),
      streamedChunks: response.chunks, ...result });
    return result;
  };
  const resume = async (id, requestId, additionalData) => {
    if (!ownedIds.has(requestId)) throw new Error('Refusing to resume a pre-existing non-QA petition');
    const response = await api(`/api/petitions/${requestId}/resume`, { token: student.token, body: { additionalData } });
    const result = summary(response);
    await record(id, { originalRequestId: requestId, additionalKeys: Object.keys(additionalData), ...result });
    return result;
  };
  const direct = async (id, inputData) => {
    const list = await api('/api/petitions?limit=200', { token: student.token });
    const collision = (list.data.data || []).find((row) => ['PENDING', 'WAITING_STUDENT'].includes(row.status)
      && row.inputData?.formCode === inputData.formCode && !ownedIds.has(row.id));
    if (collision) { await record(id, { skipped: true, reason: 'Would reuse a pre-existing non-QA petition', requestCode: collision.requestCode }); return null; }
    const response = await api('/api/petitions', { token: student.token,
      body: { requestTypeCode: 'STUDENT_CONFIRMATION', inputData: { ...inputData, qaRunId: runId } } });
    const result = summary(response);
    if (result.requestId && !baselineIds.has(result.requestId)) ownedIds.add(result.requestId);
    await record(id, { transport: 'direct-http', inputKeys: Object.keys(inputData), ...result });
    return result;
  };
  await record('baseline', { authenticatedUserFields: Object.keys(student.user),
    existingRequests: existing.map((row) => ({ id: row.id, code: row.requestCode,
      formCode: row.inputData?.formCode, status: row.status, verificationRunId: row.verificationRunId })),
    hasMore: inventory.data.hasMore, total: inventory.data.total });

  if (mode === 'inventory') {
    for (const endpoint of ['/health', '/api/agent/models', '/api/auth/me']) {
      const response = await api(endpoint, { token: student.token });
      await record(endpoint, { httpStatus: response.status, durationMs: response.durationMs,
        ...(endpoint === '/health' ? { data: response.data } : {}),
        ...(endpoint.endsWith('models') ? { defaultModel: response.data.defaultModel,
          modelIds: response.data.models?.map((model) => model.id) } : {}),
        ...(endpoint.endsWith('/me') ? { responseKeys: Object.keys(response.data),
          userFields: Object.keys(response.data.user || response.data.data || {}) } : {}) });
    }
  } else if (mode === 'probe') {
    const currentUser = {
      studentCode: '2380600001', fullName: 'Nguyễn Văn An', role: 'STUDENT',
      studentClass: '23DTHE1', birthDate: '15/03/2004', gender: 'Nam',
      phone: '0901234567', idCard: '079204001234',
      permanentAddress: '475A Điện Biên Phủ, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh',
    };
    for (const [id, message] of [['greeting', 'Xin chào'], ['sidebar-tax-quick', CONFIRMATION_FORMS[0].quickPrompt]]) {
      const response = await api('/api/agent/chat', { token: student.token,
        body: { message, sessionId: `${runId}-${id}`, currentUser, studentCode: '2380600001', requestedModel: 'auto' } });
      await record(id, { message, sentCurrentUserFields: Object.keys(currentUser), ...summary(response) });
    }
  } else if (mode === 'forms') {
    await chat('general-modal-http', `Em xin cấp giấy xác nhận sinh viên để làm vé tháng xe buýt. Kiểm thử ${runId}.`,
      formInput('GENERAL_CONFIRMATION'));
    const bank = await chat('bank-modal-socket', `Em xin giấy xác nhận vay vốn NHCSXH theo Mẫu 01. Kiểm thử ${runId}.`,
      formInput('BANK_LOAN'), 'socket');
    if (bank.status === 'WAITING_STUDENT' && bank.requestId) {
      await resume('bank-resume-missing-four', bank.requestId,
        { orphanStatus: 'Không', loanFormCount: 0, loanGrantedCount: 0, lastLoanAmount: 0 });
    }
    await direct('course-debt-direct', formInput('COURSE_DEBT'));
  } else if (mode === 'continuations') {
    const probe = previousRuns.filter((run) => run.mode === 'probe').at(-1);
    const tax = probe?.results.find((row) => row.id === 'sidebar-tax-quick');
    if (tax?.requestId && ownedIds.has(tax.requestId)) {
      const response = await chat('tax-chat-followup',
        'Số điện thoại: 0901234567; địa chỉ thường trú: 475A Điện Biên Phủ, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh; nhận tại Sai Gon Campus A-01.01.',
        null, 'http', `${probe.runId}-sidebar-tax-quick`);
      await record('tax-followup-identity-check', { initialRequestId: tax.requestId,
        followupRequestId: response.requestId, sameRequest: tax.requestId === response.requestId });
    }
    const submission = await exactModalSubmission('MILITARY_DEFERMENT', formInput('MILITARY_DEFERMENT'), buildConfirmationInput);
    const military = await chat('military-modal-socket', submission.message, submission.inputData, 'socket');
    if (military.status === 'WAITING_STUDENT' && military.requestId) {
      await chat('military-short-yes', 'Có', null, 'socket', `${runId}-military-modal-socket`);
      const detail = await api(`/api/petitions/${military.requestId}`, { token: student.token });
      await record('military-original-after-yes', { requestId: military.requestId, status: detail.data.data?.status,
        addressConfirmed: detail.data.data?.inputData?.isAddressConfirmed === true });
      if (detail.data.data?.status === 'WAITING_STUDENT') {
        await resume('military-structured-confirm', military.requestId, { isAddressConfirmed: true });
      }
    }
  } else if (mode === 'staff') {
    const staff = await login('STAFF_DAOTAO');
    const common = { reissueReason: `Kiểm thử cấp lại hồ sơ demo ${runId}` };
    const approve = await direct('general-repeat-to-staff', formInput('GENERAL_CONFIRMATION', common));
    if (approve?.status === 'ESCALATED' && ownedIds.has(approve.requestId)) {
      const observer = await observeStatusEvents(student.token);
      const response = await api(`/api/petitions/${approve.requestId}/approve`, { token: staff.token, body: {} });
      await record('staff-approve-without-text', summary(response));
      const repeated = await api(`/api/petitions/${approve.requestId}/approve`, { token: staff.token, body: {} });
      await record('staff-repeat-approval', summary(repeated));
      const detail = await api(`/api/petitions/${approve.requestId}`, { token: student.token });
      await record('student-sees-staff-approval', { requestId: approve.requestId, status: detail.data.data?.status,
        auditActions: detail.data.data?.auditLogs?.map((row) => ({ action: row.action, actorType: row.actorType })) });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await record('student-status-events', { requestId: approve.requestId, observedEvents: observer.events,
        observationWindow: 'Connected before approval, through detail reload, plus 1500 ms' });
      observer.close();
    }
    const reject = await direct('bank-repeat-to-staff', formInput('BANK_LOAN', {
      ...common, orphanStatus: 'Không', loanFormCount: 0, loanGrantedCount: 0, lastLoanAmount: 0,
    }));
    if (reject?.status === 'ESCALATED' && ownedIds.has(reject.requestId)) {
      const blank = await api(`/api/petitions/${reject.requestId}/reject`, { token: staff.token, body: {} });
      await record('staff-reject-without-reason', summary(blank));
      const preset = await api(`/api/petitions/${reject.requestId}/reject`, { token: staff.token,
        body: { reason: `Kết thúc hồ sơ kiểm thử automation ${runId}; không dùng cho nghiệp vụ thực tế.` } });
      await record('staff-reject-with-preset', summary(preset));
    }
  } else if (mode === 'exact-bank-modal') {
    const submission = await exactModalSubmission('BANK_LOAN', formInput('BANK_LOAN'), buildConfirmationInput);
    await chat('exact-bank-modal-http', submission.message, submission.inputData);
  } else if (mode === 'cleanup') {
    const staff = await login('STAFF_DAOTAO');
    for (const requestId of ownedIds) {
      const detail = await api(`/api/petitions/${requestId}`, { token: student.token });
      const petition = detail.data.data;
      const marked = String(petition?.inputData?.sessionId || '').includes('QA_AUTOMATION_')
        || String(petition?.inputData?.qaRunId || '').startsWith('QA_AUTOMATION_');
      if (!marked || petition?.student?.studentCode !== '2380600001') {
        throw new Error(`Refusing cleanup of unmarked or non-owned petition ${requestId}`);
      }
      if (petition.status === 'CANCELLED') continue;
      const response = await api(`/api/petitions/${requestId}/rollback`, { token: staff.token,
        body: { reason: `Kết thúc kiểm thử automation ${runId}; thu hồi riêng hồ sơ QA để không chiếm hạn ngạch demo. Giữ nguyên lịch sử kiểm toán.` } });
      await record('cleanup-qa-petition', { requestId, requestCode: petition.requestCode,
        httpStatus: response.status, success: response.data.success,
        previousStatus: response.data.previousStatus, currentStatus: response.data.currentStatus });
      if (!response.data.success) throw new Error(`Cleanup failed for ${requestId}`);
    }
    const final = await api('/api/petitions?limit=200', { token: student.token });
    await record('final-state', { qaRequests: (final.data.data || []).filter((row) => ownedIds.has(row.id))
      .map((row) => ({ id: row.id, requestCode: row.requestCode, status: row.status })),
      originalRequests: (final.data.data || []).filter((row) => !ownedIds.has(row.id))
        .map((row) => ({ id: row.id, requestCode: row.requestCode, status: row.status })) });
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }
  const after = await api('/api/petitions?limit=200', { token: student.token });
  await record('created-requests', { requests: (after.data.data || []).filter((row) => !baselineIds.has(row.id))
    .map((row) => ({ id: row.id, code: row.requestCode, status: row.status,
      formCode: row.inputData?.formCode, inputKeys: Object.keys(row.inputData || {}) })) });
} catch (error) {
  await record('run-error', { error: error.message, code: error.cause?.code });
  process.exitCode = 1;
} finally {
  evidence.completedAt = new Date().toISOString();
  await fs.writeFile(outFile, JSON.stringify(evidence, null, 2));
  console.log(`Evidence: ${outFile}`);
}
