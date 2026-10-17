import { toDisplayText } from './displayText.js';

export function normalizeMarkdown(content, isUser = false) {
  const raw = String(content ?? '').replace(/__(.+?)__/g, '**$1**');
  const source = isUser ? raw : toDisplayText(raw);
  return source.replace(/\r\n?/g, '\n').replace(/\\r\\n|\\n/g, '\n')
    .replace(/\]\s*\n\s*\(/g, '](')
    .replace(/\*\*\[([^\]]+)\]\*\*\s*\((https?:\/\/[^\s)]+)\)/g, '**[$1]($2)**')
    .replace(/([^\n])\s+(?=\d+[.)]\s+(?:\*\*|__))/g, '$1\n');
}
export function safeLink(href) {
  return /^(?:https?:\/\/|\/(?!\/)|#[\w-])/i.test(href) ? href : null;
}
