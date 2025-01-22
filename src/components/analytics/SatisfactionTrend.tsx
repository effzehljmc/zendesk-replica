"use client"

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { useAdminStats } from "@/hooks/useAdminStats"

export function SatisfactionTrend() {
  const { stats } = useAdminStats();

  // Process satisfaction data by day
  const satisfactionByDay = stats?.recentTickets.map(day => {
    const date = day.date;
    const dayTickets = stats.agentStats.flatMap(agent => 
      agent.satisfaction > 0 ? [{ date, rating: agent.satisfaction }] : []
    );
    
    const avgRating = dayTickets.length > 0
      ? dayTickets.reduce((sum, t) => sum + t.rating, 0) / dayTickets.length
      : null;

    return {
      date,
      rating: avgRating
    };
  }) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Satisfaction Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            rating: {
              label: "Rating",
              color: "hsl(var(--success))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={satisfactionByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date: string) => new Date(date).toLocaleDateString()}
              />
              <YAxis 
                domain={[1, 5]} 
                ticks={[1, 2, 3, 4, 5]}
              />
              <Line 
                type="monotone" 
                dataKey="rating" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--success))" }}
                connectNulls
              />
              <ChartTooltip />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
} 