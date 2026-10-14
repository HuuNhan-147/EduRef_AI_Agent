import { Layers3 } from 'lucide-react';

export default function Brand({ compact = false }) {
  return (
    <span className="eduref-brand">
      <span className="eduref-brand-mark" aria-hidden="true"><Layers3 size={22} strokeWidth={1.7} /></span>
      <span>
        <span className="eduref-brand-name">EduRef<span> AI</span></span>
        {!compact && <span className="eduref-brand-caption">Học vụ, nhẹ nhàng hơn.</span>}
      </span>
    </span>
  );
}
