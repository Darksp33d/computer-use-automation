import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { failureCode } from "../contracts/errors.js";
import { json, listen, readBody } from "../http/server.js";
import { ControlRequest, StartRequest } from "./contracts.js";
import type { RunManager } from "./manager.js";

export async function startOperator(
  manager: RunManager,
  options: { port?: number; assets: string },
) {
  const token = randomBytes(32).toString("hex");
  let origin = "";
  let inFlight = 0;
  const server = createServer(async (request, response) => {
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "no-store");
    if (
      request.headers.host !== new URL(origin).host ||
      (request.headers.origin && request.headers.origin !== origin)
    ) {
      json(response, 403, { code: "POLICY_DENIED" });
      return;
    }
    if (++inFlight > 16) {
      inFlight--;
      json(response, 429, { code: "BUDGET_EXCEEDED" });
      return;
    }
    try {
      const url = new URL(request.url ?? "/", origin);
      if (url.search) {
        json(response, 400, { code: "INVALID_INPUT" });
        return;
      }
      if (url.pathname.startsWith("/api/")) {
        const supplied =
          /^Bearer ([a-f0-9]{64})$/.exec(request.headers.authorization ?? "")?.[1] ?? "";
        if (
          supplied.length !== token.length ||
          !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))
        ) {
          json(response, 401, { code: "UNAUTHORIZED" });
          return;
        }
        if (request.method === "GET" && url.pathname === "/api/workspace") {
          json(response, 200, await manager.workspace());
          return;
        }
        const artifact = /^\/api\/runs\/([a-f0-9-]{36})\/capability$/.exec(url.pathname);
        if (request.method === "GET" && artifact) {
          json(response, 200, manager.artifact(artifact[1]!));
          return;
        }
        const image = /^\/api\/runs\/([a-f0-9-]{36})\/image$/.exec(url.pathname);
        if (request.method === "GET" && image) {
          const buffer = await manager.image(image[1]!);
          if (!buffer) {
            response.writeHead(204);
            response.end();
            return;
          }
          response.writeHead(200, { "Content-Type": "image/png" });
          response.end(buffer);
          return;
        }
        if (
          request.method !== "POST" ||
          request.headers.origin !== origin ||
          request.headers["content-type"] !== "application/json"
        ) {
          json(response, 403, { code: "POLICY_DENIED" });
          return;
        }
        let body: unknown;
        try {
          body = JSON.parse(await readBody(request));
        } catch {
          json(response, 400, { code: "INVALID_INPUT" });
          return;
        }
        if (url.pathname === "/api/runs") {
          const parsed = StartRequest.safeParse(body);
          if (!parsed.success) {
            json(response, 400, { code: "INVALID_INPUT" });
            return;
          }
          json(response, 201, await manager.start(parsed.data));
          return;
        }
        const command = /^\/api\/runs\/([a-f0-9-]{36})\/control$/.exec(url.pathname);
        if (command) {
          const parsed = ControlRequest.safeParse(body);
          if (!parsed.success) {
            json(response, 400, { code: "INVALID_INPUT" });
            return;
          }
          await manager.command(command[1]!, parsed.data);
          json(response, 200, { ok: true });
          return;
        }
        json(response, 404, { code: "NOT_FOUND" });
        return;
      }
      if (request.method !== "GET") {
        json(response, 405, { code: "METHOD_NOT_ALLOWED" });
        return;
      }
      const asset =
        url.pathname === "/"
          ? "index.html"
          : /^\/assets\/[a-zA-Z0-9_-]+\.(js|css)$/.test(url.pathname)
            ? url.pathname.slice(1)
            : null;
      if (!asset) {
        json(response, 404, { code: "NOT_FOUND" });
        return;
      }
      const body = await readFile(join(options.assets, asset));
      response.writeHead(200, {
        "Content-Type":
          extname(asset) === ".css"
            ? "text/css"
            : extname(asset) === ".js"
              ? "text/javascript"
              : "text/html; charset=utf-8",
      });
      response.end(body);
    } catch (error) {
      const code = failureCode(error);
      json(
        response,
        ["CONTROL_CONFLICT", "STALE_CONTROL"].includes(code)
          ? 409
          : code === "POLICY_DENIED"
            ? 403
            : code === "BUDGET_EXCEEDED"
              ? 429
              : 400,
        { code },
      );
    } finally {
      inFlight--;
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  const listening = await listen(server, options.port ?? 0);
  origin = listening.origin;
  return {
    origin,
    token,
    url: `${origin}/#${token}`,
    async close() {
      await listening.close();
      await manager.close();
    },
  };
}
