export function Wordmark() {
  return (
    <div className="wordmark" role="img" aria-label="Groove">
      <svg className="brand-symbol" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M26 8a12 12 0 1 0 1 14" />
        <path d="M22 12a7 7 0 1 0 0 9h-6" />
        <path className="brand-thread" d="M16 16h12v6" />
      </svg>
      <span className="brand-name" aria-hidden="true">
        groove
      </span>
      <span className="edition" aria-hidden="true">
        LOCAL
      </span>
    </div>
  );
}
