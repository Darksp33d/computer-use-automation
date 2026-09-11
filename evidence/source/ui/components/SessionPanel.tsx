import type { RunView } from "../../src/operator/contracts.js";
import { useSessionImage } from "../hooks/useSessionImage.js";
import { Icon } from "./Icon.js";

export const workflowTitle = (workflow: "savings" | "review") =>
  workflow === "savings" ? "Read savings balance" : "Prepare sub-account";
export const phaseLabel = (run: RunView) =>
  run.owner === "awaiting_human"
    ? "Needs attention"
    : run.owner === "human"
      ? "You have control"
      : {
          running: "Running",
          validating: "Validating replay",
          success: "Completed",
          business_outcome: "Business outcome",
          failure: "Stopped",
          canceled: "Canceled",
        }[run.phase];
const eventLabels: Record<string, string> = {
  "run-started": "Session started",
  "model-decision": "Model selected the next action",
  "action-intent": "Action authorized",
  "action-completed": "Action completed",
  "action-failed": "Action stopped",
  checkpoint: "Checkpoint verified",
  recovery: "Known notice recovery",
  intervention: "Operator intervention requested",
  "control-changed": "Session control changed",
  "run-finished": "Execution finished",
};

export function SessionPanel({ run }: { run: RunView }) {
  const image = useSessionImage(run.id);
  return (
    <section className="session-main">
      <div className="section-heading">
        <div className="section-title">
          <Icon name="screen" />
          <h2>Application session</h2>
        </div>
        <span className="quiet-label">NORTHSTAR · SYNTHETIC DATA</span>
      </div>
      <div className="session-window">
        <div className="window-bar">
          <span className="window-dots">
            <i />
            <i />
            <i />
          </span>
          <span>
            Member services /{" "}
            {run.screen?.replace(/-screen$/, "").replaceAll("-", " ") ?? "Connecting"}
          </span>
          <span className="privacy-badge">
            <Icon name="shield" size={13} />
            Masked view
          </span>
        </div>
        <div
          className={`screen-content${run.owner === "terminal" && !image ? " closed-screen" : ""}`}
        >
          {image ? (
            <img src={image} alt="Masked view of the same live Northstar banking session" />
          ) : (
            <div className="screen-placeholder">
              <Icon name="screen" size={34} />
              <h3>
                {run.owner === "terminal"
                  ? "Session closed"
                  : run.hasDialog
                    ? "A browser dialog needs attention"
                    : "Session view is unavailable"}
              </h3>
              <p>
                {run.owner === "terminal"
                  ? "Results and activity remain available."
                  : run.hasDialog
                    ? "Take control to dismiss the dialog, then verify and resume."
                    : "Activity remains available below."}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="timeline-header">
        <h2>Activity</h2>
        <span className="counter">{run.events.length} events</span>
      </div>
      <ol className="timeline" tabIndex={0} aria-label="Execution events">
        {run.events.map((event) => (
          <li
            key={event.seq}
            className={event.type === "intervention" || event.code ? "event-attention" : ""}
          >
            <span className="event-node">
              {event.type === "checkpoint" ? <Icon name="check" size={12} /> : <span />}
            </span>
            <div>
              <strong>{eventLabels[event.type] ?? event.type}</strong>
              {event.target || event.code || event.actor === "local-operator" ? (
                <p>
                  {event.target?.replaceAll("-", " ") ??
                    event.code?.replaceAll("_", " ") ??
                    "Local operator"}
                </p>
              ) : null}
            </div>
            <time dateTime={event.at}>
              {new Date(event.at).toLocaleTimeString([], { hour12: false })}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}
