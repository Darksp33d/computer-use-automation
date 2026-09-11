import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { writeNewJson } from "../dist/src/evidence/files.js";
import { Catalog } from "../dist/src/services/catalog.js";
import { createSession } from "../dist/src/services/session.js";

const exec = promisify(execFile);
const project = `groove-check-${process.pid}`;
const compose = [
  "compose",
  "-p",
  project,
  "-f",
  "containers/compose.yml",
  "--profile",
  "verification",
];
const docker = async (args) =>
  (await exec("docker", args, { timeout: 180_000, maxBuffer: 4_000_000 })).stdout.trim();
const inService = (service, script) =>
  docker([...compose, "exec", "-T", service, "node", "--input-type=module", "-e", script]);
const summary = {
  sourceRevision: (await exec("git", ["rev-parse", "HEAD"])).stdout.trim(),
  sourceDirty: Boolean(
    (
      await exec("git", [
        "status",
        "--porcelain",
        "--",
        "src",
        "demo",
        "containers",
        "scripts/verify-containment.mjs",
      ])
    ).stdout,
  ),
  checks: {},
};
const sockets = new Set();
const proxy = createServer((socket) => {
  sockets.add(socket);
  if (sockets.size > 4) {
    socket.destroy();
    return;
  }
  const child = spawn("docker", [...compose, "exec", "-T", "browser", "node", "control-pipe.mjs"], {
    stdio: ["pipe", "pipe", "ignore"],
  });
  socket.setTimeout(120_000, () => socket.destroy());
  socket.pipe(child.stdin);
  child.stdout.pipe(socket);
  child.stdin.on("error", () => socket.destroy());
  child.on("error", () => socket.destroy());
  child.on("exit", () => socket.destroy());
  socket.on("error", () => {});
  socket.on("close", () => {
    sockets.delete(socket);
    child.stdin.end();
  });
});
try {
  console.error("Build and start isolated verification workers");
  await docker([...compose, "up", "-d", "--build"]);
  let path;
  for (let attempt = 0; attempt < 40 && !path; attempt++) {
    path = /ws:\/\/0\.0\.0\.0:3000(\/[a-f0-9]+)/.exec(
      await docker([...compose, "logs", "--no-log-prefix", "browser"]),
    )?.[1];
    if (!path) await delay(250);
  }
  assert.ok(path, "Sandboxed browser did not start");
  await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  const endpoint = `ws://127.0.0.1:${proxy.address().port}${path}`;
  for (const service of ["browser", "target"]) {
    const id = await docker([...compose, "ps", "-q", service]);
    const [info] = JSON.parse(await docker(["inspect", id]));
    assert.equal(info.Config.User, "node");
    assert.equal(info.HostConfig.ReadonlyRootfs, true);
    assert.deepEqual(info.HostConfig.CapDrop, ["ALL"]);
    assert.equal(
      info.Mounts.some((mount) => mount.Type === "bind"),
      false,
    );
    const status = JSON.parse(
      await inService(
        service,
        `import {readFile} from 'node:fs/promises'; console.log(JSON.stringify({uid:process.getuid(),key:!!process.env.OPENAI_API_KEY,status:await readFile('/proc/self/status','utf8')}));`,
      ),
    );
    assert.notEqual(status.uid, 0);
    assert.equal(status.key, false);
    assert.match(status.status, /CapEff:\s+0000000000000000/);
    assert.match(status.status, /Seccomp:\s+2/);
    summary.checks[`${service}Isolation`] = true;
  }
  const network = JSON.parse(await docker(["network", "inspect", `${project}_execution`]))[0];
  assert.equal(network.Internal, true);
  const receiverId = await docker([...compose, "ps", "-q", "receiver"]);
  const [receiver] = JSON.parse(await docker(["inspect", receiverId]));
  const receiverIp = Object.values(receiver.NetworkSettings.Networks)[0].IPAddress;
  const receiverUrl = `http://${receiverIp}:8080/probe`;
  await inService("receiver", `await fetch('http://127.0.0.1:8080/probe');`);
  const count = () =>
    inService(
      "receiver",
      `console.log(await (await fetch('http://127.0.0.1:8080/count')).text());`,
    );
  assert.equal(await count(), "1");
  for (const service of ["browser", "target"]) {
    assert.equal(
      await inService(
        service,
        `try { await fetch(${JSON.stringify(receiverUrl)}, {signal:AbortSignal.timeout(1500)}); console.log('reachable'); } catch { console.log('blocked'); }`,
      ),
      "blocked",
    );
  }
  const rawBrowser = await chromium.connect(endpoint);
  try {
    const page = await rawBrowser.newPage();
    await assert.rejects(page.goto(receiverUrl, { timeout: 2000 }));
  } finally {
    await rawBrowser.close();
  }
  assert.equal(await count(), "1");
  summary.checks.externalReceiverUnchanged = true;
  const directory = join(".local/containment", randomUUID());
  const source = await new Catalog("capabilities").load("read-savings-balance", 1);
  const session = await createSession(
    source,
    { memberId: "B1002" },
    {
      origin: "http://target:4174",
      directory,
      browserEndpoint: endpoint,
    },
  );
  try {
    const result = await session.replay();
    assert.equal(result.status, "success");
    assert.equal(result.outputs.availableBalanceMinor, 823010);
    summary.checks.containedReplay = true;
    summary.runId = session.runId;
    summary.browserVersion = session.surface.browserVersion;
  } finally {
    await session.close();
  }
  summary.checkedAt = new Date().toISOString();
  await writeNewJson(join(directory, "summary.json"), summary);
  console.log(JSON.stringify({ summary: join(directory, "summary.json"), checks: summary.checks }));
} finally {
  for (const socket of sockets) socket.destroy();
  if (proxy.listening) await new Promise((resolve) => proxy.close(resolve));
  await docker([...compose, "down", "--remove-orphans"]);
}
