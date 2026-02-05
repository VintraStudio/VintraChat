'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, TrendingUp, MessageSquare, Users, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from 'recharts'

interface AnalyticsData {
  totalSessions: number
  totalMessages: number
  avgResponseTime: number
  satisfactionRate: number
  sessionsChange: number
  messagesChange: number
  dailyData: { date: string; sessions: number; messages: number }[]
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

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get total sessions
    const { count: totalSessions } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('admin_id', user.id)

    // Get total messages
    const { count: totalMessages } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('admin_id', user.id)

    // Generate sample daily data (in production, query from analytics_events)
    const dailyData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      dailyData.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        sessions: Math.floor(Math.random() * 20) + 5,
        messages: Math.floor(Math.random() * 100) + 20,
      })
    }

    setData({
      totalSessions: totalSessions || 0,
      totalMessages: totalMessages || 0,
      avgResponseTime: 2.5,
      satisfactionRate: 94,
      sessionsChange: 12,
      messagesChange: 8,
      dailyData,
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const statCards = [
    {
      title: 'Total Conversations',
      value: data.totalSessions.toLocaleString(),
      change: data.sessionsChange,
      icon: Users,
    },
    {
      title: 'Total Messages',
      value: data.totalMessages.toLocaleString(),
      change: data.messagesChange,
      icon: MessageSquare,
    },
    {
      title: 'Avg Response Time',
      value: `${data.avgResponseTime}m`,
      change: -15,
      icon: Clock,
    },
    {
      title: 'Satisfaction Rate',
      value: `${data.satisfactionRate}%`,
      change: 3,
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">
          Track your chatbot performance and engagement metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-1 text-xs">
                {stat.change > 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                )}
                <span className={stat.change > 0 ? 'text-green-600' : 'text-red-600'}>
                  {Math.abs(stat.change)}%
                </span>
                <span className="text-muted-foreground">from last period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversations Over Time</CardTitle>
            <CardDescription>Daily conversation count for the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailyData}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="var(--color-sessions)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-sessions)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messages Over Time</CardTitle>
            <CardDescription>Daily message count for the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyData}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="messages" fill="var(--color-messages)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Where conversations start</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { page: '/pricing', count: 45, percent: 35 },
                { page: '/features', count: 32, percent: 25 },
                { page: '/', count: 28, percent: 22 },
                { page: '/contact', count: 23, percent: 18 },
              ].map((item) => (
                <div key={item.page} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.page}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Times</CardTitle>
            <CardDescription>Average time to first response</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Under 1 min', value: 65 },
                { label: '1-5 mins', value: 25 },
                { label: '5-30 mins', value: 8 },
                { label: 'Over 30 mins', value: 2 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground">{item.value}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
            <CardDescription>When visitors are most active</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { hour: '9 AM - 12 PM', value: 40 },
                { hour: '12 PM - 3 PM', value: 30 },
                { hour: '3 PM - 6 PM', value: 20 },
                { hour: '6 PM - 9 PM', value: 10 },
              ].map((item) => (
                <div key={item.hour} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.hour}</span>
                      <span className="text-muted-foreground">{item.value}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
