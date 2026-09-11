import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { bankActions, bankMarkers, bankRoutes, bankTargets } from "../applications/legacy-bank.js";
import type { Capability } from "../contracts/capability.js";
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

export async function createSession(
  source: string,
  argumentsValue: unknown,
  options: {
    origin: string;
    directory: string;
    conditionTimeoutMs?: number;
    activeTimeoutMs?: number;
    browserEndpoint?: string;
  },
) {
  const capability = parseCapability(source);
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
      ...(options.conditionTimeoutMs === undefined
        ? {}
        : { timeoutMs: options.conditionTimeoutMs }),
      ...(options.browserEndpoint ? { endpoint: options.browserEndpoint } : {}),
    });
  } catch (error) {
    const result: Result = {
      status: "failure",
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
    async replay() {
      if (started) throw new Error("SESSION_ALREADY_STARTED");
      started = true;
      result = await replay(execution);
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
