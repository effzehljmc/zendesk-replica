import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats } from "@/hooks/useAdminStats";
import { TicketStatusChart } from "@/components/dashboard/TicketStatusChart";
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
import { SatisfactionTrend } from "@/components/analytics/SatisfactionTrend";

export function AdminDashboard() {
  const navigate = useNavigate();
  const { stats, loading, error } = useAdminStats();

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading dashboard data: {error.message}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your help desk performance
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/tickets?status=new")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  New Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.ticketStats.new}</div>
                )}
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/tickets?status=open")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Open Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.ticketStats.open}</div>
                )}
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/tickets?status=in_progress")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.ticketStats.inProgress}</div>
                )}
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/tickets?status=resolved")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Resolved Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.ticketStats.resolved}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* System Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/admin/users")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.userCount}</div>
                )}
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/admin/users?role=agent")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.agentCount}</div>
                )}
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/knowledge-base")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  KB Articles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.kbArticleCount}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ticket Activity Chart */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Ticket Activity (Last 30 Days)</h3>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.recentTickets}>
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
            )}
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {loading || !stats?.ticketStats ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <TicketStatusChart stats={stats.ticketStats} />
              <SatisfactionTrend />
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {/* Reports content */}
        </TabsContent>
      </Tabs>
    </div>
  );
} 