/**
 * Typed Redis key builder. Every key in the platform routes through this
 * module so the `greenroom:` prefix and key shape stay consistent.
 *
 * Key inventory is owned by ISSUE-44 (foundation). Additions go here when a
 * new use case from ISSUE-45 / ISSUE-46 needs them.
 */

const PREFIX = "greenroom";

function key(...segments: Array<string | number>): string {
  return [PREFIX, ...segments].join(":");
}

export const keys = {
  // ── Rate limiting ──────────────────────────────────────────────────
  /** `greenroom:ratelimit:<sha1(ip)[:16]>` */
  rateLimit(hashedIp: string): string {
    return key("ratelimit", hashedIp);
  },

  // ── Feature Gate ───────────────────────────────────────────────────
  /** `greenroom:featuregate:<festivalId>` */
  featureGate(festivalId: string): string {
    return key("featuregate", festivalId);
  },
  /** `greenroom:featuregate:tier:<tier>` — merged override map for a tier */
  featureGateTier(tier: string): string {
    return key("featuregate", "tier", tier);
  },
  /** `greenroom:featuregate:all` — global override snapshot */
  featureGateAll(): string {
    return key("featuregate", "all");
  },

  // ── Custom Domain ──────────────────────────────────────────────────
  /** `greenroom:domain:<host>` */
  domainHost(host: string): string {
    return key("domain", host.toLowerCase());
  },

  // ── Slug → festivalId ──────────────────────────────────────────────
  /** `greenroom:slug:<slug>` */
  slugFestival(slug: string): string {
    return key("slug", slug);
  },

  // ── Festival public profile + counters ─────────────────────────────
  /** `greenroom:festival:<festivalId>:profile` */
  festivalProfile(festivalId: string): string {
    return key("festival", festivalId, "profile");
  },

  // ── Public lists ───────────────────────────────────────────────────
  /** `greenroom:festival:<festivalId>:programmes` */
  programmeList(festivalId: string): string {
    return key("festival", festivalId, "programmes");
  },
  /** `greenroom:festival:<festivalId>:schedule` */
  schedule(festivalId: string): string {
    return key("festival", festivalId, "schedule");
  },
  /** `greenroom:festival:<festivalId>:media` */
  mediaList(festivalId: string): string {
    return key("festival", festivalId, "media");
  },
  /** `greenroom:festival:<festivalId>:news` */
  newsList(festivalId: string): string {
    return key("festival", festivalId, "news");
  },

  // ── Leaderboards (ZSETs) ───────────────────────────────────────────
  /** `greenroom:lb:top:<festivalId>` — top-scorers participants */
  leaderboardTop(festivalId: string): string {
    return key("lb", "top", festivalId);
  },
  /** `greenroom:lb:team:<festivalId>` — top-scorers teams */
  leaderboardTeam(festivalId: string): string {
    return key("lb", "team", festivalId);
  },
  /** `greenroom:lb:cat:<categoryId>:<festivalId>` — per-category */
  leaderboardCategory(categoryId: string, festivalId: string): string {
    return key("lb", "cat", categoryId, festivalId);
  },

  // ── Announcer ──────────────────────────────────────────────────────
  /** `greenroom:announcer:<festivalId>:queue` */
  announcerQueue(festivalId: string): string {
    return key("announcer", festivalId, "queue");
  },

  // ── Festival countdown ─────────────────────────────────────────────
  /** `greenroom:countdown:<festivalId>` */
  trialCountdown(festivalId: string): string {
    return key("countdown", festivalId);
  },

  // ── Plan feature flag snapshot ─────────────────────────────────────
  /** `greenroom:planflag:<festivalId>` — hash of feature booleans */
  planFlagSnapshot(festivalId: string): string {
    return key("planflag", festivalId);
  },

  // ── QR code replay protection ──────────────────────────────────────
  /** `greenroom:qr:<participantId>:<token>` */
  qrToken(participantId: string, token: string): string {
    return key("qr", participantId, token);
  },

  // ── OTP / PIN throttles ────────────────────────────────────────────
  /** `greenroom:otp:<userId>:<type>` */
  otpThrottle(userId: string, type: string): string {
    return key("otp", userId, type);
  },
  /** `greenroom:otp:participant:<participantId>` */
  participantOtp(participantId: string): string {
    return key("otp", "participant", participantId);
  },
  /** `greenroom:stagepin:<stageId>` */
  stagePortalPin(stageId: string): string {
    return key("stagepin", stageId);
  },

  // ── 2FA backup codes ───────────────────────────────────────────────
  /** `greenroom:2fa-backup:<userId>` */
  twoFactorBackup(userId: string): string {
    return key("2fa-backup", userId);
  },

  // ── Food Hall ──────────────────────────────────────────────────────
  /** `greenroom:foodhall:<slotId>:session` */
  foodHallSession(slotId: string): string {
    return key("foodhall", slotId, "session");
  },
  /** `greenroom:foodhall:<slotId>:scanned` — INCR counter */
  foodHallScanned(slotId: string): string {
    return key("foodhall", slotId, "scanned");
  },

  // ── Audit dedup ────────────────────────────────────────────────────
  /** `greenroom:audit:<actorId>:<action>` */
  auditDedup(actorId: string, action: string): string {
    return key("audit", actorId, action);
  },

  // ── Email preferences ──────────────────────────────────────────────
  /** `greenroom:emailprefs:<userId>` */
  emailPrefs(userId: string): string {
    return key("emailprefs", userId);
  },

  // ── Pricing / marketing ────────────────────────────────────────────
  /** `greenroom:pricing:matrix` */
  pricingMatrix(): string {
    return key("pricing", "matrix");
  },

  // ── Edit locks ─────────────────────────────────────────────────────
  /** `greenroom:lock:<entityType>:<entityId>` */
  editLock(entityType: string, entityId: string): string {
    return key("lock", entityType, entityId);
  },

  // ── Judge scoring dedup ────────────────────────────────────────────
  /** `greenroom:judge-score:<judgeId>:<codeLetterId>` */
  judgeScoreDedup(judgeId: string, codeLetterId: string): string {
    return key("judge-score", judgeId, codeLetterId);
  },

  // ── Cloudinary upload signatures ───────────────────────────────────
  /** `greenroom:cloudinary-sig:<userId>` */
  cloudinarySig(userId: string): string {
    return key("cloudinary-sig", userId);
  },
} as const;

export type Keys = typeof keys;
