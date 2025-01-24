import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useAgentStats } from "@/hooks/useAgentStats";
import { TicketStatusChart } from "@/components/dashboard/TicketStatusChart";
import { AgentPerformance } from "@/components/dashboard/AgentPerformance";
import { SatisfactionTrend } from "@/components/analytics/SatisfactionTrend";
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
  const { profile } = useAuth();
  const isAdmin = profile?.roles.some(role => role.name === 'admin');
  
  // Use different stats hooks based on role
  const adminStatsResult = useAdminStats();
  const agentStatsResult = useAgentStats();
  
  // Select the appropriate stats based on role
  const { stats, loading, error } = isAdmin ? adminStatsResult : agentStatsResult;

  // Add logging for debugging
  console.log('Analytics Data:', {
    isAdmin,
    loading,
    error,
    ticketStats: stats?.ticketStats,
    recentTickets: stats?.recentTickets,
    agentStats: isAdmin && stats && 'agentStats' in stats ? stats.agentStats : undefined,
    thirtyDaysAgo: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(),
    now: new Date().toISOString(),
  });

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
          {isAdmin ? "Insights into your help desk performance" : "Track your support performance"}
        </p>
      </div>

      {loading || !stats?.ticketStats ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
          {isAdmin && <Skeleton className="h-[400px]" />}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <TicketStatusChart stats={stats.ticketStats} />
            
            {/* Ticket Activity Chart */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">
                {isAdmin ? "Ticket Activity (Last 30 Days)" : "My Ticket Activity (Last 30 Days)"}
              </h3>
              <div className="h-[300px]">
                {/* Add logging before rendering chart */}
                <>{console.log('Chart Data:', {
                  recentTickets: stats.recentTickets,
                  firstDate: stats.recentTickets[0]?.date,
                  lastDate: stats.recentTickets[stats.recentTickets.length - 1]?.date,
                  ticketCount: stats.recentTickets.length,
                })}</>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.recentTickets}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      type="category"
                      tickFormatter={(date: string) => {
                        const localDate = new Date(date + 'T00:00:00');
                        return localDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
                      }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date: string) => {
                        // Use same date formatting for tooltip
                        const localDate = new Date(date + 'T00:00:00');
                        return localDate.toLocaleDateString();
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="opened" 
                      stroke="#2563eb" 
                      name="Tickets Opened"
                      dot={{ strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                    <Line 
                      type="monotone" 
                      dataKey="closed" 
                      stroke="#16a34a" 
                      name="Tickets Closed"
                      dot={{ strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Only show satisfaction trend for admins */}
            {isAdmin && <SatisfactionTrend />}
          </div>

          {/* Agent Performance - Only visible to admins */}
          {isAdmin && 'agentStats' in stats && (
            <AgentPerformance agentStats={stats.agentStats} loading={loading} />
          )}
        </div>
      )}
    </div>
  );
} 