import GeminiStreamClient from '../llm/GeminiStreamClient.js';
import PromptEngine from './PromptEngine.js';
import ToolRegistry from '../tools/ToolRegistry.js';
import ToolResolver from '../tools/ToolResolver.js';
import AgentTerminalLogger from './AgentTerminalLogger.js';
import { resolveContext } from '../memory/ContextResolver.js';
import { conversationMemory } from '../memory/ConversationMemory.js';
import certificateVisionService from '../../../services/CertificateVisionService.js';
import AuditLogService from '../../../services/AuditLogService.js';
import { describeToolOutcome } from './toolOutcome.js';

export class AgentOrchestrator {
  constructor(socket = null, sessionId = null) {
    this.socket = socket;
    this.sessionId = sessionId || `sess_${Date.now()}`;
    this.logger = new AgentTerminalLogger(socket, this.sessionId);
    this.geminiClient = new GeminiStreamClient();
  }

  /**
   * Vòng lặp ReAct Loop thực thi tác tử đa bước kết hợp SSE Token Streaming
   */
  async run({ message, currentUser = null, conversationHistory = [], onChunk = null, attachments = null, inputData = null }) {
    const startTime = Date.now();
    this.logger.log({
      step: 'START',
      message: `Nhận yêu cầu: "${message}"`,
      type: 'info',
    });

    try {
      // 0. Giám định Đa phương thức (Gemini Vision) nếu người dùng có gửi kèm ảnh chứng chỉ
      const certsToVerify = [];
      if (attachments?.b1?.previewUrl) {
        certsToVerify.push({ type: 'B1', name: 'Tiếng Anh B1', previewUrl: attachments.b1.previewUrl });
      }
      if (attachments?.teamwork?.previewUrl) {
        certsToVerify.push({ type: 'TEAMWORK', name: 'Kỹ năng Giao tiếp & Làm việc nhóm', previewUrl: attachments.teamwork.previewUrl });
      }

      if (certsToVerify.length > 0) {
        let visionInspectionFailed = false;
        let visionManualReviewRequired = false;
        let visionRejectMessage = '';

        for (const cert of certsToVerify) {
          this.logger.log({
            step: 'MULTIMODAL_VISION',
            message: `👁️ [Gemini 2.0 Flash Vision] Đang giám định trực tiếp ảnh văn bằng "${cert.name}"...`,
            type: 'thought',
          });

          const studentName = currentUser?.fullName || currentUser?.name || 'Cao Hữu Nhân';
          const visionResult = await certificateVisionService.verifyCertificate({
            imageBase64: cert.previewUrl,
            expectedType: cert.type,
            studentName,
          });

          this.logger.log({
            step: 'VISION_RESULT',
            message: `Kết quả thị giác máy tính [${cert.name}]: Chất lượng=${visionResult.imageQuality}, Hợp lệ=${visionResult.isValid}, Số hiệu=${visionResult.extractedData?.certNumber || 'BỊ CHE KHUẤT/KHÔNG ĐỌC ĐƯỢC'}`,
            type: visionResult.isValid ? 'info' : 'error',
            meta: visionResult,
          });

          if (visionResult.requiresManualReview || visionResult.imageQuality === 'ERROR') {
            visionManualReviewRequired = true;
            visionRejectMessage = visionResult.feedback || `Dịch vụ giám định ảnh chưa thể kết luận chứng chỉ "${cert.name}". Cán bộ PĐT có xác minh thủ công chứng chỉ này không?`;
            break;
          }

          // Kiểm tra xem số hiệu có bị che khuất/bôi đen hoặc ảnh mờ không
          if (!visionResult.isValid || visionResult.imageQuality === 'BLURRY' || !visionResult.extractedData?.certNumber || !visionResult.extractedData?.bookNumber) {
            visionInspectionFailed = true;
            visionRejectMessage = visionResult.feedback || `Ảnh chứng chỉ "${cert.name}" tải lên bị mờ, mất góc hoặc vùng chứa số hiệu (Serial number / Certificate number) đã bị che khuất hoặc bôi đen. Vui lòng chụp lại bản scan rõ nét để Nhà trường đối soát.`;
            break;
          }

          // Kiểm tra họ tên chủ sở hữu
          if (visionResult.studentNameMatch === false) {
            visionInspectionFailed = true;
            visionRejectMessage = `Họ tên in trên chứng chỉ ("${visionResult.extractedName || 'người khác'}") không trùng khớp với sinh viên nộp đơn ("${studentName}").`;
            break;
          }
        }

        if (visionManualReviewRequired) {
          const actionableQuestion = `${visionRejectMessage} Cán bộ PĐT có xác minh thủ công và quyết định tiếp nhận minh chứng này không?`;
          this.logger.log({
            step: 'DECISION_FINAL',
            message: 'Quyết định cuối: [ESCALATE_TO_STAFF] - Dịch vụ thị giác không đủ bằng chứng để tự kết luận',
            type: 'decision',
          });
          const reply = `Hệ thống chưa thể tự xác minh ảnh chứng chỉ nên đã dừng tự động hóa. ${actionableQuestion}`;
          await AuditLogService.recordLog({
            actorType: 'AI_AGENT',
            action: 'VISION_SERVICE_MANUAL_REVIEW',
            decision: 'ESCALATE_TO_STAFF',
            reason: visionRejectMessage,
            inputSnapshot: { actionableQuestion, sessionId: this.sessionId },
            decisionTimeMs: Date.now() - startTime,
          });
          if (onChunk) onChunk(reply);
          return {
            reply,
            decision: 'ESCALATE_TO_STAFF',
            toolResult: {
              decision: 'ESCALATE_TO_STAFF',
              classification: 'BEYOND_AUTHORITY',
              status: 'ESCALATED',
              actionableQuestion,
              message: reply,
            },
            sessionId: this.sessionId,
            totalDuration: Date.now() - startTime,
          };
        }

        if (visionInspectionFailed) {
          this.logger.log({
            step: 'DECISION_FINAL',
            message: `Quyết định cuối: [ASK_CLARIFICATION] - Từ chối minh chứng do không đạt tiêu chuẩn giám định thị giác`,
            type: 'decision',
          });

          const reply = `Chào bạn, hệ thống thẩm định AI phát hiện: ${visionRejectMessage}\n\nBạn vui lòng kiểm tra và cung cấp lại bản scan rõ nét, đầy đủ số hiệu pháp lý và chữ ký mộc đỏ để tiếp tục quy trình xét tốt nghiệp.`;
          if (onChunk) onChunk(reply);

          return {
            reply,
            decision: 'ASK_CLARIFICATION',
            toolResult: {
              decision: 'ASK_CLARIFICATION',
              status: 'WAITING_STUDENT',
              actionableQuestion: visionRejectMessage,
              message: visionRejectMessage,
            },
            sessionId: this.sessionId,
            totalDuration: Date.now() - startTime,
          };
        }
      }
      // 0. Chuẩn hóa tiếng lóng học vụ và đại từ chỉ định ngữ cảnh
      const resolvedMessage = resolveContext(message, this.sessionId);
      if (resolvedMessage !== message) {
        this.logger.log({
          step: 'CONTEXT_RESOLVED',
          message: `Đã chuẩn hóa ngôn ngữ học vụ: "${resolvedMessage}"`,
          type: 'thought',
        });
      }

      // Nạp lịch sử hội thoại các lượt trước đó
      const history =
        conversationHistory && conversationHistory.length > 0
          ? conversationHistory
          : conversationMemory.loadHistory(this.sessionId, 10);

      // Lưu tin nhắn người dùng hiện tại vào bộ nhớ phiên
      conversationMemory.saveUserMessage(this.sessionId, resolvedMessage);

      // 1. Chuẩn bị System Prompt & Khai báo Tools
      const systemInstruction = PromptEngine.buildSystemInstruction({ currentUser });
      const functionDeclarations = ToolRegistry.getDeclarations();

      // 2. Định dạng nội dung hội thoại chuẩn Gemini (đảm bảo xen kẽ user - model)
      const contents = [
        ...history,
        {
          role: 'user',
          parts: [{ text: resolvedMessage }],
        },
      ];

      this.logger.log({
        step: 'REASONING',
        message: 'Tác tử đang phân tích ngôn ngữ tự nhiên và trích xuất thực thể...',
        type: 'thought',
      });

      // 3. Vòng lặp ReAct Đa bước Tự hành (Autonomous Multi-Step ReAct Loop)
      let stepCount = 0;
      const maxSteps = 8;
      let finalReplyText = '';
      let lastToolResult = null;

      while (stepCount < maxSteps) {
        stepCount++;

        const stepResult = await this.geminiClient.streamGenerateContent(
          contents,
          functionDeclarations,
          systemInstruction,
          onChunk
        );

        const functionCallPart = stepResult.parts?.find((p) => p.functionCall);

        if (!functionCallPart) {
          finalReplyText = stepResult.text || '';
          break;
        }

        // Thực thi Function Call (Gọi Tool nghiệp vụ)
        const { name: toolName, args: toolArgs } = functionCallPart.functionCall;

        this.logger.log({
          step: 'TOOL_INVOCATION',
          message: `Gọi công cụ [${toolName}] với tham số: ${JSON.stringify(toolArgs)}`,
          type: 'tool_call',
          meta: { toolName, toolArgs },
        });

        // Điều phối thực thi qua ToolResolver
        const toolResult = await ToolResolver.resolve(toolName, toolArgs);
        lastToolResult = toolResult;

        this.logger.log({
          step: 'TOOL_OBSERVATION',
          message: `Kết quả từ [${toolName}]: Trạng thái=${describeToolOutcome(toolResult)}`,
          type: 'tool_result',
          meta: toolResult,
        });

        // Bổ sung lịch sử gọi tool chuẩn Gemini 2.0 (bảo tồn thoughtSignature)
        contents.push({
          role: 'model',
          parts:
            stepResult.parts && stepResult.parts.length > 0
              ? stepResult.parts
              : [{ functionCall: { name: toolName, args: toolArgs } }],
        });

        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: toolName,
                response: { content: toolResult },
              },
            },
          ],
        });

        this.logger.log({
          step: 'SYNTHESIS',
          message: `Đang xử lý bước tiếp theo trong quy trình thẩm định học vụ...`,
          type: 'thought',
        });
      }

      const totalDuration = Date.now() - startTime;

      // Lưu câu trả lời trợ lý vào bộ nhớ phiên
      conversationMemory.saveAssistantMessage(this.sessionId, finalReplyText);

      // Cập nhật metadata đơn gần nhất vào session để phục vụ đại từ chỉ định ở lượt kế tiếp
      const targetCode =
        lastToolResult?.requestCode ||
        lastToolResult?.requestId ||
        lastToolResult?.data?.requestCode ||
        lastToolResult?.data?.id;
      if (targetCode) {
        conversationMemory.setSessionMeta(this.sessionId, 'lastRequestId', targetCode);
      }
      const targetType = lastToolResult?.requestType || lastToolResult?.requestTypeCode;
      if (targetType) {
        conversationMemory.setSessionMeta(this.sessionId, 'lastRequestType', targetType);
      }

      this.logger.log({
        step: 'DECISION_FINAL',
        message: `Quyết định cuối: [${lastToolResult?.decision || 'DONE'}] - Xử lý trong ${totalDuration}ms`,
        type: 'decision',
        meta: { decision: lastToolResult?.decision, totalDuration },
      });

      return {
        reply: finalReplyText,
        toolResult: lastToolResult,
        decision: lastToolResult?.decision || 'PROCESSED',
        sessionId: this.sessionId,
        totalDuration,
      };
    } catch (error) {
      console.error('❌ [AgentOrchestrator] Lỗi:', error);
      this.logger.log({
        step: 'ERROR',
        message: `Lỗi xử lý tác tử: ${error.message}`,
        type: 'error',
      });

      return {
        reply: `Xin lỗi bạn, đã xảy ra lỗi trong quá trình thẩm định học vụ: ${error.message}`,
        error: error.message,
        sessionId: this.sessionId,
      };
    }
  }
}

export default AgentOrchestrator;
