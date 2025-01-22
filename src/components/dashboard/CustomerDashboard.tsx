import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomerStats } from "@/hooks/useCustomerStats";
import { PlusCircle, Book, Clock, Star } from "lucide-react";

export function CustomerDashboard() {
  const navigate = useNavigate();
  const { stats, loading, error } = useCustomerStats();

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
            Track your support tickets and get help
          </p>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => navigate("/tickets/create")} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Ticket
          </Button>
          <Button onClick={() => navigate("/knowledge-base")} variant="outline" className="gap-2">
            <Book className="h-4 w-4" />
            Knowledge Base
          </Button>
        </div>
      </div>

      {/* Active Tickets */}
      <div className="grid gap-4 md:grid-cols-3">
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

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/tickets?status=pending")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.ticketStats.pending}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
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
                  {stats?.averageResponseTime.toFixed(1)}h
                </div>
                <p className="text-xs text-muted-foreground">
                  Average time to first response
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
                  {stats?.satisfactionRating.toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on your feedback
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Suggestions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recently Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : stats?.recentTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No resolved tickets yet</p>
            ) : (
              <div className="space-y-4">
                {stats?.recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex justify-between items-center hover:bg-muted/50 p-2 rounded cursor-pointer"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <div>
                      <p className="font-medium">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Resolved on {new Date(ticket.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Suggested Articles</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : stats?.suggestedArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No suggested articles</p>
            ) : (
              <div className="space-y-4">
                {stats?.suggestedArticles.map((article) => (
                  <div
                    key={article.id}
                    className="hover:bg-muted/50 p-2 rounded cursor-pointer"
                    onClick={() => navigate(`/knowledge-base/${article.id}`)}
                  >
                    <p className="font-medium">{article.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 