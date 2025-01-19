import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const stats = [
  {
    name: "Total Tickets",
    value: "128",
    change: "+14.6% from last month",
    changeType: "positive",
  },
  {
    name: "Open Tickets",
    value: "42",
    change: "-4% from last month",
    changeType: "negative",
  },
  {
    name: "Average Response Time",
    value: "2.4h",
    change: "+12 minutes from last month",
    changeType: "neutral",
  },
  {
    name: "Customer Satisfaction",
    value: "98%",
    change: "+2% from last month",
    changeType: "positive",
  },
];

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/tickets")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={cn(
                  "text-xs",
                  stat.changeType === "positive" && "text-green-600",
                  stat.changeType === "negative" && "text-red-600",
                  stat.changeType === "neutral" && "text-muted-foreground"
                )}>
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Tabs>
    </div>
  );
} 