import { useEffect, useId, useState } from 'react';
import { Check, ChevronDown, Circle, LoaderCircle, Octagon, Sparkles, XCircle } from 'lucide-react';
import { cn } from '../../lib/ui';

function formatDuration(value) {
  if (!Number.isFinite(value)) return '';
  if (value < 1000) return `${Math.max(1, Math.round(value))} ms`;
  return `${(value / 1000).toFixed(value < 10000 ? 1 : 0).replace('.', ',')} giây`;
}

function StepIcon({ status }) {
  if (status === 'COMPLETED') return <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />;
  if (status === 'FAILED' || status === 'CANCELLED') return <XCircle className="h-4 w-4 text-rose-300" aria-hidden="true" />;
  if (status === 'RUNNING') return <LoaderCircle className="h-4 w-4 animate-spin text-blue-300 motion-reduce:animate-none" aria-hidden="true" />;
  return <Circle className="h-4 w-4 text-slate-600" aria-hidden="true" />;
}

export default function AgentProgress({ run, onCancel }) {
  const panelId = useId();
  const isActive = ['RUNNING', 'CANCELLING'].includes(run?.status);
  const [expanded, setExpanded] = useState(isActive);

  useEffect(() => {
    setExpanded(isActive);
  }, [isActive]);

  if (!run) return null;

  const duration = formatDuration(run.durationMs);
  const title = run.status === 'CANCELLED'
    ? 'Đã dừng xử lý'
    : run.status === 'FAILED'
      ? 'Chưa thể hoàn tất'
      : isActive
        ? run.status === 'CANCELLING' ? 'Đang dừng xử lý' : 'Đang xử lý yêu cầu'
        : `Đã xử lý${duration ? ` trong ${duration}` : ''}`;

  return (
    <section className="mb-7 max-w-[42rem] rounded-2xl border border-reasoning/20 bg-reasoning/[0.045]" aria-label="Cách EduRef xử lý yêu cầu">
      <div className="flex min-h-12 items-center gap-2 px-3 sm:px-4">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-xl text-left"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {isActive
              ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-reasoning motion-reduce:animate-none" aria-hidden="true" />
              : <Sparkles className="h-4 w-4 shrink-0 text-reasoning" aria-hidden="true" />}
            <span className="truncate text-sm font-medium text-foreground" aria-live="polite">{title}</span>
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-reasoning transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
        </button>
        {isActive && (
          <button
            type="button"
            onClick={() => onCancel?.(run.id)}
            disabled={run.status === 'CANCELLING'}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-rose-200 disabled:opacity-50"
          >
            <Octagon className="h-3.5 w-3.5" aria-hidden="true" /> Dừng
          </button>
        )}
      </div>

      {expanded && (
        <div id={panelId} className="border-t border-reasoning/15 px-4 py-3">
          <p className="mb-3 text-xs leading-5 text-slate-400">
            Các bước và lý do công khai của quy trình; không hiển thị suy luận nội bộ hoặc dữ liệu kỹ thuật nhạy cảm.
          </p>
          <ol className="space-y-2.5">
            {(run.steps || []).map((step) => (
              <li key={`${step.sequence}-${step.phase}`} className="flex items-start gap-2.5 text-xs text-slate-300">
                <span className="mt-0.5"><StepIcon status={step.status} /></span>
                <span className="min-w-0">
                  <span className="block leading-5">{step.label}</span>
                  {step.summary && <span className="mt-0.5 block leading-5 text-slate-500">{step.summary}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
