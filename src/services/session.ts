import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { bankImage } from "../applications/bank-image.js";
import {
  bankActions,
  bankMarkers,
  bankOutcomes,
  bankRecovery,
  bankRoutes,
  bankTargets,
  taskContracts,
  visible,
} from "../applications/legacy-bank.js";
import type { Capability } from "../contracts/capability.js";
import { type DiscoveryIntent, prepareGoal } from "../contracts/discovery.js";
import { failureCode } from "../contracts/errors.js";
import type { Result } from "../contracts/runtime.js";
import { parseCapability, validateArguments } from "../contracts/validate.js";
import { Execution } from "../core/execution.js";
import { Policy } from "../core/policy.js";
import { replay } from "../core/replay.js";
import { writeNewJson } from "../evidence/files.js";
import { Journal } from "../evidence/journal.js";
import { BrowserSurface } from "../surfaces/browser.js";

export function safeResult(result: Result, capability: Capability): unknown {
  if (result.status !== "success") return result;
  return {
    ...result,
    outputs: Object.fromEntries(
      Object.entries(result.outputs).map(([key, value]) => [
        key,
        capability.outputs[key]?.sensitivity === "sensitive" ? "[redacted]" : value,
      ]),
    ),
    redactedFields: Object.keys(result.outputs).filter(
      (key) => capability.outputs[key]?.sensitivity === "sensitive",
    ),
  };
}

export interface SessionOptions {
  origin: string;
  directory: string;
  conditionTimeoutMs?: number;
  activeTimeoutMs?: number;
  browserEndpoint?: string;
}

export function createSession(source: string, argumentsValue: unknown, options: SessionOptions) {
  return initializeSession(parseCapability(source), argumentsValue, options);
}

export function createDiscoverySession(
  workflow: "savings" | "review",
  argumentsValue: unknown,
  sourceRevision: string,
  options: SessionOptions & { intent?: DiscoveryIntent },
) {
  const draft: Capability = {
    schemaVersion: 1,
    ...taskContracts[workflow],
    revision: 1,
    application: { family: "legacy-bank", bindingVersion: 1, driver: "browser-v1" },
    targets: bankTargets,
    entry: { route: "search", conditions: [visible("search-screen")] },
    steps: [],
    outcomes: bankOutcomes,
    recovery: bankRecovery,
    provenance: {
      kind: "discovery",
      runId: randomUUID(),
      model: "pending",
      promptVersion: 1,
      browserVersion: "pending",
      sourceRevision,
    },
  };
  const inputs = validateArguments(draft, argumentsValue);
  const goal = prepareGoal(
    options.intent ?? { goal: draft.description, target: "northstar" },
    draft,
    inputs,
  );
  return initializeSession(draft, inputs, options, goal);
}

async function initializeSession(
  capability: Capability,
  argumentsValue: unknown,
  options: SessionOptions,
  discoveryGoal: string | null = null,
) {
  const inputs = validateArguments(capability, argumentsValue);
  const policy = new Policy(options.origin, {
    targets: bankTargets,
    routes: bankRoutes,
    actions: bankActions,
  });
  policy.validate(capability);
  const runId = randomUUID();
  const directory = join(options.directory, runId);
  const journal = await Journal.create(directory, runId);
  let surface: BrowserSurface;
  try {
    surface = await BrowserSurface.create(policy, inputs, bankMarkers, {
      imagePolicy: bankImage,
      ...(options.conditionTimeoutMs === undefined
        ? {}
        : { timeoutMs: options.conditionTimeoutMs }),
      ...(options.browserEndpoint ? { endpoint: options.browserEndpoint } : {}),
    });
  } catch (error) {
    const result: Result = {
      status: "failure",
      diagnostic: {
        stage: "startup",
        expected: { conditions: capability.entry.conditions, output: null },
        observed: null,
      },
      runId,
      code: failureCode(error),
      stepId: null,
      effect: "not_dispatched",
    };
    try {
      await journal.append({ type: "run-finished", status: "failure", code: result.code });
      await writeNewJson(join(directory, "result.json"), result);
    } finally {
      await journal.close();
    }
    throw error;
  }
  const abort = new AbortController();
  const execution = new Execution(
    runId,
    capability,
    inputs,
    surface,
    policy,
    journal,
    abort.signal,
    options.conditionTimeoutMs,
    options.activeTimeoutMs,
  );
  let result: Result | null = null;
  let closed = false;
  let started = false;
  return {
    runId,
    directory,
    discoveryGoal,
    execution,
    surface,
    abort,
    get result() {
      return result;
    },
    async persist(completed: Result) {
      result = completed;
      await writeNewJson(join(directory, "result.json"), safeResult(result, capability));
      if (result.status !== "success")
        await writeNewJson(join(directory, "structure.json"), {
          runId,
          stepId: execution.stepId,
          ownership: execution.ownership.state,
          observation: execution.current,
        });
    },
    replay() {
      return this.run(replay);
    },
    async run(operation: (execution: Execution) => Promise<Result>) {
      if (started) throw new Error("SESSION_ALREADY_STARTED");
      started = true;
      result = await operation(execution);
      try {
        await this.persist(result);
      } catch (error) {
        result = execution.resultFrom(error);
      }
      return result;
    },
    async close() {
      if (closed) return;
      closed = true;
      abort.abort();
      try {
        await surface.close();
      } finally {
        await journal.close();
      }
    },
  };
}

export type Session = Awaited<ReturnType<typeof createSession>>;
