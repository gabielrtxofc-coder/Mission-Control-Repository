export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown) {
  return new ApiError(400, "bad_request", message, details);
}

export function unauthorized(message = "Não autenticado.") {
  return new ApiError(401, "unauthorized", message);
}

export function forbidden(message = "Você não tem permissão para esta ação.") {
  return new ApiError(403, "forbidden", message);
}

export function notFound(message = "Registro não encontrado.") {
  return new ApiError(404, "not_found", message);
}

export function conflict(message: string, details?: unknown) {
  return new ApiError(409, "conflict", message, details);
}

export function payloadTooLarge(message: string) {
  return new ApiError(413, "payload_too_large", message);
}

export function unprocessable(message: string, details?: unknown) {
  return new ApiError(422, "unprocessable", message, details);
}

export function tooManyRequests(message = "Muitas tentativas. Tente novamente em instantes.") {
  return new ApiError(429, "rate_limited", message);
}

export function internal(message = "Erro interno do servidor.") {
  return new ApiError(500, "internal", message);
}
