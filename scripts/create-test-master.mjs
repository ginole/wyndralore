// Creates (or resets) a test master account with seeded orders/ledger entries in every status
// (held/available/requested/paid_out), so the master dashboard + withdraw button can be previewed
// without waiting for a real master to sell real readings. Writes directly to the shared prod DB
// (no separate dev DB) — safe to re-run, it wipes and re-seeds only this one master's own orders.
//
// Usage: node --env-file=.env scripts/create-test-master.mjs
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MASTER_EMAIL = "demo-master@wyndralore.com";
const MASTER_PASSWORD = "TestPass123!";
const BUYER_EMAIL = "demo-master-buyer@wyndralore.com";
const HANDLE = "demo-master";

const now = Date.now();
const daysAgo = (n) => new Date(now - n * 24 * 60 * 60 * 1000);

async function ensureUser(email, password) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, plan: "free" },
  });
}

const masterUser = await ensureUser(MASTER_EMAIL, MASTER_PASSWORD);
const buyer = await ensureUser(BUYER_EMAIL, "not-a-real-login");

const master = await prisma.masterProfile.upsert({
  where: { userId: masterUser.id },
  update: {},
  create: {
    userId: masterUser.id,
    handle: HANDLE,
    displayName: "Luna (Demo Master)",
    tagline: "Test account — seeded for previewing the master dashboard.",
    styleTone: "gentle",
    payoutMethod: "paypal",
    payoutHandle: "demo-master@example.com",
    status: "active",
  },
});

// Wipe this master's previously-seeded orders (ledger cascades via the order relation) so re-runs
// don't pile up duplicate demo data.
await prisma.ledgerEntry.deleteMany({ where: { masterId: master.id } });
await prisma.masterOrder.deleteMany({ where: { masterId: master.id } });

let seq = 0;
function nextCode() {
  seq += 1;
  return `WL-M-DEMO${seq}`;
}

async function seedOrder({ kind, amountUsd, commissionPct, cutUsd, orderStatus, deliveredAt, disputeUntil, ledgerStatus, availableAt, requestedAt, paidOutAt }) {
  const order = await prisma.masterOrder.create({
    data: {
      code: nextCode(),
      masterId: master.id,
      buyerId: buyer.id,
      kind,
      amountUsd,
      commissionPct,
      status: orderStatus,
      paidAt: daysAgo(30),
      deliveredAt,
      disputeUntil,
    },
  });
  await prisma.ledgerEntry.create({
    data: { masterId: master.id, orderId: order.id, amountUsd: cutUsd, status: ledgerStatus, availableAt, requestedAt, paidOutAt },
  });
}

// held — delivered recently, still inside its 30-day hold.
await seedOrder({
  kind: "live_voice",
  amountUsd: 39,
  commissionPct: 0.7,
  cutUsd: 25.59,
  orderStatus: "delivered",
  deliveredAt: daysAgo(5),
  disputeUntil: new Date(now + 25 * 24 * 60 * 60 * 1000),
  ledgerStatus: "held",
});

// available — two released orders totaling just over the $30 withdrawal minimum.
await seedOrder({
  kind: "ai_style",
  amountUsd: 9.9,
  commissionPct: 0.5,
  cutUsd: 4.45,
  orderStatus: "released",
  deliveredAt: daysAgo(35),
  disputeUntil: daysAgo(5),
  ledgerStatus: "available",
  availableAt: daysAgo(5),
});
await seedOrder({
  kind: "live_voice",
  amountUsd: 39,
  commissionPct: 0.7,
  cutUsd: 25.59,
  orderStatus: "released",
  deliveredAt: daysAgo(35),
  disputeUntil: daysAgo(5),
  ledgerStatus: "available",
  availableAt: daysAgo(5),
});

// requested — already asked to be paid, awaiting admin action.
await seedOrder({
  kind: "live_voice",
  amountUsd: 39,
  commissionPct: 0.7,
  cutUsd: 25.59,
  orderStatus: "released",
  deliveredAt: daysAgo(40),
  disputeUntil: daysAgo(10),
  ledgerStatus: "requested",
  availableAt: daysAgo(10),
  requestedAt: daysAgo(2),
});

// paid_out — historical, already settled.
await seedOrder({
  kind: "ai_style",
  amountUsd: 9.9,
  commissionPct: 0.5,
  cutUsd: 4.45,
  orderStatus: "released",
  deliveredAt: daysAgo(60),
  disputeUntil: daysAgo(30),
  ledgerStatus: "paid_out",
  availableAt: daysAgo(30),
  paidOutAt: daysAgo(28),
});

console.log(`Test master ready: ${MASTER_EMAIL} / ${MASTER_PASSWORD}`);
console.log(`Dashboard: /masters/dashboard (log in as ${MASTER_EMAIL})`);
console.log(`Expected balances — held: $25.59, available: $30.04, requested: $25.59, paid out: $4.45`);
await prisma.$disconnect();
