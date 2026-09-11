import { type Arguments, type BusinessCode, type Condition } from "./capability.js";
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
export type Result =
  | { status: "success"; runId: string; outputs: Arguments }
  | { status: "business_outcome"; runId: string; code: BusinessCode }
  | {
      status: "failure";
      runId: string;
      code: FailureCode;
      stepId: string | null;
      effect: EffectState;
    }
  | { status: "canceled"; runId: string; stepId: string | null; effect: EffectState };
