import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, MinusCircle } from 'lucide-react';
import { cn, getStatusMeta } from '../../lib/ui';

const toneStyles = {
  success: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  attention: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  danger: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
  info: 'border-blue-400/25 bg-blue-400/10 text-blue-200',
  neutral: 'border-ui-border bg-surface-soft/70 text-slate-300',
};

const toneIcons = {
  success: CheckCircle2,
  attention: Clock3,
  danger: AlertCircle,
  info: LoaderCircle,
  neutral: MinusCircle,
};

export default function StatusBadge({ status, label, tone, className, showIcon = true }) {
  const meta = getStatusMeta(status);
  const resolvedTone = tone || meta.tone;
  const Icon = toneIcons[resolvedTone] || MinusCircle;

  return (
    <span className={cn('inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none', toneStyles[resolvedTone], className)}>
      {showIcon && <Icon className={cn('h-3.5 w-3.5', resolvedTone === 'info' && ['PROCESSING', 'CHECKING'].includes(status) && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />}
      {label || meta.label}
    </span>
  );
}
