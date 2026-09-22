import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const rawKeys = process.env.GEMINI_API_KEY || '';
const keys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

console.log(`Tìm thấy ${keys.length} key trong file .env`);

async function testAll() {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const masked = key.slice(0, 10) + '...' + key.slice(-6);
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${key}`,
        { contents: [{ parts: [{ text: 'Trả lời: OK' }] }] },
        { timeout: 10000 }
      );
      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Có phản hồi';
      console.log(`✅ Key ${i + 1} [${masked}]: HOẠT ĐỘNG TỐT (${text})`);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error?.message || err.message;
      console.log(`❌ Key ${i + 1} [${masked}]: LỖI (${status || 'Error'}): ${message}`);
    }
  }
}

testAll();
