import "server-only";
import {
  getSessionFromHeaders,
  type SessionPayload,
} from "@/core/auth/session";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { err, forbidden, internalError, unauthorized } from "./response";

export type { SessionPayload };

export type HandlerContext = {
  user: SessionPayload | null;
  /**
   * @deprecated The JWT token string the route handler used to pass to
   * downstream code. No longer meaningful after the Better Auth
   * migration (sessions are DB-backed). Kept for backward compatibility
   * with any caller that destructures it; the value is `null`.
   */
  session: string | null;
};

export type HandlerFn<T = unknown> = (
  ctx: HandlerContext & { request: Request },
) => Promise<Response>;

export type RouteHandlers = {
  GET?: HandlerFn;
  POST?: HandlerFn;
  PUT?: HandlerFn;
  PATCH?: HandlerFn;
  DELETE?: HandlerFn;
};

/**
 * Resolve the session once per request and hand it to the route
 * handlers. The implementation delegates to `getSessionFromHeaders()`
 * (Better Auth under the hood). We pass the explicit `Request`
 * headers rather than calling `next/headers` inside `getSession()` so
 * the cron-handler tests can exercise this factory without a Next
 * request scope.
 */
export function createHandler(handlers: RouteHandlers) {
  return async (req: Request): Promise<Response> => {
    const user = await getSessionFromHeaders(req.headers);

    const method = req.method as keyof RouteHandlers;
    const handler = handlers[method];

    if (!handler) {
      return Response.json(
        err("METHOD_NOT_ALLOWED", `${method} not supported`),
        { status: 405 },
      );
    }

    try {
      return await handler({ user, session: null, request: req });
    } catch (error) {
      console.error("[ApiHandlerError]", error);

      if (error instanceof AppError) {
        return Response.json(err(error.code, error.message), {
          status: 400,
        });
      }

      return internalError(ERROR_MESSAGES.DEFAULT);
    }
  };
}

export function createProtectedHandler(handlers: RouteHandlers) {
  return createHandler({
    GET: handlers.GET
      ? async (ctx) => {
          if (!ctx.user) return unauthorized();
          return handlers.GET!(ctx);
        }
      : undefined,
    POST: handlers.POST
      ? async (ctx) => {
          if (!ctx.user) return unauthorized();
          return handlers.POST!(ctx);
        }
      : undefined,
    PUT: handlers.PUT
      ? async (ctx) => {
          if (!ctx.user) return unauthorized();
          return handlers.PUT!(ctx);
        }
      : undefined,
    PATCH: handlers.PATCH
      ? async (ctx) => {
          if (!ctx.user) return unauthorized();
          return handlers.PATCH!(ctx);
        }
      : undefined,
    DELETE: handlers.DELETE
      ? async (ctx) => {
          if (!ctx.user) return unauthorized();
          return handlers.DELETE!(ctx);
        }
      : undefined,
  });
}

export function createAdminHandler(handlers: RouteHandlers) {
  return createHandler({
    GET: handlers.GET
      ? async (ctx) => {
          if (!ctx.user) return unauthorized();
          if (ctx.user.role !== "SUPER_ADMIN") return forbidden();
          return handlers.GET!(ctx);
        }
      : undefined,
    POST: handlers.POST
      ? async (ctx) => {
          if (!ctx.user) return unauthorized();
          if (ctx.user.role !== "SUPER_ADMIN") return forbidden();
          return handlers.POST!(ctx);
        }
      : undefined,
    PUT: handlers.PUT
      ? async (ctx) => {
          if (!ctx.user) return unauthorized();
          if (ctx.user.role !== "SUPER_ADMIN") return forbidden();
          return handlers.PUT!(ctx);
        }
      : undefined,
    PATCH: handlers.PATCH
      ? async (ctx) => {
          if (!ctx.user) return unauthorized();
          if (ctx.user.role !== "SUPER_ADMIN") return forbidden();
          return handlers.PATCH!(ctx);
        }
      : undefined,
    DELETE: handlers.DELETE
      ? async (ctx) => {
          if (!ctx.user) return unauthorized();
          if (ctx.user.role !== "SUPER_ADMIN") return forbidden();
          return handlers.DELETE!(ctx);
        }
      : undefined,
  });
}

export function createCronHandler(handlers: RouteHandlers) {
  const cronSecretEnv = process.env.CRON_SECRET;

  // Fail-fast in production: silently rejecting every cron call because the
  // secret is unset is worse than throwing at startup — Vercel Cron would
  // 403 every invocation with no signal in the code that anything is wrong.
  if (process.env.NODE_ENV === "production" && !cronSecretEnv) {
    throw new Error(
      "CRON_SECRET is not defined — refusing to start cron handlers in production.",
    );
  }

  return createHandler({
    GET: handlers.GET
      ? async (ctx) => {
          const auth = ctx.request.headers.get("authorization");
          if (!auth || auth !== `Bearer ${cronSecretEnv}`) {
            return forbidden("Invalid or missing cron secret");
          }
          return handlers.GET!(ctx);
        }
      : undefined,
  });
}
