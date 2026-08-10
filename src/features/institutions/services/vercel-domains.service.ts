import "server-only";

import { normalizeCustomDomain } from "@/features/institutions/lib/custom-domain";

/**
 * Vercel Domains API client — Phase 2 automated TLS provisioning.
 *
 * Adds `*.{customDomain}` to the Greenroom Vercel project, verifies the
 * domain challenge, and reads the domain config for TLS readiness.
 *
 * Env (all three required to enable automation):
 *   VERCEL_TOKEN       — API token scoped to the team
 *   VERCEL_PROJECT_ID  — target project id (prj_…)
 *   VERCEL_TEAM_ID     — team id (team_…)
 *
 * When unset the app stays on the Phase 1 manual path: ops attaches the
 * wildcard by hand and HTTPS readiness is proven by probe, not by this API.
 */

const API_BASE = "https://api.vercel.com";

/** Vercel API calls are on the request path — keep them from hanging a route. */
const REQUEST_TIMEOUT_MS = 10_000;

type VercelEnv = {
  token: string;
  projectId: string;
  teamId: string;
};

function readVercelEnv(): VercelEnv | null {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();

  if (!token || !projectId || !teamId) return null;
  return { token, projectId, teamId };
}

/** True when Phase 2 automation can run; false keeps the manual ops path. */
export function isVercelDomainsConfigured(): boolean {
  return readVercelEnv() !== null;
}

function requireVercelEnv(): VercelEnv {
  const env = readVercelEnv();
  if (!env) {
    throw new VercelNotConfiguredError(
      "VERCEL_TOKEN, VERCEL_PROJECT_ID, and VERCEL_TEAM_ID must be set for automated domain provisioning",
    );
  }
  return env;
}

/** Thrown when automation is requested but env is missing — callers fall back. */
export class VercelNotConfiguredError extends Error {
  readonly code = "VERCEL_NOT_CONFIGURED";
}

function teamQuery(teamId: string): string {
  return `?teamId=${encodeURIComponent(teamId)}`;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function wildcardOf(customDomain: string): string {
  return `*.${normalizeCustomDomain(customDomain)}`;
}

// ── Types ──────────────────────────────────────────────────────────────────

export type DomainVerificationRecord = {
  type: string;
  domain: string;
  value: string;
  reason: string;
};

export type ProjectDomainResponse = {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification?: DomainVerificationRecord[];
};

export type DomainConfigResponse = {
  configuredBy: "A" | "CNAME" | "dns-01" | "http" | null;
  acceptedChallenges: string[];
  misconfigured: boolean;
};

/**
 * Attach state as reported by Vercel. TLS readiness itself is proven by an
 * HTTPS probe (see custom-domain-provisioning.service) because a domain can be
 * attached and configured while the certificate is still being issued.
 */
export type VercelAttachStatus =
  | { status: "not-configured" }
  | { status: "not-attached" }
  | { status: "pending-verification"; records: DomainVerificationRecord[] }
  | { status: "misconfigured" }
  | { status: "attached" }
  | { status: "error"; message: string };

type VercelError = {
  error?: { message?: string; code?: string };
};

// ── Fetch plumbing ─────────────────────────────────────────────────────────

async function parseJson<T>(res: Response): Promise<T | VercelError | null> {
  try {
    return (await res.json()) as T | VercelError;
  } catch {
    return null;
  }
}

function errorMessage(body: unknown, fallback: string): string {
  const message = (body as VercelError | null)?.error?.message;
  return message ?? fallback;
}

async function vercelFetch<T>(
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; body: T | VercelError | null }> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  const body = await parseJson<T>(res);
  return { ok: res.ok, status: res.status, body };
}

// ── API calls ──────────────────────────────────────────────────────────────

/**
 * Add `*.{customDomain}` (wildcard) to the Vercel project.
 * Idempotent: an already-attached domain is fetched and returned as-is.
 */
export async function addWildcardDomainToProject(
  customDomain: string,
): Promise<ProjectDomainResponse> {
  const { token, projectId, teamId } = requireVercelEnv();
  const domain = wildcardOf(customDomain);

  const url = `${API_BASE}/v10/projects/${encodeURIComponent(projectId)}/domains${teamQuery(teamId)}`;

  const { ok, status, body } = await vercelFetch<ProjectDomainResponse>(url, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ name: domain }),
  });

  // 409 = already on this project; re-read the record so callers get real state.
  if (status === 409) {
    return await getProjectDomain(customDomain);
  }

  if (!ok) {
    throw new Error(errorMessage(body, `Vercel add domain failed: ${status}`));
  }

  return body as ProjectDomainResponse;
}

/**
 * Verify a project domain — asks Vercel to re-check its TXT challenge.
 * Safe to call when already verified.
 */
export async function verifyProjectDomain(
  customDomain: string,
): Promise<ProjectDomainResponse> {
  const { token, projectId, teamId } = requireVercelEnv();
  const domain = wildcardOf(customDomain);

  const url = `${API_BASE}/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}/verify${teamQuery(teamId)}`;

  const { ok, status, body } = await vercelFetch<ProjectDomainResponse>(url, {
    method: "POST",
    headers: authHeaders(token),
  });

  if (!ok) {
    throw new Error(
      errorMessage(body, `Vercel verify domain failed: ${status}`),
    );
  }

  return body as ProjectDomainResponse;
}

/**
 * Get domain config. `misconfigured: false` means DNS points at Vercel
 * correctly — a precondition for the certificate, not proof of it.
 */
export async function getDomainConfig(
  customDomain: string,
): Promise<DomainConfigResponse> {
  const { token, teamId } = requireVercelEnv();
  const domain = wildcardOf(customDomain);

  const url = `${API_BASE}/v6/domains/${encodeURIComponent(domain)}/config${teamQuery(teamId)}`;

  const { ok, status, body } = await vercelFetch<DomainConfigResponse>(url, {
    method: "GET",
    headers: authHeaders(token),
  });

  if (!ok) {
    throw new Error(errorMessage(body, `Vercel get config failed: ${status}`));
  }

  return body as DomainConfigResponse;
}

/** Read a project domain record. Throws `DOMAIN_NOT_FOUND` when absent. */
export async function getProjectDomain(
  customDomain: string,
): Promise<ProjectDomainResponse> {
  const { token, projectId, teamId } = requireVercelEnv();
  const domain = wildcardOf(customDomain);

  const url = `${API_BASE}/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}${teamQuery(teamId)}`;

  const { ok, status, body } = await vercelFetch<ProjectDomainResponse>(url, {
    method: "GET",
    headers: authHeaders(token),
  });

  if (status === 404) {
    throw new DomainNotFoundError(`${domain} is not on the Vercel project`);
  }

  if (!ok) {
    throw new Error(
      errorMessage(body, `Vercel get project domain failed: ${status}`),
    );
  }

  return body as ProjectDomainResponse;
}

/** Distinguishes "domain absent" from a transient/auth API failure. */
export class DomainNotFoundError extends Error {
  readonly code = "DOMAIN_NOT_FOUND";
}

/**
 * Remove `*.{customDomain}` from the Vercel project.
 * Called when an institution changes or clears their domain.
 */
export async function removeProjectDomain(customDomain: string): Promise<void> {
  const { token, projectId, teamId } = requireVercelEnv();
  const domain = wildcardOf(customDomain);

  const url = `${API_BASE}/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}${teamQuery(teamId)}`;

  const { ok, status, body } = await vercelFetch<unknown>(url, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  // 404 = already gone — the desired end state either way.
  if (!ok && status !== 404) {
    throw new Error(
      errorMessage(body, `Vercel remove domain failed: ${status}`),
    );
  }
}

/**
 * Attach state for a domain on the Vercel project.
 *
 * Never throws: every failure is mapped to a status the UI can render, so a
 * Vercel outage degrades to "we can't tell yet" rather than a broken screen.
 */
export async function checkAttachStatus(
  customDomain: string,
): Promise<VercelAttachStatus> {
  if (!isVercelDomainsConfigured()) return { status: "not-configured" };

  const normalized = normalizeCustomDomain(customDomain);
  if (!normalized) return { status: "not-attached" };

  try {
    let projectDomain: ProjectDomainResponse;
    try {
      projectDomain = await getProjectDomain(normalized);
    } catch (err) {
      if (err instanceof DomainNotFoundError) return { status: "not-attached" };
      throw err;
    }

    if (!projectDomain.verified) {
      // Attached but unverified — nudge Vercel to re-check before reporting.
      try {
        projectDomain = await verifyProjectDomain(normalized);
      } catch {
        // Verify is best-effort; fall through to the record we already have.
      }
    }

    if (!projectDomain.verified) {
      return {
        status: "pending-verification",
        records: projectDomain.verification ?? [],
      };
    }

    const config = await getDomainConfig(normalized);
    return config.misconfigured
      ? { status: "misconfigured" }
      : { status: "attached" };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown Vercel API error";
    return { status: "error", message };
  }
}
