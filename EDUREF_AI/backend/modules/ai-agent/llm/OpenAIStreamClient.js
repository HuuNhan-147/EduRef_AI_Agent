import 'dotenv/config';
import axios from 'axios';
import https from 'https';
import { StringDecoder } from 'string_decoder';

const httpsAgent = new https.Agent({ keepAlive: true });

let globalKeyIndex = 0;

// Ngưỡng canh stream
const STREAM_IDLE_TIMEOUT_MS = Number(process.env.OPENAI_STREAM_IDLE_TIMEOUT_MS) || 30_000;
const STREAM_MAX_DURATION_MS = Number(process.env.OPENAI_STREAM_MAX_DURATION_MS) || 120_000;

export class OpenAIStreamClient {
  constructor(apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL || 'gpt-4o-mini') {
    const rawKeys = apiKey || process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || '';
    this.apiKeys = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);
    this.model = model;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  /**
   * Danh sách model cần thử theo thứ tự ưu tiên
   */
  getModelsToTry(requestedModel = null) {
    const rawFallbacks = process.env.OPENAI_FALLBACK_MODELS || process.env.OPENAI_MODEL || 'gpt-4o-mini,gpt-5.4-mini,gpt-4.1-mini,gpt-5.5,gpt-6.1-sol,gpt-4.1,gpt-5.6-sol';
    const defaultList = rawFallbacks.split(',').map((m) => m.trim()).filter(Boolean);
    const target = (requestedModel || this.model || '').trim();

    if (!target || target === 'auto') {
      return defaultList.length > 0 ? defaultList : ['gpt-4o-mini', 'gpt-5.4-mini', 'gpt-4.1-mini'];
    }

    if (defaultList.includes(target)) {
      const others = defaultList.filter((m) => m !== target);
      return [target, ...others];
    }

    return [target];
  }

  getNextKey() {
    if (this.apiKeys.length === 0) return null;
    const key = this.apiKeys[globalKeyIndex % this.apiKeys.length];
    globalKeyIndex++;
    return key;
  }

  /**
   * Chuyển đổi định dạng contents của Gemini sang messages chuẩn của OpenAI Chat Completions (/v1/chat/completions)
   */
  convertGeminiContentsToOpenAIMessages(contents = [], systemInstruction = '') {
    const messages = [];

    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }

    let toolCallCounter = 1;
    let pendingCallId = null;

    for (const c of contents) {
      if (!c) continue;

      // 1. Kiểm tra kết quả trả về từ Tool (chuẩn Gemini lưu role 'user' hoặc 'function' kèm functionResponse)
      const functionResponsePart = (c.parts || []).find((p) => p.functionResponse);
      if (functionResponsePart) {
        const contentVal = functionResponsePart.functionResponse?.response?.content ?? functionResponsePart.functionResponse?.response ?? {};
        messages.push({
          role: 'tool',
          tool_call_id: pendingCallId || `call_legacy_${toolCallCounter++}`,
          content: typeof contentVal === 'string' ? contentVal : JSON.stringify(contentVal),
        });
        pendingCallId = null;
        continue;
      }

      // 2. Lời thoại người dùng
      if (c.role === 'user') {
        const text = (c.parts || []).map((p) => p.text || '').filter(Boolean).join('\n');
        messages.push({ role: 'user', content: text || '' });
      } else if (c.role === 'model') {
        const textPart = (c.parts || []).find((p) => p.text);
        const functionCallPart = (c.parts || []).find((p) => p.functionCall);

        if (functionCallPart) {
          pendingCallId = `call_${Date.now()}_${toolCallCounter++}`;
          messages.push({
            role: 'assistant',
            content: textPart?.text || '',
            tool_calls: [
              {
                id: pendingCallId,
                type: 'function',
                function: {
                  name: functionCallPart.functionCall.name,
                  arguments: JSON.stringify(functionCallPart.functionCall.args || {}),
                },
              },
            ],
          });
        } else {
          messages.push({ role: 'assistant', content: textPart ? textPart.text : '' });
        }
      }
    }

    return messages;
  }

  /**
   * Chuyển đổi định dạng contents của Gemini sang input chuẩn của OpenAI Responses API (/v1/responses)
   */
  convertGeminiContentsToResponsesInput(contents = []) {
    const inputItems = [];
    let toolCallCounter = 1;
    let pendingCallId = null;

    for (const c of contents) {
      if (!c) continue;

      const functionResponsePart = (c.parts || []).find((p) => p.functionResponse);
      if (functionResponsePart) {
        const contentVal = functionResponsePart.functionResponse?.response?.content ?? functionResponsePart.functionResponse?.response ?? {};
        inputItems.push({
          type: 'function_call_output',
          call_id: pendingCallId || `call_legacy_${toolCallCounter++}`,
          output: typeof contentVal === 'string' ? contentVal : JSON.stringify(contentVal),
        });
        pendingCallId = null;
        continue;
      }

      if (c.role === 'user') {
        const text = (c.parts || []).map((p) => p.text || '').filter(Boolean).join('\n');
        inputItems.push({ role: 'user', content: text || '' });
      } else if (c.role === 'model') {
        const textPart = (c.parts || []).find((p) => p.text);
        const functionCallPart = (c.parts || []).find((p) => p.functionCall);

        if (textPart?.text) {
          inputItems.push({ role: 'assistant', content: textPart.text });
        }
        if (functionCallPart) {
          pendingCallId = `call_${Date.now()}_${toolCallCounter++}`;
          inputItems.push({
            type: 'function_call',
            call_id: pendingCallId,
            name: functionCallPart.functionCall.name,
            arguments: JSON.stringify(functionCallPart.functionCall.args || {}),
          });
        }
      }
    }

    return inputItems;
  }

  /**
   * Chuẩn hóa kiểu dữ liệu schema từ UPPERCASE (của Gemini) sang lowercase (chuẩn JSON Schema của OpenAI)
   */
  normalizeSchemaTypes(schema) {
    if (!schema || typeof schema !== 'object') return schema;
    if (Array.isArray(schema)) return schema.map((item) => this.normalizeSchemaTypes(item));

    const copy = { ...schema };
    if (typeof copy.type === 'string') {
      copy.type = copy.type.toLowerCase();
    }
    if (copy.properties && typeof copy.properties === 'object') {
      const newProps = {};
      for (const [k, v] of Object.entries(copy.properties)) {
        newProps[k] = this.normalizeSchemaTypes(v);
      }
      copy.properties = newProps;
    }
    if (copy.items) {
      copy.items = this.normalizeSchemaTypes(copy.items);
    }
    return copy;
  }

  /**
   * Chuyển đổi khai báo Tool từ Gemini sang OpenAI format (chuẩn JSON Schema)
   */
  convertTools(functionDeclarations = []) {
    if (!Array.isArray(functionDeclarations) || functionDeclarations.length === 0) {
      return undefined;
    }
    return functionDeclarations.map((fn) => ({
      type: 'function',
      function: {
        name: fn.name,
        description: fn.description,
        parameters: this.normalizeSchemaTypes(fn.parameters || { type: 'object', properties: {} }),
      },
    }));
  }

  /**
   * Gọi API OpenAI dạng Stream SSE (tự động điều phối /v1/responses hoặc /v1/chat/completions)
   */
  async streamGenerateContent(contents, functionDeclarations = [], systemInstruction = '', onChunk = null, signal = null, requestedModel = null) {
    const totalKeys = Math.max(this.apiKeys.length, 1);
    const modelsToTry = this.getModelsToTry(requestedModel);

    if (this.apiKeys.length === 0) {
      console.error('❌ [OpenAIStreamClient] OPENAI_API_KEY chưa được cấu hình!');
      throw new Error('OPENAI_API_KEY chưa được cấu hình. Vui lòng kiểm tra file .env.');
    }

    if (signal?.aborted) {
      return {
        text: '',
        parts: [],
        duration: 0,
        ttfb: 0,
        model: modelsToTry[0] || 'gpt-4o-mini',
        isAborted: true,
      };
    }

    let lastError = null;

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const activeModel = modelsToTry[mIdx];

      for (let keyAttempt = 0; keyAttempt < totalKeys; keyAttempt++) {
        const activeKey = this.getNextKey();
        const startTime = Date.now();
        let ttfb = 0;

        try {
          const isResponsesApiModel = activeModel === 'gpt-6.1-sol';
          const tools = this.convertTools(functionDeclarations);

          let fullText = '';
          const originalParts = [];

          if (isResponsesApiModel) {
            // ==========================================
            // Nhánh 1: /v1/responses (Dành cho gpt-6.1-sol)
            // ==========================================
            const responsesInput = this.convertGeminiContentsToResponsesInput(contents);
            const responsesTools = tools ? tools.map((t) => ({
              type: 'function',
              name: t.function.name,
              description: t.function.description,
              parameters: t.function.parameters,
            })) : undefined;

            const payload = {
              model: activeModel,
              instructions: systemInstruction || undefined,
              input: responsesInput,
              tools: responsesTools,
              stream: true,
            };

            const response = await axios.post(`${this.baseUrl}/responses`, payload, {
              headers: {
                Authorization: `Bearer ${activeKey}`,
                'Content-Type': 'application/json',
              },
              responseType: 'stream',
              timeout: 60000,
              httpsAgent,
              signal: signal || undefined,
            });

            await new Promise((resolve, reject) => {
              const stream = response.data;
              const decoder = new StringDecoder('utf8');
              let buffer = '';

              stream.on('data', (chunk) => {
                if (ttfb === 0) ttfb = Date.now() - startTime;
                buffer += decoder.write(chunk);
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Giữ lại phần chưa hoàn chỉnh

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith('data: ')) continue;
                  const dataStr = trimmed.slice(6);
                  if (dataStr === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(dataStr);
                    // Bắt text delta
                    if (parsed.type === 'response.output_text.delta' && parsed.delta) {
                      fullText += parsed.delta;
                      if (onChunk) onChunk(parsed.delta);
                    }
                    // Bắt tool call hoàn thành
                    if (parsed.type === 'response.output_item.done' && parsed.item?.type === 'function_call') {
                      const fn = parsed.item;
                      let parsedArgs = {};
                      try {
                        parsedArgs = JSON.parse(fn.arguments || '{}');
                      } catch (e) {
                        parsedArgs = {};
                      }
                      originalParts.push({
                        functionCall: {
                          name: fn.name,
                          args: parsedArgs,
                        },
                      });
                    }
                  } catch (err) {
                    // Bỏ qua chunk JSON lỗi
                  }
                }
              });

              stream.on('end', () => {
                if (fullText && originalParts.length === 0) {
                  originalParts.push({ text: fullText });
                }
                resolve();
              });

              stream.on('error', (err) => reject(err));
            });
          } else {
            // ==========================================
            // Nhánh 2: /v1/chat/completions (Cho các model còn lại)
            // ==========================================
            const messages = this.convertGeminiContentsToOpenAIMessages(contents, systemInstruction);
            const isReasoningModel = ['gpt-5.6-sol', 'gpt-5.5', 'gpt-5.4-mini', 'gpt-5-mini', 'gpt-6-luna'].includes(activeModel);

            const payload = {
              model: activeModel,
              messages,
              tools,
              tool_choice: tools ? 'auto' : undefined,
              stream: true,
              temperature: isReasoningModel ? undefined : 0.1,
            };

            // Model reasoning dùng max_completion_tokens thay vì max_tokens
            if (isReasoningModel) {
              payload.max_completion_tokens = 2048;
            } else {
              payload.max_tokens = 2048;
            }

            // Với gpt-5.6-sol khi có tools, tắt reasoning_effort để cho phép function tools
            if (activeModel === 'gpt-5.6-sol' && tools) {
              payload.reasoning_effort = 'none';
            }

            const response = await axios.post(`${this.baseUrl}/chat/completions`, payload, {
              headers: {
                Authorization: `Bearer ${activeKey}`,
                'Content-Type': 'application/json',
              },
              responseType: 'stream',
              timeout: 60000,
              httpsAgent,
              signal: signal || undefined,
            });

            await new Promise((resolve, reject) => {
              const stream = response.data;
              const decoder = new StringDecoder('utf8');
              let buffer = '';
              const accumulatedToolCalls = {};

              stream.on('data', (chunk) => {
                if (ttfb === 0) ttfb = Date.now() - startTime;
                buffer += decoder.write(chunk);
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith('data: ')) continue;
                  const dataStr = trimmed.slice(6);
                  if (dataStr === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(dataStr);
                    const choice = parsed.choices?.[0];
                    if (!choice) continue;

                    // 1. Text delta
                    if (choice.delta?.content) {
                      fullText += choice.delta.content;
                      if (onChunk) onChunk(choice.delta.content);
                    }

                    // 2. Tool calls delta
                    if (choice.delta?.tool_calls) {
                      for (const tc of choice.delta.tool_calls) {
                        const idx = tc.index ?? 0;
                        if (!accumulatedToolCalls[idx]) {
                          accumulatedToolCalls[idx] = {
                            id: tc.id || '',
                            name: tc.function?.name || '',
                            arguments: '',
                          };
                        }
                        if (tc.id) accumulatedToolCalls[idx].id = tc.id;
                        if (tc.function?.name) accumulatedToolCalls[idx].name = tc.function.name;
                        if (tc.function?.arguments) accumulatedToolCalls[idx].arguments += tc.function.arguments;
                      }
                    }
                  } catch (err) {}
                }
              });

              stream.on('end', () => {
                // Gom các tool call đã tích lũy
                for (const idx of Object.keys(accumulatedToolCalls)) {
                  const tc = accumulatedToolCalls[idx];
                  let parsedArgs = {};
                  try {
                    parsedArgs = JSON.parse(tc.arguments || '{}');
                  } catch (e) {
                    parsedArgs = {};
                  }
                  originalParts.push({
                    functionCall: {
                      name: tc.name,
                      args: parsedArgs,
                    },
                  });
                }

                if (fullText && originalParts.length === 0) {
                  originalParts.push({ text: fullText });
                }
                resolve();
              });

              stream.on('error', (err) => reject(err));
            });
          }

          const totalDuration = Date.now() - startTime;
          return {
            text: fullText,
            parts: originalParts,
            duration: totalDuration,
            ttfb,
            model: activeModel,
            isAborted: false,
          };
        } catch (error) {
          lastError = error;
          const status = error.response?.status;
          let errMsg = error.message;

          if (error.response?.data && typeof error.response.data.on === 'function') {
            try {
              const rawData = await new Promise((res) => {
                let d = '';
                error.response.data.on('data', (c) => (d += c));
                error.response.data.on('end', () => res(d));
                error.response.data.on('error', () => res(''));
              });
              const parsed = JSON.parse(rawData);
              if (parsed.error?.message) errMsg = parsed.error.message;
            } catch (e) {}
          } else if (error.response?.data?.error?.message) {
            errMsg = error.response.data.error.message;
          }

          console.warn(`⚠️ [OpenAIStreamClient] Lỗi khi gọi model ${activeModel} (Status: ${status || 'Network/Timeout'}): ${errMsg}`);

          // Nếu do người dùng abort thì không retry model khác
          if (axios.isCancel(error) || signal?.aborted) {
            return {
              text: '',
              parts: [],
              duration: Date.now() - startTime,
              ttfb: 0,
              model: activeModel,
              isAborted: true,
            };
          }

          // Nếu hết quota hoặc lỗi 429, 500, 503 -> tự động thử model tiếp theo trong danh sách
        }
      }
    }

    console.error('❌ [OpenAIStreamClient] Tất cả các model OpenAI đều thất bại:', lastError?.message);
    throw lastError || new Error('Không thể kết nối đến máy chủ OpenAI.');
  }
}

export default OpenAIStreamClient;
