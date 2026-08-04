import "server-only";
import type { SessionPayload } from "@/core/auth/session";
import { decrypt } from "@/core/auth/session";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { err, forbidden, internalError, unauthorized } from "./response";

export type { SessionPayload };

export type HandlerContext = {
  user: SessionPayload | null;
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

function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith("session="));
  return sessionCookie ? (sessionCookie.split("=")[1] ?? null) : null;
}

export function createHandler(handlers: RouteHandlers) {
  return async (req: Request): Promise<Response> => {
    const cookieHeader = req.headers.get("cookie");
    const sessionValue = parseSessionCookie(cookieHeader);
    let user: SessionPayload | null = null;

    if (sessionValue) {
      try {
        user = await decrypt(sessionValue);
      } catch {
        user = null;
      }
    }

    const method = req.method as keyof RouteHandlers;
    const handler = handlers[method];

    if (!handler) {
      return Response.json(
        err("METHOD_NOT_ALLOWED", `${method} not supported`),
        { status: 405 },
      );
    }

    try {
      return await handler({ user, session: sessionValue, request: req });
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
