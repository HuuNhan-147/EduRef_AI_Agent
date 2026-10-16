import 'dotenv/config';
import axios from 'axios';
import https from 'https';
import { StringDecoder } from 'string_decoder';

const httpsAgent = new https.Agent({ keepAlive: true });

let globalKeyIndex = 0;

// Ngưỡng canh stream: im lặng quá lâu, và tổng thời lượng một lượt (có thể ghi đè bằng biến môi trường)
const STREAM_IDLE_TIMEOUT_MS = Number(process.env.GEMINI_STREAM_IDLE_TIMEOUT_MS) || 30_000;
const STREAM_MAX_DURATION_MS = Number(process.env.GEMINI_STREAM_MAX_DURATION_MS) || 120_000;

export class GeminiStreamClient {
  constructor(apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite') {
    const rawKeys = apiKey || process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    this.apiKeys = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);
    this.model = model;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * Xác định danh sách mô hình cần thử nghiệm theo thứ tự ưu tiên (Primary -> Fallbacks)
   */
  getModelsToTry(requestedModel = null) {
    const rawFallbacks = process.env.GEMINI_FALLBACK_MODELS || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-flash-lite-latest';
    const defaultList = rawFallbacks.split(',').map((m) => m.trim()).filter(Boolean);
    const target = (requestedModel || this.model || '').trim();

    if (!target || target === 'auto') {
      return defaultList.length > 0 ? defaultList : ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
    }

    // Nếu target nằm trong danh sách production models được hỗ trợ, cho phép fallback sang các model còn lại
    if (defaultList.includes(target)) {
      const others = defaultList.filter((m) => m !== target);
      return [target, ...others];
    }

    // Nếu là model custom (ví dụ trong test: 'test-model'), chỉ chạy đúng model đó
    return [target];
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
   * Hỗ trợ tự động xoay Model (Model Fallback) và xoay Key khi gặp lỗi 503, 429 hoặc timeout
   * @param {Array} contents Lịch sử hội thoại
   * @param {Array} functionDeclarations Khai báo tool
   * @param {String} systemInstruction System prompt
   * @param {Function} onChunk Callback nhận từng chunk text thời gian thực
   * @param {AbortSignal} signal Tín hiệu ngắt
   * @param {String} requestedModel Tên model tùy chọn yêu cầu từ client
   */
  async streamGenerateContent(contents, functionDeclarations = [], systemInstruction = '', onChunk = null, signal = null, requestedModel = null) {
    const totalKeys = Math.max(this.apiKeys.length, 1);
    const modelsToTry = this.getModelsToTry(requestedModel);

    if (this.apiKeys.length === 0) {
      console.error('❌ [GeminiStreamClient] GEMINI_API_KEY is not defined in environment variables!');
      throw new Error('GEMINI_API_KEY chưa được cấu hình. Vui lòng kiểm tra file .env.');
    }

    if (signal?.aborted) {
      return {
        text: '',
        parts: [],
        duration: 0,
        ttfb: 0,
        model: modelsToTry[0] || 'gemini-3.1-flash-lite',
        isAborted: true,
      };
    }

    let lastError = null;

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const activeModel = modelsToTry[mIdx];

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
            signal: signal || undefined,
          }
        );

        let fullText = '';
        const originalParts = [];
        const decoder = new StringDecoder('utf8');
        const apiStartTime = Date.now();
        let ttfb = null;

        return await new Promise((resolve, reject) => {
          let buffer = '';
          let settled = false;
          let idleTimer = null;
          let maxTimer = null;

          // `timeout` của axios với responseType 'stream' chỉ áp cho lúc chờ header; nếu Gemini
          // gửi header rồi im lặng thì promise treo mãi, giữ cả phiên chat và controller trong RAM.
          // Vì vậy tự canh hai ngưỡng: im lặng quá lâu, và tổng thời lượng một lượt stream.
          const cleanup = () => {
            clearTimeout(idleTimer);
            clearTimeout(maxTimer);
            if (signal) signal.removeEventListener('abort', onAbort);
          };
          const settleResolve = (value) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(value);
          };
          const settleReject = (error) => {
            if (settled) return;
            settled = true;
            cleanup();
            try {
              response.data?.destroy();
            } catch (e) {}
            reject(error);
          };
          const failTimeout = (reason) => {
            const timeoutError = new Error(reason);
            timeoutError.code = 'ESTREAMTIMEOUT';
            timeoutError.expose = true; // thông báo an toàn để hiển thị cho người dùng
            console.warn(`⏱️ [GeminiStreamClient] ${reason} (Key: ${maskedKey}, Model: ${activeModel})`);
            settleReject(timeoutError);
          };
          const armIdleTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(
              () => failTimeout(`Trợ lý AI không phản hồi trong ${STREAM_IDLE_TIMEOUT_MS / 1000} giây, vui lòng thử lại.`),
              STREAM_IDLE_TIMEOUT_MS
            );
          };

          const onAbort = () => {
            try {
              response.data?.destroy();
            } catch (e) {}
            settleResolve({
              text: fullText,
              parts: originalParts,
              duration: Date.now() - apiStartTime,
              ttfb: ttfb || 0,
              model: activeModel,
              isAborted: true,
            });
          };

          if (signal) {
            if (signal.aborted) {
              onAbort();
              return;
            }
            signal.addEventListener('abort', onAbort, { once: true });
          }

          armIdleTimer();
          maxTimer = setTimeout(
            () => failTimeout(`Trợ lý AI xử lý quá ${STREAM_MAX_DURATION_MS / 1000} giây, vui lòng thử lại.`),
            STREAM_MAX_DURATION_MS
          );

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
            if (signal?.aborted) {
              onAbort();
              return;
            }
            armIdleTimer(); // còn nhận được dữ liệu => chưa treo
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
            if (settled) return;
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

            settleResolve({
              text: fullText,
              parts: originalParts,
              duration: totalDuration,
              ttfb: ttfb || totalDuration,
              model: activeModel,
              isAborted: false,
            });
          });

          response.data.on('error', (err) => {
            if (signal?.aborted || axios.isCancel(err) || err.name === 'CanceledError' || err.name === 'AbortError') {
              onAbort();
            } else {
              settleReject(err);
            }
          });

          // Kết nối bị đóng giữa chừng mà không có 'end'/'error' (proxy ngắt, Gemini reset):
          // trước đây promise treo vĩnh viễn.
          response.data.on('close', () => {
            if (!settled) {
              const closedError = new Error('Kết nối tới trợ lý AI bị ngắt giữa chừng, vui lòng thử lại.');
              closedError.code = 'ESTREAMCLOSED';
              closedError.expose = true;
              settleReject(closedError);
            }
          });
        });
      } catch (err) {
        lastError = err;
        if (signal?.aborted || axios.isCancel(err) || err.name === 'CanceledError' || err.name === 'AbortError') {
          console.log('⏹ [GeminiStreamClient] Yêu cầu stream đã dừng an toàn theo tín hiệu người dùng.');
          return {
            text: '',
            parts: [],
            duration: 0,
            ttfb: 0,
            model: activeModel,
            isAborted: true,
          };
        }

        // 1. Nếu lỗi quá tải từ phía máy chủ Google (503, 500, 502, 504)
        const isServerOverloaded = err.response && [500, 502, 503, 504].includes(err.response.status);

        if (isServerOverloaded && mIdx < modelsToTry.length - 1) {
          console.warn(`🔄 [ModelFallback] Mô hình [${activeModel}] gặp sự cố (${err.response?.status}), tự động chuyển sang mô hình dự phòng [${modelsToTry[mIdx + 1]}]...`);
          break; // Thoát vòng lặp key để sang model tiếp theo
        }

        // 2. Nếu lỗi hạn mức API Key (429, 403) thì xoay sang Key tiếp theo trước
        const isRecoverableKey = err.response && [429, 403].includes(err.response.status);
        if (isRecoverableKey && keyAttempt < totalKeys - 1) {
          console.warn(`🔄 [KeyRotator] Key [${maskedKey}] gặp sự cố (${err.response?.status}), tự động chuyển sang Key tiếp theo (${keyAttempt + 1}/${totalKeys})...`);
          continue;
        }

        // 3. Nếu hết Key cho model này và vẫn còn model dự phòng khác
        if (mIdx < modelsToTry.length - 1) {
          console.warn(`🔄 [ModelFallback] Mô hình [${activeModel}] cạn kiệt key khả dụng, thử sang mô hình dự phòng [${modelsToTry[mIdx + 1]}]...`);
          break;
        }

        console.error('❌ [GeminiStreamClient] Lỗi khi gọi Gemini API:', err.response?.data || err.message);
        throw err;
      }
    } // end keyAttempt
  } // end mIdx

  if (lastError) {
    throw lastError;
  }
}

  /**
   * Gọi API Gemini dạng Non-Streaming trả về định dạng JSON (dùng cho Vision OCR & Document Analysis)
   * @param {Array} contents Mảng các parts (text, inline_data...)
   * @param {String} systemInstruction System prompt chỉ dẫn
   * @param {String} requestedModel Tên model tùy chọn yêu cầu từ client
   */
  async generateJson(contents, systemInstruction = '', requestedModel = null) {
    if (this.apiKeys.length === 0) {
      throw new Error('GEMINI_API_KEY chưa được cấu hình. Vui lòng kiểm tra file .env.');
    }

    const totalKeys = Math.max(this.apiKeys.length, 1);
    const modelsToTry = this.getModelsToTry(requestedModel);
    let lastError = null;

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const activeModel = modelsToTry[mIdx];

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
          lastError = err;
          const isServerOverloaded = err.response && [500, 502, 503, 504].includes(err.response.status);
          if (isServerOverloaded && mIdx < modelsToTry.length - 1) {
            console.warn(`🔄 [ModelFallback/Vision] Mô hình [${activeModel}] gặp sự cố (${err.response?.status}), tự động chuyển sang mô hình dự phòng [${modelsToTry[mIdx + 1]}]...`);
            break;
          }

          const isRecoverable = err.response && [429, 403].includes(err.response.status);
          if (isRecoverable && keyAttempt < totalKeys - 1) {
            console.warn(`🔄 [KeyRotator/Vision] Key [${maskedKey}] gặp sự cố (${err.response?.status}), tự động chuyển sang Key tiếp theo (${keyAttempt + 1}/${totalKeys})...`);
            continue;
          }

          if (mIdx < modelsToTry.length - 1) {
            break;
          }
          throw err;
        }
      }
    }

    if (lastError) throw lastError;
  }
}

export default GeminiStreamClient;
