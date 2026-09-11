import type { Action, Arguments } from "../contracts/capability.js";
import { RunError } from "../contracts/errors.js";
import { validateArguments } from "../contracts/validate.js";
import type { Session } from "../services/session.js";

export class SessionControl {
  #pending: ReturnType<typeof Promise.withResolvers<void>> | null = null;
  #interventionTimer: ReturnType<typeof setTimeout> | undefined;
  #leaseTimer: ReturnType<typeof setTimeout> | undefined;
  expiresAt: number | null = null;

  constructor(
    readonly session: Session,
    readonly interventionMs = 600_000,
    readonly leaseMs = 120_000,
  ) {
    session.execution.onIntervention = async () => {
      this.#pending = Promise.withResolvers<void>();
      this.expiresAt = Date.now() + interventionMs;
      this.#interventionTimer = setTimeout(
        () => this.#pending?.reject(new RunError("INTERVENTION_EXPIRED")),
        interventionMs,
      );
      const cancel = () => this.#pending?.reject(new RunError("CANCELED"));
      session.abort.signal.addEventListener("abort", cancel, { once: true });
      try {
        if (session.abort.signal.aborted) throw new RunError("CANCELED");
        await this.#pending.promise;
      } finally {
        session.abort.signal.removeEventListener("abort", cancel);
        clearTimeout(this.#interventionTimer);
        clearTimeout(this.#leaseTimer);
        this.expiresAt = null;
        this.#pending = null;
      }
    };
  }

  async claim(epoch: number) {
    const execution = this.session.execution;
    if (!this.#pending) throw new RunError("CONTROL_CONFLICT");
    const state = await execution.ownership.claim(epoch);
    await execution.journal.append({
      type: "control-changed",
      actor: "local-operator",
      epoch: state.epoch,
      reason: "operator-request",
    });
    clearTimeout(this.#leaseTimer);
    this.#leaseTimer = setTimeout(() => {
      void execution.ownership
        .expire(state.epoch)
        .then((current) =>
          execution.journal.append({
            type: "control-changed",
            epoch: current.epoch,
            reason: "intervention",
          }),
        )
        .catch(() => this.session.abort.abort());
    }, this.leaseMs);
    return state;
  }

  async command(epoch: number, generation: number, action: Action, value?: string) {
    const execution = this.session.execution;
    let inputs: Arguments = execution.inputs;
    if (action.kind === "fill" || action.kind === "select") {
      inputs = validateArguments(execution.capability, { ...inputs, [action.input]: value });
    } else if (value !== undefined) throw new RunError("INVALID_INPUT");
    await execution.executor.execute(action, inputs, {
      owner: "human",
      epoch,
      generation,
      stepId: execution.stepId ?? "operator",
      preconditions: [],
    });
    execution.current = await this.session.surface.observe(
      execution.intervention?.conditions ?? [],
    );
  }

  async dismissDialog(epoch: number, generation: number) {
    const execution = this.session.execution;
    await execution.ownership.run("human", epoch, async () => {
      const observation = await this.session.surface.observe();
      if (observation.generation !== generation) throw new RunError("STALE_CONTROL");
      await execution.journal.append({
        type: "action-intent",
        actor: "local-operator",
        action: "dismiss-dialog",
        epoch,
        reason: "operator-request",
      });
      await this.session.surface.dismissDialog();
      await execution.journal.append({
        type: "action-completed",
        actor: "local-operator",
        action: "dismiss-dialog",
        epoch,
      });
    });
    execution.current = await this.session.surface.observe(
      execution.intervention?.conditions ?? [],
    );
  }

  async resume(epoch: number) {
    const execution = this.session.execution;
    const conditions = execution.intervention?.conditions;
    if (!conditions || !this.#pending) throw new RunError("CONTROL_CONFLICT");
    const state = await execution.ownership.resume(epoch, async () => {
      const observation = await this.session.surface.observe(conditions);
      execution.current = observation;
      return (
        observation.state.kind === "ready" &&
        observation.conditions.length === conditions.length &&
        observation.conditions.every((item) => item.satisfied)
      );
    });
    clearTimeout(this.#leaseTimer);
    await execution.journal.append({
      type: "control-changed",
      epoch: state.epoch,
      reason: state.owner === "automation" ? "checkpoint" : "rejected",
    });
    if (state.owner === "automation") this.#pending.resolve();
    return state;
  }

  cancel() {
    this.session.abort.abort();
  }
}
