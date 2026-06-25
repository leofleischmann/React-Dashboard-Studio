/** Generic card container — the basic building block. */
export function Card({
  children,
  style,
  onClick,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div className="rd-card" style={style} onClick={onClick}>
      {children}
    </div>
  );
}

/** Section wrapper with a title. */
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rd-section">
      <h2 className="rd-section__title">{title}</h2>
      {children}
    </section>
  );
}

/** A small labelled stat tile. */
export function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rd-card rd-stat ${accent ? 'is-accent' : ''}`}>
      <span className="rd-stat__label">{label}</span>
      <span className="rd-stat__value">
        {value}
        {unit && <small> {unit}</small>}
      </span>
    </div>
  );
}

/** Responsive grid — `min` sets the minimum column width in px. */
export function Grid({
  children,
  min = 180,
}: {
  children: React.ReactNode;
  min?: number;
}) {
  return (
    <div className="rd-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}>
      {children}
    </div>
  );
}
