/**
 * Prepara o banco de teste: aplica as migrations do Prisma.
 * Executado uma vez antes de toda a suíte.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";

export default function globalSetup() {
  const envPath = path.resolve(__dirname, "../.env");
  if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  }
  const testUrl =
    process.env.TEST_DATABASE_URL ??
    "postgresql://mission_control:mission_control_dev@127.0.0.1:5432/mission_control_test?schema=public";

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "pipe",
  });
}
