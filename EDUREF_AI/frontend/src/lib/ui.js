import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const STATUS_META = {
  IDLE: { label: 'Sẵn sàng', tone: 'neutral' },
  PENDING: { label: 'Đã tiếp nhận', tone: 'neutral' },
  PROCESSING: { label: 'Đang xử lý', tone: 'info' },
  CHECKING: { label: 'Đang kiểm tra', tone: 'info' },
  COLLECTING: { label: 'Đang bổ sung thông tin', tone: 'attention' },
  DRAFT_READY: { label: 'Bản nháp chờ bạn xác nhận', tone: 'info' },
  PASSED: { label: 'Đã đạt', tone: 'success' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  AUTO_APPROVED: { label: 'Đã duyệt', tone: 'success' },
  ROUTINE_AUTO_APPROVE: { label: 'Đã duyệt', tone: 'success' },
  ROUTINE_AUTO_APPROVED: { label: 'Đã duyệt', tone: 'success' },
  WAITING_STUDENT: { label: 'Chờ bổ sung', tone: 'attention' },
  ASK_CLARIFICATION: { label: 'Cần làm rõ', tone: 'attention' },
  ESCALATED: { label: 'Chờ Phòng Đào tạo', tone: 'attention' },
  ESCALATE_TO_STAFF: { label: 'Chờ chuyên viên', tone: 'attention' },
  ESCALATE_TO_DEAN: { label: 'Chờ trưởng đơn vị', tone: 'attention' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  REJECTED_POLICY: { label: 'Không đủ điều kiện', tone: 'danger' },
  FAILED: { label: 'Có lỗi', tone: 'danger' },
  CANCELLED: { label: 'Đã thu hồi', tone: 'neutral' },
  COMPLETED: { label: 'Hoàn tất', tone: 'success' },
  ESCALATED_PENDING: { label: 'Chờ cán bộ', tone: 'attention' },
};

export function getStatusMeta(status) {
  return STATUS_META[status] || {
    label: status ? String(status).replaceAll('_', ' ') : 'Chưa có',
    tone: 'neutral',
  };
}

export function formatDateTime(value, fallback = '—') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getOrCreateSessionId(accountCode) {
  const key = `eduref_session_${accountCode || 'guest'}`;
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const value = typeof globalThis.crypto?.randomUUID === 'function'
    ? `sess_${globalThis.crypto.randomUUID()}`
    : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  sessionStorage.setItem(key, value);
  return value;
}

export function createEmptyDecision() {
  return {
    status: 'IDLE',
    requirementsCheck: 'PENDING',
    policiesCheck: 'PENDING',
    authorityCheck: 'PENDING',
    finalDecision: null,
    reason: null,
    requestCode: null,
    requestId: null,
    qrCodeUrl: null,
    sha256Proof: null,
    missingFields: [],
  };
}

export function normalizeDecision(toolResult, fallbackDecision) {
  if (!toolResult && !fallbackDecision) return null;
  const result = toolResult || {};
  const decision = result.decision || fallbackDecision || null;
  const status = result.status || decision || (result.success ? 'COMPLETED' : 'FAILED');
  const isEscalated = decision?.startsWith('ESCALAT');
  const rawMissingFields = result.missing || result.missingFields || result.missingField;
  const missingFields = Array.isArray(rawMissingFields) ? rawMissingFields : rawMissingFields ? [rawMissingFields] : [];
  const needsClarification = decision === 'ASK_CLARIFICATION' || status === 'WAITING_STUDENT';
  const isIntake = ['COLLECTING', 'DRAFT_READY'].includes(status);

  return {
    status,
    requirementsCheck: missingFields.length || needsClarification ? 'PENDING' : 'PASSED',
    policiesCheck: isIntake ? 'PENDING' : decision === 'REJECTED_POLICY' ? 'FAILED' : 'PASSED',
    authorityCheck: isIntake ? 'PENDING' : isEscalated ? 'ESCALATED' : 'PASSED',
    finalDecision: decision || status,
    reason: result.message || result.reason || result.actionableQuestion || '',
    requestCode: result.requestCode || result.request?.requestCode || null,
    requestId: result.requestId || result.id || result.request?.id || null,
    qrCodeUrl: result.qrCodeUrl || result.request?.qrCodeUrl || null,
    sha256Proof: result.sha256Proof || result.request?.sha256Proof || null,
    missingFields,
  };
}
