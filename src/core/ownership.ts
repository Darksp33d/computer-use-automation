import { RunError } from "../contracts/errors.js";
import type { ControlState, Owner } from "../contracts/runtime.js";

export class Ownership {
  #state: ControlState = { owner: "automation", epoch: 0, actor: null };
  #tail: Promise<unknown> = Promise.resolve();
  #pending = 0;

  get state(): ControlState {
    return { ...this.#state };
  }

  #serialize<T>(operation: () => Promise<T> | T): Promise<T> {
    if (this.#pending >= 32) return Promise.reject(new RunError("CONTROL_CONFLICT"));
    this.#pending++;
    const result = this.#tail.then(operation).finally(() => {
      this.#pending--;
    });
    this.#tail = result.catch(() => {});
    return result;
  }

  #assert(owner: Owner, epoch: number) {
    if (this.#state.epoch !== epoch) throw new RunError("STALE_CONTROL");
    if (this.#state.owner !== owner) throw new RunError("CONTROL_CONFLICT");
  }

  run<T>(owner: "automation" | "human", epoch: number, action: () => Promise<T>): Promise<T> {
    return this.#serialize(() => {
      this.#assert(owner, epoch);
      return action();
    });
  }

  pause(): Promise<ControlState> {
    return this.#serialize(() => {
      if (this.#state.owner !== "automation") throw new RunError("CONTROL_CONFLICT");
      this.#state = { owner: "awaiting_human", epoch: this.#state.epoch + 1, actor: null };
      return this.state;
    });
  }

  claim(epoch: number): Promise<ControlState> {
    return this.#serialize(() => {
      this.#assert("awaiting_human", epoch);
      this.#state = { owner: "human", epoch: epoch + 1, actor: "local-operator" };
      return this.state;
    });
  }

  resume(epoch: number, verify: () => Promise<boolean>): Promise<ControlState> {
    return this.#serialize(async () => {
      this.#assert("human", epoch);
      const valid = await verify();
      this.#state = {
        owner: valid ? "automation" : "awaiting_human",
        epoch: epoch + 1,
        actor: null,
      };
      return this.state;
    });
  }

  expire(epoch: number): Promise<ControlState> {
    return this.#serialize(() => {
      if (this.#state.owner === "human" && this.#state.epoch === epoch) {
        this.#state = { owner: "awaiting_human", epoch: epoch + 1, actor: null };
      }
      return this.state;
    });
  }

  finish(): Promise<ControlState> {
    return this.#serialize(() => {
      this.#state = { owner: "terminal", epoch: this.#state.epoch + 1, actor: null };
      return this.state;
    });
  }
}
