import type { Metadata } from "next";
import MasterDeliveryUpload from "@/components/MasterDeliveryUpload";

export const metadata: Metadata = {
  title: "Deliver a Reading — Wyndralore",
  robots: { index: false, follow: false },
};

export default async function DeliverPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <MasterDeliveryUpload token={token} />;
}
