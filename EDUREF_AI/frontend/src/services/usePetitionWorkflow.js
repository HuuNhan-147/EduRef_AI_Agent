import { useState, useEffect, useRef, useCallback } from 'react';
import api from './api';
import getSocket from './socket';

export default function usePetitionWorkflow(owner, enabled = true) {
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    const sequence = ++generation.current;
    try {
      const { data } = await api.get('/drafts/active');
      if (sequence === generation.current && data.success) { setDraft(data.data); setError(''); }
    } catch (err) { if (sequence === generation.current) setError(err.response?.data?.message || 'Chưa tải được công việc đang làm.'); }
  }, [owner, enabled]);
  useEffect(() => {
    setDraft(null); setError('');
    if (!enabled) return;
    refresh();
    const socket = getSocket();
    const onUpdate = () => { if (!inFlight.current) refresh(); };
    socket.on('petition_status_updated', onUpdate); socket.on('connect', onUpdate);
    const timer = setInterval(onUpdate, 15000); // reconcile missed events, including another tab editing a draft
    return () => { generation.current++; clearInterval(timer); socket.off('petition_status_updated', onUpdate); socket.off('connect', onUpdate); };
  }, [refresh, enabled]);
  const request = async (url, body) => {
    if (inFlight.current) return null;
    inFlight.current = true; generation.current++; setBusy(true); setError('');
    try {
      const { data } = await api.post(url, body);
      if (!data.success) throw new Error(data.message || 'Chưa thể tiếp tục hồ sơ.');
      setDraft(data.data); return data.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      if (err.response?.status === 409) await refresh();
      return null;
    } finally { inFlight.current = false; setBusy(false); }
  };
  const actOn = (target, action, inputData = {}) => target && request(`/drafts/${target.id}/actions`, {
    action, revision: target.revision, inputData, acknowledgeAddress: action === 'SUBMIT' && target.addressConsentRequired,
  });
  return { draft, busy, error, refresh, accept: setDraft, actOn,
    prepare: (formCode, inputData = {}) => request('/drafts', { formCode, inputData }),
    action: (action, inputData = {}) => actOn(draft, action, inputData) };
}
