import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedOrder } from "@/lib/orders";
import { PLANS, PlanId } from "@/lib/pricing";
import { getWiseWireDetails } from "@/lib/wiseAccount";
import OrderStatusPanel from "@/components/OrderStatusPanel";

export default async function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/account");

  const { code } = await params;
  const order = await getOwnedOrder(code, user.id);
  if (!order) notFound();

  const plan = PLANS[order.plan as PlanId];

  return (
    <section className="mx-auto max-w-lg px-6 py-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Complete Your Payment</p>
        <h1 className="font-display mt-4 text-3xl text-moon sm:text-4xl">Almost there</h1>
        <p className="mt-3 text-sm text-moon-dim">
          Wyndralore is a small, independent product — payments are confirmed by hand via Wise, usually within minutes.
        </p>
      </div>

      <OrderStatusPanel
        code={order.code}
        initialStatus={order.status as "pending" | "awaiting_confirmation" | "paid" | "underpaid" | "expired"}
        amountUsd={order.amountUsd}
        planLabel={plan.label}
        wireDetails={getWiseWireDetails()}
      />
    </section>
  );
}
