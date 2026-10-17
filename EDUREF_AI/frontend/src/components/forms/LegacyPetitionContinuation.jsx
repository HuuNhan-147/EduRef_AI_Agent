import MarkdownRenderer from '../common/MarkdownRenderer';
import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function LegacyPetitionContinuation({ requestId, onDraft }) {
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.post('/drafts/from-request', { requestId }).then(({ data }) => {
      if (active && data.success) onDraft(data.data);
    }).catch(err => { if (active) setError(err.response?.data?.message || 'Chưa mở được hồ sơ đang chờ.'); });
    return () => { active = false; };
  }, [requestId]);
  return <p role={error ? 'alert' : 'status'} className="my-3 text-xs text-slate-500"><MarkdownRenderer content={error || 'Đang lấy lại thông tin hồ sơ đã nộp để tiếp tục…'} inline /></p>;
}
