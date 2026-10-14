import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { parse } from '@babel/parser';
import generator from '@babel/generator';
import postcss from 'postcss';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repository = resolve(frontend, '../..');
const server = await createServer({ root: frontend, server: { middlewareMode: true, hmr: false, watch: null } });
after(() => server.close());

const resultsModule = await server.ssrLoadModule('/src/components/common/VerifyResults.jsx');
const { default: VerifyResults, VerifySummary, formatTimestamp } = resultsModule;
const { default: LandingPage, LANDING_FACTS } = await server.ssrLoadModule('/src/pages/LandingPage.jsx');
const { CONFIRMATION_FORMS } = await server.ssrLoadModule('/src/pages/StudentWorkspacePage.jsx');
const { default: AnimatedNumber, countAtProgress } = await server.ssrLoadModule('/src/components/landing/AnimatedNumber.jsx');
const { scrollProgress, processProgress } = await server.ssrLoadModule('/src/hooks/useLandingMotion.js');
const { hoverPosition } = await server.ssrLoadModule('/src/hooks/useLandingHover.js');
const { default: TopNavbar } = await server.ssrLoadModule('/src/components/common/TopNavbar.jsx');
const { default: ConnectionPanel } = await server.ssrLoadModule('/src/components/common/ConnectionPanel.jsx');
const { default: AgentTrace } = await server.ssrLoadModule('/src/components/common/AgentTrace.jsx');
const { default: VerifyEntry } = await server.ssrLoadModule('/src/components/common/VerifyEntry.jsx');
const { default: App, getInitialTab } = await server.ssrLoadModule('/src/App.jsx');
const render = (component, props, children) => renderToStaticMarkup(React.createElement(component, props, children));

const cases = Array.from({ length: 5 }, (_, index) => ({
  id: 'A-0' + (index + 1), title: 'Ca mẫu ' + (index + 1), prompt: 'Yêu cầu mẫu ' + index,
  expectedDecision: index < 3 ? 'AUTO_APPROVED' : 'ESCALATE_TO_STAFF',
  actualDecision: index < 3 ? 'AUTO_APPROVED' : 'ESCALATE_TO_STAFF',
  classification: index < 3 ? 'ROUTINE' : 'OUTSIDE_POLICY', passed: true, durationMs: 31 + index,
  actionableQuestion: index < 3 ? null : 'Cán bộ có chấp nhận mục đích ngoại lệ của ca ' + index + ' không?',
  startedAt: '2026-10-13T01:00:00.000Z', completedAt: '2026-10-13T01:00:00.100Z',
}));
const run = { results: cases, passedCases: 5, totalCases: 5, allPassed: true, distributionPassed: true, autoCount: 3, escalationCount: 2, totalDurationMs: 175, completedAt: cases[0].completedAt, policyVersion: 'TEST_POLICY' };
const resultProps = { cases, selectedId: 'A-01', onSelect: () => {}, run, loading: false };

test('root opens landing and Verify retains its direct entry', () => {
  assert.equal(getInitialTab(''), 'LANDING');
  assert.equal(getInitialTab('?tab=verify'), 'VERIFY_HARNESS');
  assert.equal(getInitialTab('?tab=chat'), 'STUDENT_ASSISTANT');
  assert.equal(getInitialTab('?tab=unknown'), 'LANDING');
  const html = render(App);
  assert.match(html, /landing-shell/);
  assert.match(html, /href="\?tab=verify"/);
  assert.doesNotMatch(html, /aria-modal="true"/);
});

test('landing and workspace expose the same single conversation slot', () => {
  const child = React.createElement('input', { 'data-test': 'composer', defaultValue: 'Nội dung đang nhập' });
  for (const active of [true, false]) {
    const html = render(LandingPage, { active, visible: true, onNavigate: () => {} }, child);
    assert.equal((html.match(/data-test="composer"/g) || []).length, 1);
    assert.match(html, /value="Nội dung đang nhập"/);
    assert.equal(html.includes('<footer'), active);
  }
});

test('disconnected landing stays informative without fabricated live output', () => {
  const html = render(ConnectionPanel, { status: 'error', error: 'Backend offline', onRetry: () => {} });
  assert.match(html, /role="alert"/);
  assert.match(html, /Backend offline/);
  assert.doesNotMatch(html, /PASS|test-pass|type="text"/);
});

test('landing counters match current forms and Verify fixture count, not measured performance', () => {
  assert.equal(LANDING_FACTS[0].value, CONFIRMATION_FORMS.length);
  const source = parse(readFileSync(resolve(frontend, 'src/pages/VerifyHarnessPage.jsx'), 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  let fixtureCount;
  visit(source, (node) => {
    if (node.type === 'VariableDeclarator' && node.id.name === 'TRACK_A_CASES') fixtureCount = node.init.elements.length;
  });
  assert.equal(LANDING_FACTS[2].value, fixtureCount);
  const html = render(LandingPage, { active: true, visible: true, onNavigate: () => {} });
  assert.equal((html.match(/data-counter-target="5"/g) || []).length, 2);
  assert.equal((html.match(/data-counter-target="3"/g) || []).length, 1);
  assert.doesNotMatch(html, /landing-motion-toggle|Tắt hiệu ứng|Bật hiệu ứng/);
  assert.doesNotMatch(html, /test-pass|test-fail|data-counter-target="100"/);
  const workspace = render(LandingPage, { active: false, visible: true, onNavigate: () => {} });
  assert.doesNotMatch(workspace, /landing-scene|data-counter-target|landing-motion-toggle/);
});

test('count-up is monotonic, bounded and leaves an accessible final value without animation', () => {
  for (const target of [0, 3, 5, 17]) {
    const values = Array.from({ length: 101 }, (_, index) => countAtProgress(target, index / 100));
    assert.equal(values[0], 0);
    assert.equal(values[100], target);
    values.forEach((value, index) => {
      assert.ok(value >= 0 && value <= target);
      if (index) assert.ok(value >= values[index - 1]);
    });
  }
  assert.equal(countAtProgress(5, -1), 0);
  assert.equal(countAtProgress(5, 2), 5);
  const html = render(AnimatedNumber, { value: 5, motionEnabled: false });
  assert.match(html, /class="sr-only">5<\/span>/);
  assert.match(html, /aria-hidden="true" data-counter-target="5">05<\/span>/);
});

test('page and illustration scroll transforms clamp without inventing Agent progress', () => {
  assert.equal(scrollProgress(2000, 5000, 1000), 0.5);
  assert.equal(scrollProgress(-20, 5000, 1000), 0);
  assert.equal(scrollProgress(8000, 5000, 1000), 1);
  assert.equal(scrollProgress(0, 800, 1000), 0);
  assert.equal(processProgress(640, 400, 800), 0);
  assert.equal(processProgress(440, 400, 800), 0.5);
  assert.equal(processProgress(-400, 400, 800), 1);
});

test('automatic reduced-motion styles keep content visible and focused chat stationary', () => {
  const css = postcss.parse(readFileSync(resolve(frontend, 'src/styles/landing-motion.css'), 'utf8'));
  const rules = [];
  css.walkRules((rule) => rules.push(rule));
  const paused = rules.find((rule) => rule.selector === '.landing-page[data-motion="paused"] [data-reveal]');
  assert.ok(paused.nodes.some((node) => node.prop === 'opacity' && node.value === '1' && node.important));
  assert.ok(paused.nodes.some((node) => node.prop === 'transform' && node.value === 'none' && node.important));
  const reduced = rules.find((rule) => rule.selector === '.landing-page [data-reveal]' && rule.parent.params.includes('prefers-reduced-motion'));
  assert.ok(reduced.nodes.some((node) => node.prop === 'opacity' && node.value === '1' && node.important));
  const focused = rules.find((item) => item.selector === '.landing-page .hero-chat-frame:focus-within');
  assert.ok(focused);
  assert.ok(!focused.nodes.some((node) => node.prop === 'transform'));
});

test('landing chat enters without moving controls or delaying the Agent', () => {
  const css = postcss.parse(readFileSync(resolve(frontend, 'src/styles/landing-motion.css'), 'utf8'));
  let entrance;
  let animation;
  let reduced;
  let paused;
  css.walkRules((rule) => {
    if (rule.selector === '.hero-chat-stage') entrance = rule;
    if (rule.selector.includes('.landing-page .hero-chat-stage') && rule.parent.params?.includes('prefers-reduced-motion')) reduced = rule;
    if (rule.selector.includes('.landing-page[data-motion="paused"] .hero-chat-stage')) paused = rule;
  });
  css.walkAtRules('keyframes', (rule) => {
    if (rule.params === 'hero-chat-enter') animation = rule;
  });
  assert.ok(entrance.nodes.some((node) => node.prop === 'animation' && node.value.includes('hero-chat-enter')));
  assert.ok(reduced.nodes.some((node) => node.prop === 'animation' && node.value === 'none'));
  assert.ok(paused.nodes.some((node) => node.prop === 'animation' && node.value === 'none'));
  const properties = [];
  animation.walkDecls((declaration) => properties.push(declaration.prop));
  assert.deepEqual(properties, ['opacity', 'opacity']);
});

test('five executed rows retain duration and both actionable questions', () => {
  const html = render(VerifyResults, resultProps);
  assert.equal((html.match(/class="test-badge test-pass"/g) || []).length, 5);
  for (const item of cases) {
    assert.ok(html.includes(item.durationMs + ' ms'));
    if (item.actionableQuestion) assert.ok(html.includes(item.actionableQuestion));
  }
  assert.match(render(VerifySummary, { run, loading: false }), /3 AUTO : 2 ESCALATE/);
});

test('initial and loading states never show previous PASS or measured results', () => {
  const initial = cases.map(({ id, title, expectedDecision, classification }) => ({ id, title, expectedDecision, classification }));
  for (const props of [{ ...resultProps, cases: initial, run: null }, { ...resultProps, loading: true }]) {
    const html = render(VerifyResults, props);
    assert.doesNotMatch(html, /test-pass|31 ms|35 ms/);
  }
  const summary = render(VerifySummary, { run, loading: true });
  assert.doesNotMatch(summary, /test-pass|175 ms|TEST_POLICY/);
  assert.match(summary, /aria-busy="true"/);
});

test('correct 3/2 distribution does not hide a failed case', () => {
  const failedCases = cases.map((item, index) => ({ ...item, passed: index !== 0 }));
  const failedRun = { ...run, results: failedCases, passedCases: 4, allPassed: false };
  const summary = render(VerifySummary, { run: failedRun, loading: false });
  assert.match(summary, /test-fail/);
  assert.doesNotMatch(summary, /test-pass/);
  const html = render(VerifyResults, { ...resultProps, cases: failedCases, run: failedRun });
  assert.equal((html.match(/class="test-badge test-fail"/g) || []).length, 1);
  assert.equal((html.match(/class="test-badge test-pass"/g) || []).length, 4);
});

test('long questions remain complete and untrusted content is escaped', () => {
  const question = 'Thông tin cần cán bộ xác nhận '.repeat(35);
  const html = render(VerifyResults, { ...resultProps, cases: [{ ...cases[3], title: '<script>alert(1)</script>', actionableQuestion: question }], selectedId: cases[3].id });
  assert.ok(html.includes(question));
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(formatTimestamp('invalid-date'), '—');
});

function visit(node, action) {
  if (!node || typeof node !== 'object') return;
  if (node.type) action(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => visit(child, action));
    else if (value && typeof value === 'object') visit(value, action);
  }
}

function inspect(source) {
  const handlers = new Map();
  const effects = [];
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const normalize = (node) => (generator.default || generator)(node, { comments: false, compact: true }).code;
  visit(ast, (node) => {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && ['ArrowFunctionExpression', 'FunctionExpression'].includes(node.init?.type)) handlers.set(node.id.name, normalize(node.init));
    if (node.type === 'CallExpression' && node.callee.name === 'useEffect') effects.push(normalize(node));
  });
  return { handlers, effects };
}

test('cross-screen styling retains every existing API and socket call', () => {
  const paths = ['components/common/LiveTerminalConsole.jsx', 'components/common/WelcomeOnboardingModal.jsx', 'components/forms/CustomProfileModal.jsx', 'components/forms/DynamicPetitionModal.jsx', 'pages/AuditExplorerPage.jsx', 'pages/MyPetitionsPage.jsx', 'pages/StaffEscalationPage.jsx'];
  const calls = (source) => {
    const found = [];
    const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
    visit(ast, (node) => {
      if (node.type !== 'CallExpression') return;
      const owner = node.callee.object?.name;
      if (['api', 'socket'].includes(owner) || ['getSocket', 'switchRoleAuth', 'updateSocketAuth'].includes(node.callee.name)) {
        found.push((generator.default || generator)(node, { comments: false, compact: true }).code);
      }
    });
    return found;
  };
  for (const path of paths) {
    const baseline = execFileSync('git', ['show', 'origin/main:EDUREF_AI/frontend/src/' + path], { cwd: repository, encoding: 'utf8' });
    assert.deepEqual(calls(readFileSync(resolve(frontend, 'src', path), 'utf8')), calls(baseline), path);
  }
});

test('existing auth, Agent, API and Socket.IO handlers and effects remain unchanged', () => {
  const protectedHandlers = {
    'App.jsx': ['initializeDemoSession', 'handleRoleChange', 'fetchPendingCount', 'handleSubmitToChat', 'handlePetitionCreated'],
    'pages/StudentWorkspacePage.jsx': ['handleResetTestData', 'handleSendMessage', 'handleStopGeneration', 'handleResumeSubmission'],
    'pages/VerifyHarnessPage.jsx': ['runSuite', 'runCustom', 'handleSelectChip'],
  };
  for (const [path, names] of Object.entries(protectedHandlers)) {
    const baseline = inspect(execFileSync('git', ['show', 'origin/main:EDUREF_AI/frontend/src/' + path], { cwd: repository, encoding: 'utf8' }));
    const current = inspect(readFileSync(resolve(frontend, 'src', path), 'utf8'));
    for (const name of names) {
      const withoutTrace = (body) => body.replace('startTrace(userMsg.id);', '').replace('requestTraceStop();', '');
      assert.equal(withoutTrace(current.handlers.get(name)), baseline.handlers.get(name), path + ': ' + name);
    }
    for (const effect of baseline.effects) assert.ok(current.effects.includes(effect), path + ': existing effect changed');
  }
  execFileSync('git', ['diff', '--exit-code', 'origin/main', '--', 'EDUREF_AI/backend', 'EDUREF_AI/frontend/src/services', ':!EDUREF_AI/frontend/src/services/api.js', 'EDUREF_AI/frontend/package.json', 'EDUREF_AI/frontend/package-lock.json', 'EDUREF_AI/frontend/vite.config.js'], { cwd: repository });
});

test('only the two approved demo names change in API metadata, preserving account order and contracts', () => {
  const baseline = execFileSync('git', ['show', 'origin/main:EDUREF_AI/frontend/src/services/api.js'], { cwd: repository, encoding: 'utf8' });
  const expected = baseline.replace("name: 'Trần Thị Bình'", "name: 'Trần Minh Quang'").replace("name: 'Phạm Văn Dũng'", "name: 'Trần Đức Tài'");
  assert.equal(readFileSync(resolve(frontend, 'src/services/api.js'), 'utf8').replaceAll('\r\n', '\n'), expected.replaceAll('\r\n', '\n'));
});

test('chat Verify entry only navigates, with no execution or detailed-report controls', () => {
  const html = render(VerifyEntry, { onNavigate: () => {} });
  assert.match(html, /href="\?tab=verify"/);
  assert.doesNotMatch(html, /Báo cáo chi tiết|<button/);
  const student = readFileSync(resolve(frontend, 'src/pages/StudentWorkspacePage.jsx'), 'utf8');
  assert.doesNotMatch(student, /verify-90s|handleRunVerify90s|Thẩm Định 4 Chốt/);
  assert.equal((student.match(/<LiveTerminalConsole /g) || []).length, 1);
  assert.match(student, /aria-controls="procedure-panel"/);
  assert.match(student, /aria-controls="terminal-panel"/);
});

test('trace is expanded while running and collapsed after fast completion with actual duration', () => {
  const trace = { status: 'running', steps: [{ id: 'one', label: 'Đang gọi công cụ nghiệp vụ' }], durationMs: null };
  assert.match(render(AgentTrace, { trace }), /<details[^>]* open=""/);
  const html = render(AgentTrace, { trace: { ...trace, status: 'completed', durationMs: 321 } });
  assert.doesNotMatch(html, /<details[^>]* open=""/);
  assert.match(html, /Đã xử lý/);
  assert.match(html, /0,32 giây/);
  assert.match(html, /Đang gọi công cụ nghiệp vụ/);
  assert.match(html, /Xem tiến trình/);
});

test('trace observer is read-only and each subscription has a matching cleanup', () => {
  const source = readFileSync(resolve(frontend, 'src/hooks/useAgentTrace.js'), 'utf8');
  assert.doesNotMatch(source, /socket\.emit|api\.|fetch\(/);
  assert.match(source, /socket\.on\(event, handler\)/);
  assert.match(source, /socket\.off\(event, handler\)/);
  assert.match(source, /agent_terminal_log: tracker.log/);
});

test('new workspace text/color pairs retain readable contrast', () => {
  const luminance = (hex) => {
    const rgb = hex.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const [foreground, background] of [['ffffff', '225a9f'], ['172d3c', 'edf3f6'], ['526575', 'f8fafb'], ['355d60', 'f7faf9'], ['80570e', 'fff8ec'], ['bcebe3', '244d58'], ['eef5ff', '1d4f8b'], ['d3e3f5', '1d4f8b'], ['ffda74', '153f7c'], ['ffffff', 'b72b47'], ['24466c', 'e8f1fa'], ['52657d', 'e8f1fa'], ['315b88', 'edf4fd'], ['67529a', 'f2eefb'], ['855b1d', 'fbf2e4'], ['965267', 'faeef0'], ['246e62', 'e8f5f2']]) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, foreground + '/' + background);
  }
});

test('pointer depth is limited to three illustrations, with no layered chat decoration', () => {
  const landing = render(LandingPage, { active: true, visible: true, onNavigate: () => {} });
  assert.equal((landing.match(/data-hover-depth=/g) || []).length, 3);
  assert.equal((landing.match(/class="feature-visual feature-visual-[^"]+" aria-hidden="true"/g) || []).length, 3);
  for (const variant of ['forms', 'documents', 'routing']) assert.match(landing, new RegExp('feature-visual-' + variant));
  assert.doesNotMatch(landing, /data-hover-kind|hero-architecture|hero-orbit|hero-float-chip|hero-layer-node/);
  const workspace = render(LandingPage, { active: false, visible: true, onNavigate: () => {} });
  assert.doesNotMatch(workspace, /data-hover-depth|data-hover-kind|feature-visual/);
});

test('illustration tilt stays within four degrees, including outside and zero-sized surfaces', () => {
  const bounds = { left: 100, top: 100, width: 400, height: 200 };
  assert.deepEqual(hoverPosition(bounds, 300, 200), { rotateX: 0, rotateY: 0 });
  for (const x of [-1000, 100, 300, 500, 10000]) {
    for (const y of [-1000, 100, 200, 300, 10000]) {
      const position = hoverPosition(bounds, x, y);
      assert.ok(Math.abs(position.rotateX) <= 4);
      assert.ok(Math.abs(position.rotateY) <= 4);
    }
  }
  assert.ok(Object.values(hoverPosition({ left: 0, top: 0, width: 0, height: 0 }, 20, 20)).every(Number.isFinite));
});

test('chat lifts only on idle fine-pointer hover, without rotation or floating layers', () => {
  const source = readFileSync(resolve(frontend, 'src/hooks/useLandingHover.js'), 'utf8');
  assert.doesNotMatch(source, /hoverKind|--depth-/);
  const styles = postcss.parse(readFileSync(resolve(frontend, 'src/styles/landing-hover.css'), 'utf8'));
  const hover = styles.nodes.find((node) => node.type === 'atrule' && node.params.includes('pointer: fine'));
  const lift = hover.nodes.find((node) => node.selector.includes('.hero-chat-stage:hover .hero-chat-frame'));
  assert.match(lift.selector, /:not\(:focus-within\):not\(:has\(\[data-processing="true"\]\)\)/);
  assert.ok(lift.nodes.some((node) => node.prop === 'transform' && node.value === 'translateY(-6px)'));
  const fallback = styles.nodes.find((node) => node.type === 'atrule' && node.params.includes('prefers-reduced-motion: reduce'));
  assert.ok(fallback.nodes.find((node) => node.selector === '.landing-page .hero-chat-frame').nodes.some((node) => node.prop === 'transform' && node.value === 'none'));
  for (const path of ['landing.css', 'landing-motion.css', 'landing-hover.css']) {
    assert.doesNotMatch(readFileSync(resolve(frontend, 'src/styles', path), 'utf8'), /hero-chat-frame::|sheet-float|--depth-/);
  }
});

test('localized depth has no pointer light and respects preference, focus and cleanup', () => {
  const source = readFileSync(resolve(frontend, 'src/hooks/useLandingHover.js'), 'utf8');
  assert.doesNotMatch(source, /setState|preventDefault|socket|api\.|--hover-x|--hover-y/);
  assert.match(source, /if \(frame == null\) frame = requestAnimationFrame\(paint\)/);
  assert.match(source, /cancelAnimationFrame\(frame\)/);
  assert.match(source, /prefers-reduced-motion: no-preference/);
  assert.match(source, /removeEventListener\('pointermove', move\)/);
  assert.match(source, /removeEventListener\('focusin', reset\)/);
  const cssSource = readFileSync(resolve(frontend, 'src/styles/landing-hover.css'), 'utf8');
  assert.doesNotMatch(cssSource, /radial-gradient|--hover-x|--hover-y/);
  const css = postcss.parse(cssSource);
  const visual = css.nodes.find((node) => node.selector === '.feature-visual');
  assert.ok(visual.nodes.some((node) => node.prop === 'overflow' && node.value === 'hidden'));
  assert.ok(visual.nodes.some((node) => node.prop === 'pointer-events' && node.value === 'none'));
  css.walkRules((rule) => {
    if (rule.selector.endsWith('.hero-chat-frame') || rule.selector.endsWith('.capability-card.is-pointer-active')) {
      assert.ok(!rule.nodes.some((node) => node.prop === 'transform' && node.value !== 'none'), 'No tilt on cards or chat');
    }
  });
  const fallback = css.nodes.find((node) => node.type === 'atrule' && node.params.includes('prefers-reduced-motion: reduce'));
  assert.ok(fallback.nodes.find((node) => node.selector === '.feature-visual-stage').nodes.some((node) => node.prop === 'transition' && node.value === 'none'));
  for (const path of ['landing.css', 'landing-motion.css']) {
    const styles = postcss.parse(readFileSync(resolve(frontend, 'src/styles', path), 'utf8'));
    styles.walkRules((rule) => {
      if (rule.selector.includes('.capability-card:hover') || rule.selector.includes('.capability-card.is-revealed:hover')) {
        assert.ok(!rule.nodes.some((node) => node.prop === 'transform' && node.value !== 'none'), 'Card text must not move on hover');
      }
    });
  }
  const selectors = [];
  css.walkAtRules('media', (rule) => selectors.push(rule.params));
  assert.ok(selectors.some((query) => query.includes('pointer: coarse') && query.includes('prefers-reduced-motion: reduce')));
});

test('workspace blue tokens stay scoped and landing chat header uses a light surface', () => {
  const theme = postcss.parse(readFileSync(resolve(frontend, 'src/styles/workspace-theme.css'), 'utf8'));
  const tokens = theme.nodes.find((node) => node.selector === '.workspace-shell');
  assert.ok(tokens.nodes.some((node) => node.prop === '--eduref-primary' && node.value === '#225a9f'));
  theme.walkRules((rule) => assert.ok(rule.selector.startsWith('.workspace-shell'), rule.selector));
  const landing = postcss.parse(readFileSync(resolve(frontend, 'src/styles/landing.css'), 'utf8'));
  const header = landing.nodes.find((node) => node.selector === '.hero-chat-frame .student-chat-header');
  assert.ok(header.nodes.some((node) => node.prop === 'background' && node.value.includes('#e8f1fa')));
  assert.ok(!header.nodes.some((node) => node.value === '#202e29'));
});

test('landing and working headers share the blue palette, with optional help and a Track A badge', () => {
  for (const activeTab of ['LANDING', 'STUDENT_ASSISTANT']) {
    const html = render(TopNavbar, { activeTab, currentAccountKey: 'STUDENT_ACTIVE', sessionReady: true, socketConnected: true });
    assert.match(html, /header-competition-badge">VNG · Track A/);
    assert.match(html, /aria-label="Mở hướng dẫn sử dụng"/);
    assert.doesNotMatch(html, /aria-modal="true"/);
    if (activeTab === 'STUDENT_ASSISTANT') assert.match(html, /data-connected="true"/);
  }
  const styles = postcss.parse(readFileSync(resolve(frontend, 'src/styles/header-theme.css'), 'utf8'));
  const header = styles.nodes.find((node) => node.selector === '.app-shell .site-header');
  assert.ok(header.nodes.some((node) => node.prop === 'background' && node.value.includes('var(--eduref-header)')));
  assert.ok(styles.nodes.find((node) => node.selector === '.app-shell .site-header .header-help').nodes.some((node) => node.prop === 'color' && node.value === '#ffda74'));
});
