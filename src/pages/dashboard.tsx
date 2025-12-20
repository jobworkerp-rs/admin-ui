import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useActiveJobsStats, useChannelStats, useWorkerCount } from "@/hooks/use-dashboard-metrics"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Activity, Bot, Server, Zap, RefreshCw } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const STATUS_COLORS = {
  pending: "#fbbf24", // amber-400
  running: "#3b82f6", // blue-500
  waitResult: "#a855f7", // purple-500
}

export default function Dashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true)
  const refetchInterval = autoRefresh ? 5000 : false

  const { data: workerCount, isLoading: isWorkersLoading } = useWorkerCount({ refetchInterval: refetchInterval || undefined })
  const { data: jobStats, isLoading: isJobsLoading } = useActiveJobsStats({ refetchInterval: refetchInterval || undefined })
  const { data: channels, isLoading: isChannelsLoading } = useChannelStats({ refetchInterval: refetchInterval || undefined })

  const activeWorkers = channels?.reduce((acc, ch) => acc + parseInt(ch.workerCount, 10), 0) || 0

  // Prepare Chart Data
  const jobStatusData = [
    { name: "Running", value: jobStats?.running || 0, color: STATUS_COLORS.running },
    { name: "Pending", value: jobStats?.pending || 0, color: STATUS_COLORS.pending },
    { name: "Wait Result", value: jobStats?.waitResult || 0, color: STATUS_COLORS.waitResult },
  ].filter(d => d.value > 0)

  const channelData = channels?.map(c => ({
    name: c.name,
    workers: parseInt(c.workerCount, 10)
  })) || []

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
           <Label htmlFor="auto-refresh" className="text-sm text-muted-foreground flex items-center gap-2">
             <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
             Auto Refresh
           </Label>
           <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
           />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Workers Metadata */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workers</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isWorkersLoading ? "..." : workerCount}</div>
            <p className="text-xs text-muted-foreground">Registered workers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isChannelsLoading ? "..." : activeWorkers}</div>
            <p className="text-xs text-muted-foreground">Across {channels?.length || 0} channels</p>
          </CardContent>
        </Card>

        {/* Jobs Metadata */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Jobs</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isJobsLoading ? "..." : jobStats?.running || 0}</div>
            <p className="text-xs text-muted-foreground">Executing now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isJobsLoading ? "..." : jobStats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              + {jobStats?.waitResult || 0} waiting for result
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Worker Distribution</CardTitle>
            <CardDescription>Number of workers per channel</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full min-w-0">
                {channelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={channelData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                stroke="#888888" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                            />
                            <YAxis 
                                stroke="#888888" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(value) => `${value}`} 
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                itemStyle={{ color: 'var(--foreground)' }}
                                cursor={{fill: 'var(--muted)', opacity: 0.2}}
                            />
                            <Bar dataKey="workers" fill="#adfa1d" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        No channel data available
                    </div>
                )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Active Jobs Overview</CardTitle>
            <CardDescription>Current status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[300px] w-full min-w-0 flex items-center justify-center">
                {jobStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart>
                            <Pie
                                data={jobStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {jobStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                 contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                 itemStyle={{ color: 'var(--foreground)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Server className="h-10 w-10 mb-2 opacity-20" />
                        <p>No active jobs</p>
                    </div>
                )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
