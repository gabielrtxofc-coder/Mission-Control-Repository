import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators";
import {
  clientIp,
  createSession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, badRequest, unauthorized } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/api";
import { userDTO } from "@/lib/serializers";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: por IP e por e-mail (proteção contra força bruta)
    const ip = clientIp(req) ?? "unknown";
    if (!rateLimit(`login:ip:${ip}`, 20, 5 * 60_000)) {
      throw new ApiError(
        429,
        "rate_limited",
        "Muitas tentativas de login. Aguarde alguns minutos.",
      );
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      throw badRequest("Corpo da requisição inválido.");
    }
    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      throw badRequest("Dados inválidos.", parsed.error.flatten());
    }
    const { email, password } = parsed.data;

    if (!rateLimit(`login:email:${email}`, 10, 5 * 60_000)) {
      throw new ApiError(
        429,
        "rate_limited",
        "Muitas tentativas para este e-mail. Aguarde alguns minutos.",
      );
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      // Mensagem genérica: não revela se o e-mail existe.
      throw unauthorized("E-mail ou senha incorretos.");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw unauthorized("E-mail ou senha incorretos.");

    const membership = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      orderBy: { joinedAt: "asc" },
      include: { workspace: true },
    });

    const { token, expiresAt } = await createSession(user.id, {
      userAgent: req.headers.get("user-agent"),
      ip,
    });

    const res = NextResponse.json({
      user: userDTO(user),
      workspace: membership
        ? { id: membership.workspace.id, name: membership.workspace.name, role: membership.role }
        : null,
      expiresAt: expiresAt.toISOString(),
    });
    setSessionCookie(res.cookies, token);
    return res;
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error);
    console.error("[auth/login] erro:", error);
    return jsonError(new ApiError(500, "internal", "Erro interno do servidor."));
  }
}
