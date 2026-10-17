import test from 'node:test';
import assert from 'node:assert/strict';
import { displayLabel, toDisplayText, displayDetails, FORM_LABELS } from '../src/config/displayText.js';

test('all five forms and the legacy course-debit typo use the same Vietnamese names in text and labels', () => {
  for (const [code, label] of Object.entries(FORM_LABELS)) {
    assert.equal(displayLabel(code), label);
    assert.equal(toDisplayText(`Biểu mẫu [${code}]`), `Biểu mẫu ${label}`);
  }
});
test('business decisions, classifications, fields and unknown technical guards do not leak enum names', () => {
  const text = toDisplayText('UNKNOWN_FACT · ASK_CLARIFICATION · REQ_ORPHANSTATUS · pickupCampus · POL_FUTURE_RULE');
  assert.doesNotMatch(text, /UNKNOWN_FACT|ASK_CLARIFICATION|REQ_|pickupCampus|POL_/);
  assert.match(text, /Thiếu thông tin cần xác minh/); assert.match(text, /Cơ sở nhận giấy/);
  assert.match(text, /Tình trạng mồ côi/);
});
test('real request IDs, hashes, personal facts, monetary zero and link URLs stay intact', () => {
  const text = 'XNSV-873967 · 0901234567 · 0 đồng · abc012def345 · https://example.com/COURSE_DEBT?q=APPROVED';
  assert.equal(toDisplayText(text), text);
});
test('provider configuration failures explain recovery without asking students to configure backend secrets', () => {
  const text = toDisplayText('Xin lỗi: OPENAI_API_KEY chưa được cấu hình. Vui lòng kiểm tra file .env.');
  assert.doesNotMatch(text, /API_KEY|\.env/); assert.match(text, /Dịch vụ AI hiện chưa sẵn sàng/);
});
test('terminal details keep evidence identifiers while labelling fields, tools and results', () => {
  const shown = displayDetails({ draftId: 'draft-123', availableFields: ['permanentAddress'], decision: 'REJECTED_POLICY' });
  assert.equal(shown['Mã bản nháp'], 'draft-123'); assert.deepEqual(shown['Thông tin có sẵn'], ['Địa chỉ thường trú']);
  assert.equal(shown['Quyết định'], 'Từ chối theo quy định');
});
test('untrusted words cannot resolve inherited object properties as display labels', () => {
  for (const value of ['constructor', '__proto__', 'toString']) {
    assert.equal(displayLabel(value), value); assert.equal(toDisplayText(value), value);
  }
});
