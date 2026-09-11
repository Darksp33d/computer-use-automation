import { z } from "zod";
import { Capability } from "../../src/contracts/capability.js";
import {
  type ControlRequest,
  type StartRequest,
  WorkspaceView,
} from "../../src/operator/contracts.js";

const token = window.location.hash.slice(1);
window.history.replaceState(null, "", window.location.pathname);
export const authenticated = /^[a-f0-9]{64}$/.test(token);

async function request(path: string, body?: unknown, signal?: AbortSignal) {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    const parsed = z
      .object({ code: z.string().regex(/^[A-Z_]+$/) })
      .safeParse(await response.json());
    throw new Error(parsed.success ? parsed.data.code : "REQUEST_FAILED");
  }
  return response;
}
export async function workspace(signal: AbortSignal) {
  return WorkspaceView.parse(await (await request("/api/workspace", undefined, signal)).json());
}
export async function startRun(body: StartRequest) {
  return z.object({ id: z.uuid() }).parse(await (await request("/api/runs", body)).json());
}
export async function command(id: string, body: ControlRequest) {
  await request(`/api/runs/${id}/control`, body);
}
export async function sessionImage(id: string, signal: AbortSignal) {
  const response = await request(`/api/runs/${id}/image`, undefined, signal);
  return response.status === 204 ? null : response.blob();
}

export async function capability(id: string, signal: AbortSignal) {
  return Capability.parse(
    await (await request(`/api/runs/${id}/capability`, undefined, signal)).json(),
  );
}
