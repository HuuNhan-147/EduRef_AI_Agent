// backend/modules/ai-agent/memory/ContextResolver.js
// ============================================
// BỘ TIỀN XỬ LÝ NGÔN NGỮ & ĐIỀU HỢP NGỮ CẢNH (Kế thừa & Tối ưu từ DA_IELS_OLD)
// ============================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { conversationMemory } from "./ConversationMemory.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dictPath = path.resolve(__dirname, "../../../config/slangDictionary.json");

let slangDict = {};
try {
  if (fs.existsSync(dictPath)) {
    const raw = fs.readFileSync(dictPath, "utf8");
    slangDict = JSON.parse(raw);
    console.log(`📚 [ContextResolver] Đã nạp thành công từ điển với ${Object.keys(slangDict).length} mục từ.`);
  }
} catch (e) {
  console.warn("⚠️ [ContextResolver] Không thể đọc slangDictionary.json, sử dụng fallback:", e.message);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Chuẩn hóa từ lóng, viết tắt và tên thiết bị
 */
export function normalizeSlang(text) {
  if (!text || typeof text !== "string") return "";
  let t = text.trim().toLowerCase();

  const validKeys = Object.keys(slangDict).filter(
    (k) => !k.startsWith("___") && typeof slangDict[k] === "string"
  );

  // Sắp xếp từ dài nhất lên trước để tránh thay thế đè các cụm từ ghép
  const sortedKeys = validKeys.sort((a, b) => b.length - a.length);

  for (const k of sortedKeys) {
    const v = slangDict[k];
    const re = new RegExp(`(^|\\s|[.,?!])${escapeRegExp(k)}(\\s|[.,?!]|$)`, "gi");
    t = t.replace(re, `$1${v}$2`);
  }

  return t.replace(/\s+/g, " ").trim();
}

/**
 * Trích xuất số thứ tự từ văn bản (VD: "mượn cái thứ 2", "con số 1")
 */
export function extractIndexFromText(text) {
  if (!text) return null;
  const match = text.match(/(?:thứ|cái thứ|con thứ|món thứ|số)\s*(\d+)/i);
  if (match) {
    const n = parseInt(match[1], 10);
    return isNaN(n) ? null : n;
  }
  return null;
}

/**
 * Trích xuất đại từ chỉ định từ văn bản
 */
export function extractPronounFromText(text) {
  if (!text) return null;
  const patterns = [
    /(^|\s|[.,?!])(nó|cái này|thiết bị này|máy này|con này|món này|em này|cái đó|máy đó)(\s|[.,?!]|$)/i,
    /(^|\s|[.,?!])(vừa nãy|vừa xem|trước đó|ở trên)(\s|[.,?!]|$)/i,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) return match[2];
  }
  return null;
}

/**
 * Phân giải tham chiếu đại từ sang thiết bị cụ thể trong phiên
 */
export async function resolveReference({ userId, sessionId, index, pronoun, text }) {
  if (!sessionId) return null;

  try {
    const session = conversationMemory.sessions?.get(sessionId);
    if (!session || !session.meta) return null;

    const lastEquipment = session.meta.lastViewedEquipment;
    if (!lastEquipment) return null;

    return {
      success: true,
      equipment: {
        id: lastEquipment.id || lastEquipment._id,
        name: lastEquipment.name,
        modelCode: lastEquipment.modelCode || lastEquipment.assetCode,
        estimatedValue: lastEquipment.estimatedValue || lastEquipment.value,
      },
      message: `Phân giải đại từ sang thiết bị: ${lastEquipment.name}`,
    };
  } catch (err) {
    console.warn("⚠️ [ContextResolver] resolveReference error:", err.message);
    return null;
  }
}

/**
 * Xử lý đầu vào: Chuẩn hóa từ lóng + Đính kèm thông tin đại từ tham chiếu
 */
export async function processInput(text, userId, sessionId) {
  if (!text) return { text: "", resolved: null };

  const clean = normalizeSlang(text);
  let processedText = clean;
  let resolvedReference = null;

  const index = extractIndexFromText(clean);
  const pronoun = extractPronounFromText(clean);

  if (index !== null || pronoun !== null) {
    const resolution = await resolveReference({ userId, sessionId, index, pronoun, text: clean });
    if (resolution && resolution.success && resolution.equipment) {
      resolvedReference = resolution;
      const eq = resolution.equipment;
      processedText = `${clean} [EQUIPMENT_REFERENCE: name="${eq.name}", modelCode="${eq.modelCode}", id="${eq.id}"]`;
    }
  }

  return {
    text: processedText,
    resolved: resolvedReference,
  };
}
