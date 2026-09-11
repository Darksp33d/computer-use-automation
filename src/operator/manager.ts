import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { startTarget } from "../../demo/server.js";
import { bankActions, bankTargets, taskContracts } from "../applications/legacy-bank.js";
import type { Capability } from "../contracts/capability.js";
import { failureCode, RunError } from "../contracts/errors.js";
import { Catalog } from "../services/catalog.js";
import { createDiscoverySession, createSession, type Session } from "../services/session.js";
import type { ControlRequest, RunView, StartRequest, WorkspaceView } from "./contracts.js";
import { SessionControl } from "./control.js";

type Record = {
  view: RunView;
  session: Session | null;
  control: SessionControl | null;
  image: Buffer | null;
  candidate: Capability | null;
  replayRunId: string | null;
  done: Promise<void>;
};
export class RunManager {
  #runs = new Map<string, Record>();
  #starting = 0;
  #startsSettled: Promise<void> = Promise.resolve();
  #releaseStarts: (() => void) | null = null;
  #closing = false;
  constructor(
    readonly catalog: Catalog,
    readonly directory: string,
    readonly sourceRevision: string,
  ) {}

  async workspace(): Promise<WorkspaceView> {
    const entries = await this.catalog.list();
    return {
      runs: [...this.#runs.values()].reverse().map((record) => this.#view(record)),
      capabilities: entries.map((entry) => ({
        id: entry.capabilityId,
        revision: entry.revision,
        workflow: entry.capabilityId === taskContracts.savings.id ? "savings" : "review",
      })),
      providerConfigured: Boolean(process.env.OPENAI_API_KEY),
    };
  }

  #view(record: Record): RunView {
    const session = record.session;
    if (!session) return record.view;
    const execution = session.execution;
    const observation = execution.current;
    const state = execution.ownership.state;
    record.view = {
      ...record.view,
      owner: state.owner,
      epoch: state.epoch,
      generation: observation?.generation ?? 0,
      screen: observation?.screen ?? null,
      stepId: execution.stepId,
      code: execution.intervention?.code ?? record.view.code,
      expiresAt: record.control?.expiresAt ?? null,
      hasDialog: session.surface.hasDialog,
      controls: (observation?.controls ?? [])
        .filter((item) => item.visible && item.enabled && item.count === 1)
        .flatMap((item) => {
          const action = bankActions[item.id];
          const target = bankTargets[item.id]!;
          if (
            !action ||
            action.kind === "read" ||
            (action.input && !Object.hasOwn(execution.capability.inputs, action.input))
          )
            return [];
          const input = action.input ? execution.capability.inputs[action.input] : null;
          return [
            {
              id: item.id,
              label:
                target.kind === "role"
                  ? target.name
                  : target.kind === "text"
                    ? target.text
                    : target.caption,
              action: action.kind,
              input: action.input ?? null,
              values: input?.kind === "enum" ? input.values : [],
            },
          ];
        }),
      events: execution.journal.events.map((event) => ({
        seq: event.seq,
        at: event.at,
        type: event.type,
        actor: event.actor ?? null,
        target: event.target ?? null,
        code: event.code ?? null,
      })),
    };
    return record.view;
  }

  async start(request: StartRequest) {
    if (
      this.#closing ||
      this.#starting + [...this.#runs.values()].filter((item) => item.session !== null).length >= 2
    )
      throw new RunError("BUDGET_EXCEEDED");
    if (this.#starting === 0) {
      const settled = Promise.withResolvers<void>();
      this.#startsSettled = settled.promise;
      this.#releaseStarts = settled.resolve;
    }
    this.#starting++;
    let target: Awaited<ReturnType<typeof startTarget>> | undefined;
    try {
      const entries = await this.catalog.list();
      const id = taskContracts[request.workflow].id;
      const entry = entries.find((item) => item.capabilityId === id);
      const source =
        request.mode === "replay" ? await this.catalog.load(id, entry?.revision ?? 1) : null;
      if (request.mode === "discovery" && !process.env.OPENAI_API_KEY)
        throw new RunError("MODEL_UNAVAILABLE");
      target = await startTarget({ scenario: request.scenario });
      const options = {
        origin: target.origin,
        directory: this.directory,
        activeTimeoutMs: request.mode === "discovery" ? 180_000 : 120_000,
      };
      const session = source
        ? await createSession(source, request.inputs, options)
        : await createDiscoverySession(
            request.workflow,
            request.inputs,
            this.sourceRevision,
            options,
          );
      if (this.#closing) {
        await session.close();
        throw new RunError("CANCELED");
      }
      if (!source) session.execution.capability.revision = (entry?.revision ?? 0) + 1;
      const control = new SessionControl(session);
      const record: Record = {
        session,
        control,
        image: null,
        candidate: null,
        replayRunId: null,
        done: Promise.resolve(),
        view: {
          id: session.runId,
          workflow: request.workflow,
          mode: request.mode,
          startedAt: new Date().toISOString(),
          owner: "automation",
          epoch: 0,
          generation: 0,
          screen: null,
          stepId: null,
          phase: "running",
          code: null,
          expiresAt: null,
          hasDialog: false,
          controls: [],
          events: [],
          outputs: [],
          canApprove: false,
          approved: false,
          imageAvailable: false,
        },
      };
      if (this.#runs.size >= 50) {
        const oldest = [...this.#runs.entries()].find(([, item]) => item.session === null);
        if (oldest) this.#runs.delete(oldest[0]);
      }
      this.#runs.set(session.runId, record);
      record.done = this.#execute(record, request, target);
      return { id: session.runId };
    } catch (error) {
      await target?.close();
      throw error;
    } finally {
      this.#starting--;
      if (this.#starting === 0) this.#releaseStarts?.();
    }
  }

  async #execute(
    record: Record,
    request: StartRequest,
    target: Awaited<ReturnType<typeof startTarget>>,
  ) {
    const session = record.session!;
    try {
      const result =
        request.mode === "replay"
          ? await session.replay()
          : await (async () => {
              const { discover } = await import("../discovery/discover.js");
              const { OpenAIDecisions } = await import("../discovery/openai.js");
              return discover(session, new OpenAIDecisions());
            })();
      record.image = await session.surface.screenshot().catch(() => null);
      this.#view(record);
      record.view = {
        ...record.view,
        phase: result.status,
        code: "code" in result ? result.code : null,
        controls: [],
        hasDialog: false,
        imageAvailable: record.image !== null,
        outputs:
          result.status === "success"
            ? Object.entries(result.outputs).map(([name, value]) => ({
                name,
                value: String(value),
              }))
            : [],
      };
      if (result.status === "success" && request.mode === "discovery") {
        record.view.phase = "validating";
        const source = await readFile(join(session.directory, "capability.json"), "utf8");
        const memberId = request.inputs.memberId === "B1002" ? "A1001" : "B1002";
        const inputs =
          request.workflow === "savings"
            ? { memberId }
            : {
                memberId,
                accountType: request.inputs.accountType === "savings" ? "checking" : "savings",
                nickname: "Replay validation",
              };
        const validationTarget = await startTarget({ scenario: "normal" });
        let validation: Session | undefined;
        try {
          validation = await createSession(source, inputs, {
            origin: validationTarget.origin,
            directory: this.directory,
          });
          const verified = await validation.replay();
          if (verified.status !== "success") throw new RunError("CHECKPOINT_FAILED");
          record.candidate = session.execution.capability;
          record.replayRunId = validation.runId;
          record.view.canApprove = true;
          record.view.phase = "success";
        } finally {
          await validation?.close();
          await validationTarget.close();
        }
      }
    } catch (error) {
      record.view.phase = "failure";
      record.view.code = failureCode(error);
    } finally {
      await session.close().catch(() => {});
      await target.close();
      record.session = null;
      record.control = null;
      record.view.owner = "terminal";
    }
  }

  async command(id: string, command: ControlRequest) {
    const record = this.#runs.get(id);
    if (!record) throw new RunError("INVALID_INPUT");
    if (command.kind === "approve") {
      if (!record.view.canApprove || !record.candidate || !record.replayRunId)
        throw new RunError("CONTROL_CONFLICT");
      record.view.canApprove = false;
      try {
        await this.catalog.approve(record.candidate, record.replayRunId, "local-operator");
        record.view.approved = true;
      } catch (error) {
        record.view.canApprove = true;
        throw error;
      }
      return;
    }
    const control = record.control;
    if (!control) throw new RunError("CONTROL_CONFLICT");
    switch (command.kind) {
      case "claim":
        await control.claim(command.epoch);
        break;
      case "resume":
        await control.resume(command.epoch);
        break;
      case "cancel":
        control.cancel();
        break;
      case "dismiss-dialog":
        await control.dismissDialog(command.epoch, command.generation);
        break;
      case "act":
        await control.command(command.epoch, command.generation, command.action, command.value);
        break;
    }
  }

  artifact(id: string) {
    const record = this.#runs.get(id);
    if (!record?.candidate) throw new RunError("CONTROL_CONFLICT");
    return record.candidate;
  }

  async image(id: string) {
    const record = this.#runs.get(id);
    if (!record) throw new RunError("INVALID_INPUT");
    if (record.session) record.image = await record.session.surface.screenshot().catch(() => null);
    return record.image;
  }

  async close() {
    this.#closing = true;
    await this.#startsSettled;
    for (const record of this.#runs.values()) record.control?.cancel();
    await Promise.all([...this.#runs.values()].map((record) => record.done));
  }
}
