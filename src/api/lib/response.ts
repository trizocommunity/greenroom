export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export function ok<T>(data: T, cacheControl?: string): Response {
  const headers: HeadersInit = cacheControl
    ? { "Cache-Control": cacheControl }
    : {};
  return Response.json({ success: true, data }, { status: 200, headers });
}

export function err(code: string, message: string): ApiResponse<never> {
  return { success: false, error: { code, message } };
}

export function unauthorized(message = "Authentication required"): Response {
  return Response.json(err("UNAUTHORIZED", message), { status: 401 });
}

export function forbidden(message = "Insufficient permissions"): Response {
  return Response.json(err("FORBIDDEN", message), { status: 403 });
}

export function badRequest(code: string, message: string): Response {
  return Response.json(err(code, message), { status: 400 });
}

export function notFound(code: string, message: string): Response {
  return Response.json(err(code, message), { status: 404 });
}

export function internalError(message = "Internal server error"): Response {
  return Response.json(err("INTERNAL_ERROR", message), { status: 500 });
}

export function tooManyRequests(message = "Rate limit exceeded"): Response {
  return Response.json(err("TOO_MANY_REQUESTS", message), { status: 429 });
}
