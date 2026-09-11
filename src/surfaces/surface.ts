import type { Action, Arguments, Condition } from "../contracts/capability.js";
import type { Observation } from "../contracts/runtime.js";

export interface Surface {
  observe(conditions?: Condition[]): Promise<Observation>;
  check(condition: Condition): Promise<boolean>;
  act(action: Action, inputs: Arguments, owner: "automation" | "human"): Promise<string | null>;
  close(): Promise<void>;
}
