import { FORM_LABELS, toDisplayText } from './displayText.js';

const fold = value => toDisplayText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const send = (id, label, prompt) => ({ id, label, kind: 'SEND', prompt });
const view = { id: 'my-petitions', label: 'Xem đơn của tôi', kind: 'VIEW_PETITIONS' };
const overview = send('supported-forms', 'Các loại giấy đang hỗ trợ', 'Hệ thống hiện hỗ trợ những loại giấy xác nhận sinh viên nào?');
const focus = { id: 'continue-form', label: 'Mở phần thông tin cần bổ sung', kind: 'FOCUS_WORKFLOW' };

// Suggestions are selected from supported capabilities and actual outcomes; never
// generated from arbitrary model-provided buttons, invented facts or unknown tools.
export function chatSuggestions(message, { currentDraft = null, lastUserText = '' } = {}) {
  if (!message || message.sender === 'user' || message.isStreaming) return [];
  const text = fold(message.text || '');
  const task = message.workflowOutcome || message.toolResult?.draft;
  let suggestions = [];
  if (message.isError || message.decision === 'ERROR' || /dich vu ai.*(?:chua|khong)|loi ket noi|gap su co|api.key.*cau hinh/.test(text)) {
    suggestions = [lastUserText && (/mo hinh tu dong/.test(text)
      ? { id: 'retry-auto', label: 'Dùng mô hình Tự động', kind: 'RETRY_AUTO', prompt: lastUserText }
      : send('retry-message', 'Gửi lại yêu cầu', lastUserText)), view];
  } else if (task) {
    const status = task.result?.status || task.state;
    const request = task.result?.requestCode ? ` của hồ sơ ${task.result.requestCode}` : '';
    if (task.state === 'REJECTED' || status === 'REJECTED') {
      suggestions = [task.targetForm && { id: 'recommended-form', label: `Bắt đầu ${FORM_LABELS[task.targetForm] || 'thủ tục được đề xuất'}`,
        kind: 'START_RECOMMENDED', draftId: task.id, revision: task.revision, targetForm: task.targetForm },
      send('correct-school-record', 'Kiểm tra lại thông tin học vụ', 'Tôi cần liên hệ đơn vị nào để kiểm tra lại thông tin học vụ khi yêu cầu cấp giấy bị từ chối?'), view];
    } else if (['APPROVED', 'COMPLETED'].includes(status)) {
      suggestions = [view, send('pickup-appointment', 'Xem lịch và nơi nhận giấy', `Cho tôi xem lịch hẹn và nơi nhận bản cứng${request}.`), overview];
    } else if (status === 'ESCALATED') {
      suggestions = [view, send('staff-review-next', 'Bước tiếp theo khi chờ thẩm định', `Tôi cần làm gì tiếp theo khi hồ sơ${request} đang chờ cán bộ thẩm định?`)];
    } else if (['CANCELLED'].includes(status)) suggestions = [overview, view];
    else if (task.state === 'READY') {
      suggestions = [focus, send('pickup-before-submit', 'Cách nhận bản cứng', `Tôi nhận bản cứng ${FORM_LABELS[task.formCode] || 'giấy xác nhận sinh viên'} như thế nào sau khi hồ sơ được duyệt?`)];
      suggestions[0] = { ...focus, label: 'Kiểm tra hồ sơ trước khi xác nhận' };
    } else if (task.missingFields?.length) {
      suggestions = [focus, send('explain-missing', 'Hướng dẫn phần còn thiếu', `Hãy giải thích cách điền các mục còn thiếu trong hồ sơ ${FORM_LABELS[task.formCode] || 'giấy xác nhận sinh viên'}: ${task.missingFields.map(f => f.label).join(', ')}.`)];
    } else suggestions = [overview, view];
  } else if (message.id?.startsWith('welcome') || /^(?:chao ban|xin chao)[^.!?]*[.!?]?\s*$/.test(text) || /hom nay ban can/.test(text)) {
    suggestions = [send('bus-pass', 'Làm vé tháng xe buýt', 'Tôi muốn xin giấy xác nhận sinh viên để làm vé tháng xe buýt.'),
      send('student-loan', 'Vay vốn sinh viên', 'Tôi muốn xin giấy xác nhận vay vốn Ngân hàng Chính sách Xã hội.'), overview];
  } else {
    const mentionedForms = [/no mon|hoc phan con no/, /vay von|ngan hang chinh sach/, /nghia vu quan su|nvqs/, /giam tru|thue tncn/, /visa|hoc bong|xe buyt/].filter(pattern => pattern.test(text)).length;
    if (mentionedForms > 2) return [send('choose-bus', 'Làm giấy xác nhận vé xe buýt', 'Tôi muốn xin giấy xác nhận sinh viên để làm vé tháng xe buýt.'),
      send('choose-loan', 'Làm giấy xác nhận vay vốn', 'Tôi muốn xin giấy xác nhận vay vốn Ngân hàng Chính sách Xã hội.'), view];
    const form = /no mon|hoc phan con no/.test(text) ? 'COURSE_DEBT' : /vay von|ngan hang chinh sach/.test(text) ? 'BANK_LOAN'
      : /nghia vu quan su|nvqs/.test(text) ? 'MILITARY_DEFERMENT' : /giam tru|thue tncn/.test(text) ? 'TAX_DEDUCTION'
        : /visa|hoc bong|xe buyt|giay xac nhan sinh vien/.test(text) ? 'GENERAL_CONFIRMATION' : null;
    if (form) {
      const intent = form === 'GENERAL_CONFIRMATION' ? /visa/.test(text) ? 'để xin visa' : /hoc bong/.test(text) ? 'để xin học bổng' : '' : '';
      suggestions = [send('start-related', `Làm ${FORM_LABELS[form]}`, `Tôi muốn bắt đầu hồ sơ ${FORM_LABELS[form]} ${intent}.`),
        send('related-requirements', 'Thông tin cần chuẩn bị', `Tôi cần chuẩn bị thông tin gì cho hồ sơ ${FORM_LABELS[form]}?`), view];
      if (currentDraft?.formCode === form && ['READY', 'NEEDS_INPUT', 'BLOCKED'].includes(currentDraft.state)) suggestions[0] = focus;
    } else if (/don cua toi|ho so|lich hen|nhan giay|thu tuc/.test(text)) suggestions = [view, overview];
  }
  return [...new Map(suggestions.filter(Boolean).map(suggestion => [suggestion.id, suggestion])).values()].slice(0, 3);
}
