import { useState } from "react";
import type { ControlRequest, RunView } from "../../src/operator/contracts.js";
import { Icon } from "./Icon.js";
import { phaseLabel } from "./SessionPanel.js";

function ManualField({
  control,
  run,
  busy,
  send,
}: {
  control: RunView["controls"][number];
  run: RunView;
  busy: boolean;
  send: (body: ControlRequest) => Promise<boolean>;
}) {
  const [value, setValue] = useState("");
  if (!control.input || (control.action !== "fill" && control.action !== "select")) return null;
  return (
    <form
      className="manual-field"
      onSubmit={(event) => {
        event.preventDefault();
        if (control.action === "fill" || control.action === "select")
          void send({
            kind: "act",
            epoch: run.epoch,
            generation: run.generation,
            action: { kind: control.action, target: control.id, input: control.input! },
            value,
          });
      }}
    >
      <label>
        {control.label}
        {control.action === "select" ? (
          <select value={value} onChange={(event) => setValue(event.target.value)} required>
            <option value="">Choose a value</option>
            {control.values.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        ) : (
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={40}
            required
            autoComplete="off"
          />
        )}
      </label>
      <button type="submit" className="secondary" disabled={busy}>
        Apply
      </button>
    </form>
  );
}

export function Inspector({
  run,
  busy,
  send,
  review,
}: {
  run: RunView;
  busy: boolean;
  send: (body: ControlRequest) => Promise<boolean>;
  review: () => void;
}) {
  const paused = run.owner === "awaiting_human" || run.owner === "human";
  return (
    <aside className="inspector">
      <div className={`status-block ${paused ? "needs-attention" : ""}`}>
        <span className={`status-dot ${run.phase}`} />
        <h2 role="status" aria-live="polite">
          {phaseLabel(run)}
        </h2>
      </div>
      <dl className="metadata">
        <div>
          <dt>Mode</dt>
          <dd>{run.mode === "replay" ? "Replay" : "Discovery"}</dd>
        </div>
        <div>
          <dt>Control</dt>
          <dd>
            {run.phase === "validating"
              ? "Validation run"
              : run.owner === "human"
                ? "Local operator"
                : run.owner === "awaiting_human"
                  ? "Waiting for operator"
                  : run.owner === "terminal"
                    ? "Session closed"
                    : "Automation"}
          </dd>
        </div>
        <div>
          <dt>Current step</dt>
          <dd className="mono">{run.stepId ?? "Preparing"}</dd>
        </div>
        <div>
          <dt>Run ID</dt>
          <dd className="mono" title={run.id}>
            {run.id.slice(0, 8)}
          </dd>
        </div>
      </dl>
      {paused ? (
        <section className="attention-card">
          <h3>
            {run.code === "SESSION_EXPIRED"
              ? "Restore the session"
              : run.code === "CHECKPOINT_FAILED"
                ? "Review the checkpoint"
                : "Resolve the interruption"}
          </h3>
          <p>
            {run.owner === "awaiting_human"
              ? "Take control to resolve this. Automation will stay paused."
              : "Use the controls below, then verify and resume."}
          </p>
          {run.expiresAt ? (
            <small>
              Intervention expires at{" "}
              {new Date(run.expiresAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          ) : null}
          {run.owner === "awaiting_human" ? (
            <button
              className="primary full"
              disabled={busy}
              onClick={() => void send({ kind: "claim", epoch: run.epoch })}
            >
              Take control <Icon name="arrow" size={16} />
            </button>
          ) : (
            <>
              <div className="manual-controls">
                {run.hasDialog ? (
                  <button
                    className="secondary full"
                    disabled={busy}
                    onClick={() =>
                      void send({
                        kind: "dismiss-dialog",
                        epoch: run.epoch,
                        generation: run.generation,
                      })
                    }
                  >
                    Dismiss browser dialog
                  </button>
                ) : (
                  run.controls.map((control) =>
                    control.action === "click" ? (
                      <button
                        key={control.id}
                        className="secondary full"
                        disabled={busy}
                        onClick={() =>
                          void send({
                            kind: "act",
                            epoch: run.epoch,
                            generation: run.generation,
                            action: { kind: "click", target: control.id },
                          })
                        }
                      >
                        {control.label}
                      </button>
                    ) : (
                      <ManualField
                        key={control.id}
                        control={control}
                        run={run}
                        busy={busy}
                        send={send}
                      />
                    ),
                  )
                )}
              </div>
              <button
                className="primary full"
                disabled={busy}
                onClick={() => void send({ kind: "resume", epoch: run.epoch })}
              >
                Verify & resume <Icon name="arrow" size={16} />
              </button>
              <small>Resume succeeds only when the live checkpoint matches.</small>
            </>
          )}
        </section>
      ) : null}
      {run.outputs.length ? (
        <section className="output-card">
          <span className="eyebrow">VERIFIED OUTPUT</span>
          {run.outputs.map((output) => (
            <div key={output.name}>
              <span>
                {output.name === "availableBalanceMinor"
                  ? "Available balance"
                  : output.name.replace(/([A-Z])/g, " $1").toLowerCase()}
              </span>
              <strong className="mono">
                {output.name === "availableBalanceMinor"
                  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                      Number(output.value) / 100,
                    )
                  : output.value}
              </strong>
            </div>
          ))}
        </section>
      ) : null}
      {run.canApprove ? (
        <section className="approval-card">
          <h3>Ready to review</h3>
          <p>
            Replay passed with different inputs. Review the steps before saving this capability.
          </p>
          <button className="primary full" disabled={busy} onClick={review}>
            Review capability
          </button>
        </section>
      ) : null}
      {run.approved ? (
        <p className="approved-note">
          <Icon name="check" />
          Capability approved for replay
        </p>
      ) : null}
      {run.phase === "failure" || run.phase === "business_outcome" ? (
        <section className="result-note">
          <h3>{run.phase === "failure" ? "Execution stopped" : "Known business outcome"}</h3>
          <p>{run.code?.replaceAll("_", " ").toLowerCase()}</p>
          <small>
            No successful output was returned. Review the event record before starting a new
            session.
          </small>
        </section>
      ) : null}
      {run.owner !== "terminal" || run.phase === "validating" ? (
        <button
          className="text-button danger-text"
          disabled={busy}
          onClick={() => void send({ kind: "cancel" })}
        >
          Cancel session
        </button>
      ) : null}
    </aside>
  );
}
