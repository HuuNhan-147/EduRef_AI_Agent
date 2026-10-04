import api from './api';

const endpointTemplate = String(import.meta.env.VITE_DOCUMENT_UPLOAD_URL || '').trim();

export const documentUploadConfigured = Boolean(endpointTemplate);

function resolveEndpoint(requestId) {
  if (!endpointTemplate) return '';
  return endpointTemplate.replace(':requestId', encodeURIComponent(requestId));
}

export async function uploadPetitionDocument({ requestId, file, documentType, signal, onProgress }) {
  const endpoint = resolveEndpoint(requestId);
  if (!endpoint) {
    const error = new Error('Dịch vụ lưu trữ tài liệu chưa được cấu hình.');
    error.code = 'UPLOAD_NOT_CONFIGURED';
    throw error;
  }

  const payload = new FormData();
  payload.append('document', file);
  payload.append('documentType', documentType);
  payload.append('requestId', requestId);

  const response = await api.post(endpoint, payload, {
    signal,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (!event.total) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    },
  });

  if (!response.data?.success) {
    throw new Error(response.data?.message || response.data?.error || 'Máy chủ chưa tiếp nhận tài liệu.');
  }
  return response.data.data || response.data;
}
