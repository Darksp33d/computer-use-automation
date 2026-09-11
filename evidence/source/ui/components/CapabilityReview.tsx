import { useEffect, useRef } from "react";
import { useCapability } from "../hooks/useCapability.js";
export function CapabilityReview({
  id,
  busy,
  close,
  approve,
  commandError,
}: {
  id: string;
  busy: boolean;
  close: () => void;
  approve: () => Promise<void>;
  commandError: string | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { data, error } = useCapability(id);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="new-run capability-review"
      aria-labelledby="review-title"
      onCancel={close}
    >
      <div className="dialog-heading">
        <div>
          <h2 id="review-title">Review capability</h2>
        </div>
        <button className="icon-close" aria-label="Close capability review" onClick={close}>
          ×
        </button>
      </div>
      {error ? (
        <p role="alert">The capability could not be loaded. Close this review and try again.</p>
      ) : data ? (
        <>
          <p>{data.description}</p>
          <p className="review-meta mono">
            {data.id} · revision {data.revision} · {data.provenance.model}
          </p>
          <h3>Executed steps</h3>
          <ol className="review-steps">
            {data.steps.map((step) => (
              <li key={step.id}>
                <strong>
                  {step.action.kind} <span className="mono">{step.action.target}</span>
                </strong>
                <small>
                  {"input" in step.action
                    ? `Parameter: ${step.action.input}`
                    : "output" in step.action
                      ? `Output: ${step.action.output}`
                      : `Effect: ${step.effect}`}
                </small>
                <p>
                  {step.preconditions.length} required conditions · {step.postconditions.length}{" "}
                  verified postconditions
                </p>
              </li>
            ))}
          </ol>
          <details>
            <summary>Inspect the complete JSON contract</summary>
            <pre tabIndex={0}>{JSON.stringify(data, null, 2)}</pre>
          </details>
          <p className="form-note">
            Approval pins this artifact and its application binding. Runtime inputs stay separate.
            The final account-opening control remains forbidden.
          </p>
          {commandError ? (
            <p role="alert" className="notice-text">
              {commandError}
            </p>
          ) : null}
          <div className="dialog-footer">
            <button className="secondary" onClick={close}>
              Close review
            </button>
            <button className="primary" disabled={busy} onClick={() => void approve()}>
              Approve this revision
            </button>
          </div>
        </>
      ) : (
        <p role="status">Loading capability…</p>
      )}
    </dialog>
  );
}
