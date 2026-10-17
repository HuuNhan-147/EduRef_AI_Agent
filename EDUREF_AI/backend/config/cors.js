const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'https://edu-ref-ai-agent.vercel.app',
  'https://edu-ref-ai-agent-git-main-hu-nhans-projects.vercel.app',
  'https://edu-ref-ai-agent-fru4xivtn-hu-nhans-projects.vercel.app',
  'https://eduref.tech',
  'https://www.eduref.tech',
];

function normalizeConfiguredOrigin(value) {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

// Share the same allowlist between Express and Socket.IO. Environment values
// may be copied from the address bar with a trailing slash or a page path.
export function createOriginChecker(env = process.env) {
  const configuredOrigins = (env.FRONTEND_URL || '').split(',');
  const allowedOrigins = new Set(
    [...DEFAULT_ORIGINS, ...configuredOrigins].map(normalizeConfiguredOrigin).filter(Boolean)
  );

  return (origin) => {
    if (!origin) return true;
    if (allowedOrigins.has(origin)) return true;
    return /^https:\/\/edu-ref-ai-agent.*\.vercel\.app$/.test(origin);
  };
}
