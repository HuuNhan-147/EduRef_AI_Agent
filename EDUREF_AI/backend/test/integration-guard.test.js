import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const guard = fileURLToPath(new URL('../testSupport/integrationTestEnv.js', import.meta.url));
test('integration guard rejects absent opt-in and remote/shared database URLs before loading services', () => {
  for (const env of [
    { ALLOW_INTEGRATION_TESTS: 'false', DATABASE_URL: 'postgresql://test@localhost/local_test', DIRECT_URL: 'postgresql://test@localhost/local_test' },
    { ALLOW_INTEGRATION_TESTS: 'true', DATABASE_URL: 'postgresql://test@db.example.org/demo_test', DIRECT_URL: 'postgresql://test@localhost/local_test' },
    { ALLOW_INTEGRATION_TESTS: 'true', DATABASE_URL: 'postgresql://test@localhost/shared_demo', DIRECT_URL: 'postgresql://test@localhost/local_test' },
  ]) {
    const result = spawnSync(process.execPath, [guard], { env: { ...process.env, ...env }, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /local disposable/);
  }
});
