import type { Metadata } from "next";
import MasterListenPlayer from "@/components/MasterListenPlayer";

export const metadata: Metadata = {
  title: "Your Reading — Wyndralore",
  robots: { index: false, follow: false },
};

export default async function ListenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <MasterListenPlayer token={token} />;
}
