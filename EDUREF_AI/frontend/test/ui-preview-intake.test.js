import test from 'node:test';
import assert from 'node:assert/strict';
import { createUiPreviewAdapter, getUiPreviewChatResult, setPreviewAccount } from '../src/services/uiPreview.js';

test('preview chat clarifies vague requests and prepares a draft without submitting', async () => {
  setPreviewAccount('STUDENT_ACTIVE');
  const adapter = createUiPreviewAdapter();
  const before = await adapter({ method: 'get', url: '/api/petitions' });
  const clarification = getUiPreviewChatResult('Tôi muốn xin giấy xác nhận sinh viên');
  assert.equal(clarification.decision, 'ASK_CLARIFICATION');

  const draft = getUiPreviewChatResult('Để làm vé xe buýt', { draftFields: clarification.intakeDraft.fields });
  assert.equal(draft.decision, 'DRAFT_READY');
  assert.equal(draft.intakeDraft.fields.purpose, 'làm vé xe buýt');
  const afterChat = await adapter({ method: 'get', url: '/api/petitions' });
  assert.equal(afterChat.data.total, before.data.total);

  const submitted = await adapter({ method: 'post', url: '/api/petitions', data: { requestTypeCode: 'STUDENT_CONFIRMATION', formData: draft.intakeDraft.fields } });
  assert.equal(submitted.data.success, true);
  assert.equal(submitted.data.data.status, 'ESCALATED');
  const afterSubmit = await adapter({ method: 'get', url: '/api/petitions' });
  assert.equal(afterSubmit.data.total, before.data.total + 1);
});
