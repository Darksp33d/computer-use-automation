import { useState } from "react";
import { CapabilityReview } from "./components/CapabilityReview.js";
import { Icon } from "./components/Icon.js";
import { Inspector } from "./components/Inspector.js";
import { NewRun } from "./components/NewRun.js";
import { phaseLabel, SessionPanel, workflowTitle } from "./components/SessionPanel.js";
import { Wordmark } from "./components/Wordmark.js";
import { useWorkspace } from "./hooks/useWorkspace.js";

export function App() {
  const workspace = useWorkspace();
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [newRun, setNewRun] = useState(false);
  const [page, setPage] = useState<"sessions" | "capabilities">("sessions");
  const selected = workspace.selected;
  const attention =
    workspace.data?.runs.filter((run) => run.owner === "awaiting_human" || run.owner === "human")
      .length ?? 0;
  if (!workspace.authenticated)
    return (
      <main className="launch-state">
        <Wordmark />
        <h1>Open your secure workspace.</h1>
        <p>
          Use the launch link printed by <code>yarn demo</code>. It connects this tab to your local
          session controller.
        </p>
        <p className="muted">
          A page refresh clears the in-memory credential. Open the launch link again to reconnect.
        </p>
      </main>
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <nav className="sidebar" aria-label="Main navigation">
        <Wordmark />
        <div className="workspace-label">
          <span className="workspace-avatar">N</span>
          <div>
            Northstar workspace<small>Computer-use operations</small>
          </div>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <button
          className={page === "sessions" ? "nav-item active" : "nav-item"}
          onClick={() => setPage("sessions")}
        >
          <Icon name="activity" />
          Sessions{attention ? <span className="nav-count">{attention}</span> : null}
        </button>
        <button
          className={page === "capabilities" ? "nav-item active" : "nav-item"}
          onClick={() => setPage("capabilities")}
        >
          <Icon name="box" />
          Capabilities
        </button>
        <div className="sidebar-footer">
          <span className="local-indicator" />
          <div>
            Local environment<small>Synthetic banking records</small>
          </div>
        </div>
      </nav>
      <div className="app-content">
        <header className="topbar">
          <span>
            Workspace <span className="breadcrumb-slash">/</span>{" "}
            {page === "sessions" ? "Sessions" : "Capabilities"}
          </span>
          <span className="connection-state">
            <span className="local-indicator" />
            {workspace.data ? "Controller connected" : "Connecting"}
          </span>
        </header>
        <main id="workspace">
          <div className="page-heading">
            <div>
              <span className="eyebrow">COMPUTER-USE OPERATIONS</span>
              <h1>
                {page === "sessions"
                  ? "Your workflows, in motion."
                  : "Learn once. Run with confidence."}
              </h1>
              <p>
                {page === "sessions"
                  ? "Follow every step. Step in when it matters."
                  : "Reviewed, parameterized workflows ready for deterministic replay."}
              </p>
            </div>
            <button className="primary" disabled={!workspace.data} onClick={() => setNewRun(true)}>
              <Icon name="plus" size={16} />
              New session
            </button>
          </div>
          {workspace.error && !newRun ? (
            <div className="error-banner" role="alert">
              <span>{workspace.error.replaceAll("_", " ")}</span>
              <button onClick={workspace.dismissError} aria-label="Dismiss error">
                ×
              </button>
            </div>
          ) : null}
          {page === "capabilities" ? (
            <section className="catalog">
              <div className="section-heading">
                <h2>Reviewed capabilities</h2>
                <span className="counter">
                  {workspace.data?.capabilities.length ?? 0} revisions
                </span>
              </div>
              {workspace.data?.capabilities.length ? (
                workspace.data.capabilities.map((capability) => (
                  <article
                    className="capability-row"
                    key={`${capability.id}-${capability.revision}`}
                  >
                    <div className="capability-icon">
                      <Icon name="box" size={24} />
                    </div>
                    <div>
                      <h3>{workflowTitle(capability.workflow)}</h3>
                      <p>
                        {capability.workflow === "savings"
                          ? "Verify a member's savings balance and return typed output."
                          : "Prepare account details and stop before final creation."}
                      </p>
                      <small className="mono">
                        {capability.id} · v{capability.revision}
                      </small>
                    </div>
                    <span className="approved-tag">
                      <Icon name="check" size={14} />
                      Reviewed
                    </span>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <Icon name="box" size={38} />
                  <h2>Your first capability starts with discovery.</h2>
                  <p>
                    Start a discovery session, inspect the verified result, and approve the reusable
                    path.
                  </p>
                  <button className="secondary" onClick={() => setNewRun(true)}>
                    Start a session
                  </button>
                </div>
              )}
            </section>
          ) : (
            <>
              {workspace.data?.runs.length ? (
                <div className="run-strip" aria-label="Session selection">
                  {workspace.data.runs.map((run) => (
                    <button
                      key={run.id}
                      className={selected?.id === run.id ? "run-tab selected" : "run-tab"}
                      onClick={() => workspace.select(run.id)}
                    >
                      <span>
                        <span
                          className={`status-dot ${run.owner === "awaiting_human" || run.owner === "human" ? "attention" : run.phase}`}
                        />
                        {workflowTitle(run.workflow)}
                      </span>
                      <small>
                        {phaseLabel(run)} <span className="mono">{run.id.slice(0, 6)}</span>
                      </small>
                    </button>
                  ))}
                </div>
              ) : null}
              {selected ? (
                <div className="workbench">
                  <SessionPanel key={selected.id} run={selected} />
                  <Inspector
                    key={`inspector-${selected.id}`}
                    run={selected}
                    busy={workspace.busy}
                    review={() => setReviewId(selected.id)}
                    send={(body) => workspace.command(selected.id, body)}
                  />
                </div>
              ) : (
                <section className="empty-state welcome">
                  <div className="empty-illustration">
                    <div>
                      <Icon name="screen" size={28} />
                    </div>
                    <span />
                    <div>
                      <Icon name="check" size={28} />
                    </div>
                  </div>
                  <span className="eyebrow">READY WHEN YOU ARE</span>
                  <h2>A clear view of every workflow.</h2>
                  <p>
                    Launch a reviewed capability or discover a new path.
                    <br />
                    Your live session and its execution record will appear here.
                  </p>
                  <button
                    className="primary"
                    disabled={!workspace.data}
                    onClick={() => setNewRun(true)}
                  >
                    Start your first session <Icon name="arrow" size={16} />
                  </button>
                  <div className="welcome-facts">
                    <span>
                      <Icon name="shield" size={16} />
                      Policy-checked actions
                    </span>
                    <span>
                      <Icon name="activity" size={16} />
                      Same-session handoff
                    </span>
                    <span>
                      <Icon name="box" size={16} />
                      Model-free replay
                    </span>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
        <footer className="workspace-footer">
          <span>PRAXIS LOOM / LOCAL WORKSPACE</span>
          <span>Discover. Verify. Replay.</span>
        </footer>
      </div>
      {reviewId ? (
        <CapabilityReview
          id={reviewId}
          commandError={workspace.error}
          busy={workspace.busy}
          close={() => setReviewId(null)}
          approve={async () => {
            if (await workspace.command(reviewId, { kind: "approve" })) setReviewId(null);
          }}
        />
      ) : null}
      {newRun && workspace.data ? (
        <NewRun
          data={workspace.data}
          error={workspace.error}
          busy={workspace.busy}
          start={workspace.start}
          close={() => setNewRun(false)}
        />
      ) : null}
    </div>
  );
}
