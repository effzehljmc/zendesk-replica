"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface AgentStats {
  id: string;
  name: string;
  tickets: number;
  responseTime: string;
  resolutionTime: string;
  satisfaction: number;
}

interface AgentPerformanceProps {
  agentStats: AgentStats[];
  loading?: boolean;
}

export function AgentPerformance({ agentStats, loading }: AgentPerformanceProps) {
  if (loading) {
    return (
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Agent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Agent Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Tickets</TableHead>
              <TableHead className="text-right">Avg. Response</TableHead>
              <TableHead className="text-right">Avg. Resolution</TableHead>
              <TableHead className="text-right">Satisfaction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentStats.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell className="font-medium">{agent.name}</TableCell>
                <TableCell className="text-right">{agent.tickets}</TableCell>
                <TableCell className="text-right">{agent.responseTime}</TableCell>
                <TableCell className="text-right">{agent.resolutionTime}</TableCell>
                <TableCell className="text-right">{agent.satisfaction.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
} 