import { chromium } from "playwright";

const server = await chromium.launchServer({
  host: "0.0.0.0",
  port: 3000,
  headless: true,
  chromiumSandbox: true,
  env: { PATH: process.env.PATH, HOME: "/tmp/browser-home", TMPDIR: "/tmp" },
});
console.log(server.wsEndpoint());
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    void server.close();
  });
