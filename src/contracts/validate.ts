import { z } from "zod";
import { type Arguments, Capability, type Condition } from "./capability.js";
import { RunError } from "./errors.js";

export function parseCapability(source: string): Capability {
  if (Buffer.byteLength(source) > 128_000) throw new RunError("INVALID_ARTIFACT");
  let capability: Capability;
  try {
    capability = Capability.parse(JSON.parse(source));
  } catch {
    throw new RunError("INVALID_ARTIFACT");
  }
  const fail = () => {
    throw new RunError("INVALID_ARTIFACT");
  };
  if (
    Object.keys(capability.targets).length > 80 ||
    Object.keys(capability.inputs).length > 16 ||
    Object.keys(capability.outputs).length > 16
  )
    fail();
  const targetExists = (name: string) => {
    if (!Object.hasOwn(capability.targets, name)) fail();
  };
  const inputExists = (name: string) => {
    if (!Object.hasOwn(capability.inputs, name)) fail();
  };
  const conditions = (items: Condition[]) => {
    for (const item of items) {
      targetExists(item.target);
      if (item.kind === "equalsInput") inputExists(item.input);
    }
  };
  for (const definition of Object.values(capability.inputs)) {
    if (definition.kind === "string" && definition.minLength > definition.maxLength) fail();
    if (definition.kind === "integer" && definition.minimum > definition.maximum) fail();
    if (definition.kind === "enum" && new Set(definition.values).size !== definition.values.length)
      fail();
  }
  const stepIds = new Set<string>();
  const outputsRead = new Set<string>();
  for (const step of capability.steps) {
    if (stepIds.has(step.id)) fail();
    stepIds.add(step.id);
    targetExists(step.action.target);
    if (step.action.kind === "fill" || step.action.kind === "select")
      inputExists(step.action.input);
    if (step.action.kind === "read") {
      const definition = capability.outputs[step.action.output];
      if (
        !definition ||
        definition.target !== step.action.target ||
        outputsRead.has(step.action.output)
      )
        fail();
      outputsRead.add(step.action.output);
    }
    conditions(step.preconditions);
    conditions(step.postconditions);
  }
  for (const [name, definition] of Object.entries(capability.outputs)) {
    targetExists(definition.target);
    if (!outputsRead.has(name)) fail();
  }
  conditions(capability.entry.conditions);
  conditions(capability.success);
  for (const outcome of capability.outcomes) conditions([outcome.when]);
  if (new Set(capability.outcomes.map((item) => item.code)).size !== capability.outcomes.length)
    fail();
  for (const handler of capability.recovery) {
    conditions([handler.when, ...handler.postconditions]);
    targetExists(handler.action.target);
    if (handler.action.kind !== "click") fail();
  }
  return capability;
}

export function validateArguments(
  capability: Pick<Capability, "inputs">,
  value: unknown,
): Arguments {
  const shape: Record<string, z.ZodType> = {};
  for (const [name, definition] of Object.entries(capability.inputs)) {
    switch (definition.kind) {
      case "string":
        shape[name] = z.string().min(definition.minLength).max(definition.maxLength);
        break;
      case "enum":
        shape[name] = z.enum(definition.values);
        break;
      case "integer":
        shape[name] = z.int().min(definition.minimum).max(definition.maximum);
        break;
      case "boolean":
        shape[name] = z.boolean();
        break;
    }
  }
  const result = z.strictObject(shape).safeParse(value);
  if (!result.success) throw new RunError("INVALID_INPUT");
  return result.data as Arguments;
}

export function parseOutput(
  definition: Capability["outputs"][string],
  text: string,
): string | number {
  const value = text.trim();
  if (definition.parser === "usd-minor") {
    if (!/^\$(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)\.\d{2}$/.test(value))
      throw new RunError("OUTPUT_INVALID");
    const cents = Number(value.replace(/[$,.]/g, ""));
    if (!Number.isSafeInteger(cents)) throw new RunError("OUTPUT_INVALID");
    return cents;
  }
  if (definition.parser === "currency" && value !== "USD") throw new RunError("OUTPUT_INVALID");
  if (
    !value ||
    value.length > 256 ||
    (definition.allowedValues.length > 0 && !definition.allowedValues.includes(value))
  )
    throw new RunError("OUTPUT_INVALID");
  return value;
}
