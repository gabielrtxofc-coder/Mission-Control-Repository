/**
 * Armazenamento local de anexos (desenvolvimento/self-hosted).
 * Em produção serverless, trocar por blob storage — ver docs/IMPLANTACAO.md.
 */
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const DEFAULT_UPLOADS_DIR = "var/uploads";

export function uploadsRoot(): string {
  return path.resolve(process.cwd(), process.env.UPLOADS_DIR || DEFAULT_UPLOADS_DIR);
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "arquivo";
}

export async function saveUpload(
  workspaceId: string,
  file: File,
): Promise<{ storageKey: string; sizeBytes: number; mimeType: string; fileName: string }> {
  const root = uploadsRoot();
  const dir = path.join(root, workspaceId);
  await mkdir(dir, { recursive: true });

  const fileName = sanitizeFileName(file.name);
  const ext = path.extname(fileName).slice(0, 12);
  const storageKey = path.join(workspaceId, `${randomBytes(12).toString("hex")}${ext}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(root, storageKey), buffer, { flag: "wx" });

  return {
    storageKey,
    sizeBytes: buffer.byteLength,
    mimeType: file.type || "application/octet-stream",
    fileName,
  };
}

export async function readUpload(storageKey: string): Promise<Buffer> {
  const root = uploadsRoot();
  const full = path.resolve(root, storageKey);
  // Proteção contra path traversal
  if (!full.startsWith(root + path.sep)) {
    throw new Error("Caminho de arquivo inválido.");
  }
  return readFile(full);
}

export async function uploadSize(storageKey: string): Promise<number> {
  const root = uploadsRoot();
  const full = path.resolve(root, storageKey);
  if (!full.startsWith(root + path.sep)) throw new Error("Caminho de arquivo inválido.");
  const info = await stat(full);
  return info.size;
}

export async function removeUpload(storageKey: string): Promise<void> {
  const root = uploadsRoot();
  const full = path.resolve(root, storageKey);
  if (!full.startsWith(root + path.sep)) return;
  await unlink(full).catch(() => {});
}
