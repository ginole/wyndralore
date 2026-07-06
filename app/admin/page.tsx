import type { Metadata } from "next";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import AdminLoginForm from "@/components/AdminLoginForm";
import AdminDashboard from "@/components/AdminDashboard";

// Keep the admin panel out of search indexes entirely.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();
  return authed ? <AdminDashboard /> : <AdminLoginForm />;
}
