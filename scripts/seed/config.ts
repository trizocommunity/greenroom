import { TIER_CONFIG } from "../../src/config/pricing";

const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * Deterministic `createdAt` for the seed festival so QA snapshots stay
 * stable across re-runs. Anchored to the current env date when this file
 * is loaded — adjust `FESTIVAL_CREATED_AT_DAY_OFFSET` (or set
 * `SEED_DAY_OFFSET` at run time) to shift the festival back in time and
 * exercise the T-7 expiry window manually.
 */
const FESTIVAL_CREATED_AT_BASE = "2026-08-02T09:00:00.000Z";

export function getSeedCreatedAt(): string {
  const offset = getSeedDayOffset();
  return new Date(
    new Date(FESTIVAL_CREATED_AT_BASE).getTime() - offset * MS_DAY,
  ).toISOString();
}

export function getSeedDayOffset(): number {
  const raw = process.env.SEED_DAY_OFFSET;
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(
      `SEED_DAY_OFFSET must be a non-negative integer, got: ${raw}`,
    );
  }
  return n;
}

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
  startDate: "2026-09-20T09:00:00.000Z",
  endDate: "2026-09-26T09:00:00.000Z",
  chestNumberSettings: {
    autoGenerate: true,
    prefix: "AHL-",
    padding: 3,
  },
  payment: { amount: 6000, currency: "INR" },
};

export const FESTIVAL_DAYS = [
  "2026-09-20",
  "2026-09-21",
  "2026-09-22",
  "2026-09-23",
  "2026-09-24",
  "2026-09-25",
  "2026-09-26",
];

export const FESTIVAL_MEMBERS: Array<{
  email: string;
  name: string;
  role: "ADMIN" | "ANNOUNCER" | "STAGE_MANAGER" | "MEDIA";
}> = [];

export const CATEGORIES = [
  {
    name: "Y Zone",
    type: "SINGLE" as const,
    description: "Y Zone category participants",
  },
  {
    name: "C Zone",
    type: "SINGLE" as const,
    description: "C Zone category participants",
  },
  {
    name: "B Zone",
    type: "SINGLE" as const,
    description: "B Zone category participants",
  },
  {
    name: "H Zone",
    type: "GENERAL" as const,
    description: "Open programmes for H Zone participants",
  },
  {
    name: "High School",
    type: "SINGLE" as const,
    description: "High School category participants",
  },
  {
    name: "General",
    type: "GENERAL" as const,
    description: "Programmes open to all participants",
  },
];

export const GROUPS = [
  { name: "Al-Qurtuba Cordoba", color: "#2563eb", start: 100 },
  { name: "Al-Andalus Andalusia", color: "#10b981", start: 200 },
  { name: "Alhambra Granada", color: "#f59e0b", start: 300 },
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

export const PARTICIPANTS_PER_CATEGORY_PER_GROUP = 8;
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
    startTime: "2026-09-20T14:00:00.000Z",
    endTime: "2026-09-20T15:00:00.000Z",
    stageIdx: 0,
  },
  {
    title: "Islamic Heritage & Arts Symposium",
    sessionType: "TALK" as const,
    description: "Keynote symposium on classical calligraphy & literature",
    startTime: "2026-09-20T17:30:00.000Z",
    endTime: "2026-09-20T18:45:00.000Z",
    stageIdx: 0,
  },
  {
    title: "Qur'an & Modern Science Forum",
    sessionType: "GENERAL" as const,
    description: "Interactive evening forum with scholars",
    startTime: "2026-09-20T19:30:00.000Z",
    endTime: "2026-09-20T20:30:00.000Z",
    stageIdx: 1,
  },
  {
    title: "Grand Nasheed & Spiritual Evening",
    sessionType: "CONCERT" as const,
    description: "Afternoon spiritual gathering featuring choir performances",
    startTime: "2026-09-21T14:00:00.000Z",
    endTime: "2026-09-21T15:15:00.000Z",
    stageIdx: 0,
  },
  {
    title: "Islamic Calligraphy & Literary Colloquium",
    sessionType: "TALK" as const,
    description: "Evening scholarly colloquium on Islamic arts",
    startTime: "2026-09-21T17:30:00.000Z",
    endTime: "2026-09-21T18:30:00.000Z",
    stageIdx: 1,
  },
  {
    title: "Valedictory & Grand Award Ceremony",
    sessionType: "CEREMONY" as const,
    description: "Closing speech and distribution of prizes",
    startTime: "2026-09-21T19:00:00.000Z",
    endTime: "2026-09-21T20:30:00.000Z",
    stageIdx: 0,
  },
];

export type ProgrammeTemplate = {
  name: string;
  type: "INDIVIDUAL" | "GROUP";
  stageType: "stage" | "off-stage";
  maxParticipantsPerGroup: number;
  maxTeamsPerGroup: number;
  maxParticipantsPerTeam: number;
  timePerUnitMinutes: number;
};

export const PROGRAMMES_BY_CATEGORY: Record<string, ProgrammeTemplate[]> = {
  "Y Zone": [
    {
      name: "Y Zone Recitation",
      type: "INDIVIDUAL",
      stageType: "stage",
      maxParticipantsPerGroup: 3,
      maxTeamsPerGroup: 1,
      maxParticipantsPerTeam: 1,
      timePerUnitMinutes: 5,
    },
    {
      name: "Y Zone Team Quiz",
      type: "GROUP",
      stageType: "stage",
      maxParticipantsPerGroup: 6,
      maxTeamsPerGroup: 2,
      maxParticipantsPerTeam: 3,
      timePerUnitMinutes: 20,
    },
  ],
  "C Zone": [
    {
      name: "C Zone Elocution",
      type: "INDIVIDUAL",
      stageType: "stage",
      maxParticipantsPerGroup: 3,
      maxTeamsPerGroup: 1,
      maxParticipantsPerTeam: 1,
      timePerUnitMinutes: 5,
    },
    {
      name: "C Zone Nasheed",
      type: "GROUP",
      stageType: "stage",
      maxParticipantsPerGroup: 8,
      maxTeamsPerGroup: 2,
      maxParticipantsPerTeam: 4,
      timePerUnitMinutes: 20,
    },
  ],
  "B Zone": [
    {
      name: "B Zone Calligraphy",
      type: "INDIVIDUAL",
      stageType: "off-stage",
      maxParticipantsPerGroup: 3,
      maxTeamsPerGroup: 1,
      maxParticipantsPerTeam: 1,
      timePerUnitMinutes: 5,
    },
    {
      name: "B Zone Cultural Showcase",
      type: "GROUP",
      stageType: "stage",
      maxParticipantsPerGroup: 8,
      maxTeamsPerGroup: 2,
      maxParticipantsPerTeam: 4,
      timePerUnitMinutes: 20,
    },
  ],
  "H Zone": [
    {
      name: "H Zone Open Speech",
      type: "INDIVIDUAL",
      stageType: "stage",
      maxParticipantsPerGroup: 3,
      maxTeamsPerGroup: 1,
      maxParticipantsPerTeam: 1,
      timePerUnitMinutes: 5,
    },
    {
      name: "H Zone Open Performance",
      type: "GROUP",
      stageType: "stage",
      maxParticipantsPerGroup: 8,
      maxTeamsPerGroup: 2,
      maxParticipantsPerTeam: 4,
      timePerUnitMinutes: 20,
    },
  ],
  "High School": [
    {
      name: "High School Debate",
      type: "INDIVIDUAL",
      stageType: "stage",
      maxParticipantsPerGroup: 3,
      maxTeamsPerGroup: 1,
      maxParticipantsPerTeam: 1,
      timePerUnitMinutes: 5,
    },
    {
      name: "High School Knowledge League",
      type: "GROUP",
      stageType: "stage",
      maxParticipantsPerGroup: 6,
      maxTeamsPerGroup: 2,
      maxParticipantsPerTeam: 3,
      timePerUnitMinutes: 20,
    },
  ],
  General: [
    {
      name: "General Qur'an Recitation",
      type: "INDIVIDUAL",
      stageType: "stage",
      maxParticipantsPerGroup: 3,
      maxTeamsPerGroup: 1,
      maxParticipantsPerTeam: 1,
      timePerUnitMinutes: 5,
    },
    {
      name: "General Islamic Quiz",
      type: "GROUP",
      stageType: "stage",
      maxParticipantsPerGroup: 6,
      maxTeamsPerGroup: 2,
      maxParticipantsPerTeam: 3,
      timePerUnitMinutes: 20,
    },
  ],
};

/**
 * Pre-computed deterministic dates of birth for the FIRST team leader of each
 * group, so QA can test the "Date of Birth" identifier without looking it up.
 * Order matches the leader-creation order in `participants.ts`.
 */
export const TEAM_LEADER_DOB_BY_GROUP: Record<string, string> = {
  "Al-Qurtuba Cordoba": "2007-03-14T00:00:00.000Z",
  "Al-Andalus Andalusia": "2007-09-22T00:00:00.000Z",
  "Alhambra Granada": "2008-01-11T00:00:00.000Z",
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

/**
 * Compute `expiresAt` from the festival's `createdAt`, mirroring the production
 * rule in `festival-crud.actions.ts` (`createdAt + festivalDurationDays`). The
 * previous version derived expiry from `startDate`, which silently inflated the
 * window by `startDate - createdAt` days and surfaced as "103 days left" on the
 * profile card for the seeded festival.
 */
export function expiresAtFromCreatedAt(createdAtIso: string): string {
  const days = TIER_CONFIG.PRO.festivalDurationDays;
  return new Date(new Date(createdAtIso).getTime() + days * MS_DAY).toISOString();
}
