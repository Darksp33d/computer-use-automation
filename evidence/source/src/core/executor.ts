import type { Action, Arguments, Condition } from "../contracts/capability.js";
import { failureCode, RunError } from "../contracts/errors.js";
import type { EffectState } from "../contracts/runtime.js";
import type { Journal } from "../evidence/journal.js";
import type { Surface } from "../surfaces/surface.js";
import type { Ownership } from "./ownership.js";
import type { Policy } from "./policy.js";

export class Executor {
  effect: EffectState = "not_dispatched";
  constructor(
    readonly surface: Surface,
    readonly policy: Policy,
    readonly ownership: Ownership,
    readonly journal: Journal,
    readonly signal: AbortSignal,
  ) {}

  execute(
    action: Action,
    inputs: Arguments,
    options: {
      stepId: string;
      owner: "automation" | "human";
      epoch: number;
      preconditions: Condition[];
      generation?: number;
    },
  ) {
    return this.ownership.run(options.owner, options.epoch, async () => {
      this.effect = "not_dispatched";
      if (this.signal.aborted) throw new RunError("CANCELED");
      this.policy.authorize(action, options.owner);
      const current = await this.surface.observe();
      if (options.owner === "automation") {
        if (current.state.kind === "blocked") throw new RunError(current.state.code);
        if (current.state.kind === "business") throw new RunError("CHECKPOINT_FAILED");
        if (current.state.kind === "recoverable" && current.state.target !== action.target)
          throw new RunError("CHECKPOINT_FAILED");
      }
      if (options.generation !== undefined && current.generation !== options.generation)
        throw new RunError("STALE_CONTROL");
      for (const condition of options.preconditions)
        if (!(await this.surface.check(condition))) throw new RunError("CHECKPOINT_FAILED");
      const event = {
        stepId: options.stepId,
        target: action.target,
        action: action.kind,
        actor: options.owner === "human" ? ("local-operator" as const) : ("automation" as const),
        epoch: options.epoch,
      };
      await this.journal.append({
        type: "action-intent",
        ...event,
        reason: options.owner === "human" ? "operator-request" : "goal-step",
      });
      if (this.signal.aborted) throw new RunError("CANCELED");
      this.effect = "unknown";
      try {
        const value = await this.surface.act(action, inputs, options.owner);
        this.effect = "confirmed";
        await this.journal.append({ type: "action-completed", ...event });
        return value;
      } catch (error) {
        if (
          error instanceof RunError &&
          ["TARGET_AMBIGUOUS", "TARGET_MISSING", "POLICY_DENIED"].includes(error.code)
        )
          this.effect = "not_dispatched";
        await this.journal.append({ type: "action-failed", ...event, code: failureCode(error) });
        throw error;
      }
    });
  }
}
