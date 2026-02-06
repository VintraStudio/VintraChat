import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminId = user.id
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Run all count queries in parallel
    const [
      totalSessionsRes,
      totalMessagesRes,
      currentSessionsRes,
      previousSessionsRes,
      currentMessagesRes,
      previousMessagesRes,
      dailySessionsRes,
      dailyMessagesRes,
      allMessagesRes,
      sessionsWithMetaRes,
    ] = await Promise.all([
      supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', adminId),
      supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', adminId),
      supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', adminId)
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', adminId)
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', adminId)
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', adminId)
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('chat_sessions')
        .select('created_at')
        .eq('admin_id', adminId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true }),
      supabase
        .from('chat_messages')
        .select('created_at')
        .eq('admin_id', adminId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true }),
      supabase
        .from('chat_messages')
        .select('session_id, sender_type, created_at')
        .eq('admin_id', adminId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true }),
      supabase
        .from('chat_sessions')
        .select('metadata')
        .eq('admin_id', adminId)
        .not('metadata', 'is', null),
    ])

    const totalSessions = totalSessionsRes.count || 0
    const totalMessages = totalMessagesRes.count || 0
    const currentPeriodSessions = currentSessionsRes.count || 0
    const previousPeriodSessions = previousSessionsRes.count || 0
    const currentPeriodMessages = currentMessagesRes.count || 0
    const previousPeriodMessages = previousMessagesRes.count || 0

    // Calculate percentage changes
    const sessionsChange = previousPeriodSessions
      ? Math.round((currentPeriodSessions - previousPeriodSessions) / previousPeriodSessions * 100)
      : currentPeriodSessions ? 100 : 0

    const messagesChange = previousPeriodMessages
      ? Math.round((currentPeriodMessages - previousPeriodMessages) / previousPeriodMessages * 100)
      : currentPeriodMessages ? 100 : 0

    // Group daily data by day
    const dailyData: Record<string, { sessions: number; messages: number }> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dailyData[key] = { sessions: 0, messages: 0 }
    }

    const dailySessions = dailySessionsRes.data || []
    const dailyMessages = dailyMessagesRes.data || []

    dailySessions.forEach(s => {
      const key = new Date(s.created_at).toISOString().split('T')[0]
      if (dailyData[key]) dailyData[key].sessions++
    })

    dailyMessages.forEach(m => {
      const key = new Date(m.created_at).toISOString().split('T')[0]
      if (dailyData[key]) dailyData[key].messages++
    })

    const chartData = Object.entries(dailyData).map(([date, data]) => ({
      date,
      sessions: data.sessions,
      messages: data.messages,
    }))

    // Calculate response time metrics (avg + distribution in one pass)
    const allMessages = allMessagesRes.data || []
    let totalResponseTime = 0
    let responseCount = 0
    const responseTimeBuckets = { under1: 0, under5: 0, under30: 0, over30: 0 }

    // Group messages by session
    const sessionMessages: Record<string, typeof allMessages> = {}
    allMessages.forEach(m => {
      if (!sessionMessages[m.session_id]) sessionMessages[m.session_id] = []
      sessionMessages[m.session_id].push(m)
    })

    // Single pass: compute both avg and distribution
    Object.values(sessionMessages).forEach(msgs => {
      for (let i = 1; i < msgs.length; i++) {
        if (msgs[i].sender_type === 'admin' && msgs[i - 1].sender_type === 'visitor') {
          const diffMs = new Date(msgs[i].created_at).getTime() - new Date(msgs[i - 1].created_at).getTime()
          totalResponseTime += diffMs
          responseCount++

          const diffMin = diffMs / 60000
          if (diffMin < 1) responseTimeBuckets.under1++
          else if (diffMin < 5) responseTimeBuckets.under5++
          else if (diffMin < 30) responseTimeBuckets.under30++
          else responseTimeBuckets.over30++
        }
      }
    })

    const avgResponseTimeMs = responseCount > 0 ? totalResponseTime / responseCount : 0
    const avgResponseTimeMin = Math.round(avgResponseTimeMs / 60000 * 10) / 10

    const totalResponses = responseTimeBuckets.under1 + responseTimeBuckets.under5 + responseTimeBuckets.under30 + responseTimeBuckets.over30
    const responseTimeDistribution = totalResponses > 0 ? [
      { label: 'Under 1 min', value: Math.round(responseTimeBuckets.under1 / totalResponses * 100) },
      { label: '1-5 mins', value: Math.round(responseTimeBuckets.under5 / totalResponses * 100) },
      { label: '5-30 mins', value: Math.round(responseTimeBuckets.under30 / totalResponses * 100) },
      { label: 'Over 30 mins', value: Math.round(responseTimeBuckets.over30 / totalResponses * 100) },
    ] : [
      { label: 'Under 1 min', value: 0 },
      { label: '1-5 mins', value: 0 },
      { label: '5-30 mins', value: 0 },
      { label: 'Over 30 mins', value: 0 },
    ]

    // Peak hours from session data
    const hourBuckets: Record<number, number> = {}
    for (let h = 0; h < 24; h++) hourBuckets[h] = 0

    dailySessions.forEach(s => {
      const hour = new Date(s.created_at).getHours()
      hourBuckets[hour]++
    })

    const totalSessionsForHours = Object.values(hourBuckets).reduce((a, b) => a + b, 0)
    const peakHours = [
      { hour: '6 AM - 12 PM', value: 0 },
      { hour: '12 PM - 6 PM', value: 0 },
      { hour: '6 PM - 12 AM', value: 0 },
      { hour: '12 AM - 6 AM', value: 0 },
    ]

    for (let h = 6; h < 12; h++) peakHours[0].value += hourBuckets[h]
    for (let h = 12; h < 18; h++) peakHours[1].value += hourBuckets[h]
    for (let h = 18; h < 24; h++) peakHours[2].value += hourBuckets[h]
    for (let h = 0; h < 6; h++) peakHours[3].value += hourBuckets[h]

    if (totalSessionsForHours > 0) {
      peakHours.forEach(p => {
        p.value = Math.round(p.value / totalSessionsForHours * 100)
      })
    }

    // Page referrers from session metadata
    const sessionsWithMeta = sessionsWithMetaRes.data || []
    const pageCounts: Record<string, number> = {}
    sessionsWithMeta.forEach(s => {
      const meta = s.metadata as Record<string, string> | null
      const referrer = meta?.referrer
      if (referrer) {
        try {
          const url = new URL(referrer)
          const page = url.pathname || '/'
          pageCounts[page] = (pageCounts[page] || 0) + 1
        } catch {
          pageCounts[referrer] = (pageCounts[referrer] || 0) + 1
        }
      }
    })

    const totalPageHits = Object.values(pageCounts).reduce((a, b) => a + b, 0)
    const topPages = Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([page, count]) => ({
        page,
        count,
        percent: totalPageHits > 0 ? Math.round(count / totalPageHits * 100) : 0,
      }))

    return NextResponse.json({
      totalSessions,
      totalMessages,
      sessionsChange,
      messagesChange,
      avgResponseTime: avgResponseTimeMin,
      responseTimeDistribution,
      dailyData: chartData,
      peakHours,
      topPages,
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
