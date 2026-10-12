import { NextResponse } from "next/server";
import { clearSessionCookie, destroyCurrentSession } from "@/lib/auth";

export async function POST() {
  await destroyCurrentSession();
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res.cookies);
  return res;
}
