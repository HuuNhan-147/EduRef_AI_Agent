import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, LoaderCircle, UploadCloud, X } from 'lucide-react';
import { documentUploadConfigured, uploadPetitionDocument } from '../../services/documentUpload';
import { formatFileSize } from '../../lib/ui';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

export default function DocumentUploadPanel({ requestId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('ATTACHMENT');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const chooseFile = (nextFile) => {
    setError('');
    setStatus('idle');
    if (!nextFile) return setFile(null);
    if (!ALLOWED_TYPES.has(nextFile.type)) {
      setFile(null);
      return setError('Chỉ chấp nhận PDF, PNG hoặc JPG.');
    }
    if (nextFile.size > MAX_BYTES) {
      setFile(null);
      return setError('Tài liệu vượt quá giới hạn 10 MB.');
    }
    setFile(nextFile);
  };

  const upload = async () => {
    if (!file || !requestId || !documentUploadConfigured) return;
    setError('');
    setStatus('uploading');
    setProgress(0);
    abortRef.current = new AbortController();
    try {
      const document = await uploadPetitionDocument({ requestId, file, documentType, signal: abortRef.current.signal, onProgress: setProgress });
      setStatus('success');
      onUploaded?.(document);
    } catch (uploadError) {
      if (uploadError.name === 'CanceledError') {
        setStatus('idle');
      } else {
        setStatus('error');
        setError(uploadError.response?.data?.message || uploadError.message);
      }
    } finally {
      abortRef.current = null;
    }
  };

  return (
    <section className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4">
      <div className="flex items-start gap-3">
        <UploadCloud className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-amber-100">Bổ sung tài liệu thật</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">File chỉ được ghi nhận sau khi dịch vụ lưu trữ trả về xác nhận thành công.</p>
        </div>
      </div>

      <label className="mt-4 block text-xs font-medium text-slate-300" htmlFor="supplement-document-type">Loại tài liệu</label>
      <select id="supplement-document-type" value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="ui-field mt-2">
        <option value="ATTACHMENT">Tài liệu bổ sung</option>
        <option value="BANK_FORM">Mẫu xác nhận vay vốn</option>
        <option value="MILITARY_CALL_DOC">Giấy tờ nghĩa vụ quân sự</option>
      </select>

      <label className="mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ui-border bg-canvas/40 px-4 py-4 text-center transition hover:border-primary/60 hover:bg-blue-400/5" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0]); }}>
        <FileUp className="h-5 w-5 text-blue-200" aria-hidden="true" />
        <span className="mt-2 text-sm font-medium text-slate-200">Chọn hoặc kéo thả tài liệu</span>
        <span className="mt-1 text-xs text-slate-500">PDF, PNG, JPG · tối đa 10 MB</span>
        <input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />
      </label>

      {file && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-ui-border bg-canvas/50 p-3 text-xs">
          <div className="min-w-0"><p className="truncate font-medium text-slate-200">{file.name}</p><p className="mt-0.5 text-slate-500">{formatFileSize(file.size)}</p></div>
          <button type="button" onClick={() => chooseFile(null)} disabled={status === 'uploading'} className="ui-icon-button h-9 w-9" aria-label="Bỏ tài liệu đã chọn"><X className="h-4 w-4" /></button>
        </div>
      )}

      {!documentUploadConfigured && (
        <div className="mt-3 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Endpoint lưu trữ thật chưa được Tài/backend cấu hình. File vẫn ở trên thiết bị và chưa được gửi.</span>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-rose-200" role="alert">{error}</p>}
      {status === 'uploading' && <div className="mt-3" aria-live="polite"><div className="mb-1 flex justify-between text-xs text-slate-400"><span>Đang tải lên</span><span>{progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-soft"><div className="h-full bg-blue-400 transition-[width]" style={{ width: `${progress}%` }} /></div></div>}
      {status === 'success' && <p className="mt-3 flex items-center gap-2 text-xs text-emerald-200" role="status"><CheckCircle2 className="h-4 w-4" />Máy chủ đã tiếp nhận tài liệu.</p>}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={upload} disabled={!file || !requestId || !documentUploadConfigured || status === 'uploading' || status === 'success'} className="ui-button-primary flex-1">
          {status === 'uploading' ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <UploadCloud className="h-4 w-4" />}
          {status === 'uploading' ? 'Đang tải lên' : 'Tải tài liệu'}
        </button>
        {status === 'uploading' && <button type="button" onClick={() => abortRef.current?.abort()} className="ui-button-secondary">Hủy</button>}
      </div>
    </section>
  );
}
