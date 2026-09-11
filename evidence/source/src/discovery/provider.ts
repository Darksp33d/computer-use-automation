import { z } from "zod";
import { Action, type Capability } from "../contracts/capability.js";
import type { Observation } from "../contracts/runtime.js";
import type { EventPayload } from "../evidence/journal.js";

export const Decision = z.strictObject({
  kind: z.enum(["act", "finish"]),
  action: Action.nullable(),
});
export interface DiscoveryView {
  task: Pick<Capability, "description" | "inputs" | "outputs" | "success">;
  observation: Observation;
  controls: { id: string; label: string; action: Action["kind"]; input: string | null }[];
  executed: Action[];
  collectedOutputs: string[];
}
export interface DecisionProvider {
  decide(
    view: DiscoveryView,
    screenshot: Buffer | null,
    signal: AbortSignal,
  ): Promise<{
    decision: z.infer<typeof Decision>;
    metadata: NonNullable<EventPayload["provider"]>;
  }>;
}
