import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { conversationMemory } from './ConversationMemory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dictPath = path.resolve(__dirname, '../../../config/slangDictionary.json');

let slangDict = {};
try {
  if (fs.existsSync(dictPath)) {
    const raw = fs.readFileSync(dictPath, 'utf8');
    slangDict = JSON.parse(raw);
    console.log(`📚 [ContextResolver] Đã nạp thành công từ điển học vụ với ${Object.keys(slangDict).length} thuật ngữ viết tắt.`);
  }
} catch (e) {
  console.warn('⚠️ [ContextResolver] Không thể nạp slangDictionary.json:', e.message);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Chuẩn hóa từ lóng, viết tắt học vụ tiếng Việt
 */
export function normalizeSlang(text) {
  if (!text || typeof text !== 'string') return '';
  let t = text.trim().toLowerCase();

  const validKeys = Object.keys(slangDict).filter((k) => typeof slangDict[k] === 'string');

  // Sắp xếp từ dài nhất lên trước để tránh thay thế đè các từ ghép
  const sortedKeys = validKeys.sort((a, b) => b.length - a.length);

  for (const k of sortedKeys) {
    const v = slangDict[k];
    const re = new RegExp(`(^|\\s|[.,?!])${escapeRegExp(k)}(\\s|[.,?!]|$)`, 'gi');
    t = t.replace(re, `$1${v}$2`);
  }

  return t.replace(/\s+/g, ' ').trim();
}

/**
 * Phân giải đại từ chỉ định và ngữ cảnh đa lượt
 */
export function resolveContext(text, sessionId = null) {
  const normalizedText = normalizeSlang(text);

  if (!sessionId) return normalizedText;

  const lastRequestId = conversationMemory.getSessionMeta(sessionId, 'lastRequestId');
  const lastRequestType = conversationMemory.getSessionMeta(sessionId, 'lastRequestType');

  // Phát hiện đại từ chỉ định: "đơn đó", "hồ sơ vừa tạo", "cái này", "môn đó"
  const pronounPatterns = /(?:đơn đó|hồ sơ đó|cái đó|vừa tạo|vừa xin|cái đơn vừa rồi)/i;

  if (pronounPatterns.test(normalizedText) && lastRequestId) {
    console.log(`🔗 [ContextResolver] Ánh xạ đại từ chỉ định sang đơn gần nhất: [${lastRequestId}]`);
    return `${normalizedText} [NGỮ CẢNH HỘI THOẠI TRƯỚC: Sinh viên đang nói về hồ sơ requestId="${lastRequestId}", loại đơn="${lastRequestType || ''}"]`;
  }

  return normalizedText;
}

export default { normalizeSlang, resolveContext };
