import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampler: (samplingContext) => {
    const pathname =
      samplingContext.request?.url ||
      samplingContext.transactionContext?.name ||
      "";
    if (pathname.includes("/api/health")) return 0;
    return 0.1;
  },

  environment: process.env.NODE_ENV ?? "development",

  enabled: process.env.NODE_ENV === "production",
});
