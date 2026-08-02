import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  const email = "admin@cora.mn";
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (existing) {
    console.log(`Seed skipped: ${email} already exists.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  await db.insert(users).values({
    email,
    passwordHash,
    name: "Admin",
    role: "admin",
  });

  console.log(`Seeded admin user: ${email} / ChangeMe123! (change this after first login)`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
