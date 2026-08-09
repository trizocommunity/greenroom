# Greenroom Context

Language for the Greenroom festival-management platform. These terms name concepts that appear in business rules, user-facing copy, and module interfaces.

## Language

**Festival**:
A multi-tenant event instance owned by a paying customer. Contains programmes, participants, stages, results, and configuration.
_Avoid_: Event (too generic), tenant.

**Programme**:
A competitive or ceremonial event within a festival. Has a category, type (individual or group), stage assignment, and a lifecycle from draft to published.
_Avoid_: Event (reserved for public calendar entries), competition.

**Participant**:
A competitor or attendee registered in a festival. Belongs to a group and a category, and may have a public profile and chest number.
_Avoid_: Contestant, user.

**Stage Portal**:
The credential-based scoring interface used by on-stage judges and announcers.
_Avoid_: Judge app, scoring portal.

**Tier**:
A subscription level (BASIC, STANDARD, PRO) that controls feature availability and resource limits for a festival.
_Avoid_: Plan (use in pricing copy only), subscription.

**Feature Gate**:
The single seam through which the codebase asks whether a festival’s tier (and any Super Admin overrides) enables a given capability.
_Avoid_: Feature flag (too broad), FeatureService.

**Effective Features**:
The merged view of a tier’s configured features and any Super Admin overrides stored in system configuration.
_Avoid_: Feature matrix, override map.

**Custom Domain**:
An institution apex hostname (e.g. `ahlussuffa.in`) whose wildcard subdomains serve festival public surfaces as `{festivalSlug}.{customDomain}`. Gated by plan feature `customDomain` (PRO). Requires DNS verify (`verifiedAt`); HTTPS attachment on Vercel is Phase 2 automation.
_Avoid_: Custom URL (that is the Greenroom path `/{slug}` / slug branding), subdomain alone without the institution apex.

