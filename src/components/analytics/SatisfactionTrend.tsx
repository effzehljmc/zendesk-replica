"use client"

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartTooltip } from "@/components/ui/chart"
import { useAdminStats } from "@/hooks/useAdminStats"

export function SatisfactionTrend() {
  const { stats } = useAdminStats();

  // Use the satisfaction data directly from recentTickets
  const satisfactionByDay = stats?.recentTickets.map(day => ({
    date: day.date,
    rating: day.satisfaction
  })) || [];

  console.log('Satisfaction Data:', satisfactionByDay);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Satisfaction Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={satisfactionByDay}>
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
              <YAxis 
                domain={[0, 5]} 
                ticks={[0, 1, 2, 3, 4, 5]}
                allowDataOverflow={false}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="rating" 
                name="Rating"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ strokeWidth: 2, r: 4, fill: "#16a34a" }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              <ChartTooltip 
                labelFormatter={(date: string) => {
                  const localDate = new Date(date + 'T00:00:00');
                  return localDate.toLocaleDateString();
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 