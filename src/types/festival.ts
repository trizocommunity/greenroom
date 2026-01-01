export interface JoinedFestival {
  id: string;
  name: string;
  role:
    | "JUDGE"
    | "ADMIN"
    | "TEAM-LEADER"
    | "STAGE-MANAGER"
    | "ANNOUNCER"
    | "OWNER";
  startDate: Date;
  location: string;
}
