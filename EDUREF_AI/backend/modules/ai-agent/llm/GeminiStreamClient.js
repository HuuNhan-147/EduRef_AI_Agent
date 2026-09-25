import 'dotenv/config';
import axios from 'axios';
import https from 'https';
import { StringDecoder } from 'string_decoder';

const httpsAgent = new https.Agent({ keepAlive: true });

let globalKeyIndex = 0;

export class GeminiStreamClient {
  constructor(apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest') {
    const rawKeys = apiKey || process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    this.apiKeys = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);
    this.model = model;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * Lấy API Key tiếp theo theo cơ chế Round-Robin
   */
  getNextKey() {
    if (this.apiKeys.length === 0) return null;
    const key = this.apiKeys[globalKeyIndex % this.apiKeys.length];
    globalKeyIndex++;
    return key;
  }

  /**
   * Gọi API Gemini dạng HTTP Stream và giải mã JSON stream an toàn
   * Hỗ trợ tự động xoay Key khi gặp giới hạn Quota (429) hoặc lỗi mạng
   * @param {Array} contents Lịch sử hội thoại
   * @param {Array} functionDeclarations Khai báo tool
   * @param {String} systemInstruction System prompt
   * @param {Function} onChunk Callback nhận từng chunk text thời gian thực
   */
  async streamGenerateContent(contents, functionDeclarations = [], systemInstruction = '', onChunk = null) {
    const totalKeys = Math.max(this.apiKeys.length, 1);
    const activeModel = this.model || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

    if (this.apiKeys.length === 0) {
      console.error('❌ [GeminiStreamClient] GEMINI_API_KEY is not defined in environment variables!');
      throw new Error('GEMINI_API_KEY chưa được cấu hình. Vui lòng kiểm tra file .env.');
    }

    for (let keyAttempt = 0; keyAttempt < totalKeys; keyAttempt++) {
      const activeKey = this.getNextKey();
      const keyIdx = ((globalKeyIndex - 1) % this.apiKeys.length) + 1;
      const maskedKey = `API_KEY_#${keyIdx}/${this.apiKeys.length}`;

      try {
        const payload = {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined,
          generationConfig: {
            temperature: 0.1, // Nhiệt độ rất thấp để đảm bảo tính tuân thủ quy chế
            maxOutputTokens: 2048,
          },
        };

        const response = await axios.post(
          `${this.baseUrl}/models/${activeModel}:streamGenerateContent?alt=sse&key=${activeKey}`,
          payload,
          {
            headers: { 'Content-Type': 'application/json' },
            responseType: 'stream',
            timeout: 60000,
            httpsAgent: httpsAgent,
          }
        );

        let fullText = '';
        const originalParts = [];
        const decoder = new StringDecoder('utf8');
        const apiStartTime = Date.now();
        let ttfb = null;

        return await new Promise((resolve, reject) => {
          let buffer = '';

          const processJsonObj = (jsonObj) => {
            const candidate = jsonObj.candidates?.[0];
            const content = candidate?.content;
            const text = content?.parts?.filter((p) => p.text).map((p) => p.text).join('');

            if (text) {
              fullText += text;
              if (onChunk) onChunk(text);
            }

            const parts = content?.parts?.filter((p) => p.functionCall || p.text) || [];
            originalParts.push(...parts);
          };

          response.data.on('data', (chunk) => {
            if (ttfb === null) {
              ttfb = Date.now() - apiStartTime;
            }
            buffer += decoder.write(chunk);
            let lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (let line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              let jsonStr = trimmed;
              if (trimmed.startsWith('data:')) {
                jsonStr = trimmed.replace(/^data:\s*/, '').trim();
              }
              if (!jsonStr || jsonStr === '[' || jsonStr === ']') continue;
              if (jsonStr.startsWith(',')) jsonStr = jsonStr.substring(1).trim();
              if (jsonStr.endsWith(',')) jsonStr = jsonStr.substring(0, jsonStr.length - 1).trim();

              try {
                const jsonObj = JSON.parse(jsonStr);
                processJsonObj(jsonObj);
              } catch (e) {
                // Tiếp tục nhận buffer nếu chunk chưa kết thúc
              }
            }
          });

          response.data.on('end', () => {
            if (buffer.trim()) {
              let jsonStr = buffer.trim();
              if (jsonStr.startsWith('data:')) jsonStr = jsonStr.replace(/^data:\s*/, '').trim();
              try {
                const jsonObj = JSON.parse(jsonStr);
                processJsonObj(jsonObj);
              } catch (e) {}
            }

            const totalDuration = Date.now() - apiStartTime;
            const hasTool = originalParts.some((p) => p.functionCall);
            console.log(
              `⚡ [LLM Performance] Model: ${activeModel} | Key: ${maskedKey} | TTFB: ${ttfb || totalDuration}ms | Tổng: ${totalDuration}ms | Kiểu: ${hasTool ? '🔧 Tool Calling' : '💬 Text Stream'}`
            );

            resolve({
              text: fullText,
              parts: originalParts,
              duration: totalDuration,
              ttfb: ttfb || totalDuration,
              model: activeModel,
            });
          });

          response.data.on('error', (err) => {
            reject(err);
          });
        });
      } catch (err) {
        const isRecoverable = err.response && [429, 403, 500, 503, 504].includes(err.response.status);
        if (isRecoverable && keyAttempt < totalKeys - 1) {
          console.warn(`🔄 [KeyRotator] Key [${maskedKey}] gặp sự cố (${err.response?.status}), tự động chuyển sang Key tiếp theo (${keyAttempt + 1}/${totalKeys})...`);
          continue;
        }
        console.error('❌ [GeminiStreamClient] Lỗi khi gọi Gemini API:', err.response?.data || err.message);
        throw err;
      }
    }
  }

  /**
   * Gọi API Gemini dạng Non-Streaming trả về định dạng JSON (dùng cho Vision OCR & Document Analysis)
   * @param {Array} contents Mảng các parts (text, inline_data...)
   * @param {String} systemInstruction System prompt chỉ dẫn
   */
  async generateJson(contents, systemInstruction = '') {
    if (this.apiKeys.length === 0) {
      throw new Error('GEMINI_API_KEY chưa được cấu hình. Vui lòng kiểm tra file .env.');
    }

    const totalKeys = Math.max(this.apiKeys.length, 1);
    const activeModel = this.model || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

    for (let keyAttempt = 0; keyAttempt < totalKeys; keyAttempt++) {
      const activeKey = this.getNextKey();
      const keyIdx = ((globalKeyIndex - 1) % this.apiKeys.length) + 1;
      const maskedKey = `API_KEY_#${keyIdx}/${this.apiKeys.length}`;

      try {
        const payload = {
          system_instruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          contents,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        };

        const res = await axios.post(
          `${this.baseUrl}/models/${activeModel}:generateContent?key=${activeKey}`,
          payload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
            httpsAgent,
          }
        );

        return res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (err) {
        const isRecoverable = err.response && [429, 403, 500, 503, 504].includes(err.response.status);
        if (isRecoverable && keyAttempt < totalKeys - 1) {
          console.warn(`🔄 [KeyRotator/Vision] Key [${maskedKey}] gặp sự cố (${err.response?.status}), tự động chuyển sang Key tiếp theo (${keyAttempt + 1}/${totalKeys})...`);
          continue;
        }
        throw err;
      }
    }
  }
}

export default GeminiStreamClient;
