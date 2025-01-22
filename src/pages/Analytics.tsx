import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats } from "@/hooks/useAdminStats";
import { TicketStatusChart } from "@/components/dashboard/TicketStatusChart";
import { AgentPerformance } from "@/components/dashboard/AgentPerformance";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from "@/contexts/AuthContext";

export function Analytics() {
  const { stats, loading, error } = useAdminStats();
  const { profile } = useAuth();
  const isAdmin = profile?.roles.some(role => role.name === 'admin');

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading analytics data: {error.message}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">
          Insights into your help desk performance
        </p>
      </div>

      {loading || !stats?.ticketStats ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
          {isAdmin && <Skeleton className="h-[400px] md:col-span-2" />}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <TicketStatusChart stats={stats.ticketStats} />
            
            {/* Ticket Activity Chart */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Ticket Activity (Last 30 Days)</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.recentTickets}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date: string) => new Date(date).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date: string) => new Date(date).toLocaleDateString()}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="opened" 
                      stroke="#2563eb" 
                      name="Tickets Opened"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="closed" 
                      stroke="#16a34a" 
                      name="Tickets Closed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Agent Performance - Only visible to admins */}
          {isAdmin && (
            <AgentPerformance agentStats={stats.agentStats} loading={loading} />
          )}
        </div>
      )}
    </div>
  );
} 