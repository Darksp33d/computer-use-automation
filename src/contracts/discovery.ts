import { z } from "zod";
import type { Arguments, Capability } from "./capability.js";
import { RunError } from "./errors.js";

export const DiscoveryIntent = z.strictObject({
  goal: z.string().trim().min(10).max(500),
  target: z.literal("northstar"),
});
export type DiscoveryIntent = z.infer<typeof DiscoveryIntent>;

// Goals are public task instructions. Private invocation values stay in named arguments.
export function prepareGoal(
  intent: unknown,
  capability: Pick<Capability, "inputs">,
  inputs: Arguments,
) {
  const parsed = DiscoveryIntent.safeParse(intent);
  if (!parsed.success) throw new RunError("INVALID_INPUT");
  let goal = parsed.data.goal;
  const sensitive = Object.entries(inputs)
    .filter(([name]) => capability.inputs[name]?.sensitivity === "sensitive")
    .sort((a, b) => String(b[1]).length - String(a[1]).length);
  for (const [name, value] of sensitive) {
    if (String(value).length) goal = goal.replaceAll(String(value), `{${name}}`);
  }
  if (
    /[^a-zA-Z\s.,!?{}'():;-]/.test(goal) ||
    /\b(password|secret|token|credential|api[ -]?key|bearer)\b/i.test(goal) ||
    /[a-zA-Z]{40}/.test(goal) ||
    /[\u0000-\u0008\u000b-\u001f\u007f]/.test(goal)
  )
    throw new RunError("INVALID_INPUT");
  for (const match of goal.matchAll(/\{([^{}]+)\}/g))
    if (!Object.hasOwn(capability.inputs, match[1]!)) throw new RunError("INVALID_INPUT");
  return goal;
}
