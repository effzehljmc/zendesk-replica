import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboard } from "@/pages/admin/Dashboard";
import { AgentDashboard } from "@/components/dashboard/AgentDashboard";
import { CustomerDashboard } from "@/components/dashboard/CustomerDashboard";

export function Dashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.roles.some(role => role.name === 'admin');
  const isAgent = profile?.roles.some(role => role.name === 'agent');

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isAgent) {
    return <AgentDashboard />;
  }

  return <CustomerDashboard />;
} 