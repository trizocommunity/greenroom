import { eq } from "drizzle-orm";
import { db } from "../src/core/database/client";
import { institution } from "../src/core/database/schema";
async function run() {
  const res = await db.query.institution.findFirst({
    where: eq(institution.customDomain, "ahlussuffadars.in"),
  });
  console.log("INSTITUTION:", res);
  process.exit(0);
}
run();
