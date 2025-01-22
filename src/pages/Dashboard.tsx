import { useAuth } from "@/contexts/AuthContext";
import { CustomerDashboard } from "@/components/dashboard/CustomerDashboard";
import { AdminDashboard } from "@/pages/admin/Dashboard";

export function Dashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.roles.some(role => role.name === 'admin');

  return isAdmin ? <AdminDashboard /> : <CustomerDashboard />;
} 