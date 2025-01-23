import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentStats } from "@/hooks/useAgentStats";
import { Book, Clock, PlusCircle, Star } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export function AgentDashboard() {
  const navigate = useNavigate();
  const { stats, loading, error } = useAgentStats();

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
          <h2 className="text-3xl font-bold tracking-tight">My Dashboard</h2>
          <p className="text-muted-foreground">
            Track your support performance
          </p>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => navigate("/tickets")} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            View Tickets
          </Button>
          <Button onClick={() => navigate("/knowledge-base")} variant="outline" className="gap-2">
            <Book className="h-4 w-4" />
            Knowledge Base
          </Button>
        </div>
      </div>

      {/* Ticket Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
              Resolved
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

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Average Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div>
                <div className="text-2xl font-bold">
                  {stats?.performance.responseTime}
                </div>
                <p className="text-xs text-muted-foreground">
                  Time to first response
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Average Resolution Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div>
                <div className="text-2xl font-bold">
                  {stats?.performance.resolutionTime}
                </div>
                <p className="text-xs text-muted-foreground">
                  Time to resolution
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Satisfaction Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div>
                <div className="text-2xl font-bold">
                  {stats?.performance.satisfaction.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average customer rating
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ticket Activity Chart */}
      {!loading && stats?.recentTickets && (
        <Card>
          <CardHeader>
            <CardTitle>Ticket Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.recentTickets}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    type="category"
                    tickFormatter={(date: string) => {
                      const localDate = new Date(date + 'T00:00:00');
                      return localDate.toLocaleDateString();
                    }}
                    interval={0}
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
                    stroke="hsl(var(--primary))" 
                    name="Opened"
                    strokeWidth={2}
                    dot={{ strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                  <Line 
                    type="monotone" 
                    dataKey="closed" 
                    stroke="hsl(var(--success))" 
                    name="Resolved"
                    strokeWidth={2}
                    dot={{ strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 