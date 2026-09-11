export function Wordmark() {
  return (
    <div className="wordmark" role="img" aria-label="Praxis Loom">
      <svg className="brand-symbol" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M7 5v22M16 5v22M25 5v22M5 10h22M5 22h22" />
        <path className="brand-thread" d="M5 16h22" />
      </svg>
      <span className="brand-name" aria-hidden="true">
        praxis<small>loom</small>
      </span>
      <span className="edition" aria-hidden="true">
        LOCAL
      </span>
    </div>
  );
}
