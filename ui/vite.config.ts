import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  envPrefix: "RELAY_PUBLIC_",
  build: { outDir: "../dist/ui", emptyOutDir: true, sourcemap: false },
});
