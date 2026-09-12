import 'dotenv/config';
import axios from "axios";
import https from "https";
import { StringDecoder } from "string_decoder";

const httpsAgent = new https.Agent({ keepAlive: true });

export class GeminiStreamClient {
  constructor(apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest") {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  }

  /**
   * Gọi API Gemini dạng HTTP Stream và giải mã JSON stream an toàn
   * @param {Array} contents Lịch sử hội thoại
   * @param {Array} functionDeclarations Khai báo tool
   * @param {String} systemInstruction System prompt
   * @param {Function} onChunk Callback nhận từng chunk text thời gian thực
   */
  async streamGenerateContent(contents, functionDeclarations = [], systemInstruction = "", onChunk = null) {
    const activeKey = this.apiKey || process.env.GEMINI_API_KEY;
    const activeModel = this.model || process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

    if (!activeKey) {
      console.error("❌ [GeminiStreamClient] GEMINI_API_KEY is not defined in environment variables!");
      throw new Error("GEMINI_API_KEY chưa được cấu hình. Vui lòng kiểm tra file .env.");
    }

    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const payload = {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined,
          generationConfig: {
            temperature: 0.2, // Nhiệt độ thấp cho quyết định quy chế chuẩn xác
            maxOutputTokens: 2048,
          },
        };

        const response = await axios.post(
          `${this.baseUrl}/models/${activeModel}:streamGenerateContent?alt=sse&key=${activeKey}`,
          payload,
          {
            headers: { "Content-Type": "application/json" },
            responseType: "stream",
            timeout: 60000,
            httpsAgent: httpsAgent,
          }
        );


        let fullText = "";
        const originalParts = [];
        const decoder = new StringDecoder("utf8");

        return await new Promise((resolve, reject) => {
          let buffer = "";

          const processJsonObj = (jsonObj) => {
            const candidate = jsonObj.candidates?.[0];
            const content = candidate?.content;
            const text = content?.parts?.filter((p) => p.text).map((p) => p.text).join("");

            if (text) {
              fullText += text;
              if (onChunk) onChunk(text);
            }

            const parts = content?.parts?.filter((p) => p.functionCall || p.text) || [];
            originalParts.push(...parts);
          };

          response.data.on("data", (chunk) => {
            buffer += decoder.write(chunk);
            let lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (let line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              let jsonStr = trimmed;
              if (trimmed.startsWith("data:")) {
                jsonStr = trimmed.replace(/^data:\s*/, "").trim();
              }
              if (!jsonStr || jsonStr === "[" || jsonStr === "]") continue;
              if (jsonStr.startsWith(",")) jsonStr = jsonStr.substring(1).trim();
              if (jsonStr.endsWith(",")) jsonStr = jsonStr.substring(0, jsonStr.length - 1).trim();

              try {
                const jsonObj = JSON.parse(jsonStr);
                processJsonObj(jsonObj);
              } catch (e) {
                // Tiếp tục nhận buffer nếu chunk chưa kết thúc
              }
            }
          });

          response.data.on("end", () => {
            buffer += decoder.end();
            if (buffer.trim()) {
              let trimmed = buffer.trim();
              if (trimmed.startsWith("data:")) trimmed = trimmed.replace(/^data:\s*/, "").trim();
              try {
                processJsonObj(JSON.parse(trimmed));
              } catch (e) {}
            }

            const functionCallParts = originalParts.filter((p) => p.functionCall);

            resolve({
              text: fullText,
              functionCalls: functionCallParts.length > 0 ? functionCallParts.map((p) => p.functionCall) : null,
              functionCallsOriginalParts: functionCallParts,
              originalParts,
            });
          });

          response.data.on("error", (err) => {
            reject(err);
          });
        });
      } catch (error) {
        const isRateLimit = error.response?.status === 429;
        const isServerErr = error.response?.status >= 500;

        if ((isRateLimit || isServerErr) && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.warn(`[GeminiClient] Thử lại lần ${attempt}/${maxRetries} sau ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        console.error("[GeminiClient] Lỗi khi gọi Google Gemini Stream API:", error.message);
        throw error;
      }
    }
  }
}
