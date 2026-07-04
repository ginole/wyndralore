import { isAdminAuthenticated } from "@/lib/adminAuth";
import AdminLoginForm from "@/components/AdminLoginForm";
import AdminDashboard from "@/components/AdminDashboard";

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();
  return authed ? <AdminDashboard /> : <AdminLoginForm />;
}
