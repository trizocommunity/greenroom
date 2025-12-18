export interface JoinedFestival {
  id: string;
  name: string;
  role: "JUDGE" | "PARTICIPANT" | "ADMIN" | "TEAM-LEADER" | "STAGE-MANAGER";
  startDate: Date;
  location: string;
}
