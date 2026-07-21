import type { Metadata } from "next";
import AccountPage from "@/app/account/page";

// Shared client component; localizes from the /tw path. Auth/cookies logic untouched.
export const metadata: Metadata = {
  title: "帳號 — Wyndralore",
};

export default function TwAccountPage() {
  return <AccountPage />;
}
