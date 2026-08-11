-- Per-festival TLS readiness for branded custom-domain hosts.
--
-- Replaces the institution-wide `institution.httpsReadyAt` signal, which
-- assumed one wildcard certificate (`*.{apex}`) covered every festival under an
-- institution. That assumption was wrong: wildcard certificates can only be
-- validated through the DNS-01 ACME challenge, which requires Vercel to write
-- TXT records into the institution's zone at issuance and at every renewal.
-- Institutions keep their own DNS (their apex site and email live there), so
-- Vercel never had the zone control it needed and the certificate never issued.
--
-- Each festival host is now attached to the Vercel project individually and
-- validated over HTTP-01, which needs no zone control. Readiness therefore
-- becomes a per-festival fact: `suffamehil.ahlussuffa.in` can be serving while
-- a sibling festival under the same apex has not been published yet.
--
-- Nullable with no default and no backfill: NULL is exactly "no certificate
-- proven yet", which is the correct state for every existing row. The probe in
-- custom-domain-provisioning.service stamps it on the first successful TLS
-- handshake and clears it if the certificate stops serving.
--
-- `institution.httpsReadyAt` is left in place for now — it is no longer read
-- once this ships, and dropping it is a separate migration.

ALTER TABLE "festival"
ADD COLUMN IF NOT EXISTS "domain_https_ready_at" timestamp with time zone;
