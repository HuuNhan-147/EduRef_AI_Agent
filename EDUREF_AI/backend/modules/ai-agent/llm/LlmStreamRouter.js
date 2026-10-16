import GeminiStreamClient from './GeminiStreamClient.js';
import OpenAIStreamClient from './OpenAIStreamClient.js';

export class LlmStreamRouter {
  constructor() {
    this.geminiClient = new GeminiStreamClient();
    this.openaiClient = new OpenAIStreamClient();
  }

  /**
   * Xác định provider tương ứng dựa vào tên model
   */
  detectProvider(modelName = '') {
    const m = (modelName || '').toLowerCase().trim();
    if (!m || m === 'auto') return 'auto';
    if (m.startsWith('gpt-') || m.startsWith('o1-') || m.startsWith('o3-') || m.startsWith('chatgpt-')) {
      return 'openai';
    }
    if (m.startsWith('gemini-')) {
      return 'gemini';
    }
    return 'gemini'; // Mặc định là gemini nếu không xác định
  }

  /**
   * Điều phối stream gọi LLM theo đúng provider yêu cầu
   * Hỗ trợ tự động chuyển đổi chéo liên đám mây (Cross-Provider Fallback: Gemini <-> OpenAI) khi chế độ auto
   */
  async streamGenerateContent(contents, functionDeclarations = [], systemInstruction = '', onChunk = null, signal = null, requestedModel = null) {
    const provider = this.detectProvider(requestedModel);

    // 1. Chỉ định rõ OpenAI
    if (provider === 'openai') {
      return await this.openaiClient.streamGenerateContent(
        contents,
        functionDeclarations,
        systemInstruction,
        onChunk,
        signal,
        requestedModel
      );
    }

    // 2. Chỉ định rõ Gemini
    if (provider === 'gemini') {
      return await this.geminiClient.streamGenerateContent(
        contents,
        functionDeclarations,
        systemInstruction,
        onChunk,
        signal,
        requestedModel
      );
    }

    // 3. Chế độ Tự động (Auto Cross-Provider Resilient)
    // Ưu tiên Gemini để tối ưu chi phí và tốc độ ~1.0s
    try {
      return await this.geminiClient.streamGenerateContent(
        contents,
        functionDeclarations,
        systemInstruction,
        onChunk,
        signal,
        'auto'
      );
    } catch (geminiError) {
      console.warn('⚠️ [LlmStreamRouter] Toàn bộ cluster Gemini bị quá tải/lỗi. Tự động kích hoạt OpenAI Fallback Cluster...');

      // Fallback sang OpenAI gpt-4o-mini
      return await this.openaiClient.streamGenerateContent(
        contents,
        functionDeclarations,
        systemInstruction,
        onChunk,
        signal,
        'gpt-4o-mini'
      );
    }
  }
}

export default LlmStreamRouter;
