export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  festivals: {
    all: ["festivals"] as const,
    detail: (id: string) => ["festivals", id] as const,
  },
  participants: {
    all: (festivalId: string) => ["participants", festivalId] as const,
    detail: (festivalId: string, participantId: string) =>
      ["participants", festivalId, participantId] as const,
    paginated: (festivalId: string, params: unknown) =>
      ["participants", festivalId, "paginated", params] as const,
  },
  groups: {
    all: (festivalId: string) => ["groups", festivalId] as const,
  },
  categories: {
    all: (festivalId: string) => ["categories", festivalId] as const,
  },
  programmes: {
    all: (festivalId: string, categoryId?: string) =>
      ["programmes", festivalId, categoryId] as const,
    detail: (festivalId: string, programmeId: string) =>
      ["programmes", festivalId, programmeId] as const,
    paginated: (festivalId: string, params: unknown) =>
      ["programmes", festivalId, "paginated", params] as const,
  },
  assignments: {
    all: (festivalId: string) => ["assignments", festivalId] as const,
    paginated: (festivalId: string, params: unknown) =>
      ["assignments", festivalId, "paginated", params] as const,
  },
  judges: {
    all: (festivalId: string) => ["judges", festivalId] as const,
    paginated: (festivalId: string, params: unknown) =>
      ["judges", festivalId, "paginated", params] as const,
  },
  members: {
    all: (festivalId: string) => ["members", festivalId] as const,
    paginated: (festivalId: string, params: unknown) =>
      ["members", festivalId, "paginated", params] as const,
  },
  stages: {
    all: (festivalId: string) => ["stages", festivalId] as const,
  },
  stageAssignments: {
    all: (festivalId: string) => ["stage-assignments", festivalId] as const,
  },
  judgeStageAssignments: {
    all: (festivalId: string) =>
      ["judge-stage-assignments", festivalId] as const,
  },
  schedule: {
    all: (festivalId: string, typeFilter?: string) =>
      ["schedule", festivalId, typeFilter] as const,
    paginated: (festivalId: string, params: unknown) =>
      ["schedule", festivalId, "paginated", params] as const,
  },
  results: {
    all: (festivalId: string, programmeId?: string) =>
      ["results", festivalId, programmeId] as const,
    paginated: (festivalId: string, params: unknown) =>
      ["results", festivalId, "paginated", params] as const,
  },
  judgement: {
    dashboard: (festivalId: string) =>
      ["judgement", "dashboard", festivalId] as const,
  },
  notifications: {
    all: (participantId: string) => ["notifications", participantId] as const,
  },
  payments: {
    all: ["payments"] as const,
    status: ["payments", "status"] as const,
    history: ["payments", "history"] as const,
  },
  billing: {
    unusedCredit: ["billing", "unusedCredit"] as const,
  },
  media: {
    all: (festivalId: string) => ["media", festivalId] as const,
    videos: (festivalId: string) => ["media", "videos", festivalId] as const,
    paginated: (festivalId: string, params: unknown) =>
      ["media", festivalId, "paginated", params] as const,
  },
  news: {
    all: (festivalId: string) => ["news", festivalId] as const,
    paginated: (festivalId: string, params: unknown) =>
      ["news", festivalId, "paginated", params] as const,
  },
  exports: {
    all: (festivalId: string) => ["exports", festivalId] as const,
  },
  profile: {
    all: ["profile"] as const,
  },
  myFestival: {
    all: ["my-festival"] as const,
    joined: ["my-festival", "joined"] as const,
  },
  teamLeader: {
    festivals: ["team-leader", "festivals"] as const,
    dashboard: ["team-leader", "dashboard"] as const,
    participants: ["team-leader", "participants"] as const,
  },
  superAdmin: {
    analytics: ["super-admin", "analytics"] as const,
    payments: ["super-admin", "payments"] as const,
  },
  participantLogin: {
    session: ["participant-login", "session"] as const,
  },
} as const;
