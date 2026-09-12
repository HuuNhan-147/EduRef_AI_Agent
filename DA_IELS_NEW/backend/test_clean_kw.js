import 'dotenv/config';
import mongoose from 'mongoose';

const STOP_WORDS = [
  "thiết bị", "thiet bi", "máy móc", "may moc", "sản phẩm", "san pham",
  "đồ", "do", "kho", "con", "cái", "cai", "chiếc", "chiec", "những", "nhung", "các", "cac",
  "có", "co", "không", "khong", "ko", "k", "bạn", "ban", "cho", "mượn", "muon", "xin",
  "cần", "can", "hỏi", "hoi", "ở", "o", "trong", "xem", "với", "vs", "nhé", "nhe", "ạ",
  "a", "nào", "nao", "gì", "gi", "chưa", "chua", "thì", "thi", "sao", "được", "duoc", "đc",
  "dc", "nữa", "nua", "ơi", "oi", "đi", "di", "dùm", "dum", "hộ", "ho"
];

function cleanSearchKeyword(rawKeyword) {
  if (!rawKeyword || typeof rawKeyword !== "string") return "";
  let cleaned = rawKeyword.trim().toLowerCase();

  // Sort stop words by length descending
  const sortedStopWords = [...STOP_WORDS].sort((a, b) => b.length - a.length);

  for (const sw of sortedStopWords) {
    const reg = new RegExp(`(^|\\s|[.,?!])${sw}(\\s|[.,?!]|$)`, "gi");
    cleaned = cleaned.replace(reg, " ");
  }
  return cleaned.replace(/\s+/g, " ").trim();
}

console.log("clean 'kho có máy chiếu không bạn' ➔", cleanSearchKeyword("kho có máy chiếu không bạn"));
console.log("clean 'cho mượn cái mic đi bạn' ➔", cleanSearchKeyword("cho mượn cái mic đi bạn"));
console.log("clean 'máy chiếu thì sao' ➔", cleanSearchKeyword("máy chiếu thì sao"));
console.log("clean 'có máy chiếu' ➔", cleanSearchKeyword("có máy chiếu"));
