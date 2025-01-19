import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

export function Dashboard() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-card p-6 rounded-lg shadow">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Total Tickets</h3>
              </div>
              <div>
                <div className="text-2xl font-bold">128</div>
                <p className="text-xs text-muted-foreground">
                  +14.6% from last month
                </p>
              </div>
            </div>
            <div className="bg-card p-6 rounded-lg shadow">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Open Tickets</h3>
              </div>
              <div>
                <div className="text-2xl font-bold">42</div>
                <p className="text-xs text-muted-foreground">
                  -4% from last month
                </p>
              </div>
            </div>
            <div className="bg-card p-6 rounded-lg shadow">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Average Response Time</h3>
              </div>
              <div>
                <div className="text-2xl font-bold">2.4h</div>
                <p className="text-xs text-muted-foreground">
                  +12 minutes from last month
                </p>
              </div>
            </div>
            <div className="bg-card p-6 rounded-lg shadow">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Customer Satisfaction</h3>
              </div>
              <div>
                <div className="text-2xl font-bold">98%</div>
                <p className="text-xs text-muted-foreground">
                  +2% from last month
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="analytics">
          <div className="text-center py-10">
            Analytics content coming soon...
          </div>
        </TabsContent>
        <TabsContent value="reports">
          <div className="text-center py-10">
            Reports content coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 