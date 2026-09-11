import { setTimeout as delay } from "node:timers/promises";
import type {
  Arguments,
  BusinessCode,
  Capability,
  Condition,
  Step,
} from "../contracts/capability.js";
import { type FailureCode, failureCode, RunError } from "../contracts/errors.js";
import type { Observation, Result } from "../contracts/runtime.js";
import { parseOutput } from "../contracts/validate.js";
import type { Journal } from "../evidence/journal.js";
import type { Surface } from "../surfaces/surface.js";
import { Executor } from "./executor.js";
import { Ownership } from "./ownership.js";
import type { Policy } from "./policy.js";

export class BusinessOutcome extends Error {
  constructor(readonly code: BusinessCode) {
    super(code);
  }
}

export interface Intervention {
  code: FailureCode;
  stepId: string | null;
  conditions: Condition[];
}

export class Execution {
  readonly ownership = new Ownership();
  readonly executor: Executor;
  readonly outputs: Arguments = {};
  current: Observation | null = null;
  stepId: string | null = null;
  completedSteps = 0;
  intervention: Intervention | null = null;
  onIntervention: ((request: Intervention) => Promise<void>) | null = null;
  #recoveries = new Set<number>();
  #deadline: number;

  constructor(
    readonly runId: string,
    readonly capability: Capability,
    readonly inputs: Arguments,
    readonly surface: Surface,
    readonly policy: Policy,
    readonly journal: Journal,
    readonly signal: AbortSignal,
    readonly conditionTimeoutMs = 5_000,
    activeTimeoutMs = 120_000,
  ) {
    this.executor = new Executor(surface, policy, this.ownership, journal, signal);
    this.#deadline = performance.now() + activeTimeoutMs;
  }

  assertActive() {
    if (this.signal.aborted) throw new RunError("CANCELED");
    if (performance.now() >= this.#deadline) throw new RunError("BUDGET_EXCEEDED");
  }

  get remainingActiveMs() {
    this.assertActive();
    return Math.max(1, Math.ceil(this.#deadline - performance.now()));
  }

  async observe(conditions: Condition[] = []) {
    this.assertActive();
    this.current = await this.surface.observe(conditions);
    return this.current;
  }

  async handleState(conditions: Condition[]) {
    const observation = await this.observe(conditions);
    if (observation.state.kind === "business") {
      const code = observation.state.code;
      const outcome = this.capability.outcomes.find((item) => item.code === code);
      if (!outcome || !(await this.surface.check(outcome.when)))
        throw new RunError("CHECKPOINT_FAILED");
      throw new BusinessOutcome(code);
    }
    if (observation.state.kind === "blocked") {
      const code = observation.state.code;
      if (["UNEXPECTED_DIALOG", "SESSION_EXPIRED"].includes(code)) {
        await this.pause(code, conditions);
        return this.observe(conditions);
      }
      throw new RunError(code);
    }
    if (observation.state.kind === "recoverable") {
      const target = observation.state.target;
      const index = this.capability.recovery.findIndex(
        (handler) => handler.action.target === target,
      );
      const handler = this.capability.recovery[index];
      if (!handler || this.#recoveries.has(index) || !(await this.surface.check(handler.when)))
        throw new RunError("CHECKPOINT_FAILED");
      this.#recoveries.add(index);
      await this.journal.append({ type: "recovery", target, reason: "known-recovery" });
      await this.executor.execute(handler.action, this.inputs, {
        stepId: "known-recovery",
        owner: "automation",
        epoch: this.ownership.state.epoch,
        preconditions: [handler.when],
      });
      for (const condition of handler.postconditions)
        if (!(await this.surface.check(condition))) throw new RunError("CHECKPOINT_FAILED");
      return this.observe(conditions);
    }
    return observation;
  }

  async pause(code: FailureCode, conditions: Condition[]) {
    if (!this.onIntervention) throw new RunError(code);
    const started = performance.now();
    await this.ownership.pause();
    this.intervention = { code, stepId: this.stepId, conditions };
    await this.journal.append({
      type: "intervention",
      code,
      reason: "intervention",
      epoch: this.ownership.state.epoch,
    });
    try {
      await this.onIntervention(this.intervention);
    } finally {
      this.#deadline += performance.now() - started;
    }
    this.assertActive();
    if (this.ownership.state.owner !== "automation") throw new RunError("CONTROL_CONFLICT");
    this.intervention = null;
  }

  async wait(conditions: Condition[]) {
    const started = performance.now();
    let paused = 0;
    while (performance.now() - started - paused < this.conditionTimeoutMs) {
      const before = performance.now();
      const deadlineBefore = this.#deadline;
      const observation = await this.handleState(conditions);
      paused += this.#deadline - deadlineBefore;
      if (
        observation.conditions.length === conditions.length &&
        observation.conditions.every((item) => item.satisfied)
      )
        return;
      this.assertActive();
      await delay(Math.max(20, 75 - (performance.now() - before)), undefined, {
        signal: this.signal,
      }).catch(() => {
        throw new RunError("CANCELED");
      });
    }
    await this.pause("CHECKPOINT_FAILED", conditions);
    const observed = await this.handleState(conditions);
    if (
      observed.conditions.length !== conditions.length ||
      !observed.conditions.every((item) => item.satisfied)
    )
      throw new RunError("CHECKPOINT_FAILED");
  }

  async step(step: Step) {
    this.stepId = step.id;
    this.executor.effect = "not_dispatched";
    await this.wait(step.preconditions);
    let raw: string | null = null;
    try {
      raw = await this.executor.execute(step.action, this.inputs, {
        stepId: step.id,
        owner: "automation",
        epoch: this.ownership.state.epoch,
        preconditions: step.preconditions,
      });
    } catch (error) {
      if (
        !(error instanceof RunError) ||
        error.code !== "UNCERTAIN_EFFECT" ||
        step.action.kind === "read"
      )
        throw error;
      // A sent click is never repeated. Its postcondition may resolve the uncertainty.
      await this.wait(step.postconditions);
      this.executor.effect = "confirmed";
    }
    await this.wait(step.postconditions);
    if (step.action.kind === "read") {
      if (raw === null) throw new RunError("OUTPUT_INVALID");
      this.outputs[step.action.output] = parseOutput(
        this.capability.outputs[step.action.output]!,
        raw,
      );
    }
    this.completedSteps++;
    await this.journal.append({ type: "checkpoint", stepId: step.id, reason: "checkpoint" });
  }

  async successfulResult(): Promise<Result> {
    await this.wait(this.capability.success);
    if (Object.keys(this.outputs).length !== Object.keys(this.capability.outputs).length)
      throw new RunError("OUTPUT_INVALID");
    return { status: "success", runId: this.runId, outputs: { ...this.outputs } };
  }

  resultFrom(error: unknown): Result {
    if (error instanceof BusinessOutcome)
      return { status: "business_outcome", runId: this.runId, code: error.code };
    const code = this.signal.aborted ? "CANCELED" : failureCode(error);
    if (code === "CANCELED")
      return {
        status: "canceled",
        runId: this.runId,
        stepId: this.stepId,
        effect: this.executor.effect,
      };
    return {
      status: "failure",
      runId: this.runId,
      code,
      stepId: this.stepId,
      effect: this.executor.effect,
    };
  }

  async finish(result: Result) {
    await this.journal.append({
      type: "run-finished",
      status: result.status,
      ...("code" in result ? { code: result.code } : {}),
      reason: "completed",
    });
    await this.ownership.finish();
  }
}
