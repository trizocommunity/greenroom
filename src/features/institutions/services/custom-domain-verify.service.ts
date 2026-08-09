import { promises as dns } from "node:dns";
import {
  getDomainOwnershipToken,
  getDomainOwnershipTxtName,
  normalizeCustomDomain,
  VERCEL_DNS_CNAME_TARGET,
} from "@/features/institutions/lib/custom-domain";

export type DnsVerifyResult =
  | { ok: true }
  | {
      ok: false;
      missing: Array<"txt" | "cname">;
      details: string[];
    };

async function checkOwnershipTxt(
  customDomain: string,
  institutionId: string,
): Promise<{ ok: boolean; detail: string }> {
  const name = getDomainOwnershipTxtName(customDomain);
  const expected = getDomainOwnershipToken(institutionId);

  try {
    const records = await dns.resolveTxt(name);
    const flat = records.map((parts) => parts.join(""));
    if (flat.some((v) => v.trim() === expected)) {
      return { ok: true, detail: `TXT ${name} found` };
    }
    return {
      ok: false,
      detail: `TXT ${name} is missing or does not equal ${expected}`,
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    return {
      ok: false,
      detail:
        code === "ENOTFOUND" || code === "ENODATA"
          ? `TXT ${name} not found`
          : `TXT lookup failed for ${name}: ${code ?? "error"}`,
    };
  }
}

async function checkWildcardCname(
  customDomain: string,
): Promise<{ ok: boolean; detail: string }> {
  const apex = normalizeCustomDomain(customDomain);
  // Probe a random label; wildcard `*` CNAME answers for any subdomain.
  const probeHost = `_gr-probe-${Date.now().toString(36)}.${apex}`;
  const expected = (
    process.env.VERCEL_DNS_CNAME_TARGET?.trim() || VERCEL_DNS_CNAME_TARGET
  )
    .toLowerCase()
    .replace(/\.$/, "");

  try {
    const records = await dns.resolveCname(probeHost);
    const normalized = records.map((r) => r.toLowerCase().replace(/\.$/, ""));
    if (normalized.some((r) => r === expected || r.endsWith(`.${expected}`))) {
      return { ok: true, detail: `Wildcard CNAME points to ${expected}` };
    }
    return {
      ok: false,
      detail: `Wildcard CNAME for *.${apex} must point to ${expected} (got: ${normalized.join(", ") || "none"})`,
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    return {
      ok: false,
      detail:
        code === "ENOTFOUND" || code === "ENODATA"
          ? `Wildcard CNAME *.${apex} → ${expected} not found`
          : `CNAME lookup failed for ${probeHost}: ${code ?? "error"}`,
    };
  }
}

/**
 * Phase 1 verify: require ownership TXT and wildcard CNAME to Vercel.
 * Does not attach the domain on Vercel (Phase 2).
 */
export async function verifyCustomDomainDns(opts: {
  customDomain: string;
  institutionId: string;
}): Promise<DnsVerifyResult> {
  const domain = normalizeCustomDomain(opts.customDomain);
  const [txt, cname] = await Promise.all([
    checkOwnershipTxt(domain, opts.institutionId),
    checkWildcardCname(domain),
  ]);

  const missing: Array<"txt" | "cname"> = [];
  const details: string[] = [];

  if (!txt.ok) {
    missing.push("txt");
    details.push(txt.detail);
  } else {
    details.push(txt.detail);
  }

  if (!cname.ok) {
    missing.push("cname");
    details.push(cname.detail);
  } else {
    details.push(cname.detail);
  }

  if (missing.length > 0) {
    return { ok: false, missing, details };
  }
  return { ok: true };
}
