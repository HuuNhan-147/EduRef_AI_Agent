import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const backend = fileURLToPath(new URL('../', import.meta.url));
const integration = process.argv.includes('--integration');
const directory = integration ? 'test/integration' : 'test';
const files = fs.readdirSync(path.join(backend, directory))
  .filter((file) => file.endsWith('.test.js')).sort()
  .map((file) => `${directory}/${file}`);
if (!files.length) throw new Error('No test files found');

const preload = integration ? './testSupport/integrationTestEnv.js' : './testSupport/securityTestEnv.js';
const result = spawnSync(process.execPath, [
  '--import', preload, '--test', '--test-concurrency=1', ...files,
], { cwd: backend, stdio: 'inherit', env: process.env, windowsHide: true });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
