import { fileURLToPath } from 'node:url';

// Integration tests create petitions. Require an explicit opt-in and a local,
// disposable database named *_test. Never load credentials from the app's .env.
function isDisposableLocalDatabase(value) {
  try {
    const url = new URL(value);
    return ['postgres:', 'postgresql:'].includes(url.protocol)
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      && /_test$/.test(decodeURIComponent(url.pathname.slice(1)));
  } catch {
    return false;
  }
}

if (process.env.ALLOW_INTEGRATION_TESTS !== 'true'
  || !isDisposableLocalDatabase(process.env.DATABASE_URL)
  || !isDisposableLocalDatabase(process.env.DIRECT_URL)) {
  throw new Error('Integration tests require ALLOW_INTEGRATION_TESTS=true and explicit DATABASE_URL/DIRECT_URL to a local disposable *_test database.');
}

process.env.NODE_ENV = 'test';
process.env.DOTENV_CONFIG_PATH = fileURLToPath(new URL('./.no-app-env', import.meta.url));
process.env.GEMINI_API_KEY = 'integration-test-key-not-real';
process.env.GEMINI_API_KEYS = 'integration-test-key-not-real';
process.env.JWT_SECRET = 'integration-test-secret-0123456789abcdef0123456789abcdef';
