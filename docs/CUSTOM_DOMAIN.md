# Custom Domain (wildcard branded hosts)

**Status:** Phase 1 shipped · Phase 2 shipped  
**App host (prod):** `https://greenroomm.vercel.app`  
**Tier gate:** `TIER_CONFIG.*.features.customDomain` — **PRO only** (`src/config/pricing.ts`)  
**Plan label:** Super Admin matrix → “Custom Domain” (`src/config/plan-features.config.ts`)  
**Surface:** Institutional festivals · Dashboard → Settings → **Launch Website** (`?tab=festival-live`)  

Related plan/grill notes: [`DOCS/custom_domain_wildcard_dns_2e9fc0b6.plan.md`](../custom_domain_wildcard_dns_2e9fc0b6.plan.md)

---

## 1. What it is

Institutions on **PRO** can point a wildcard DNS name at Greenroom so each festival is reachable at:

```text
https://{festivalSlug}.{customDomain}/
https://{festivalSlug}.{customDomain}/login
https://{festivalSlug}.{customDomain}/stage-portal
```

**Example**

| Piece | Value |
|-------|--------|
| Festival slug | `suffamehil` |
| Apex (saved by owner) | `ahlussuffa.in` |
| Branded public URL | `https://suffamehil.ahlussuffa.in` |
| Path URL (always available) | `https://greenroomm.vercel.app/suffamehil` |
| Dashboard (always app host) | `https://greenroomm.vercel.app/dashboard/suffamehil` |

Until the domain is **DNS-verified**, public URLs stay on the Greenroom path form.  
Until **HTTPS is proven** on the branded host, public URLs *also* stay on the path form — Greenroom only advertises `{slug}.{domain}` once a real TLS handshake has succeeded (`institution.httpsReadyAt`).

Dashboard always stays on the Greenroom app host. Requests to `/dashboard/*` on a custom host redirect to `getAppBaseUrl() + pathname`.

---

## 2. URL matrix

Example: slug `suffamehil` · apex `ahlussuffa.in` · app `greenroomm.vercel.app`

| Surface | Not verified | Verified + HTTPS ready | Notes |
|---------|--------------|------------------------|--------|
| Dashboard | App host only | Still app host; custom-host `/dashboard/*` **redirects** to app | Never served on branded host |
| Public site | `…/suffamehil` | `suffamehil.ahlussuffa.in` | Path still works unless canonical redirect is enabled |
| Stage portal | `…/suffamehil/stage-portal` | `suffamehil.ahlussuffa.in/stage-portal` | |
| Participant login | `…/suffamehil/login` | `suffamehil.ahlussuffa.in/login` | |
| Live links UI | Path URLs | Prefer branded when verified | |
| Bare apex / `www` | n/a | **404** on our proxy | Institution’s own apex site stays untouched |

**Proxy rewrite** (custom Host + institution verified): path `P` → `/${festivalSlug}${P}`  
(e.g. `/login` → `/suffamehil/login`). Leave `/api/*` and `/_next/*` on the same origin (no rewrite). Unverified custom Host → 404.

```mermaid
flowchart LR
  Host["Host: suffamehil.ahlussuffa.in"] --> Proxy["src/proxy.ts"]
  Proxy -->|"cache hit/miss 60s"| Inst["institution by customDomain"]
  Proxy -->|"rewrite / → /suffamehil"| Public["public + portals"]
  Proxy -->|"/dashboard/*"| Redir["redirect getAppBaseUrl + pathname"]
```

---

## 3. Product rules (locked)

| Rule | Behavior |
|------|----------|
| Gate | Festival `tier` must enable `customDomain` (PRO). Non-PRO on a custom Host → 404. Path URLs still work for all tiers. |
| Who edits | Institution **owner** only (save / clear / verify). Managers see status + DNS instructions + branded URLs. |
| Soft checklist | Overview “Verify custom subdomain” → `settings?tab=festival-live`. Launch on `/{slug}` allowed without verify. |
| Verify (Phase 1) | DNS only: TXT `_greenroom.{domain}` = `greenroom-verify={institutionId}` **and** wildcard CNAME `*` → `cname.vercel-dns.com`. |
| Domain change | Saving/clearing clears `verifiedAt` immediately; cache invalidated. Old branded Host → 404 (≤60s cache). |
| Canonical redirect | Opt-in: `ENABLE_CUSTOM_DOMAIN_CANONICAL_REDIRECT=true` in **production only**, and only after wildcard HTTPS works. Off by default; always off on localhost / non-production. |
| Apex / www | Bare apex and `www.{domain}` → 404 (not festival hosts). |
| Post-expiry | Results + standings remain; news / media / participant login / stage portal blocked. |
| Slug uniqueness | Global (unchanged). No per-institution slug namespace. |

---

## 4. End-to-end who does what

### Phase 1 (superseded)

```text
1. Greenroom eng     → ship/deploy Phase 1 code + migration + PRO gate
2. Institution owner → Save apex → publish DNS (TXT + *) → Verify DNS → Launch
3. Greenroom ops     → Manually add *.{domain} on Vercel → wait for TLS
4. Public users      → Use branded HTTPS URLs
```

Still the live path on deployments **without** Vercel API credentials — see
“manual-attach” in §9.

### Phase 2 (today)

```text
1. Greenroom eng     → set VERCEL_TOKEN / VERCEL_PROJECT_ID / VERCEL_TEAM_ID
2. Institution owner → Save → DNS → Verify — no “ask Greenroom” step
3. System            → Auto-attach *.{domain}, probe HTTPS, show “HTTPS ready”
4. Public users      → Use branded HTTPS URLs
```

---

## 5. Institution user workflow (owner)

**Prerequisites:** Institutional festival on **PRO**; logged in as institution **owner**.

| Step | Where | Action |
|------|--------|--------|
| 1 | `https://greenroomm.vercel.app/dashboard/{slug}/settings` → **Launch Website** | Enter apex only (e.g. `ahlussuffa.in`) → **Save domain**. Not `www`, not a full URL. |
| 2 | Same screen → **DNS records** | At the domain DNS provider, add the two records shown in the UI (see below). |
| 3 | Same screen | Click **Verify DNS**. Status becomes **Verified** when both records resolve correctly. |
| 4 | Same screen | UI shows **Provisioning HTTPS…** and polls every 15s, then flips to **HTTPS ready**. No ops ticket. If the deployment has no Vercel credentials the badge reads **DNS verified — awaiting HTTPS** instead, and the alert asks Greenroom to attach the wildcard — that is the Phase 1 manual path. |
| 5 | Launch Website | **Go live** if not already. Path launch works **without** verify. |
| 6 | Share | After HTTPS ready: `https://{slug}.{domain}`, `/login`, `/stage-portal`. |

### DNS records (owner’s DNS panel)

| Type | Name / host | Value |
|------|-------------|--------|
| TXT | `_greenroom.{apex}` | `greenroom-verify={institutionId}` |
| CNAME | `*` | `cname.vercel-dns.com` |

Exact strings are copied from Festival Live after Save.

**Managers:** can view status, DNS instructions, and branded URLs — cannot save/clear/verify.

---

## 6. Screens, UI steps & components

Click-path a user (or you) actually walks, with the React pieces behind each step.

### 6.1 Screen map

| # | Screen | Route | Primary components |
|---|--------|-------|-------------------|
| A | Festival **Overview** | `/dashboard/[slug]` | `OverviewWidgets` → `FestSetupWidget`, `LiveLinksCard`, `LaunchFestivalDrawer` |
| B | **Settings** shell | `/dashboard/[slug]/settings` | `settings/page.tsx` (RSC) → `SettingsTabs` |
| C | **Launch Website** tab | `…/settings?tab=festival-live` | `FestivalLiveClient` |
| D | Public festival (path) | `/{slug}` | `(festivalPublic)/[slug]/*` |
| E | Public festival (branded) | `https://{slug}.{domain}/` | Same app routes via `src/proxy.ts` rewrite |
| F | Participant login | `/{slug}/login` or branded `/login` | `src/app/[slug]/login/page.tsx` |
| G | Stage portal | `/{slug}/stage-portal` or branded `/stage-portal` | `src/app/[slug]/stage-portal/page.tsx` |

Dashboard organizer UI never stays on a branded host — proxy redirects `/dashboard/*` to the app host.

### 6.2 Step-by-step on screens (owner)

```text
Overview (A)
  ├─ Fest setup → “Verify custom subdomain”  ──href──►  Settings?tab=festival-live (C)
  └─ Fest setup → “Launch Festival”  ──opens──►  LaunchFestivalDrawer
        └─ CTA continues to Launch Website tab (C)

Settings → Launch Website (C)   ← main custom-domain UI
  ├─ Section “Public festival URL”     → copy / open (uses getPublicFestivalBaseUrl)
  ├─ Section “Custom subdomain”        → apex input, Save, Verify, DNS list, HTTPS alert
  └─ Section “Go live”                 → launch / take offline + preview iframe

Overview (A) again
  └─ “Live links” card                 → site / login / stage-portal (branded when verified)

Public / portals (D–G)
  └─ End users hit path or branded URLs after launch + (for branded) DNS+TLS
```

| Owner action | Screen | What they click / see | Component(s) |
|--------------|--------|----------------------|--------------|
| See soft checklist | Overview | Step **Verify custom subdomain** (incomplete until `verifiedAt`) | `FestSetupWidget` |
| Open domain UI from checklist | Overview → Settings | Click that step | `FestSetupWidget` → navigates to `?tab=festival-live` |
| Open domain UI from launch | Overview | **Launch Festival** → drawer → goes to Launch Website | `LaunchFestivalDrawer` |
| Open Settings directly | Sidebar / nav | Settings → tab **Launch Website** | `SettingsTabs` (`value: "festival-live"`, label “Launch Website”) |
| Save apex | Launch Website | **Custom subdomain** → input → **Save domain** | `FestivalLiveClient` → `PUT …/custom-domain` |
| Copy DNS instructions | Launch Website | TXT + CNAME block + Phase 1 HTTPS alert | `FestivalLiveClient` (`Alert` / `AlertTitle`) |
| Verify | Launch Website | **Verify DNS** | `FestivalLiveClient` → `POST …/custom-domain/verify` |
| Launch site | Launch Website | **Go live** control | `FestivalLiveClient` (launch / unpublish) |
| Share links | Overview | **Live links** copy/open | `LiveLinksCard` (URLs from `OverviewWidgets` + `getPublicFestivalBaseUrl`) |
| Preview same-origin | Launch Website | Preview iframe always `/{slug}` | `FestivalLiveClient` (`previewPath`) |

### 6.3 Component roles

| Component | File | Role |
|-----------|------|------|
| `OverviewWidgets` | `src/components/dashboard/overview/OverviewWidgets.tsx` | Loads institution domain fields; builds `publicBaseUrl` via `getPublicFestivalBaseUrl`; passes verify flags into setup + live links |
| `FestSetupWidget` | `src/components/dashboard/overview/FestSetupWidget.tsx` | Soft step **Verify custom subdomain** (institutional PRO only); `href` → settings Launch Website tab |
| `LaunchFestivalDrawer` | `src/components/dashboard/overview/LaunchFestivalDrawer.tsx` | Overview launch entry; routes to `settings?tab=festival-live` |
| `LiveLinksCard` | `src/components/dashboard/overview/LiveLinksCard.tsx` | Copy/open public site, `/login`, `/stage-portal` using canonical `publicBaseUrl` |
| Settings page (RSC) | `src/app/dashboard/[slug]/settings/page.tsx` | Auth + loads festival/institution; computes `publicUrl`, `customDomain` props (`isOwner`, `isPro`, `isInstitutional`) |
| `SettingsTabs` | `src/app/dashboard/[slug]/settings/_components/SettingsTabs.tsx` | Tab chrome; mounts `FestivalLiveClient` when `tab=festival-live` |
| `FestivalLiveClient` | `…/settings/_components/FestivalLiveClient.tsx` | **All** domain save/verify UI, DNS copy, HTTPS warning, public URL, go-live, preview |
| `FeatureGate` / plan matrix | `src/components/common/FeatureGate.tsx`, `src/config/plan-features.config.ts` | Labels/gates “Custom Domain” for PRO |
| `src/proxy.ts` | (not a React screen) | Host rewrite, dashboard redirect, optional canonical redirect |

### 6.4 `FestivalLiveClient` UI blocks (in order)

1. **Header** — “Launch Website”  
2. **Public festival URL** — mono URL, Copy, Open (when live); adds login/stage URLs once **HTTPS is ready**  
3. **Custom subdomain** (only if `isInstitutional && isPro`)  
   - Phase badge: Not configured / Awaiting DNS verification / Provisioning HTTPS… / DNS verified — awaiting HTTPS / HTTPS ready / Needs attention  
   - Owner: apex `Input`, **Save domain**, **Verify DNS** (when saved & not verified)  
   - Non-owner: read-only note  
   - DNS records list + phase-specific alert (see §9)  
4. **Go live** — launch / take offline  
5. **Preview** — same-origin iframe of `previewPath` (`/{slug}`)

### 6.5 APIs the screens call

| UI action | Method | Route |
|-----------|--------|-------|
| Save / clear domain | `PUT` | `/api/v1/profile/institution/custom-domain` |
| Verify DNS | `POST` | `/api/v1/profile/institution/custom-domain/verify` |
| Poll TLS status | `GET` | `/api/v1/profile/institution/custom-domain/status` |
| Launch / unpublish | (existing festival live toggle inside `FestivalLiveClient`) | festival public-site APIs already used by Launch Website |

The status route is readable by any institution member (managers get view
access); only save/clear/verify are owner-gated. `FestivalLiveClient` polls it
every 15s **only** while the phase is `provisioning` or `manual-attach`, so a
settled tab makes no background requests.

---

## 7. Greenroom developer / ops workflow

### 7.1 One-time project setup (prod)

1. Deploy Greenroom so it serves **`https://greenroomm.vercel.app`**.
2. Vercel env (minimum related to this feature):
   - `NEXT_PUBLIC_APP_URL=https://greenroomm.vercel.app`
   - `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` — enables Phase 2 automation. All three or none; a partial set is treated as unset.
   - Leave `ENABLE_CUSTOM_DOMAIN_CANONICAL_REDIRECT` **unset/false** until at least one customer has working wildcard HTTPS.
3. Confirm PRO has `customDomain: true` in `src/config/pricing.ts`.
4. Apply schema migrations: `drizzle/0029_unusual_phantom_reporter.sql` (`institution.customDomain`, `verifiedAt`, unique index) and `drizzle/0030_nifty_king_bedlam.sql` (`institution.httpsReadyAt`).
5. Confirm Settings → Launch Website shows **Custom subdomain** for PRO institutional festivals.

### 7.2 Per customer — Phase 2 (automated, default)

Nothing to do. When the owner clicks **Verify DNS**:

1. Greenroom verifies the TXT + wildcard CNAME records.
2. `ensureWildcardAttached` POSTs `*.{domain}` to the Vercel project (409 “already attached” is treated as success).
3. `syncCustomDomainStatus` probes `https://_gr-tls-probe.{domain}/`; the first successful handshake stamps `institution.httpsReadyAt`.
4. Festival Live polls the status route and flips to **HTTPS ready** on its own.

Ops involvement is token health and monitoring only.

### 7.3 Per customer — manual fallback (no Vercel credentials)

If `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID` are unset, the status
reports `manual-attach` and the owner sees “Awaiting wildcard attach”. Then:

1. Note their apex (e.g. `ahlussuffa.in`) from Festival Live or DB.
2. Vercel → Project → **Settings → Domains** → add **`*.ahlussuffa.in`** (wildcard).
3. Wait until status is Valid / certificate issued.
4. Smoke in a browser:
   - `https://{slug}.ahlussuffa.in` → public site
   - `https://{slug}.ahlussuffa.in/login`
   - `https://{slug}.ahlussuffa.in/stage-portal`
   - `https://{slug}.ahlussuffa.in/dashboard/...` → redirects to `greenroomm.vercel.app/dashboard/...`
5. No DB edit needed — the probe notices the working certificate and stamps `httpsReadyAt` on the next status poll.
6. Optional: only after the above works, set `ENABLE_CUSTOM_DOMAIN_CANONICAL_REDIRECT=true` if you want app-host `/{slug}` to 302 to the branded host.

**Do not** enable canonical redirect before HTTPS is confirmed — path URLs would
redirect to a host that cannot serve TLS and look “dead” while logs still show
2xx/3xx. `findBrandedRedirectTarget` guards this by requiring `httpsReadyAt`,
but the env flag is still the outer switch.

---

## 8. Technical reference

### Data model

`institution` table:

- `customDomain` — apex string, unique when set  
- `verifiedAt` — set after successful DNS verify  
- `httpsReadyAt` — set once a TLS handshake against the branded host succeeds; cleared if it later stops serving  

Migrations: `drizzle/0029_unusual_phantom_reporter.sql`, `drizzle/0030_nifty_king_bedlam.sql`

`verifiedAt` and `httpsReadyAt` are independent on purpose. A TLS failure never
clears DNS verification — only a domain change does.

### Key code

| Area | Path |
|------|------|
| Helpers + public URL builder + phase types | `src/features/institutions/lib/custom-domain.ts` |
| 60s in-process cache | `src/features/institutions/lib/custom-domain-cache.ts` |
| Repository + invalidate | `src/features/institutions/repositories/institution.repository.ts` |
| DNS verify | `src/features/institutions/services/custom-domain-verify.service.ts` |
| Vercel Domains API client | `src/features/institutions/services/vercel-domains.service.ts` |
| Attach + probe + status orchestration | `src/features/institutions/services/custom-domain-provisioning.service.ts` |
| Host rewrite / redirect | `src/proxy.ts` |
| Save domain API | `PUT /api/v1/profile/institution/custom-domain` |
| Verify API | `POST /api/v1/profile/institution/custom-domain/verify` |
| Status API | `GET /api/v1/profile/institution/custom-domain/status` |
| Festival Live UI | `src/app/dashboard/[slug]/settings/_components/FestivalLiveClient.tsx` |
| Feature flag | `features.customDomain` in `src/config/pricing.ts` |

`src/proxy.ts` imports the institution repository, so that repository must stay
free of network side effects. Vercel calls live in the services above and are
invoked from route handlers only — this is why `updateInstitutionCustomDomain`
returns `previousDomain` for the route to detach rather than detaching itself.

### Proxy behavior (important)

- Host routing runs for page navigations (matcher covers app routes).
- **CSRF / CSP security headers apply only to `/api/*`** — not to HTML documents. Applying strict CSP to all pages previously returned **200 with a blank/broken UI**.
- Canonical path→branded redirect is gated by `ENABLE_CUSTOM_DOMAIN_CANONICAL_REDIRECT=true` + production + non-localhost, **and** by `institution.httpsReadyAt` in `findBrandedRedirectTarget`.

---

## 9. Phase 2 — shipped

**Goal (met):** Remove the manual Vercel attach step so institution owners get
working HTTPS after DNS verify without asking Greenroom ops.

### Phase machine

`CustomDomainPhase` in `src/features/institutions/lib/custom-domain.ts`:

| Phase | Meaning | UI |
|-------|---------|-----|
| `no-domain` | No apex saved | “Not configured” |
| `awaiting-dns` | Apex saved, `verifiedAt` null | “Awaiting DNS verification” + records |
| `provisioning` | DNS verified, wildcard attached on Vercel, certificate not serving yet | “Provisioning HTTPS…”, polls |
| `manual-attach` | DNS verified but no Vercel credentials — ops must attach | “DNS verified — awaiting HTTPS”, polls |
| `https-ready` | TLS handshake succeeded; `httpsReadyAt` set | “HTTPS ready”, branded links appear |
| `error` | Institution missing / unrecoverable | “Needs attention” + detail |

`isCustomDomainPhasePending` marks the two phases worth polling.

### Why an HTTPS probe, not the Vercel API

Vercel can report a domain as `verified` with `misconfigured: false` while the
certificate is still being issued, and manual-attach deployments have no API to
query at all. A successful TLS handshake against `https://_gr-tls-probe.{domain}/`
means the same thing in both modes and is exactly what a visitor's browser does.
Any HTTP response — including our own 404 for that non-slug label — proves the
handshake; only transport/TLS failures count as not-ready.

### Flow

```text
Save domain
  → phase awaiting-dns, DNS records shown
  → (domain changed?) detachWildcard(previousDomain), verifiedAt cleared, cache invalidated
Verify DNS
  → TXT + CNAME checked
  → markInstitutionDomainVerified
  → ensureWildcardAttached  → POST *.{domain} to Vercel (409 = already attached)
  → syncCustomDomainStatus  → probe → stamp httpsReadyAt
  → phase provisioning | manual-attach | https-ready
GET .../custom-domain/status  (polled every 15s while pending)
  → same probe + reconcile → phase https-ready
```

### Guarantees

- **Idempotent.** Re-verify and re-attach are safe; a 409 from Vercel is read back as the existing record.
- **Attach failure never rolls back DNS verification.** It surfaces as `status.detail` and the owner can retry.
- **Self-healing both ways.** The probe sets `httpsReadyAt` when the certificate starts serving and clears it if the certificate stops, so branded URLs stop being advertised rather than 404ing visitors.
- **No network in the proxy path.** Probing and Vercel calls happen in route handlers, never in `src/proxy.ts`'s import graph.
- **Bounded.** Vercel calls time out at 10s, the probe at 8s; `checkAttachStatus` never throws, so an outage degrades to “can't tell yet”.

### Out of scope (unchanged)

- Per-institution slug uniqueness (slugs stay globally unique)
- Institution-level tier column
- Enabling `customDomain` for STANDARD (gate remains PRO / `features.customDomain`)
- Auto-enabling `ENABLE_CUSTOM_DOMAIN_CANONICAL_REDIRECT` — still a deliberate ops switch

### Tests

| File | Covers |
|------|--------|
| `src/features/institutions/lib/custom-domain.test.ts` | URL builder gating on `httpsReadyAt`, phase-pending helper, host parsing, cache |
| `src/features/institutions/services/custom-domain-provisioning.service.test.ts` | Probe semantics, attach/detach failure handling, every `syncCustomDomainStatus` phase, `httpsReadyAt` set/clear |

---

## 10. Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | App origin for redirects, emails, dashboard bounce from custom hosts. Prod: `https://greenroomm.vercel.app` |
| `ENABLE_CUSTOM_DOMAIN_CANONICAL_REDIRECT` | Set `true` only in production after wildcard HTTPS works. Redirects `/{slug}/…` → branded host. |
| `VERCEL_URL` | Auto-included in app-host allowlist on Vercel deployments |
| `VERCEL_TOKEN` | Domains API token, scoped to the team. Required for automated attach. |
| `VERCEL_PROJECT_ID` | Target project (`prj_…`). Required for automated attach. |
| `VERCEL_TEAM_ID` | Team (`team_…`). Required for automated attach. |

All three Vercel vars must be present together. With any missing, the app stays
on the manual-attach path and reports `manual-attach` rather than erroring.

---

## 11. Local smoke (Windows)

Linux/macOS `curl`/`hosts` examples work too; below is Windows-first.

### 11.1 Hosts file

1. Open **Notepad as Administrator**.
2. Open: `C:\Windows\System32\drivers\etc\hosts`
3. Add (example):

```text
127.0.0.1 suffamehil.ahlussuffa.test
```

4. Save. Flush DNS if needed (Admin PowerShell):

```powershell
ipconfig /flushdns
```

### 11.2 Seed / DB

For a **PRO** institutional festival:

- Set `institution.customDomain` (e.g. `ahlussuffa.test`)
- Set `institution.verifiedAt` to now
- Set `institution.httpsReadyAt` to now — the proxy does not need it, but
  `getPublicFestivalBaseUrl` and the branded redirect do, so leaving it null is
  the right way to test the “still on path URLs” half of the feature
- Optionally `festival.publicSiteEnabled = true`

Do **not** expect the status route to reach `https-ready` locally: the probe
requires a real certificate on a public host, and `*.ahlussuffa.test` has none.
Locally the phase settles on `manual-attach` (no Vercel env) — which is itself
worth confirming, since it is the same code path a credential-less production
deployment takes.

### 11.3 Run app + probe (PowerShell)

```powershell
pnpm dev
```

```powershell
# Public rewrite on custom host (expect 200 when seeded)
Invoke-WebRequest -Uri http://127.0.0.1:3000/ `
  -Headers @{ Host = "suffamehil.ahlussuffa.test" } `
  -UseBasicParsing | Select-Object StatusCode

# Dashboard on custom host → redirect to app base
try {
  Invoke-WebRequest -Uri http://127.0.0.1:3000/dashboard/suffamehil `
    -Headers @{ Host = "suffamehil.ahlussuffa.test" } `
    -MaximumRedirection 0 -UseBasicParsing -ErrorAction Stop
} catch {
  [int]$_.Exception.Response.StatusCode
  $_.Exception.Response.Headers.Location
}
# Expect 307/302 and Location → http://localhost:3000/dashboard/suffamehil
```

Or browse: `http://suffamehil.ahlussuffa.test:3000/`

### 11.4 Confirm document CSP is not blanking the UI

```powershell
$r = Invoke-WebRequest http://127.0.0.1:3000/login -UseBasicParsing
"status=$($r.StatusCode) hasDocumentCsp=$([bool]$r.Headers['Content-Security-Policy'])"
# Pages should have NO Content-Security-Policy header.
# API routes still may set CSP — that is expected.
```

---

## 12. Confirm develop / prod checklist

### Greenroom side (`greenroomm.vercel.app`)

- [ ] App loads on production app host  
- [ ] Migration applied; PRO shows Custom subdomain in Launch Website  
- [ ] Owner can Save → sees TXT + CNAME instructions  
- [ ] After DNS: Verify succeeds  
- [ ] **Phase 1:** Ops adds `*.domain` in Vercel → cert Valid  
- [ ] **Phase 2 (when built):** UI reaches “HTTPS ready” without ops  
- [ ] Branded HTTPS: public / login / stage-portal work  
- [ ] Dashboard on branded host redirects to app host  
- [ ] Canonical redirect env still **off** until HTTPS proven  

### Owner side

- [ ] PRO institutional festival  
- [ ] Apex saved (no `www`)  
- [ ] TXT + `*` CNAME published  
- [ ] Verify DNS green  
- [ ] After HTTPS: share branded links; Launch if needed  

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| HTML 200 but UI blank / nothing interactive | Document CSP applied via proxy to all routes | CSP must stay **API-only** (`src/proxy.ts`) |
| Verify fails on TXT | Wrong name/value or DNS not propagated | Match UI exactly; wait TTL; `nslookup -type=TXT _greenroom.apex` |
| Verify fails on CNAME | `*` not pointing at `cname.vercel-dns.com` | Fix wildcard CNAME |
| Verified but browser TLS error on branded host | Domain not on Vercel project (Phase 1 gap) | Ops attach `*.domain`; Phase 2 automates this |
| Path URL suddenly leaves Greenroom | Canonical redirect enabled before TLS ready | Unset `ENABLE_CUSTOM_DOMAIN_CANONICAL_REDIRECT` |
| Custom Host → 404 | Unverified, wrong apex, or non-PRO on branded host | Verify DNS; confirm PRO; confirm slug belongs under that institution’s domain |
| Apex / www → 404 | By design | Festival hosts are `{slug}.{apex}` only |
| Changed domain; old host still works briefly | 60s cache | Wait or restart server instances; invalidate on save already |

---

## 14. Setup chain summary

| Actor | Phase 1 | Phase 2 |
|-------|---------|---------|
| Greenroom developer | Code shipped; maintain proxy/DNS verify | Build Vercel Domains + TLS UX |
| Institution owner | Save → DNS → Verify → Launch | Same; no ops wait for HTTPS |
| Greenroom ops | **Manual** Vercel domain + TLS per customer | Token health / monitoring only |
| End users | Branded URLs after HTTPS ready | Same |

---

## 15. Related files / docs

- Plan: [`DOCS/custom_domain_wildcard_dns_2e9fc0b6.plan.md`](../custom_domain_wildcard_dns_2e9fc0b6.plan.md)
- Proxy: `src/proxy.ts`
- Helpers: `src/features/institutions/lib/custom-domain.ts`
- Verify service: `src/features/institutions/services/custom-domain-verify.service.ts`
- UI (main): `FestivalLiveClient.tsx`, `SettingsTabs.tsx`, settings `page.tsx`
- Overview: `OverviewWidgets.tsx`, `FestSetupWidget.tsx`, `LiveLinksCard.tsx`, `LaunchFestivalDrawer.tsx`
