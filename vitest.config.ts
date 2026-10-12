import { defineConfig } from "vitest/config";
import path from "node:path";
import { existsSync } from "node:fs";

// Carrega .env para obter TEST_DATABASE_URL
const envPath = path.resolve(__dirname, ".env");
if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    env: {
      // Os testes de integração usam SEMPRE o banco de teste
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgresql://mission_control:mission_control_dev@127.0.0.1:5432/mission_control_test?schema=public",
      TZ: "America/Sao_Paulo",
      APP_TIMEZONE: "America/Sao_Paulo",
      AUTH_SECRET: "test-secret",
      NODE_ENV: "test",
    },
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    pool: "forks",
  },
});
