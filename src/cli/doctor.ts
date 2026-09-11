import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

export function diagnose(runtime: string, browserInstalled: boolean, providerConfigured: boolean) {
  const supportedRuntime = /^v24\./.test(runtime);
  return {
    ready: supportedRuntime && browserInstalled,
    runtime: { version: runtime, supported: supportedRuntime },
    browser: { installed: browserInstalled },
    discovery: { configured: providerConfigured },
    instructions: [
      ...(!supportedRuntime ? ["Use Node.js 24 LTS: nvm install && nvm use"] : []),
      ...(!browserInstalled ? ["Install the pinned browser: yarn setup"] : []),
      ...(!providerConfigured
        ? ["Replay works without a model key. Fresh discovery needs API access."]
        : []),
    ],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = diagnose(
    process.version,
    existsSync(chromium.executablePath()),
    Boolean(process.env.OPENAI_API_KEY),
  );
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ready ? 0 : 1;
}
