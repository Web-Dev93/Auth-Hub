import * as React from "react"
import { AppLayout } from "@/components/layout"
import { useGetStats } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Activity as ActivityIcon, ArrowUpRight, Box } from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats()

  if (isLoading || !stats) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="h-32" /></Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card><CardContent className="h-80" /></Card>
            <Card><CardContent className="h-80" /></Card>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Calculate percentage growth for users today vs this week average (simplified for demo)
  const averageThisWeek = stats.newUsersThisWeek / 7;
  const growth = averageThisWeek > 0 ? ((stats.newUsersToday - averageThisWeek) / averageThisWeek) * 100 : 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground font-mono text-sm">SYSTEM OVERVIEW & TELEMETRY</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard 
            title="Total Users" 
            value={stats.totalUsers.toLocaleString()} 
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <MetricCard 
            title="Active Today" 
            value={stats.activeToday.toLocaleString()} 
            icon={<ActivityIcon className="h-4 w-4 text-primary" />}
          />
          <MetricCard 
            title="New Today" 
            value={stats.newUsersToday.toLocaleString()} 
            icon={<ArrowUpRight className={`h-4 w-4 ${growth >= 0 ? 'text-emerald-500' : 'text-destructive'}`} />}
            trend={`${growth > 0 ? '+' : ''}${growth.toFixed(1)}% vs weekly avg`}
            trendUp={growth >= 0}
          />
          <MetricCard 
            title="Total Apps" 
            value={stats.totalApps.toLocaleString()} 
            icon={<Box className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Registrations Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="font-mono text-sm font-medium uppercase tracking-wider text-muted-foreground">Registrations (14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.registrationsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => {
                        const date = new Date(val);
                        return `${date.getMonth()+1}/${date.getDate()}`;
                      }}
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      cursor={{fill: 'hsl(var(--muted))'}}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Provider Breakdown Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="font-mono text-sm font-medium uppercase tracking-wider text-muted-foreground">Provider Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.providerBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="provider"
                      stroke="none"
                    >
                      {stats.providerBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Most Active Apps */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm font-medium uppercase tracking-wider text-muted-foreground">Most Active Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.appBreakdown.slice(0, 5).map((app, i) => (
                <div key={app.appId} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center font-mono text-xs text-primary border border-primary/20">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium">{app.appName}</p>
                      <p className="text-xs text-muted-foreground font-mono">ID: {app.appId.substring(0,8)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono">{app.count.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">users</p>
                  </div>
                </div>
              ))}
              {stats.appBreakdown.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">No app activity recorded.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

function MetricCard({ title, value, icon, trend, trendUp }: { title: string, value: string | number, icon: React.ReactNode, trend?: string, trendUp?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-mono tracking-tighter">{value}</div>
        {trend && (
          <p className={`text-xs mt-1 ${trendUp ? 'text-emerald-500' : 'text-destructive'}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
