import { z } from "zod";
import { scenarios } from "../../demo/fixtures.js";
import { Action } from "../contracts/capability.js";
import { DiscoveryIntent } from "../contracts/discovery.js";
import { FailureDiagnostic } from "../contracts/runtime.js";

const StartFields = {
  workflow: z.enum(["savings", "review"]),
  scenario: z.enum(scenarios),
  inputs: z.record(z.string().max(64), z.union([z.string().max(256), z.number(), z.boolean()])),
};
export const StartRequest = z.discriminatedUnion("mode", [
  z.strictObject({ ...StartFields, mode: z.literal("replay") }),
  z.strictObject({ ...StartFields, mode: z.literal("discovery"), ...DiscoveryIntent.shape }),
]);
export type StartRequest = z.infer<typeof StartRequest>;
export const ControlRequest = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("claim"), epoch: z.int().nonnegative() }),
  z.strictObject({ kind: z.literal("resume"), epoch: z.int().nonnegative() }),
  z.strictObject({ kind: z.literal("cancel") }),
  z.strictObject({ kind: z.literal("approve") }),
  z.strictObject({
    kind: z.literal("dismiss-dialog"),
    epoch: z.int().nonnegative(),
    generation: z.int().nonnegative(),
  }),
  z.strictObject({
    kind: z.literal("act"),
    epoch: z.int().nonnegative(),
    generation: z.int().nonnegative(),
    action: Action,
    value: z.string().max(256).optional(),
  }),
]);
export type ControlRequest = z.infer<typeof ControlRequest>;

export const RunView = z.strictObject({
  id: z.uuid(),
  workflow: z.enum(["savings", "review"]),
  mode: z.enum(["replay", "discovery"]),
  startedAt: z.string(),
  owner: z.enum(["automation", "awaiting_human", "human", "terminal"]),
  epoch: z.number(),
  generation: z.number(),
  screen: z.string().nullable(),
  stepId: z.string().nullable(),
  phase: z.enum(["running", "validating", "success", "business_outcome", "failure", "canceled"]),
  code: z.string().nullable(),
  diagnostic: FailureDiagnostic.nullable(),
  expiresAt: z.number().nullable(),
  hasDialog: z.boolean(),
  controls: z.array(
    z.strictObject({
      id: z.string(),
      label: z.string(),
      action: z.enum(["click", "fill", "select", "read"]),
      input: z.string().nullable(),
      values: z.array(z.string()),
    }),
  ),
  events: z.array(
    z.strictObject({
      seq: z.number(),
      at: z.string(),
      type: z.string(),
      actor: z.string().nullable(),
      target: z.string().nullable(),
      code: z.string().nullable(),
    }),
  ),
  outputs: z.array(z.strictObject({ name: z.string(), value: z.string() })),
  canApprove: z.boolean(),
  approved: z.boolean(),
  imageAvailable: z.boolean(),
});
export type RunView = z.infer<typeof RunView>;
export const WorkspaceView = z.strictObject({
  runs: z.array(RunView),
  capabilities: z.array(
    z.strictObject({
      id: z.string(),
      revision: z.number(),
      workflow: z.enum(["savings", "review"]),
    }),
  ),
  providerConfigured: z.boolean(),
});
export type WorkspaceView = z.infer<typeof WorkspaceView>;
