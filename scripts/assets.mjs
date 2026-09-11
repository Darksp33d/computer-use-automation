import { cp, mkdir } from "node:fs/promises";

await mkdir(new URL("../dist/demo/public/", import.meta.url), { recursive: true });
await cp(
  new URL("../demo/public/", import.meta.url),
  new URL("../dist/demo/public/", import.meta.url),
  { recursive: true },
);
