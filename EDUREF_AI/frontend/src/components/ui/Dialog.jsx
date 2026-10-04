import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/ui';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Dialog({ open, onClose, title, description, children, footer, className, closeLabel = 'Đóng hộp thoại' }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const id = useId();
  const titleId = `dialog-title-${id}`;
  const descriptionId = `dialog-description-${id}`;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelectorAll(FOCUSABLE)?.[0]?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={cn('max-h-[92dvh] w-full overflow-hidden rounded-t-3xl border border-ui-border bg-surface-raised shadow-2xl sm:max-w-xl sm:rounded-2xl', className)}>
        <header className="flex items-start justify-between gap-4 border-b border-ui-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
            {description && <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="ui-icon-button -mr-2 -mt-1" aria-label={closeLabel}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="max-h-[calc(92dvh-9rem)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <footer className="border-t border-ui-border bg-surface px-5 py-4 sm:px-6">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}
