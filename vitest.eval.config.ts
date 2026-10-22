import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Live model runs only: kept out of `npm test` because they cost money and need AWS credentials.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.eval.ts"] },
});
