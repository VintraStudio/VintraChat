'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingUp, MessageSquare, Users, Clock, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Bar, BarChart, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AnalyticsData {
  totalSessions: number
  totalMessages: number
  avgResponseTime: number
  sessionsChange: number
  messagesChange: number
  dailyData: { date: string; sessions: number; messages: number }[]
  responseTimeDistribution: { label: string; value: number }[]
  peakHours: { hour: string; value: number }[]
  topPages: { page: string; count: number; percent: number }[]
}

const chartConfig = {
  sessions: {
    label: 'Sessions',
    color: 'hsl(var(--chart-1))',
  },
  messages: {
    label: 'Messages',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartRange, setChartRange] = useState<'7' | '14' | '30'>('30')

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      if (!response.ok) throw new Error('Failed to load analytics')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">Failed to load analytics data.</p>
      </div>
    )
  }

  const filteredDailyData = data.dailyData.slice(-parseInt(chartRange))

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const thisWeekSessions = data.dailyData.slice(-7).reduce((sum, d) => sum + d.sessions, 0)
  const lastWeekSessions = data.dailyData.slice(-14, -7).reduce((sum, d) => sum + d.sessions, 0)
  const thisWeekChange = lastWeekSessions
    ? Math.round((thisWeekSessions - lastWeekSessions) / lastWeekSessions * 100)
    : thisWeekSessions ? 100 : 0

  const formatResponseTime = (mins: number) => {
    if (mins <= 0) return 'N/A'
    if (mins < 1) return `${Math.round(mins * 60)}s`
    if (mins >= 60) return `${Math.round(mins / 60 * 10) / 10}h`
    return `${mins}m`
  }

  const statCards = [
    {
      title: 'Total Conversations',
      value: data.totalSessions.toLocaleString(),
      change: data.sessionsChange,
      icon: Users,
      description: 'vs prev. week',
    },
    {
      title: 'Total Messages',
      value: data.totalMessages.toLocaleString(),
      change: data.messagesChange,
      icon: MessageSquare,
      description: 'vs prev. week',
    },
    {
      title: 'Avg Response Time',
      value: formatResponseTime(data.avgResponseTime),
      change: 0,
      icon: Clock,
      description: 'last 30 days',
      noChange: data.avgResponseTime === 0,
    },
    {
      title: 'This Week',
      value: thisWeekSessions.toLocaleString(),
      change: thisWeekChange,
      icon: TrendingUp,
      description: 'vs prev. week',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Real performance metrics from your chatbot data
          </p>
        </div>
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Live Data
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="rounded-md bg-primary/10 p-1.5">
                <stat.icon className="h-3.5 w-3.5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                {'noChange' in stat && stat.noChange ? (
                  <span className="flex items-center gap-0.5 text-muted-foreground">
                    <Minus className="h-3 w-3" />
                    No data yet
                  </span>
                ) : stat.change > 0 ? (
                  <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-400">
                    <ArrowUpRight className="h-3 w-3" />
                    {stat.change}%
                  </span>
                ) : stat.change < 0 ? (
                  <span className="flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 font-medium text-red-400">
                    <ArrowDownRight className="h-3 w-3" />
                    {Math.abs(stat.change)}%
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-muted-foreground">
                    <Minus className="h-3 w-3" />
                    0%
                  </span>
                )}
                <span className="text-muted-foreground">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Conversations Over Time</CardTitle>
              <CardDescription>Daily conversation count</CardDescription>
            </div>
            <Select value={chartRange} onValueChange={(v) => setChartRange(v as typeof chartRange)}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {filteredDailyData.every(d => d.sessions === 0) ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No conversation data for this period yet.
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={filteredDailyData}>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="var(--color-sessions)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-sessions)', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Messages Over Time</CardTitle>
            <CardDescription>Daily message count</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDailyData.every(d => d.messages === 0) ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No message data for this period yet.
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={filteredDailyData}>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="messages" fill="var(--color-messages)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Referrer Pages</CardTitle>
            <CardDescription>Where conversations originate</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topPages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">No referrer data yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">Pages will appear once visitors start chatting.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.topPages.map((item) => (
                  <div key={item.page} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium font-mono text-xs">{item.page}</span>
                        <span className="shrink-0 text-muted-foreground">{item.count}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.max(item.percent, 3)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Response Times</CardTitle>
            <CardDescription>Average time to first admin response</CardDescription>
          </CardHeader>
          <CardContent>
            {data.responseTimeDistribution.every(d => d.value === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">No response data yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">Reply to conversations to see response time metrics.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.responseTimeDistribution.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground">{item.value}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.max(item.value, 1)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peak Hours</CardTitle>
            <CardDescription>When visitors are most active</CardDescription>
          </CardHeader>
          <CardContent>
            {data.peakHours.every(d => d.value === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">No activity data yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">Peak hours will show once visitors start chatting.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.peakHours.map((item) => (
                  <div key={item.hour} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.hour}</span>
                        <span className="text-muted-foreground">{item.value}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.max(item.value, 1)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
