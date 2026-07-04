import { prisma } from "./db";

/** Fetches an order the given user owns, lazily flipping it to "expired" past its 48h window. */
export async function getOwnedOrder(code: string, userId: string) {
  const order = await prisma.order.findUnique({ where: { code: code.toUpperCase() } });
  if (!order || order.userId !== userId) return null;

  if ((order.status === "pending" || order.status === "awaiting_confirmation") && order.expiresAt.getTime() < Date.now()) {
    return prisma.order.update({ where: { id: order.id }, data: { status: "expired" } });
  }
  return order;
}
