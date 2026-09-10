-- Owner-controlled switch for whether the branded URL is currently advertised.
--
-- Lets a Disconnect pause the custom domain (path URL only, cert stays
-- attached on Vercel) and a Connect resume it without re-verifying DNS.
-- Defaults to true so existing rows behave exactly as before — Disconnect is
-- the only thing that flips it off, and only an explicit Connect flips it on.

ALTER TABLE "institution"
ADD COLUMN IF NOT EXISTS "custom_domain_connected" boolean NOT NULL DEFAULT true;
