/**
 * Helpers de data. Toda data de negócio (prazo, início) é tratada como
 * date-only (YYYY-MM-DD) para evitar ambiguidades de fuso horário.
 * "Hoje" é calculado no fuso configurado em APP_TIMEZONE.
 */
import {
  addDays as fnsAddDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type ISODate = string; // YYYY-MM-DD

export function appTimeZone(): string {
  return process.env.APP_TIMEZONE || "America/Sao_Paulo";
}

export function todayISO(): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function nowDate(): Date {
  return new Date();
}

/** Converte Date do Prisma (@db.Date) para string YYYY-MM-DD (sem depender do fuso). */
export function toISODate(value: Date | string | null | undefined): ISODate | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

/** Converte YYYY-MM-DD em Date UTC midnight (formato esperado pelo Prisma em @db.Date). */
export function fromDateISO(value: ISODate | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export function addDaysISO(value: ISODate, days: number): ISODate {
  return format(fnsAddDays(parseISO(value), days), "yyyy-MM-dd");
}

export function diffDaysISO(from: ISODate, to: ISODate): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

export function isOverdue(due: ISODate | null, today = todayISO()): boolean {
  return due !== null && due < today;
}

export function isDueToday(due: ISODate | null, today = todayISO()): boolean {
  return due === today;
}

export function isDueSoon(due: ISODate | null, today = todayISO(), withinDays = 3): boolean {
  if (due === null) return false;
  return due >= today && diffDaysISO(today, due) < withinDays;
}

export function formatDateBR(value: ISODate | null | undefined): string {
  if (!value) return "—";
  return format(parseISO(value), "dd/MM/yyyy");
}

export function formatDateTimeBR(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: appTimeZone(),
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelative(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dia${days > 1 ? "s" : ""}`;
  return formatDateTimeBR(date);
}

export function monthRange(anchor: ISODate): { start: ISODate; end: ISODate } {
  const date = parseISO(anchor);
  return {
    start: format(startOfMonth(date), "yyyy-MM-dd"),
    end: format(endOfMonth(date), "yyyy-MM-dd"),
  };
}

export function weekRange(anchor: ISODate): { start: ISODate; end: ISODate } {
  const date = parseISO(anchor);
  return {
    start: format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    end: format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  };
}

export function clampDate(value: ISODate, min: ISODate, max: ISODate): ISODate {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
