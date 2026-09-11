import { z } from "zod";

export const Identifier = z.string().regex(/^[a-z][a-zA-Z0-9-]{0,63}$/);
const SafeLabel = z.string().min(1).max(160);
const Sensitivity = z.enum(["public", "sensitive"]);

export const InputDefinition = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("string"),
    minLength: z.int().min(0).max(256),
    maxLength: z.int().min(1).max(256),
    sensitivity: Sensitivity,
  }),
  z.strictObject({
    kind: z.literal("enum"),
    values: z.array(SafeLabel).min(1).max(16),
    sensitivity: Sensitivity,
  }),
  z.strictObject({
    kind: z.literal("integer"),
    minimum: z.int(),
    maximum: z.int(),
    sensitivity: Sensitivity,
  }),
  z.strictObject({ kind: z.literal("boolean"), sensitivity: Sensitivity }),
]);

const TargetScope = { frame: Identifier, rationale: SafeLabel };
export const Target = z.discriminatedUnion("kind", [
  z.strictObject({
    ...TargetScope,
    kind: z.literal("role"),
    role: z.enum(["button", "link", "heading"]),
    name: SafeLabel,
  }),
  z.strictObject({ ...TargetScope, kind: z.literal("text"), text: SafeLabel }),
  z.strictObject({
    ...TargetScope,
    kind: z.literal("field"),
    caption: SafeLabel,
    control: z.enum(["input", "select"]),
  }),
  z.strictObject({ ...TargetScope, kind: z.literal("cell"), caption: SafeLabel }),
]);

export const Condition = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("visible"), target: Identifier }),
  z.strictObject({ kind: z.literal("absent"), target: Identifier }),
  z.strictObject({ kind: z.literal("equalsInput"), target: Identifier, input: Identifier }),
  z.strictObject({ kind: z.literal("equalsLiteral"), target: Identifier, value: SafeLabel }),
]);

export const Action = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("click"), target: Identifier }),
  z.strictObject({ kind: z.literal("fill"), target: Identifier, input: Identifier }),
  z.strictObject({ kind: z.literal("select"), target: Identifier, input: Identifier }),
  z.strictObject({ kind: z.literal("read"), target: Identifier, output: Identifier }),
]);

export const OutputDefinition = z.strictObject({
  target: Identifier,
  parser: z.enum(["usd-minor", "currency", "text"]),
  allowedValues: z.array(SafeLabel).max(16),
  sensitivity: Sensitivity,
});

export const Step = z.strictObject({
  id: Identifier,
  action: Action,
  preconditions: z.array(Condition).min(1).max(8),
  postconditions: z.array(Condition).min(1).max(8),
  effect: z.enum(["read", "reversible"]),
});

export const BusinessCode = z.enum([
  "MEMBER_NOT_FOUND",
  "ACCOUNT_NOT_FOUND",
  "VALIDATION_REJECTED",
]);
export const Capability = z.strictObject({
  schemaVersion: z.literal(1),
  id: Identifier,
  revision: z.int().min(1),
  description: SafeLabel,
  application: z.strictObject({
    family: z.literal("legacy-bank"),
    bindingVersion: z.literal(1),
    driver: z.literal("browser-v1"),
  }),
  inputs: z.record(Identifier, InputDefinition),
  outputs: z.record(Identifier, OutputDefinition),
  targets: z.record(Identifier, Target),
  entry: z.strictObject({
    route: z.literal("search"),
    conditions: z.array(Condition).min(1).max(8),
  }),
  steps: z.array(Step).min(1).max(60),
  outcomes: z.array(z.strictObject({ code: BusinessCode, when: Condition })).max(8),
  recovery: z
    .array(
      z.strictObject({
        when: Condition,
        action: Action,
        postconditions: z.array(Condition).min(1).max(8),
        maxAttempts: z.literal(1),
      }),
    )
    .max(4),
  success: z.array(Condition).min(1).max(8),
  provenance: z.strictObject({
    kind: z.enum(["discovery", "test-fixture"]),
    runId: z.string().uuid(),
    model: z.string().min(1).max(80),
    promptVersion: z.union([z.literal(1), z.literal(2)]),
    browserVersion: z.string().min(1).max(80),
    sourceRevision: z.string().regex(/^[a-f0-9]{40}$/),
  }),
});

export type Capability = z.infer<typeof Capability>;
export type Target = z.infer<typeof Target>;
export type Action = z.infer<typeof Action>;
export type Condition = z.infer<typeof Condition>;
export type Step = z.infer<typeof Step>;
export type InputDefinition = z.infer<typeof InputDefinition>;
export type OutputDefinition = z.infer<typeof OutputDefinition>;
export type Arguments = Record<string, string | number | boolean>;
export type BusinessCode = z.infer<typeof BusinessCode>;
