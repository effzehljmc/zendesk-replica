"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TicketStatusChartProps {
  stats: {
    new: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
}

export function TicketStatusChart({ stats }: TicketStatusChartProps) {
  const data = [
    { name: "New", value: stats.new, color: "hsl(var(--warning))" },
    { name: "Open", value: stats.open, color: "hsl(var(--primary))" },
    { name: "In Progress", value: stats.inProgress, color: "hsl(var(--muted))" },
    { name: "Resolved", value: stats.resolved, color: "hsl(var(--success))" },
  ]

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Ticket Volume by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={data} 
                cx="50%" 
                cy="50%" 
                innerRadius={60} 
                outerRadius={80} 
                paddingAngle={2} 
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          {data.map((status) => (
            <div key={status.name} className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="text-sm text-muted-foreground">
                {status.name} ({status.value})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 