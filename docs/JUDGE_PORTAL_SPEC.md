# Judge Portal — New Judgment Method (Design Spec)

> **Status:** Draft — design only, no implementation yet
> **Version:** 0.1
> **Last Updated:** July 2026
> **Replaces:** External judgment flow (link + PIN) described in `judgment.actions.ts`. Legacy BASIC-tier marks/timer flow is untouched by this doc.

---

## Table of Contents

1. [Problem with the current flow](#1-problem-with-the-current-flow)
2. [New method — overview](#2-new-method--overview)
3. [Roles](#3-roles)
4. [End-to-end flow](#4-end-to-end-flow)
5. [Screen-by-screen](#5-screen-by-screen)
6. [Programme judging session — lifecycle](#6-programme-judging-session--lifecycle)
7. [Judge assignment model](#7-judge-assignment-model)
8. [What replaces what](#8-what-replaces-what)
9. [Open questions](#9-open-questions)

---

## 1. Problem with the current flow

Today, judging a programme externally requires:

- Admin manually creates a `judgment_config`, generates a token + PIN per programme.
- Admin copies/shares the link and PIN (e.g. via WhatsApp) to each judge.
- Judge opens a one-off link, enters PIN, gets a JWT cookie bound to that link.
- Link expires on a timer or once all judges finish.

This is manual, one-off per programme, and has nothing to do with what's actually happening live on stage — a judge can open a link for a programme that hasn't started yet, or after it's over.

## 2. New method — overview

Replace "generate link + PIN per programme" with a **stage-owned Judge Portal** that mirrors what's happening live on stage:

- One portal login per **stage** (created when the stage is set up), not per judge and not per programme.
- Stage Manager starts a programme → at that moment, and only then, the programme becomes judgeable.
- Stage Manager picks which judge(s) score that specific programme, at start time — not a fixed roster.
- Judges use the shared stage portal, claim their name, score, submit. No links, no PINs, no sharing.

## 3. Roles

| Role | Does what here |
|------|-----------------|
| **Stage Manager** | Owns the stage portal credential. Starts/restarts programmes. Picks judges per programme. |
| **Admin** | Can also restart a programme for rejudge (same rights as Stage Manager here). |
| **Judge** | Logs into the shared stage portal, claims their name when picked for a live programme, scores, submits. |

## 4. End-to-end flow

1. **Stage setup** — When a stage is created, a portal credential is generated for that stage (owned/reset by Stage Manager or Admin).
2. **Stage Manager starts a programme** — Opens "Start Judgment" on a programme. A dialog opens to search and select judge(s) for this specific programme, or quick-create a judge on the spot if they're not in the system yet (e.g. a substitute). Dialog pre-fills with the last-used judges for that stage to avoid re-picking every time.
3. **Programme goes live** — The programme becomes the single active card in the stage portal, visible only to the judge(s) picked in step 2.
4. **Judge claims and scores** — Judge opens the stage portal (already logged in), sees the live programme with their name attached, taps it to open the existing scoring panel (marks entry, review, submit — unchanged from today's judging UI).
5. **Submit** — Judge reviews and submits. Programme drops out of the live queue. It moves into the portal's history list (done, by whom, when).
6. **Publish or rejudge** — If results aren't published yet, Stage Manager/Admin can restart the programme (back to step 2, judges re-picked or reused) for a rejudge. Once published, it can no longer be restarted.

## 5. Screen-by-screen

### Stage Portal (judge-facing)
- **Top bar**: stage name/selector (if a judge's credential ever spans more than one stage), Stage Manager name + contact CTA.
- **Live card** (0 or 1 at a time): current programme, code/title, judges attached, "Enter Scores" action for the judge whose name is on it.
- **History panel**: completed programmes for the day — programme, judge(s), submitted time, status. Read-only.
- **Empty state**: "No live programme right now" when Stage Manager hasn't started one.

### Start Judgment dialog (Stage Manager-facing)
- Search box over the festival's judge list, filtered to the stage's usual judges by default.
- Multi-select for panel judging (more than one judge scoring the same programme).
- "+ Add new judge" inline — name only, minimal fields; full profile completed later in the normal Judges CRUD screen.
- Pre-filled with the previous programme's judge selection on that stage; one-tap confirm if unchanged.

### Scoring panel
- Unchanged — reuses the existing marks entry / review / submit UI used in today's external judge flow.

## 6. Programme judging session — lifecycle

```
not_started ──(Start Judgment + pick judges)──> live ──(submit)──> submitted ──(publish)──> published
     ^                                                                  │
     └──────────────────(Stage Manager/Admin restarts, pre-publish)─────┘
```

- **not_started** — default state, nothing to see in the portal.
- **live** — exactly one programme per stage can be live at a time; only visible to the judges picked for it.
- **submitted** — scores in, programme leaves the live slot, appears in history.
- **published** — terminal; can't be restarted. Rejudge no longer possible past this point.
- **restarted** — Stage Manager/Admin sends a submitted (unpublished) programme back to live, optionally re-picking judges.

## 7. Judge assignment model

Two layers, not one:

- **Stage-level pool** (loose) — the general list of judges who usually work a stage. Used only to pre-fill the Start Judgment dialog; not an enforced restriction.
- **Programme-level assignment** (binding) — decided at Start Judgment time, per programme. This is what actually controls who can see and score that live programme.

This replaces `judge_stage_assignment` as a hard rule with a soft default — it speeds up the common case (same panel all day) without blocking substitutions or guest judges.

## 8. What replaces what

| Today | New method |
|---|---|
| `judgment_link` (token + PIN + expiry per programme) | Stage-owned portal credential, created once per stage |
| Admin manually generates link/PIN and shares it | Stage Manager starts the programme; judges are already in the portal |
| Judge identity from JWT bound to link/device hash | Judge claims their name from the dialog-selected list for that live programme |
| `programme_judge_session` (mostly unused today) | Becomes the real backing model for the live/submitted/published lifecycle above |
| Link deactivates on completion or timer | Programme leaves the live slot on submit; restart is an explicit Stage Manager/Admin action |

Untouched: scoring panel UI, `judgment_score` table, scoring-policy/grading logic, results/leaderboard pipeline.

## 9. Open questions

- Does the stage portal credential ever need to be reset/rotated mid-event (e.g. device lost)? Who can do that — Stage Manager only, or Admin too?
- For panel judging (multiple judges on one programme), does "submitted" require all picked judges to finish, or does each judge submit independently and the programme closes when the last one is done?
- Should the quick-created judge (from the Start Judgment dialog) be scoped to that stage only until an Admin completes their profile, or immediately available festival-wide?
- Any limit on how far back "rejudge" can reach — e.g. can a programme be restarted the next day, or only same-day/pre-publish?
