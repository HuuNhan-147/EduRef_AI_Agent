import { randomUUID } from 'node:crypto';
import GeminiStreamClient from './llm/GeminiStreamClient.js';
import { mergeIntakeFields, validateIntakeFields } from './studentIntakeFields.js';

const extractor = new GeminiStreamClient();
const INSTRUCTION = `Bạn là trợ lý tiếp nhận yêu cầu giấy xác nhận sinh viên.
Chỉ trả về một JSON object hợp lệ gồm intent (REQUEST hoặc QUESTION), purpose, recipient, note, answer.
purpose, recipient, note chỉ chứa thông tin người dùng nêu trong tin nhắn mới; không suy diễn, không bịa dữ kiện.
REQUEST khi người dùng muốn xin/cấp/nộp giấy hoặc đang bổ sung bản nháp. QUESTION khi chỉ hỏi đáp.
Nếu là QUESTION, answer trả lời ngắn bằng tiếng Việt theo các thông tin chắc chắn: sinh viên cần nêu mục đích; AI chuẩn bị bản nháp; sinh viên kiểm tra và bấm gửi; Phòng Đào tạo quyết định cuối cùng.
Không khẳng định mức phí, thời hạn, điều kiện học vụ, quy định pháp luật hay việc đã gửi đơn khi không có nguồn xác nhận. Nếu câu hỏi cần quy định chưa được cung cấp, nói rõ cần Phòng Đào tạo xác nhận.`;

function parseModelResult(text) {
  const content = String(text || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI chưa đọc được yêu cầu. Bạn vui lòng thử lại.');
  const parsed = JSON.parse(content.slice(start, end + 1));
  if (!['REQUEST', 'QUESTION'].includes(parsed.intent)) throw new Error('AI chưa xác định được yêu cầu. Bạn vui lòng diễn đạt lại.');
  return parsed;
}

export async function runStudentIntake({
  message,
  currentUser,
  sessionId,
  runId = `run_${randomUUID()}`,
  inputData = {},
  onChunk,
  onProgress,
  signal,
}) {
  const startedAt = Date.now();
  let sequence = 0;
  const progress = (phase, status, label, summary = '') => onProgress?.({
    sessionId, runId, phase, status, label, summary,
    sequence: ++sequence,
    timestamp: new Date().toISOString(),
  });

  progress('UNDERSTAND_REQUEST', 'RUNNING', 'Đang đọc yêu cầu của bạn');
  try {
    const provided = inputData?.formFields || {};
    const previous = inputData?.draftFields || {};
    let interpreted;

    if (provided.purpose) {
      interpreted = { intent: 'REQUEST', ...provided };
    } else {
      const contents = [{
        role: 'user',
        parts: [{ text: JSON.stringify({ previousDraft: previous, message: String(message).slice(0, 4000) }) }],
      }];
      const modelResult = await extractor.streamGenerateContent(contents, [], INSTRUCTION, null, { signal });
      interpreted = parseModelResult(modelResult.text);
    }

    if (signal?.aborted) throw Object.assign(new Error('Đã dừng yêu cầu.'), { name: 'AbortError' });
    progress('UNDERSTAND_REQUEST', 'COMPLETED', 'Đã xác định nội dung yêu cầu');

    if (interpreted.intent === 'QUESTION') {
      const asksPrice = /(?:giá|phí|bao nhiêu tiền|lệ phí)/iu.test(message);
      const reply = asksPrice
        ? 'Mức phí cấp giấy xác nhận sinh viên chưa được Phòng Đào tạo cung cấp cho hệ thống. Bạn nên xác nhận trực tiếp với bộ phận này trước khi nộp.'
        : String(interpreted.answer || 'Bạn có thể mô tả mục đích xin giấy xác nhận sinh viên; tôi sẽ giúp chuẩn bị bản nháp để bạn kiểm tra.').slice(0, 1200);
      onChunk?.(reply);
      progress('COMPLETED', 'COMPLETED', 'Đã chuẩn bị câu trả lời');
      return { reply, decision: 'ANSWERED', sessionId, runId, totalDuration: Date.now() - startedAt };
    }

    progress('CHECK_FIELDS', 'RUNNING', 'Đang kiểm tra thông tin cần có');
    const fields = mergeIntakeFields(previous, interpreted, provided);
    const validation = validateIntakeFields(fields);
    const firstError = Object.values(validation.errors)[0];
    progress('CHECK_FIELDS', 'COMPLETED', 'Đã kiểm tra thông tin đã cung cấp', firstError || 'Đủ dữ liệu để tạo bản nháp.');

    if (!validation.valid) {
      const reply = `${firstError} Bạn có thể trả lời ngay tại đây; tôi sẽ cập nhật bản nháp trước khi gửi.`;
      onChunk?.(reply);
      progress('WAITING_STUDENT', 'COMPLETED', 'Đang chờ bạn bổ sung thông tin');
      return {
        reply,
        decision: 'ASK_CLARIFICATION',
        toolResult: { status: 'COLLECTING', decision: 'ASK_CLARIFICATION', missingFields: Object.keys(validation.errors), message: reply },
        intakeDraft: { fields: validation.fields, ready: false },
        sessionId, runId, totalDuration: Date.now() - startedAt,
      };
    }

    progress('PREPARE_DRAFT', 'RUNNING', 'Đang tổng hợp bản nháp để bạn kiểm tra');
    const intakeDraft = {
      id: `draft_${randomUUID()}`,
      ready: true,
      requestTypeCode: 'STUDENT_CONFIRMATION',
      student: { fullName: currentUser.fullName, studentCode: currentUser.studentCode },
      fields: validation.fields,
      destination: 'Phòng Đào tạo',
    };
    const reply = 'Tôi đã tổng hợp thông tin thành **bản nháp giấy xác nhận sinh viên**. Bạn hãy kiểm tra mục đích, nơi tiếp nhận và ghi chú bên dưới. Hồ sơ chỉ được gửi tới Phòng Đào tạo sau khi bạn bấm **Gửi hồ sơ**.';
    onChunk?.(reply);
    progress('PREPARE_DRAFT', 'COMPLETED', 'Bản nháp đã sẵn sàng', 'Đang chờ bạn kiểm tra và xác nhận gửi.');
    return {
      reply,
      decision: 'DRAFT_READY',
      toolResult: { status: 'DRAFT_READY', decision: 'DRAFT_READY', message: 'Bản nháp đã sẵn sàng để sinh viên kiểm tra.' },
      intakeDraft,
      sessionId, runId, totalDuration: Date.now() - startedAt,
    };
  } catch (error) {
    const cancelled = error.name === 'AbortError' || signal?.aborted;
    progress(cancelled ? 'CANCELLED' : 'FAILED', cancelled ? 'CANCELLED' : 'FAILED', cancelled ? 'Đã dừng xử lý' : 'Chưa thể hoàn tất', cancelled ? '' : 'Bạn có thể thử gửi lại tin nhắn.');
    return {
      reply: cancelled ? '' : 'Tôi chưa thể đọc yêu cầu này. Bạn vui lòng thử lại sau ít phút.',
      error: error.message,
      cancelled,
      sessionId, runId, totalDuration: Date.now() - startedAt,
    };
  }
}
