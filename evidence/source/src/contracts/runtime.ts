import { z } from "zod";
import { type Arguments, type BusinessCode, Condition } from "./capability.js";
import type { FailureCode } from "./errors.js";

export type Owner = "automation" | "awaiting_human" | "human" | "terminal";
export type EffectState = "not_dispatched" | "unknown" | "confirmed";
export interface ControlState {
  owner: Owner;
  epoch: number;
  actor: string | null;
}
export interface Observation {
  generation: number;
  screen: string | null;
  controls: { id: string; kind: string; visible: boolean; enabled: boolean; count: number }[];
  conditions: { condition: Condition; satisfied: boolean }[];
  state:
    | { kind: "ready" }
    | { kind: "business"; code: BusinessCode }
    | { kind: "blocked"; code: FailureCode }
    | { kind: "recoverable"; target: string };
}
export const FailureDiagnostic = z.strictObject({
  stage: z.enum(["startup", "execution"]),
  expected: z.strictObject({
    conditions: z.array(Condition),
    output: z
      .strictObject({
        name: z.string(),
        target: z.string(),
        parser: z.enum(["usd-minor", "currency", "text"]),
        allowedValues: z.array(z.string()),
      })
      .nullable(),
  }),
  observed: z
    .strictObject({
      screen: z.string().nullable(),
      state: z.enum(["ready", "business", "blocked", "recoverable"]),
      conditions: z.array(z.strictObject({ condition: Condition, satisfied: z.boolean() })),
    })
    .nullable(),
});
export type FailureDiagnostic = z.infer<typeof FailureDiagnostic>;

export type Result =
  | { status: "success"; runId: string; outputs: Arguments }
  | { status: "business_outcome"; runId: string; code: BusinessCode }
  | {
      status: "failure";
      diagnostic: FailureDiagnostic;
      runId: string;
      code: FailureCode;
      stepId: string | null;
      effect: EffectState;
    }
  | { status: "canceled"; runId: string; stepId: string | null; effect: EffectState };
