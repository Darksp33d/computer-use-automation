import { isDeepStrictEqual } from "node:util";
import type { Action, Capability, Target } from "../contracts/capability.js";
import { RunError } from "../contracts/errors.js";

export interface PolicyBinding {
  targets: Record<string, Target>;
  routes: Record<string, readonly string[]>;
  actions: Record<
    string,
    { kind: Action["kind"]; input?: string; humanOnly?: boolean; effect: "read" | "reversible" }
  >;
}

export class Policy {
  constructor(
    readonly origin: string,
    readonly binding: PolicyBinding,
  ) {
    const url = new URL(origin);
    if (
      url.origin !== origin ||
      url.protocol !== "http:" ||
      !["127.0.0.1", "target"].includes(url.hostname) ||
      url.username ||
      url.password
    )
      throw new RunError("POLICY_DENIED");
  }

  permitsRequest(raw: string, method: string): boolean {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return false;
    }
    return (
      url.origin === this.origin &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      Boolean(this.binding.routes[url.pathname]?.includes(method))
    );
  }

  authorize(action: Action, owner: "automation" | "human") {
    const rule = this.binding.actions[action.target];
    if (!rule || rule.kind !== action.kind || (rule.humanOnly && owner !== "human"))
      throw new RunError("POLICY_DENIED");
    if ((action.kind === "fill" || action.kind === "select") && action.input !== rule.input)
      throw new RunError("POLICY_DENIED");
    return rule.effect;
  }

  validate(capability: Capability) {
    for (const [id, target] of Object.entries(capability.targets)) {
      if (!isDeepStrictEqual(target, this.binding.targets[id]))
        throw new RunError("UNSUPPORTED_BINDING");
    }
    for (const step of capability.steps) {
      if (this.authorize(step.action, "automation") !== step.effect)
        throw new RunError("POLICY_DENIED");
    }
    for (const recovery of capability.recovery) this.authorize(recovery.action, "automation");
  }
}
