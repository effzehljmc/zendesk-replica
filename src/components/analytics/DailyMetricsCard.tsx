import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DailyMetric {
  day: string;
  acceptance_rate: number;
  rejection_rate: number;
  total_feedback: number;  // This will handle bigint from PostgreSQL
  metadata: {
    top_reasons: Array<{
      reason: string;
      count: number;
    }>;
  };
}

export function DailyMetricsCard() {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['dailyMetrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_last_7_days_metrics', {});
      
      if (error) {
        console.error('Error fetching daily metrics:', error);
        throw error;
      }
      
      return data as DailyMetric[];
    }
  });

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Daily AI Suggestions Feedback</CardTitle>
        </CardHeader>
        <CardContent>Loading...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Daily AI Suggestions Feedback</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500">
          Error loading metrics: {error.message}
        </CardContent>
      </Card>
    );
  }

  const chartData = metrics?.map((m: DailyMetric) => {
    // Convert UTC date to local timezone for display
    const utcDate = new Date(m.day);
    const localDate = new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000));
    return {
      date: localDate.toISOString().split('T')[0], // Use ISO date for consistent sorting
      acceptance: Math.round(m.acceptance_rate * 100),
      rejection: Math.round(m.rejection_rate * 100)
    };
  }).sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending

  // Get today's top reasons
  const todayReasons = metrics?.[0]?.metadata.top_reasons || [];

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Daily AI Suggestions Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
                <YAxis unit="%" />
                <Tooltip 
                  labelFormatter={(date: string) => {
                    const localDate = new Date(date + 'T00:00:00');
                    return localDate.toLocaleDateString();
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="acceptance" 
                  stroke="#16a34a" 
                  name="Acceptance Rate" 
                />
                <Line 
                  type="monotone" 
                  dataKey="rejection" 
                  stroke="#dc2626" 
                  name="Rejection Rate" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Today's Top Rejection Reasons</h4>
            <ul className="space-y-2">
              {todayReasons.map((reason: { reason: string; count: number }, index: number) => (
                <li key={index} className="flex justify-between">
                  <span>{reason.reason}</span>
                  <span className="font-mono">{reason.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
