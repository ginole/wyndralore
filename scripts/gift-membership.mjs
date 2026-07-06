// Gifts a user a free Monthly-tier membership (AI-reading PRD §3 — creator/affiliate seeding).
// Also resets their AI deep-read quota cycle, same as a real Lemon Squeezy purchase would.
//
// Usage: node --env-file=.env scripts/gift-membership.mjs <email> [days=30]
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = process.argv[2];
const days = Number(process.argv[3] ?? 30);

if (!email) {
  console.error("Usage: node --env-file=.env scripts/gift-membership.mjs <email> [days=30]");
  process.exit(1);
}
if (!Number.isFinite(days) || days <= 0) {
  console.error(`Invalid days: ${process.argv[3]}`);
  process.exit(1);
}

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error(`No user found with email ${email}. They must sign up first.`);
  process.exit(1);
}

const now = new Date();
const planExpiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

const updated = await prisma.user.update({
  where: { email },
  data: {
    plan: "monthly",
    planExpiresAt,
    aiQuotaCycleStart: now,
    aiDeepReadsUsed: 0,
  },
});

console.log(`Gifted ${updated.email}: plan=monthly, expires ${planExpiresAt.toISOString()}, AI quota cycle reset.`);
await prisma.$disconnect();
