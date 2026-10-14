export default function FeatureVisual({ icon: Icon, variant }) {
  return (
    <div className={`feature-visual feature-visual-${variant}`} aria-hidden="true">
      <div className="feature-visual-stage">
        <span className="feature-plane feature-plane-back" />
        <span className="feature-plane feature-plane-middle" />
        <span className="feature-plane feature-plane-front">
          <span className="feature-visual-icon"><Icon size={27} strokeWidth={1.4} /></span>
          {variant === 'routing' ? (
            <span className="feature-route"><i /><i /><i /></span>
          ) : (
            <span className="feature-paper-lines"><i /><i /><i /></span>
          )}
        </span>
        <span className="feature-visual-tile"><Icon size={20} strokeWidth={1.5} /></span>
      </div>
    </div>
  );
}
