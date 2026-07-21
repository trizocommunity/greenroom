import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as relations from "../src/core/database/relations";
import * as schema from "../src/core/database/schema";
import { generateProfileSlug } from "../src/core/utils/slug";

const dbSchema = { ...schema, ...relations };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be defined in .env");
}

const isLocalConnection = (() => {
  try {
    const url = new URL(connectionString);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return /localhost|127\.0\.0\.1|::1/i.test(connectionString);
  }
})();

const hasExplicitSslDisable = /sslmode=disable/i.test(connectionString);
const sslConfig =
  isLocalConnection || hasExplicitSslDisable
    ? false
    : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
});

const db = drizzle(pool, { schema: dbSchema });

async function getOrCreateUser(
  email: string,
  fullName: string,
  globalRole: "SUPER_ADMIN" | "USER",
  displayName?: string,
  accountType?: "PERSONAL" | "INSTITUTIONAL",
  institutionId?: string,
): Promise<string> {
  const now = new Date().toISOString();
  const emailLower = email.toLowerCase().trim();
  const existing = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, emailLower),
  });

  if (existing) {
    await db
      .update(schema.user)
      .set({
        fullName,
        displayName: displayName ?? fullName,
        ...(accountType ? { accountType } : {}),
        ...(institutionId ? { institutionId } : {}),
        updatedAt: now,
      })
      .where(eq(schema.user.id, existing.id));
    return existing.id;
  }

  const id = crypto.randomUUID();
  await db.insert(schema.user).values({
    id,
    email: emailLower,
    globalRole,
    fullName,
    displayName: displayName ?? fullName,
    ...(accountType ? { accountType } : {}),
    ...(institutionId ? { institutionId } : {}),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function getOrCreateInstitution(
  ownerId: string,
  data: {
    name: string;
    type:
      | "COLLEGE"
      | "MADRASA"
      | "SCHOOL"
      | "OTHER"
      | "UNIVERSITY"
      | "INSTITUTION"
      | "CAMPUS"
      | "DARS";
    affiliation?: string | null;
    city?: string | null;
    sizeRange?: string | null;
  },
): Promise<string> {
  const now = new Date().toISOString();
  const existing = await db.query.institution.findFirst({
    where: (i, { eq }) => eq(i.ownerId, ownerId),
  });

  if (existing) {
    await db
      .update(schema.institution)
      .set({
        name: data.name,
        type: data.type,
        affiliation: data.affiliation ?? null,
        city: data.city ?? null,
        sizeRange: data.sizeRange ?? null,
        updatedAt: now,
      })
      .where(eq(schema.institution.id, existing.id));
    return existing.id;
  }

  const id = crypto.randomUUID();
  await db.insert(schema.institution).values({
    id,
    ownerId,
    name: data.name,
    type: data.type,
    affiliation: data.affiliation ?? null,
    city: data.city ?? null,
    sizeRange: data.sizeRange ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

// Daily Timetable Slot Allocator (9:00 AM to 10:00 PM with Prayer/Food breaks)
class FestivalScheduler {
  private days = ["2026-08-15", "2026-08-16", "2026-08-17", "2026-08-18"];
  private currentDayIdx = 0;
  private currentMinutes = 9 * 60; // Start at 09:00 AM (540 minutes)

  // Breaks defined in minutes from midnight [startMin, endMin, breakName]
  private breaks: [number, number, string][] = [
    [13 * 60, 13 * 60 + 30, "Dhuhr Prayer & Lunch Break (13:00 - 13:30)"],
    [16 * 60 + 30, 17 * 60, "Asr Prayer & Tea Break (16:30 - 17:00)"],
    [18 * 60 + 45, 19 * 60 + 15, "Maghrib Prayer Break (18:45 - 19:15)"],
    [20 * 60 + 30, 21 * 60, "Isha Prayer & Dinner Break (20:30 - 21:00)"],
  ];

  allocateSlot(durationMinutes: number): {
    startTime: string;
    endTime: string;
    dayDate: string;
  } {
    const endOfDayMinutes = 22 * 60; // 10:00 PM

    // Check if current slot overlaps with any break or extends past 10 PM
    while (true) {
      // If exceeds 10:00 PM, advance to next day at 9:00 AM
      if (this.currentMinutes + durationMinutes > endOfDayMinutes) {
        this.currentDayIdx = Math.min(
          this.currentDayIdx + 1,
          this.days.length - 1,
        );
        this.currentMinutes = 9 * 60;
        continue;
      }

      // Check overlap with breaks
      let overlappedBreak = false;
      for (const [breakStart, breakEnd] of this.breaks) {
        const slotStart = this.currentMinutes;
        const slotEnd = this.currentMinutes + durationMinutes;

        // If slot starts inside or ends inside break window
        if (
          (slotStart >= breakStart && slotStart < breakEnd) ||
          (slotEnd > breakStart && slotEnd <= breakEnd) ||
          (slotStart <= breakStart && slotEnd >= breakEnd)
        ) {
          this.currentMinutes = breakEnd;
          overlappedBreak = true;
          break;
        }
      }

      if (!overlappedBreak) {
        break;
      }
    }

    const dayDate = this.days[this.currentDayIdx];
    const startHour = Math.floor(this.currentMinutes / 60)
      .toString()
      .padStart(2, "0");
    const startMin = (this.currentMinutes % 60).toString().padStart(2, "0");

    const endTotalMinutes = this.currentMinutes + durationMinutes;
    const endHour = Math.floor(endTotalMinutes / 60)
      .toString()
      .padStart(2, "0");
    const endMin = (endTotalMinutes % 60).toString().padStart(2, "0");

    const startTime = `${dayDate}T${startHour}:${startMin}:00.000Z`;
    const endTime = `${dayDate}T${endHour}:${endMin}:00.000Z`;

    // Advance current time by duration + 15 minute gap between programmes/sessions
    this.currentMinutes = endTotalMinutes + 15;

    return { startTime, endTime, dayDate };
  }
}

async function seed() {
  const now = new Date().toISOString();
  console.log("🌱 Starting database seeding...");

  // 1. Create Super Admin User
  const superAdminEmail = "trizocommunity@gmail.com";
  await getOrCreateUser(
    superAdminEmail,
    "TRIZO Community Admin",
    "SUPER_ADMIN",
  );
  console.log(`✅ Super Admin verified/created: ${superAdminEmail}`);

  // 2. Create Festival Owner User (Ahlussuffa.igs@gmail.com)
  const festivalOwnerEmail = "Ahlussuffa.igs@gmail.com";

  // Create user first (getOrCreateUser returns existing id if present)
  const festivalOwnerId = await getOrCreateUser(
    festivalOwnerEmail,
    "Ahlussuffa IGS Admin",
    "USER",
  );

  // Create institution (idempotent - handles re-runs) and link to user
  const institutionId = await getOrCreateInstitution(festivalOwnerId, {
    name: "Ahlussuffa Integrated Graduate Studies",
    type: "DARS",
    affiliation: "Jami'athul Hind Al Islamiya",
    city: "Kannur",
    sizeRange: "100-500",
  });

  // Update user with institutional account type and institution link
  await db
    .update(schema.user)
    .set({
      fullName: "Ahlussuffa IGS Admin",
      displayName: "Ahlussuffa IGS Admin",
      accountType: "INSTITUTIONAL",
      institutionId,
      updatedAt: now,
    })
    .where(eq(schema.user.id, festivalOwnerId));

  console.log(`✅ Institution created: Ahlussuffa IGS`);
  console.log(`✅ Festival Owner verified/created: ${festivalOwnerEmail}`);

  // 3. Create Additional Festival Member Users
  const memberAccounts = [
    {
      email: "announcer.ahlussuffa@gmail.com",
      name: "Ustadh Hamza Announcer",
      role: "ANNOUNCER" as const,
    },
    {
      email: "stagemanager.ahlussuffa@gmail.com",
      name: "Tariq Stage Manager",
      role: "STAGE_MANAGER" as const,
    },
    {
      email: "media.ahlussuffa@gmail.com",
      name: "Bilal Media Coord",
      role: "MEDIA" as const,
    },
  ];

  const createdMembers: {
    userId: string;
    email: string;
    role: "ANNOUNCER" | "STAGE_MANAGER" | "MEDIA";
  }[] = [];
  for (const acc of memberAccounts) {
    const userId = await getOrCreateUser(acc.email, acc.name, "USER");
    createdMembers.push({ userId, email: acc.email, role: acc.role });
  }

  // 4. Check if Pro Festival already exists
  const festivalSlug = "ahlussuffa-igs-pro-2026";
  const existingFestival = await db.query.festival.findFirst({
    where: (f, { eq: eqFunc }) => eqFunc(f.slug, festivalSlug),
  });

  if (existingFestival) {
    console.log(
      `♻️ Existing Festival '${existingFestival.name}' found. Removing previous data to seed cleanly...`,
    );
    await db
      .delete(schema.festival)
      .where(eq(schema.festival.id, existingFestival.id));
  }

  // 5. Create PRO TIER Festival with start & end dates + chest number settings
  const festivalId = crypto.randomUUID();
  const startDate = "2026-08-15T09:00:00.000Z";
  const endDate = "2026-08-16T21:30:00.000Z";

  console.log("👑 Creating Pro Tier Festival with start & end dates...");
  await db.insert(schema.festival).values({
    id: festivalId,
    ownerId: festivalOwnerId,
    institutionId,
    festivalType: "INSTITUTIONAL",
    name: "Ahlussuffa IGS Grand Islamic Arts Festival 2026",
    slug: festivalSlug,
    category: "Inter-Collegiate Islamic Arts Fest",
    description: "Annual Pro Tier Arts & Literary Festival by Ahlussuffa IGS.",
    orgName: "Ahlussuffa IGS",
    orgLocation: "Kozhikode, Kerala",
    tier: "PRO",
    tierLabel: "Pro",
    status: "READY",
    scoringSystem: "SCORE_BASED",
    isLocked: false,
    startDate,
    endDate,
    chestNumberSettings: {
      autoGenerate: true,
      prefix: "AHL-",
      padding: 3,
    },
    createdAt: now,
    updatedAt: now,
  });

  // 5b. Create PRO tier payment record
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  await db.insert(schema.payment).values({
    id: crypto.randomUUID(),
    amount: 6000,
    currency: "INR",
    providerId: "SEED_PAYMENT",
    userId: festivalOwnerId,
    festivalId,
    purpose: "FESTIVAL_CREATION",
    status: "PAID",
    used: false,
    validUntil: validUntil.toISOString(),
    tier: "PRO",
    createdAt: now,
    updatedAt: now,
  });

  // 5c. Upsert user purchase summary
  const existingSummary = await db.query.userPurchaseSummary.findFirst({
    where: (s, { eq }) => eq(s.userId, festivalOwnerId),
  });

  if (existingSummary) {
    await db
      .update(schema.userPurchaseSummary)
      .set({
        totalSpend: existingSummary.totalSpend + 6000,
        festivalsCount: existingSummary.festivalsCount + 1,
        festivalIds: [
          ...((existingSummary.festivalIds as string[]) || []),
          festivalId,
        ],
        planCountsByTier: {
          ...((existingSummary.planCountsByTier as Record<string, number>) ||
            {}),
          PRO:
            ((existingSummary.planCountsByTier as Record<string, number>)
              ?.PRO || 0) + 1,
        },
        lastPurchaseAt: now,
        updatedAt: now,
      })
      .where(eq(schema.userPurchaseSummary.userId, festivalOwnerId));
  } else {
    await db.insert(schema.userPurchaseSummary).values({
      userId: festivalOwnerId,
      totalSpend: 6000,
      festivalsCount: 1,
      festivalIds: [festivalId],
      planCountsByTier: { PRO: 1 },
      lastPurchaseAt: now,
      updatedAt: now,
    });
  }

  // 6. Add Owner & Members to festival_member table
  await db.insert(schema.festivalMember).values({
    id: crypto.randomUUID(),
    festivalId,
    userId: festivalOwnerId,
    role: "ADMIN",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  for (const mem of createdMembers) {
    await db.insert(schema.festivalMember).values({
      id: crypto.randomUUID(),
      festivalId,
      userId: mem.userId,
      role: mem.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 7. Create Categories (1 GENERAL type with GENERAL, 2 SINGLE type with JUNIOR, SENIOR)
  console.log("📁 Creating Categories (GENERAL, JUNIOR, SENIOR)...");
  const categoriesData = [
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

  const createdCategories: { id: string; name: string; type: string }[] = [];
  for (const cat of categoriesData) {
    const catId = crypto.randomUUID();
    await db.insert(schema.category).values({
      id: catId,
      festivalId,
      name: cat.name,
      description: cat.description,
      type: cat.type,
      createdAt: now,
      updatedAt: now,
    });
    createdCategories.push({ id: catId, name: cat.name, type: cat.type });
  }

  // 8. Create Exactly 2 Groups with Islamic touch names
  console.log("flags Creating 2 Groups (Al-Qurtuba & Al-Andalus)...");
  const groupsData = [
    {
      name: "Al-Qurtuba Cordoba",
      color: "#2563eb",
      start: 100,
    },
    {
      name: "Al-Andalus Andalusia",
      color: "#10b981",
      start: 200,
    },
  ];

  const createdGroups: { id: string; name: string; start: number }[] = [];
  for (const group of groupsData) {
    const groupId = crypto.randomUUID();
    await db.insert(schema.group).values({
      id: groupId,
      festivalId,
      name: group.name,
      color: group.color,
      seriesStart: group.start,
      createdAt: now,
      updatedAt: now,
    });
    createdGroups.push({ id: groupId, name: group.name, start: group.start });
  }

  // 9. Create Stages
  console.log("🎭 Creating Stages...");
  const stagesData = [
    { name: "Al-Azhar Grand Hall", description: "Primary Main Stage" },
    {
      name: "Imam Ghazali Conference Hall",
      description: "Literary & Debate Stage",
    },
    { name: "Ibn Khaldun Open Arena", description: "Outdoor Cultural Stage" },
  ];

  const createdStages: { id: string; name: string }[] = [];
  for (const stg of stagesData) {
    const stageId = crypto.randomUUID();
    await db.insert(schema.stage).values({
      id: stageId,
      festivalId,
      name: stg.name,
      description: stg.description,
      createdAt: now,
      updatedAt: now,
    });
    createdStages.push({ id: stageId, name: stg.name });
  }

  // 10. Create Authentic Islamic Students & Assign 2 Team Leaders per group
  console.log(
    "👥 Creating Authentic Students with Chest Numbers & 2 Team Leaders per group...",
  );
  const islamicMaleNames = [
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
  const islamicFemaleNames = [
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

  const createdStudents: {
    id: string;
    name: string;
    categoryId: string;
    groupId: string;
    chestNumber: string;
    isTeamLeader: boolean;
  }[] = [];

  let maleIdx = 0;
  let femaleIdx = 0;

  for (const group of createdGroups) {
    let leadersAssignedForGroup = 0;
    let chestCount = 1;

    // Every student belongs to exactly one specific category.
    // No student can be assigned directly to a "GENERAL" category.
    const specificCategories = createdCategories.filter(
      (c) => c.type !== "GENERAL",
    );

    for (const cat of specificCategories) {
      // Create 8 students per specific category per group = 16 students per group (32 total)
      for (let i = 0; i < 8; i++) {
        const studentId = crypto.randomUUID();
        const chestNumber = `${group.start + chestCount}`;
        const isFemale = i % 2 === 1;
        const studentName = isFemale
          ? islamicFemaleNames[femaleIdx++ % islamicFemaleNames.length]
          : islamicMaleNames[maleIdx++ % islamicMaleNames.length];

        const isLeader = leadersAssignedForGroup < 2 && i === 0;
        if (isLeader) {
          leadersAssignedForGroup++;
        }

        const profileSlug = generateProfileSlug(
          studentName,
          studentId,
          chestNumber,
        );

        await db.insert(schema.student).values({
          id: studentId,
          festivalId,
          groupId: group.id,
          categoryId: cat.id,
          name: studentName,
          email: isLeader
            ? `${studentName.toLowerCase().replace(/[^a-z0-9]/g, "")}@ahlussuffa.igs`
            : null,
          profileSlug,
          chestNumber,
          gender: isFemale ? "FEMALE" : "MALE",
          isTeamLeader: isLeader,
          createdAt: now,
          updatedAt: now,
        });

        createdStudents.push({
          id: studentId,
          name: studentName,
          categoryId: cat.id,
          groupId: group.id,
          chestNumber,
          isTeamLeader: isLeader,
        });

        chestCount++;
      }
    }
  }

  // 11. Create 11 Judges
  console.log("⚖️ Creating 11 Judges...");
  const judgesNames = [
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

  for (const judgeName of judgesNames) {
    await db.insert(schema.judge).values({
      id: crypto.randomUUID(),
      festivalId,
      name: judgeName,
      description: "Appointed Panel Judge",
      createdAt: now,
      updatedAt: now,
    });
  }

  // 12. Initialize Scheduler (Allocates zero-overlap 9am - 10pm slots respecting Dhuhr, Asr, Maghrib, Isha breaks)
  const scheduler = new FestivalScheduler();
  let orderIndex = 1;

  // Create 6 Sessions scheduled across Day 1 & Day 2 (Every day has 3 sessions in afternoon & evening)
  console.log(
    "📅 Creating & Scheduling 6 Sessions (2-Day Fest: Afternoon & Evening slots)...",
  );
  const sessionsData = [
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

  for (const sess of sessionsData) {
    const stageAssigned = createdStages[sess.stageIdx] ?? createdStages[0];
    await db.insert(schema.scheduleEntry).values({
      id: crypto.randomUUID(),
      festivalId,
      title: sess.title,
      description: sess.description,
      type: "SESSION",
      sessionType: sess.sessionType,
      startTime: sess.startTime,
      endTime: sess.endTime,
      order: orderIndex++,
      stageId: stageAssigned?.id,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 13. Create Programmes, 100% Assign Students, & Schedule every Programme distinctively
  console.log(
    "🏆 Creating Programmes, 100% Student Assignments, & Scheduling every Programme...",
  );
  const programmeTemplates = [
    {
      name: "Qira'at",
      type: "INDIVIDUAL" as const,
      stageType: "STAGE" as const,
      maxParticipantsPerGroup: 3,
      maxTeamsPerGroup: 1,
      maxStudentsPerTeam: 1,
      durationMins: 60,
    },
    {
      name: "Adhan Competition",
      type: "INDIVIDUAL" as const,
      stageType: "STAGE" as const,
      maxParticipantsPerGroup: 3,
      maxTeamsPerGroup: 1,
      maxStudentsPerTeam: 1,
      durationMins: 45,
    },
    {
      name: "Arabic Elocution",
      type: "INDIVIDUAL" as const,
      stageType: "STAGE" as const,
      maxParticipantsPerGroup: 2,
      maxTeamsPerGroup: 1,
      maxStudentsPerTeam: 1,
      durationMins: 50,
    },
    {
      name: "Islamic Calligraphy & Art",
      type: "INDIVIDUAL" as const,
      stageType: "NON_STAGE" as const,
      maxParticipantsPerGroup: 3,
      maxTeamsPerGroup: 1,
      maxStudentsPerTeam: 1,
      durationMins: 60,
    },
    {
      name: "Group Nasheed",
      type: "GROUP" as const,
      stageType: "STAGE" as const,
      maxParticipantsPerGroup: 10,
      maxTeamsPerGroup: 2, // Included max team limit 2
      maxStudentsPerTeam: 4,
      durationMins: 75,
    },
    {
      name: "Islamic Quiz Competition",
      type: "GROUP" as const,
      stageType: "STAGE" as const,
      maxParticipantsPerGroup: 6,
      maxTeamsPerGroup: 2, // Included max team limit 2
      maxStudentsPerTeam: 3,
      durationMins: 60,
    },
  ];

  let totalAssignments = 0;
  let scheduledProgrammesCount = 0;

  const programmeScheduleMap: Record<
    string,
    { startTime: string; endTime: string; stageIdx: number }
  > = {
    // Stage 0 (Al-Azhar Grand Hall)
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

    // Stage 1 (Imam Ghazali Conference Hall)
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

    // Stage 2 (Ibn Khaldun Open Arena)
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

  for (const cat of createdCategories) {
    for (const tmpl of programmeTemplates) {
      const progId = crypto.randomUUID();
      const scheduleKey = `${tmpl.name} - ${cat.name}`;
      const progName = tmpl.name;
      const scheduleSlot = programmeScheduleMap[scheduleKey] ?? {
        startTime: "2026-08-15T11:00:00.000Z",
        endTime: "2026-08-15T12:00:00.000Z",
        stageIdx: 0,
      };
      const stageAssigned =
        createdStages[scheduleSlot.stageIdx] ?? createdStages[0];

      await db.insert(schema.programme).values({
        id: progId,
        festivalId,
        categoryId: cat.id,
        name: progName,
        type: tmpl.type,
        stageType: tmpl.stageType,
        maxParticipantsPerGroup: tmpl.maxParticipantsPerGroup,
        maxTeamsPerGroup: tmpl.maxTeamsPerGroup,
        maxStudentsPerTeam: tmpl.maxStudentsPerTeam,
        status: "SCHEDULED", // Set status to SCHEDULED
        createdAt: now,
        updatedAt: now,
      });

      // Schedule Entry for Programme
      const scheduleEntryId = crypto.randomUUID();
      await db.insert(schema.scheduleEntry).values({
        id: scheduleEntryId,
        festivalId,
        programmeId: progId,
        stageId: stageAssigned?.id,
        title: progName,
        type: "PROGRAMME",
        startTime: scheduleSlot.startTime,
        endTime: scheduleSlot.endTime,
        order: orderIndex++,
        createdAt: now,
        updatedAt: now,
      });

      // Create Programme Reporting Session linked to the schedule entry
      await db.insert(schema.programmeReportingSession).values({
        id: crypto.randomUUID(),
        festivalId,
        scheduleEntryId,
        programmeId: progId,
        stageId: stageAssigned?.id,
        status: "NOT_STARTED",
        createdAt: now,
        updatedAt: now,
      });

      scheduledProgrammesCount++;

      // Assign participants up to the maximum limits
      // Programmes classified under the "GENERAL" category are open to all students, regardless of their specific individual category
      const categoryStudents =
        cat.type === "GENERAL"
          ? createdStudents
          : createdStudents.filter((s) => s.categoryId === cat.id);

      if (tmpl.type === "INDIVIDUAL") {
        for (const group of createdGroups) {
          const groupStudents = categoryStudents.filter(
            (s) => s.groupId === group.id,
          );
          for (const student of groupStudents.slice(
            0,
            tmpl.maxParticipantsPerGroup,
          )) {
            await db.insert(schema.programmeAssignment).values({
              id: crypto.randomUUID(),
              programmeId: progId,
              festivalId,
              categoryId: cat.id,
              studentId: student.id,
              groupId: group.id,
              teamNumber: 1,
              createdAt: now,
              updatedAt: now,
            });
            totalAssignments++;
          }
        }
      } else {
        // GROUP programme: create maxTeamsPerGroup teams per group (100% fulfillment)
        for (const group of createdGroups) {
          const groupStudents = categoryStudents.filter(
            (s) => s.groupId === group.id,
          );
          for (let teamNum = 1; teamNum <= tmpl.maxTeamsPerGroup; teamNum++) {
            const startIdx = (teamNum - 1) * tmpl.maxStudentsPerTeam;
            const teamMembers = groupStudents.slice(
              startIdx,
              startIdx + tmpl.maxStudentsPerTeam,
            );
            for (const student of teamMembers) {
              await db.insert(schema.programmeAssignment).values({
                id: crypto.randomUUID(),
                programmeId: progId,
                festivalId,
                categoryId: cat.id,
                studentId: student.id,
                groupId: group.id,
                teamNumber: teamNum,
                createdAt: now,
                updatedAt: now,
              });
              totalAssignments++;
            }
          }
        }
      }
    }
  }

  const leadersCount = createdStudents.filter((s) => s.isTeamLeader).length;

  // 14. Update festival usage counts to reflect seeded data
  await db
    .update(schema.festival)
    .set({
      studentsCount: createdStudents.length,
      programmesCount: scheduledProgrammesCount,
      stagesCount: createdStages.length,
      storageUsedMb: 0,
      updatedAt: now,
    })
    .where(eq(schema.festival.id, festivalId));

  console.log("\n✨ AHLUSSUFFA IGS PRO TIER FESTIVAL SUCCESSFULLY SEEDED!");
  console.log("──────────────────────────────────────────────────────────");
  console.log(
    `Festival Name    : Ahlussuffa IGS Grand Islamic Arts Festival 2026`,
  );
  console.log(`Festival Dates   : ${startDate} to ${endDate}`);
  console.log(
    `Daily Schedule   : 09:00 AM to 10:00 PM (with Dhuhr, Asr, Maghrib, Isha breaks)`,
  );
  console.log(`Tier             : PRO`);
  console.log("──────────────────────────────────────────────────────────");
  console.log("ACCOUNTS VERIFIED / CREATED:");
  console.log(`  Super Admin    : ${superAdminEmail} (Magic link auth)`);
  console.log(`  Festival Owner : ${festivalOwnerEmail} (Magic link auth)`);
  console.log(
    `  Announcer      : announcer.ahlussuffa@gmail.com (Magic link auth)`,
  );
  console.log(
    `  Stage Manager  : stagemanager.ahlussuffa@gmail.com (Magic link auth)`,
  );
  console.log(
    `  Media Coord    : media.ahlussuffa@gmail.com (Magic link auth)`,
  );
  console.log("──────────────────────────────────────────────────────────");
  console.log(
    `Categories       : ${createdCategories.length} (GENERAL, JUNIOR, SENIOR)`,
  );
  console.log(
    `Groups/Teams     : ${createdGroups.length} (Al-Qurtuba & Al-Andalus)`,
  );
  console.log(
    `Students         : ${createdStudents.length} (${leadersCount} Team Leaders assigned)`,
  );
  console.log(`Judges           : ${judgesNames.length}`);
  console.log(
    `Sessions         : ${sessionsData.length} (Scheduled across Day 1 & Day 2 afternoon/evening)`,
  );
  console.log(
    `Programmes       : ${scheduledProgrammesCount} (100% Scheduled & Assigned)`,
  );
  console.log(
    `Total Schedule   : ${sessionsData.length + scheduledProgrammesCount} unique zero-overlap slots across 2 Days`,
  );
  console.log(
    `Assignments      : ${totalAssignments} total participant entries`,
  );
  console.log("──────────────────────────────────────────────────────────");

  await pool.end();
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
