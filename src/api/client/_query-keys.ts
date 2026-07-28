export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  festivals: {
    all: ["festivals"] as const,
    detail: (id: string) => ["festivals", id] as const,
  },
  students: {
    all: (festivalId: string) => ["students", festivalId] as const,
    detail: (festivalId: string, studentId: string) =>
      ["students", festivalId, studentId] as const,
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
  },
  assignments: {
    all: (festivalId: string) => ["assignments", festivalId] as const,
  },
  judges: {
    all: (festivalId: string) => ["judges", festivalId] as const,
  },
  members: {
    all: (festivalId: string) => ["members", festivalId] as const,
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
  },
  results: {
    all: (festivalId: string, programmeId?: string) =>
      ["results", festivalId, programmeId] as const,
  },
  judgment: {
    dashboard: (festivalId: string) =>
      ["judgment", "dashboard", festivalId] as const,
  },
  notifications: {
    all: (studentId: string) => ["notifications", studentId] as const,
  },
  payments: {
    all: ["payments"] as const,
    status: ["payments", "status"] as const,
    history: ["payments", "history"] as const,
  },
  billing: {
    unusedCredit: ["billing", "unusedCredit"] as const,
  },
  gallery: {
    all: (festivalId: string) => ["gallery", festivalId] as const,
  },
  news: {
    all: (festivalId: string) => ["news", festivalId] as const,
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
    students: ["team-leader", "students"] as const,
  },
  superAdmin: {
    analytics: ["super-admin", "analytics"] as const,
    payments: ["super-admin", "payments"] as const,
  },
  participantLogin: {
    session: ["participant-login", "session"] as const,
  },
} as const;
