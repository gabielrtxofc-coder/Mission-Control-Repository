import { fromDateISO as fromISO, toISODate as toISO } from "@/lib/dates";

export const fromDateISO = fromISO;
export const toISODate = toISO;

/** Normaliza datas vindas de formulários ("" → null). */
export function normalize(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}
