'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Palette,
  Code2,
  MessagesSquare,
  BarChart3,
  ExternalLink,
  Circle,
  Loader2
} from 'lucide-react'

interface DashboardStats {
  totalSessions: number
  totalMessages: number
  recentSessions: number
  activeSessions: number
  uniqueVisitors: number
  sessionsChange: number
  messagesChange: number
}

interface RecentConversation {
  id: string
  visitor_name: string | null
  visitor_email: string | null
  status: string
  created_at: string
  chat_messages: { id: string; content: string; sender_type: string; created_at: string }[]
}

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-400">
        <ArrowUpRight className="h-3 w-3" />
        {change}%
      </span>
    )
  }
  if (change < 0) {
    return (
      <span className="flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 font-medium text-red-400">
        <ArrowDownRight className="h-3 w-3" />
        {Math.abs(change)}%
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-muted-foreground">
      <Minus className="h-3 w-3" />
      0%
    </span>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([])
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    // Run all queries in parallel
    const [
      totalSessionsRes,
      totalMessagesRes,
      currentSessionsRes,
      previousSessionsRes,
      currentMessagesRes,
      previousMessagesRes,
      activeSessionsRes,
      uniqueVisitorsRes,
      recentRes,
    ] = await Promise.all([
      supabase.from('chat_sessions').select('*', { count: 'exact', head: true }).eq('admin_id', user.id),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('admin_id', user.id),
      supabase.from('chat_sessions').select('*', { count: 'exact', head: true }).eq('admin_id', user.id).gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('chat_sessions').select('*', { count: 'exact', head: true }).eq('admin_id', user.id).gte('created_at', fourteenDaysAgo.toISOString()).lt('created_at', sevenDaysAgo.toISOString()),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('admin_id', user.id).gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('admin_id', user.id).gte('created_at', fourteenDaysAgo.toISOString()).lt('created_at', sevenDaysAgo.toISOString()),
      supabase.from('chat_sessions').select('*', { count: 'exact', head: true }).eq('admin_id', user.id).eq('status', 'active'),
      supabase.from('chat_sessions').select('visitor_email').eq('admin_id', user.id).not('visitor_email', 'is', null),
      supabase.from('chat_sessions').select(`id, visitor_name, visitor_email, status, created_at, chat_messages ( id, content, sender_type, created_at )`).eq('admin_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])

    const currentSessions = currentSessionsRes.count || 0
    const previousSessions = previousSessionsRes.count || 0
    const currentMessages = currentMessagesRes.count || 0
    const previousMessages = previousMessagesRes.count || 0

    const uniqueEmails = new Set(uniqueVisitorsRes.data?.map(v => v.visitor_email) || [])

    const sessionsChange = previousSessions
      ? Math.round((currentSessions - previousSessions) / previousSessions * 100)
      : currentSessions ? 100 : 0

    const messagesChange = previousMessages
      ? Math.round((currentMessages - previousMessages) / previousMessages * 100)
      : currentMessages ? 100 : 0

    setStats({
      totalSessions: totalSessionsRes.count || 0,
      totalMessages: totalMessagesRes.count || 0,
      recentSessions: currentSessions,
      activeSessions: activeSessionsRes.count || 0,
      uniqueVisitors: uniqueEmails.size,
      sessionsChange,
      messagesChange,
    })

    setRecentConversations(recentRes.data || [])
    setLoading(false)
  }, [])

  // Initial load + auto-refresh every 15 seconds
  useEffect(() => {
    loadDashboard()
    const interval = setInterval(loadDashboard, 15000)
    return () => clearInterval(interval)
  }, [loadDashboard])

  // Also subscribe to realtime for instant updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, () => loadDashboard())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => loadDashboard())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadDashboard])

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Conversations',
      value: stats.totalSessions,
      icon: Users,
      change: stats.sessionsChange,
      description: 'vs last week',
    },
    {
      title: 'Messages',
      value: stats.totalMessages,
      icon: MessageSquare,
      change: stats.messagesChange,
      description: 'vs last week',
    },
    {
      title: 'Active Now',
      value: stats.activeSessions,
      icon: Zap,
      isLive: true,
      description: 'Real-time',
    },
    {
      title: 'This Week',
      value: stats.recentSessions,
      icon: TrendingUp,
      change: stats.sessionsChange,
      description: 'last 7 days',
    },
  ]

  const quickActions = [
    { title: 'Conversations', description: 'View and reply to chats', icon: MessageSquare, href: '/admin/conversations', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Customize Widget', description: 'Change colors and text', icon: Palette, href: '/admin/appearance', color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { title: 'Canned Responses', description: 'Manage quick replies', icon: MessagesSquare, href: '/admin/responses', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Get Embed Code', description: 'Install on your site', icon: Code2, href: '/admin/integration', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { title: 'View Analytics', description: 'Performance metrics', icon: BarChart3, href: '/admin/analytics', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { title: 'Preview Widget', description: 'See it in action', icon: ExternalLink, href: '/widget-preview', color: 'text-orange-400', bg: 'bg-orange-500/10', external: true },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your chatbot performance and recent activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
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
                {'isLive' in stat && stat.isLive ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {stat.value > 0 && (
                      <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
                    )}
                    {stat.value > 0 ? 'Live' : 'None'}
                  </span>
                ) : (
                  <ChangeIndicator change={'change' in stat ? stat.change : 0} />
                )}
                <span className="text-muted-foreground">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              {...('external' in action && action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              <Card className="group cursor-pointer transition-all hover:border-primary/30 hover:bg-card/80">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${action.bg}`}>
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {action.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-all group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Conversations */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Conversations</CardTitle>
              <CardDescription>Latest chat sessions from your visitors</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/conversations" className="text-xs">
                View All
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3">
                  <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <h3 className="mt-4 text-sm font-medium">No conversations yet</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Install the widget on your website to start receiving chats.
                </p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/admin/integration">Get Started</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {recentConversations.map((conversation) => {
                  const lastMessage = conversation.chat_messages?.[conversation.chat_messages.length - 1]
                  return (
                    <Link
                      key={conversation.id}
                      href="/admin/conversations"
                      className="flex items-start justify-between rounded-lg p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {conversation.visitor_name?.[0]?.toUpperCase() || 'V'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {conversation.visitor_name || 'Anonymous Visitor'}
                            </span>
                            <Badge 
                              variant={conversation.status === 'active' ? 'default' : 'secondary'}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {conversation.status}
                            </Badge>
                          </div>
                          {lastMessage && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {new Date(conversation.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Activity Summary</CardTitle>
            <CardDescription>Your chatbot at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-sm">Active Sessions</span>
                </div>
                <span className="text-sm font-bold">{stats.activeSessions}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-400" />
                  <span className="text-sm">Unique Visitors</span>
                </div>
                <span className="text-sm font-bold">{stats.uniqueVisitors}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-sm">This Week</span>
                </div>
                <span className="text-sm font-bold">{stats.recentSessions}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-pink-400" />
                  <span className="text-sm">Total Messages</span>
                </div>
                <span className="text-sm font-bold">{stats.totalMessages}</span>
              </div>
            </div>

            <div className="rounded-lg border border-dashed p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-1.5">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Pro Tip</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    Set up canned responses to reply faster to common questions and improve your response time.
                  </p>
                  <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs text-primary" asChild>
                    <Link href="/admin/responses">
                      Set up responses
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
