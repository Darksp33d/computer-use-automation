import { startTarget } from "./dist/demo/server.js";

const target = await startTarget({ host: "0.0.0.0", port: 4174 });
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    void target.close();
  });
