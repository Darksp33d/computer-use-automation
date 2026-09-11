import { createServer } from "node:http";
import { expect, test } from "@playwright/test";
import {
  bankActions,
  bankMarkers,
  bankRoutes,
  bankTargets,
} from "../../src/applications/legacy-bank.js";
import { Policy } from "../../src/core/policy.js";
import { listen } from "../../src/http/server.js";
import { BrowserSurface } from "../../src/surfaces/browser.js";

for (const kind of [
  "fetch",
  "frame",
  "popup",
  "form",
  "image",
  "redirect",
  "websocket",
  "data-frame",
  "file-chooser",
  "download",
  "service-worker",
] as const) {
  test(`browser denies ${kind} escape with zero external receiver requests`, async () => {
    let prohibited = 0;
    let workerRequests = 0;
    const receiver = await listen(
      createServer((_request, response) => {
        prohibited++;
        response.end("unexpected");
      }),
      0,
    );
    const destination = `${receiver.origin}/canary`;
    const scripts = {
      fetch: `fetch('${destination}').catch(()=>{})`,
      frame: `const f=document.createElement('iframe');f.src='${destination}';document.body.append(f)`,
      popup: `window.open('${destination}')`,
      form: `const f=document.createElement('form');f.method='POST';f.action='${destination}';document.body.append(f);f.submit()`,
      image: `const i=new Image();i.src='${destination}';document.body.append(i)`,
      redirect: `location.href='/savings'`,
      websocket: `new WebSocket('${destination.replace("http:", "ws:")}')`,
      "data-frame": `const f=document.createElement('iframe');f.src='data:text/html,UNTRUSTED';document.body.append(f)`,
      "file-chooser": `document.querySelector('input').click()`,
      download: `const a=document.createElement('a');a.href=window.URL.createObjectURL(new Blob(['PRIVATE-CANARY']));a.download='canary.txt';document.body.append(a);a.click()`,
      "service-worker": `navigator.serviceWorker.register('/bank.css').catch(()=>{})`,
    };
    const application = await listen(
      createServer((request, response) => {
        if (request.url === "/bank.css") {
          workerRequests++;
          response.setHeader("Content-Type", "application/javascript");
          response.end("self.addEventListener('fetch',()=>{});");
          return;
        }
        if (request.url === "/savings") {
          response.writeHead(302, { Location: destination });
          response.end();
          return;
        }
        response.setHeader("Content-Type", "text/html");
        response.end(
          request.url === "/"
            ? '<iframe name="workspace" src="/search"></iframe>'
            : `<h1>Member search</h1><input type="file" hidden><button onclick="${scripts[kind]}">Search members</button>`,
        );
      }),
      0,
    );
    const surface = await BrowserSurface.create(
      new Policy(application.origin, {
        targets: bankTargets,
        routes: bankRoutes,
        actions: bankActions,
      }),
      { memberId: "A1001" },
      bankMarkers,
      { timeoutMs: 500 },
    );
    try {
      await surface
        .act({ kind: "click", target: "search-members" }, {}, "automation")
        .catch(() => {});
      if (kind === "service-worker") {
        expect(workerRequests).toBe(0);
      } else await expect(surface.observe()).rejects.toThrow("POLICY_DENIED");
      expect(prohibited).toBe(0);
    } finally {
      await surface.close();
      await application.close();
      await receiver.close();
    }
  });
}
