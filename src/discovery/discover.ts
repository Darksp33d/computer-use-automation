import { join } from "node:path";
import { visible } from "../applications/legacy-bank.js";
import type { Action, Condition, Step } from "../contracts/capability.js";
import { RunError } from "../contracts/errors.js";
import type { Result } from "../contracts/runtime.js";
import { parseCapability, parseOutput } from "../contracts/validate.js";
import type { Execution } from "../core/execution.js";
import { writeNewJson } from "../evidence/files.js";
import type { Session } from "../services/session.js";
import { Decision, type DecisionProvider, type DiscoveryView } from "./provider.js";

function view(execution: Execution, goal: string): DiscoveryView {
  const observation = execution.current!;
  const capability = execution.capability;
  return {
    goal,
    target: "northstar",
    task: {
      description: capability.description,
      inputs: capability.inputs,
      outputs: capability.outputs,
      success: capability.success,
    },
    observation,
    controls: observation.controls
      .filter((control) => control.visible && control.enabled)
      .flatMap((control) => {
        const rule = execution.policy.binding.actions[control.id];
        const target = capability.targets[control.id]!;
        if (
          !rule ||
          rule.humanOnly ||
          (rule.input && !Object.hasOwn(capability.inputs, rule.input))
        )
          return [];
        return [
          {
            id: control.id,
            label:
              target.kind === "role"
                ? target.name
                : target.kind === "text"
                  ? target.text
                  : target.caption,
            action: rule.kind,
            input: rule.input ?? null,
          },
        ];
      }),
    executed: capability.steps.map((step) => step.action),
    collectedOutputs: Object.keys(execution.outputs),
  };
}

export function discover(session: Session, provider: DecisionProvider) {
  return session.run(async (execution) => {
    const capability = execution.capability;
    const seen = new Set<string>();
    let result: Result;
    let totalTokens = 0;
    try {
      await execution.journal.append({ type: "run-started" });
      await execution.wait(capability.entry.conditions);
      for (let index = 0; ; index++) {
        if (index >= 30) throw new RunError("BUDGET_EXCEEDED");
        const before = await execution.handleState(capability.success);
        if (!before.screen) throw new RunError("CHECKPOINT_FAILED");
        const response = await provider.decide(
          view(execution, session.discoveryGoal ?? capability.description),
          await session.surface.screenshot(),
          AbortSignal.any([execution.signal, AbortSignal.timeout(execution.remainingActiveMs)]),
        );
        execution.assertActive();
        const parsed = Decision.safeParse(response.decision);
        if (!parsed.success) throw new RunError("MODEL_INVALID");
        const decision = parsed.data;
        totalTokens += response.metadata.inputTokens + response.metadata.outputTokens;
        if (totalTokens > 120_000) throw new RunError("BUDGET_EXCEEDED");
        capability.provenance = {
          ...capability.provenance,
          runId: session.runId,
          model: response.metadata.model,
          browserVersion: session.surface.browserVersion,
        };
        await execution.journal.append({
          type: "model-decision",
          reason: "provider-decision",
          provider: response.metadata,
        });
        if (decision.kind === "unsupported") {
          if (decision.action !== null) throw new RunError("MODEL_INVALID");
          throw new RunError("GOAL_UNSUPPORTED");
        }
        if (decision.kind === "finish") {
          if (decision.action !== null) throw new RunError("MODEL_INVALID");
          result = await execution.successfulResult();
          const compiled = parseCapability(JSON.stringify(capability));
          execution.policy.validate(compiled);
          await writeNewJson(join(session.directory, "capability.json"), compiled);
          break;
        }
        const action = decision.action;
        if (!action) throw new RunError("MODEL_INVALID");
        const effect = execution.policy.authorize(action, "automation");
        if (
          !view(execution, session.discoveryGoal ?? capability.description).controls.some(
            (control) => control.id === action.target,
          )
        )
          throw new RunError("MODEL_INVALID");
        const fingerprint = JSON.stringify([before.screen, action]);
        if (seen.has(fingerprint)) throw new RunError("NO_PROGRESS");
        seen.add(fingerprint);
        const preconditions: Condition[] = [visible(before.screen), visible(action.target)];
        if (before.controls.some((control) => control.id === "member-number" && control.visible))
          preconditions.push({ kind: "equalsInput", target: "member-number", input: "memberId" });
        if (action.kind === "read") {
          const definition = capability.outputs[action.output];
          if (
            !definition ||
            definition.target !== action.target ||
            Object.hasOwn(execution.outputs, action.output)
          )
            throw new RunError("MODEL_INVALID");
          for (const condition of capability.success)
            if (
              !preconditions.some(
                (existing) => JSON.stringify(existing) === JSON.stringify(condition),
              )
            )
              preconditions.push(condition);
        }
        execution.stepId = `step-${capability.steps.length + 1}`;
        execution.expectedConditions = preconditions;
        execution.expectedOutput = action.kind === "read" ? action.output : null;
        const raw = await execution.executor.execute(action, execution.inputs, {
          stepId: execution.stepId,
          owner: "automation",
          epoch: execution.ownership.state.epoch,
          generation: before.generation,
          preconditions,
        });
        const after = await execution.handleState([]);
        if (!after.screen) throw new RunError("CHECKPOINT_FAILED");
        const postconditions: Condition[] = [visible(after.screen)];
        if (action.kind === "fill" || action.kind === "select")
          postconditions.push({ kind: "equalsInput", target: action.target, input: action.input });
        await execution.wait(postconditions);
        if (action.kind === "read") {
          if (raw === null) throw new RunError("OUTPUT_INVALID");
          execution.outputs[action.output] = parseOutput(capability.outputs[action.output]!, raw);
        }
        const step: Step = {
          id: execution.stepId,
          action: action as Action,
          preconditions,
          postconditions,
          effect,
        };
        capability.steps.push(step);
        execution.completedSteps++;
        await execution.journal.append({
          type: "checkpoint",
          stepId: step.id,
          reason: "checkpoint",
        });
      }
    } catch (error) {
      result = execution.resultFrom(error);
    }
    try {
      await execution.finish(result);
    } catch (error) {
      result = execution.resultFrom(error);
      await execution.ownership.finish();
    }
    return result;
  });
}
