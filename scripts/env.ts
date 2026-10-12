/** Carrega .env em scripts Node (sem dependência externa). */
import { existsSync } from "node:fs";
import path from "node:path";

export function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  }
}
