import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { listen, readBody } from "../src/http/server.js";
import type { Scenario, Session } from "./fixtures.js";
import * as views from "./views.js";

export async function startTarget(
  options: { port?: number; scenario?: Scenario; host?: string } = {},
) {
  const scenario = options.scenario ?? "normal";
  const sessions = new Map<string, Session>();
  const css = await readFile(new URL("./public/bank.css", import.meta.url), "utf8");
  const stats = { requests: 0, commits: 0, searches: 0, savingsLoads: 0 };
  const server = createServer(async (request, response) => {
    try {
      stats.requests++;
      const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
      if (request.headers.origin && request.headers.origin !== url.origin) {
        response.writeHead(403);
        response.end();
        return;
      }
      if (url.pathname === "/bank.css") {
        response.writeHead(200, { "Content-Type": "text/css" });
        response.end(css);
        return;
      }
      let token = /(?:^|; )northstar=([a-f0-9]{48})(?:;|$)/.exec(request.headers.cookie ?? "")?.[1];
      if (!token || !sessions.has(token)) {
        for (const [key, value] of sessions)
          if (Date.now() - value.createdAt > 600_000) sessions.delete(key);
        if (sessions.size >= 100) {
          response.writeHead(503);
          response.end();
          return;
        }
        token = randomBytes(24).toString("hex");
        sessions.set(token, {
          memberId: "",
          acknowledged: false,
          nickname: "",
          accountType: "savings",
          createdAt: Date.now(),
        });
        response.setHeader("Set-Cookie", `northstar=${token}; HttpOnly; SameSite=Strict; Path=/`);
      }
      const session = sessions.get(token)!;
      let body: string;
      if (request.method === "GET") {
        switch (url.pathname) {
          case "/":
            body = views.shell(scenario);
            break;
          case "/search":
            body = views.search(scenario);
            break;
          case "/member":
            body = views.member(session, scenario);
            break;
          case "/savings":
            stats.savingsLoads++;
            if (scenario === "delayed-click") await delay(600);
            body = views.savings(session, scenario);
            break;
          case "/new":
            body = views.accountForm(session);
            break;
          default:
            response.writeHead(404);
            response.end();
            return;
        }
      } else if (request.method === "POST") {
        if (!request.headers["content-type"]?.startsWith("application/x-www-form-urlencoded")) {
          response.writeHead(415);
          response.end();
          return;
        }
        const params = new URLSearchParams(await readBody(request));
        switch (url.pathname) {
          case "/find":
            session.memberId = (params.get("memberId") ?? "").slice(0, 32);
            stats.searches++;
            if (scenario === "slow") await delay(400);
            body = views.results(session, scenario);
            break;
          case "/ack":
          case "/restore":
            session.acknowledged = true;
            body = views.member(session, scenario);
            break;
          case "/review":
            session.nickname = params.get("nickname") ?? "";
            session.accountType = params.get("accountType") ?? "";
            body = views.review(session, scenario);
            break;
          case "/commit":
            stats.commits++;
            response.writeHead(403);
            response.end("Account creation disabled in training");
            return;
          default:
            response.writeHead(404);
            response.end();
            return;
        }
      } else {
        response.writeHead(405);
        response.end();
        return;
      }
      const nonce = randomBytes(16).toString("hex");
      if (scenario === "native-dialog" && url.pathname === "/member" && !session.acknowledged) {
        body = body.replace(
          "</body>",
          `<script nonce="${nonce}">if(confirm('Training session requires operator review')) { location.href='/member'; }</script></body>`,
        );
        session.acknowledged = true;
      }
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": `default-src 'self'; script-src 'nonce-${nonce}'; style-src 'self'; frame-ancestors 'self'; form-action 'self'; base-uri 'none'`,
      });
      response.end(body);
    } catch {
      if (!response.headersSent) response.writeHead(400);
      response.end();
    }
  });
  const lifecycle = await listen(server, options.port ?? 0, options.host ?? "127.0.0.1");
  return { ...lifecycle, stats };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const target = await startTarget({ port: 4174, host: process.env.TARGET_HOST ?? "127.0.0.1" });
  console.log(`Northstar training application: ${target.origin}`);
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      void target.close();
    });
}
