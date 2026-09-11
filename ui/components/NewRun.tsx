import { useEffect, useRef, useState } from "react";
import type { StartRequest, WorkspaceView } from "../../src/operator/contracts.js";

export function NewRun({
  data,
  busy,
  start,
  close,
  error,
}: {
  data: WorkspaceView;
  busy: boolean;
  start: (body: StartRequest) => Promise<boolean>;
  close: () => void;
  error: string | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [workflow, setWorkflow] = useState<"savings" | "review">("savings");
  const [mode, setMode] = useState<"replay" | "discovery">("replay");
  const [memberId, setMemberId] = useState("A1001");
  const [scenario, setScenario] = useState<StartRequest["scenario"]>("normal");
  const [nickname, setNickname] = useState("Travel fund");
  const [accountType, setAccountType] = useState("savings");
  const available = data.capabilities.some((item) => item.workflow === workflow);
  const allowed = mode === "discovery" ? data.providerConfigured : available;
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog aria-labelledby="new-run-title" ref={dialog} className="new-run" onCancel={close}>
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">NEW SESSION</span>
          <h2 id="new-run-title">Put a workflow to work.</h2>
        </div>
        <button className="icon-close" type="button" aria-label="Close new session" onClick={close}>
          ×
        </button>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (
            await start({
              workflow,
              mode,
              scenario,
              inputs: workflow === "savings" ? { memberId } : { memberId, nickname, accountType },
            })
          )
            close();
        }}
      >
        <label>
          Workflow
          <select
            value={workflow}
            onChange={(event) => setWorkflow(event.target.value as "savings" | "review")}
          >
            <option value="savings">Read savings balance</option>
            <option value="review">Prepare sub-account</option>
          </select>
        </label>
        <fieldset className="mode-options">
          <legend>Execution mode</legend>
          <label>
            <input
              type="radio"
              name="mode"
              checked={mode === "replay"}
              onChange={() => setMode("replay")}
            />
            <span>
              <strong>Replay</strong>
              <small>Run a reviewed capability. No model calls.</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="mode"
              checked={mode === "discovery"}
              onChange={() => setMode("discovery")}
            />
            <span>
              <strong>Discover</strong>
              <small>Learn from the live UI with GPT-6 Astra.</small>
            </span>
          </label>
        </fieldset>
        <div className="form-grid">
          <label>
            Member number
            <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
              <option>A1001</option>
              <option>B1002</option>
            </select>
          </label>
          <label>
            Scenario
            <select
              value={scenario}
              onChange={(event) => setScenario(event.target.value as StartRequest["scenario"])}
            >
              <option value="normal">Normal flow</option>
              <option value="intervention">Operator notice</option>
              <option value="notice">Recoverable notice</option>
              <option value="session-expired">Expired session</option>
              <option value="native-dialog">Browser dialog</option>
              <option value="not-found">Member not found</option>
              <option value="permission">Permission denied</option>
              <option value="malformed-balance">Malformed balance</option>
              <option value="validation">Validation rejected</option>
            </select>
          </label>
        </div>
        {workflow === "review" ? (
          <div className="form-grid">
            <label>
              Account type
              <select value={accountType} onChange={(event) => setAccountType(event.target.value)}>
                <option value="savings">Savings</option>
                <option value="checking">Checking</option>
              </select>
            </label>
            <label>
              Account nickname
              <input
                required
                maxLength={40}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
            </label>
          </div>
        ) : null}
        <p className="form-note">All records are fictional. Account preparation stops at review.</p>
        {!allowed ? (
          <p role="status" className="notice-text">
            {mode === "replay"
              ? "Discover and approve this workflow first, or install the included reviewed capabilities."
              : "Fresh discovery needs a server-side OpenAI API key. Replay works without one."}
          </p>
        ) : null}
        {error ? (
          <p className="notice-text" role="alert">
            {error}
          </p>
        ) : null}
        <div className="dialog-footer">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy || !allowed} type="submit">
            {busy ? "Starting session…" : "Start session"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
