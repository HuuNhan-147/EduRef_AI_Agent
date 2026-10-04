import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeIntakeFields, validateIntakeFields } from '../modules/ai-agent/studentIntakeFields.js';

test('student intake asks for a missing or vague purpose before creating a draft', () => {
  assert.equal(validateIntakeFields({}).valid, false);
  assert.equal(validateIntakeFields({ purpose: 'xin' }).valid, false);
  assert.equal(validateIntakeFields({ purpose: 'Tôi muốn xin giấy xác nhận sinh viên' }).valid, false);
  assert.equal(validateIntakeFields({ purpose: 'Làm vé xe buýt' }).valid, true);
});

test('student intake rejects overlong fields', () => {
  const result = validateIntakeFields({ purpose: 'a'.repeat(501), recipient: 'b'.repeat(161) });
  assert.equal(result.valid, false);
  assert.ok(result.errors.purpose);
  assert.ok(result.errors.recipient);
});

test('new student answer completes a partial draft without dropping other fields', () => {
  const result = mergeIntakeFields(
    { purpose: '', recipient: 'Phòng Công tác sinh viên' },
    { purpose: 'Làm hồ sơ vay vốn sinh viên' },
  );
  assert.deepEqual(result, {
    purpose: 'Làm hồ sơ vay vốn sinh viên',
    recipient: 'Phòng Công tác sinh viên',
    note: '',
  });
});
