/**
 * Wrapper de rotas de API: autenticação, autorização, validação Zod,
 * verificação de origem (CSRF) e mapeamento consistente de erros.
 */
import { NextRequest, NextResponse } from "next/server";
import type { ZodTypeAny, z } from "zod";
import { ApiError, badRequest, forbidden, tooManyRequests, unauthorized } from "@/lib/errors";
import { getAuthContext, type AuthContext } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export type HandlerArgs<Params extends Record<string, string> = Record<string, string>> = {
  req: NextRequest;
  ctx: AuthContext;
  params: Params;
  /** Faz parse do corpo JSON e valida com o schema. */
  body: <S extends ZodTypeAny>(schema: S) => Promise<z.infer<S>>;
  /** Valida os parâmetros de query string. */
  query: <S extends ZodTypeAny>(schema: S) => z.infer<S>;
};

type HandlerOptions<Params extends Record<string, string>> = {
  adminOnly?: boolean;
  /** Rate limit aplicado antes do handler (além do auth). */
  rateLimit?: { limit: number; windowMs: number; by?: "ip" | "user" };
  /** Permite acesso sem sessão (ex.: login). */
  public?: boolean;
  params?: (raw: Record<string, string>) => Params;
};

export function jsonError(error: ApiError) {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    },
    { status: error.status },
  );
}

function isMutating(method: string) {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

/**
 * Bloqueia requisições de origem cruzada em mutações (complementa SameSite).
 * Compara o host da Origem com o Host da requisição (proxy-aware) e com
 * NEXT_PUBLIC_APP_URL — funciona com localhost, 127.0.0.1, LAN e domínios.
 */
function checkOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return; // clientes não-browser (scripts/testes)

  const requestHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  let originHost = "";
  let originOk = false;
  try {
    const originUrl = new URL(origin);
    originHost = originUrl.host;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && new URL(appUrl).origin === originUrl.origin) originOk = true;
  } catch {
    throw forbidden("Origem da requisição não permitida.");
  }

  if (originOk || (requestHost && originHost === requestHost)) return;
  throw forbidden("Origem da requisição não permitida.");
}

async function parseJsonBody<S extends ZodTypeAny>(
  req: NextRequest,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Corpo da requisição inválido: esperado JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw badRequest("Dados inválidos.", result.error.flatten());
  }
  return result.data;
}

function parseQueryParams<S extends ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  const obj: Record<string, string | string[]> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    const existing = obj[key];
    if (existing === undefined) obj[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else obj[key] = [existing, value];
  });
  const result = schema.safeParse(obj);
  if (!result.success) {
    throw badRequest("Parâmetros inválidos.", result.error.flatten());
  }
  return result.data;
}

export function apiHandler<Params extends Record<string, string> = Record<string, string>>(
  handler: (args: HandlerArgs<Params>) => Promise<Response>,
  options: HandlerOptions<Params> = {},
) {
  return async (
    req: NextRequest,
    routeCtx: { params: Promise<Record<string, string>> },
  ): Promise<Response> => {
    try {
      if (isMutating(req.method)) checkOrigin(req);

      const rawParams = routeCtx?.params ? await routeCtx.params : {};
      const params = (options.params ? options.params(rawParams) : (rawParams as Params)) as Params;

      let ctx: AuthContext | null = null;
      if (!options.public) {
        ctx = await getAuthContext();
        if (!ctx) throw unauthorized("Sessão inválida ou expirada. Faça login novamente.");
        if (options.adminOnly && ctx.role !== "ADMIN") {
          throw forbidden("Apenas administradores podem executar esta ação.");
        }
      }

      if (options.rateLimit) {
        const by = options.rateLimit.by ?? "ip";
        const id = by === "user" && ctx ? ctx.user.id : (clientIpOf(req) ?? "unknown");
        const ok = rateLimit(
          `${req.method}:${req.nextUrl.pathname}:${id}`,
          options.rateLimit.limit,
          options.rateLimit.windowMs,
        );
        if (!ok) throw tooManyRequests();
      }

      const args: HandlerArgs<Params> = {
        req,
        ctx: ctx as AuthContext,
        params,
        body: (schema) => parseJsonBody(req, schema),
        query: (schema) => parseQueryParams(req, schema),
      };
      return await handler(args);
    } catch (error) {
      if (error instanceof ApiError) return jsonError(error);
      console.error("[api] erro não tratado:", error);
      return jsonError(new ApiError(500, "internal", "Erro interno do servidor."));
    }
  };
}

function clientIpOf(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip");
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}
