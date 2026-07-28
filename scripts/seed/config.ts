import { TIER_CONFIG } from "../../src/config/pricing";

export const SUPER_ADMIN_EMAIL = "trizocommunity@gmail.com";
export const SUPER_ADMIN_NAME = "TRIZO Community Admin";

export const FESTIVAL_OWNER_EMAIL = "Ahlussuffa.igs@gmail.com";
export const FESTIVAL_OWNER_NAME = "Ahlussuffa";

export const INSTITUTION = {
  name: "Ahlussuffa Integrated Graduate Studies",
  type: "DARS" as const,
  affiliation: "Jami'athul Hind Al Islamiya",
  city: "Kannur",
  sizeRange: "100-500",
};

export const FESTIVAL = {
  slug: "suffamehfil",
  name: "SUFFA MEHFIL 2026",
  category: "Inter-Collegiate Islamic Arts Fest",
  description: "Annual Pro Tier Arts & Literary Festival by Ahlussuffa IGS.",
  orgName: "Ahlussuffa",
  orgLocation: "Kozhikode, Kerala",
  tier: "PRO" as const,
  tierLabel: "Pro",
  status: "READY" as const,
  scoringSystem: "SCORE_BASED" as const,
  startDate: "2026-08-15T09:00:00.000Z",
  endDate: "2026-08-18T21:30:00.000Z",
  chestNumberSettings: {
    autoGenerate: true,
    prefix: "AHL-",
    padding: 3,
  },
  payment: { amount: 6000, currency: "INR" },
};

export const FESTIVAL_DAYS = [
  "2026-08-15",
  "2026-08-16",
  "2026-08-17",
  "2026-08-18",
];

export const FESTIVAL_MEMBERS: Array<{
  email: string;
  name: string;
  role: "ADMIN" | "ANNOUNCER" | "STAGE_MANAGER" | "MEDIA";
}> = [];

export const CATEGORIES = [
  {
    name: "GENERAL",
    type: "GENERAL" as const,
    description: "Open to all age groups",
  },
  {
    name: "JUNIOR",
    type: "SINGLE" as const,
    description: "Junior Category Under 15",
  },
  {
    name: "SENIOR",
    type: "SINGLE" as const,
    description: "Senior Category 15 to 19",
  },
];

export const GROUPS = [
  { name: "Al-Qurtuba Cordoba", color: "#2563eb", start: 100 },
  { name: "Al-Andalus Andalusia", color: "#10b981", start: 200 },
];

export const STAGES = [
  { name: "Al-Azhar Grand Hall", description: "Primary Main Stage" },
  {
    name: "Imam Ghazali Conference Hall",
    description: "Literary & Debate Stage",
  },
  { name: "Ibn Khaldun Open Arena", description: "Outdoor Cultural Stage" },
];

export const ISLAMIC_MALE_NAMES = [
  "Muhammad Bilal",
  "Ahmad Zaki",
  "Omar Tariq",
  "Hamza Kareem",
  "Yusuf Rayan",
  "Abdullah Farhan",
  "Hassan Ali",
  "Zaid Ibrahim",
  "Imran Farooq",
  "Usman Raza",
  "Ibrahim Khalil",
  "Salman Farsi",
  "Talha Zubair",
  "Anas Malik",
  "Faysal Rashid",
  "Tariq Aziz",
  "Zubair Ahmad",
  "Haris Mahmood",
  "Saad Waqar",
  "Rayyan Kabir",
  "Daniyal Hameed",
  "Idris Mansoor",
  "Nuh Sulaiman",
  "Qasim Junaid",
  "Luqman Hakim",
  "Dawud Kareem",
  "Yahya Latif",
  "Eesa Rauf",
  "Ayub Shakir",
  "Zakir Waseem",
  "Sufyan Nabeel",
  "Amir Sohail",
];

export const ISLAMIC_FEMALE_NAMES = [
  "Zainab Fatima",
  "Ayesha Mariam",
  "Khadija Noor",
  "Maryam Huda",
  "Safiya Hafsa",
  "Ruqayyah Asma",
  "Sumayyah Haniya",
  "Fatima Zahra",
  "Kulthum Amina",
  "Halima Sadia",
  "Nafisa Shirin",
  "Raihana Salsabil",
  "Juwayriya Bushra",
  "Samira Lubna",
  "Nouran Tasneem",
  "Maymuna Salma",
  "Inaya Zooni",
  "Hania Mahnoor",
  "Rida Emaan",
  "Sana Batool",
  "Madiha Kiran",
  "Nida Faryal",
  "Zara Mehwish",
  "Sidra Tuba",
  "Aleena Quratulain",
  "Rabia Fareeha",
  "Uzma Shahida",
  "Laila Shazia",
  "Farah Naheed",
  "Shaista Anjum",
  "Amna Jawaria",
  "Tehmina Gul",
];

export const STUDENTS_PER_CATEGORY_PER_GROUP = 8;
export const TEAM_LEADERS_PER_GROUP = 2;

export const JUDGES = [
  "Sheikh Abdullah Al-Makki",
  "Dr. Ibrahim K. M.",
  "Ustadh Tariq Jameel",
  "Qari Abdul Basit",
  "Prof. Muhammad Shafi",
  "Hafiz Umar Farooq",
  "Dr. Zainab Abdurrahman",
  "Ustadh Hamza Yusuf",
  "Qari Shakir Qasmi",
  "Dr. Ahmad al-Hadi",
  "Ustadh Bilal Phillips",
];

export const SESSIONS = [
  {
    title: "Inaugural Ceremony & Opening Remarks",
    sessionType: "CEREMONY" as const,
    description: "Official opening ceremony of the festival",
    startTime: "2026-08-15T14:00:00.000Z",
    endTime: "2026-08-15T15:00:00.000Z",
    stageIdx: 0,
  },
  {
    title: "Islamic Heritage & Arts Symposium",
    sessionType: "TALK" as const,
    description: "Keynote symposium on classical calligraphy & literature",
    startTime: "2026-08-15T17:30:00.000Z",
    endTime: "2026-08-15T18:45:00.000Z",
    stageIdx: 0,
  },
  {
    title: "Qur'an & Modern Science Forum",
    sessionType: "GENERAL" as const,
    description: "Interactive evening forum with scholars",
    startTime: "2026-08-15T19:30:00.000Z",
    endTime: "2026-08-15T20:30:00.000Z",
    stageIdx: 1,
  },
  {
    title: "Grand Nasheed & Spiritual Evening",
    sessionType: "CONCERT" as const,
    description: "Afternoon spiritual gathering featuring choir performances",
    startTime: "2026-08-16T14:00:00.000Z",
    endTime: "2026-08-16T15:15:00.000Z",
    stageIdx: 0,
  },
  {
    title: "Islamic Calligraphy & Literary Colloquium",
    sessionType: "TALK" as const,
    description: "Evening scholarly colloquium on Islamic arts",
    startTime: "2026-08-16T17:30:00.000Z",
    endTime: "2026-08-16T18:30:00.000Z",
    stageIdx: 1,
  },
  {
    title: "Valedictory & Grand Award Ceremony",
    sessionType: "CEREMONY" as const,
    description: "Closing speech and distribution of prizes",
    startTime: "2026-08-16T19:00:00.000Z",
    endTime: "2026-08-16T20:30:00.000Z",
    stageIdx: 0,
  },
];

export type ProgrammeTemplate = {
  name: string;
  type: "INDIVIDUAL" | "GROUP";
  stageType: "STAGE" | "NON_STAGE";
  maxParticipantsPerGroup: number;
  maxTeamsPerGroup: number;
  maxStudentsPerTeam: number;
  durationMins: number;
};

export const PROGRAMME_TEMPLATES: ProgrammeTemplate[] = [
  {
    name: "Qira'at",
    type: "INDIVIDUAL",
    stageType: "STAGE",
    maxParticipantsPerGroup: 3,
    maxTeamsPerGroup: 1,
    maxStudentsPerTeam: 1,
    durationMins: 60,
  },
  {
    name: "Adhan Competition",
    type: "INDIVIDUAL",
    stageType: "STAGE",
    maxParticipantsPerGroup: 3,
    maxTeamsPerGroup: 1,
    maxStudentsPerTeam: 1,
    durationMins: 45,
  },
  {
    name: "Arabic Elocution",
    type: "INDIVIDUAL",
    stageType: "STAGE",
    maxParticipantsPerGroup: 2,
    maxTeamsPerGroup: 1,
    maxStudentsPerTeam: 1,
    durationMins: 50,
  },
  {
    name: "Islamic Calligraphy & Art",
    type: "INDIVIDUAL",
    stageType: "NON_STAGE",
    maxParticipantsPerGroup: 3,
    maxTeamsPerGroup: 1,
    maxStudentsPerTeam: 1,
    durationMins: 60,
  },
  {
    name: "Group Nasheed",
    type: "GROUP",
    stageType: "STAGE",
    maxParticipantsPerGroup: 10,
    maxTeamsPerGroup: 2,
    maxStudentsPerTeam: 4,
    durationMins: 75,
  },
  {
    name: "Islamic Quiz Competition",
    type: "GROUP",
    stageType: "STAGE",
    maxParticipantsPerGroup: 6,
    maxTeamsPerGroup: 2,
    maxStudentsPerTeam: 3,
    durationMins: 60,
  },
];

export const PROGRAMME_SCHEDULE: Record<
  string,
  { startTime: string; endTime: string; stageIdx: number }
> = {
  "Qira'at - GENERAL": {
    startTime: "2026-08-15T09:30:00.000Z",
    endTime: "2026-08-15T10:30:00.000Z",
    stageIdx: 0,
  },
  "Qira'at - JUNIOR": {
    startTime: "2026-08-15T10:45:00.000Z",
    endTime: "2026-08-15T11:45:00.000Z",
    stageIdx: 0,
  },
  "Qira'at - SENIOR": {
    startTime: "2026-08-15T12:00:00.000Z",
    endTime: "2026-08-15T13:00:00.000Z",
    stageIdx: 0,
  },
  "Group Nasheed - JUNIOR": {
    startTime: "2026-08-15T15:15:00.000Z",
    endTime: "2026-08-15T16:30:00.000Z",
    stageIdx: 0,
  },
  "Group Nasheed - SENIOR": {
    startTime: "2026-08-16T09:30:00.000Z",
    endTime: "2026-08-16T10:45:00.000Z",
    stageIdx: 0,
  },
  "Group Nasheed - GENERAL": {
    startTime: "2026-08-16T11:00:00.000Z",
    endTime: "2026-08-16T12:15:00.000Z",
    stageIdx: 0,
  },
  "Islamic Quiz Competition - GENERAL": {
    startTime: "2026-08-16T15:30:00.000Z",
    endTime: "2026-08-16T16:30:00.000Z",
    stageIdx: 0,
  },
  "Adhan Competition - GENERAL": {
    startTime: "2026-08-15T09:30:00.000Z",
    endTime: "2026-08-15T10:15:00.000Z",
    stageIdx: 1,
  },
  "Adhan Competition - JUNIOR": {
    startTime: "2026-08-15T10:30:00.000Z",
    endTime: "2026-08-15T11:15:00.000Z",
    stageIdx: 1,
  },
  "Adhan Competition - SENIOR": {
    startTime: "2026-08-15T11:30:00.000Z",
    endTime: "2026-08-15T12:15:00.000Z",
    stageIdx: 1,
  },
  "Arabic Elocution - GENERAL": {
    startTime: "2026-08-15T14:15:00.000Z",
    endTime: "2026-08-15T15:05:00.000Z",
    stageIdx: 1,
  },
  "Arabic Elocution - JUNIOR": {
    startTime: "2026-08-15T15:20:00.000Z",
    endTime: "2026-08-15T16:10:00.000Z",
    stageIdx: 1,
  },
  "Arabic Elocution - SENIOR": {
    startTime: "2026-08-16T09:30:00.000Z",
    endTime: "2026-08-16T10:20:00.000Z",
    stageIdx: 1,
  },
  "Islamic Quiz Competition - JUNIOR": {
    startTime: "2026-08-16T10:40:00.000Z",
    endTime: "2026-08-16T11:40:00.000Z",
    stageIdx: 1,
  },
  "Islamic Quiz Competition - SENIOR": {
    startTime: "2026-08-16T14:30:00.000Z",
    endTime: "2026-08-16T15:30:00.000Z",
    stageIdx: 1,
  },
  "Islamic Calligraphy & Art - GENERAL": {
    startTime: "2026-08-15T10:00:00.000Z",
    endTime: "2026-08-15T11:00:00.000Z",
    stageIdx: 2,
  },
  "Islamic Calligraphy & Art - JUNIOR": {
    startTime: "2026-08-15T14:30:00.000Z",
    endTime: "2026-08-15T15:30:00.000Z",
    stageIdx: 2,
  },
  "Islamic Calligraphy & Art - SENIOR": {
    startTime: "2026-08-16T10:00:00.000Z",
    endTime: "2026-08-16T11:00:00.000Z",
    stageIdx: 2,
  },
};

/**
 * Pre-computed deterministic dates of birth for the FIRST team leader of each
 * group, so QA can test the "Date of Birth" identifier without looking it up.
 * Order matches the leader-creation order in `students.ts`.
 */
export const TEAM_LEADER_DOB_BY_GROUP: Record<string, string> = {
  "Al-Qurtuba Cordoba": "2007-03-14T00:00:00.000Z",
  "Al-Andalus Andalusia": "2007-09-22T00:00:00.000Z",
};

/**
 * Compute a deterministic date of birth so re-runs produce stable identifiers.
 * Cycles through a 7-year window from a base date so ages look realistic.
 */
export function dateOfBirthFor(index: number): string {
  const base = new Date("2006-01-15T00:00:00.000Z").getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const offset = (index * 137) % (7 * 365);
  return new Date(base + offset * oneDay).toISOString();
}

export function expiresAt(startDate: string): string {
  return new Date(
    new Date(startDate).getTime() +
      TIER_CONFIG.PRO.festivalDurationDays * 24 * 60 * 60 * 1000,
  ).toISOString();
}
