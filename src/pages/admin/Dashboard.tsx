import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAdminStats } from '@/hooks/useAdminStats';
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
import { Skeleton } from '@/components/ui/skeleton';

export function AdminDashboard() {
  const { stats, loading, error } = useAdminStats();
  const navigate = useNavigate();

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading dashboard data: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      
      {/* Ticket Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/tickets?status=new')}
        >
          <h3 className="font-semibold mb-2 text-muted-foreground">New Tickets</h3>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold">{stats?.ticketStats.new}</p>
          )}
        </Card>
        
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/tickets?status=open')}
        >
          <h3 className="font-semibold mb-2 text-muted-foreground">Open Tickets</h3>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold">{stats?.ticketStats.open}</p>
          )}
        </Card>
        
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/tickets?status=in_progress')}
        >
          <h3 className="font-semibold mb-2 text-muted-foreground">In Progress</h3>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold">{stats?.ticketStats.inProgress}</p>
          )}
        </Card>
        
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/tickets?status=resolved')}
        >
          <h3 className="font-semibold mb-2 text-muted-foreground">Resolved</h3>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold">{stats?.ticketStats.resolved}</p>
          )}
        </Card>
      </div>

      {/* System Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin/users')}
        >
          <h3 className="font-semibold mb-2 text-muted-foreground">Total Users</h3>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold">{stats?.userCount}</p>
          )}
        </Card>
        
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin/users?role=agent')}
        >
          <h3 className="font-semibold mb-2 text-muted-foreground">Active Agents</h3>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold">{stats?.agentCount}</p>
          )}
        </Card>
        
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin/knowledge-base')}
        >
          <h3 className="font-semibold mb-2 text-muted-foreground">KB Articles</h3>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold">{stats?.kbArticleCount}</p>
          )}
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
        )}
      </Card>
    </div>
  );
} 