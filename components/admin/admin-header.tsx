'use client'

import { useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, ExternalLink, Circle, MessageSquare, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface AdminHeaderProps {
  user: User
  chatbotId?: string
}

interface Notification {
  id: string
  type: 'new_session' | 'new_message'
  title: string
  description: string
  time: string
  read: boolean
  href: string
}

export function AdminHeader({ chatbotId }: AdminHeaderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch recent active sessions with unread messages
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('id, visitor_name, created_at, status')
      .eq('admin_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5)

    const items: Notification[] = []

    if (sessions) {
      for (const session of sessions) {
        // Check for unread visitor messages
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .eq('sender_type', 'visitor')
          .eq('is_read', false)

        if (count && count > 0) {
          items.push({
            id: session.id,
            type: 'new_message',
            title: `${count} unread message${count > 1 ? 's' : ''}`,
            description: `From ${session.visitor_name || 'Anonymous Visitor'}`,
            time: session.created_at,
            read: false,
            href: '/admin/conversations',
          })
        }
      }
    }

    setNotifications(items)
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const unreadCount = notifications.filter(n => !n.read).length

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-3">
          {chatbotId && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] tracking-wide border-border/60 text-muted-foreground">
                {chatbotId.slice(0, 8)}
              </Badge>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Circle className="h-1.5 w-1.5 fill-emerald-400 text-emerald-400" />
                <span className="hidden sm:inline">Online</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="hidden gap-2 text-xs text-muted-foreground hover:text-foreground sm:flex"
            asChild
          >
            <a href="/widget-preview" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Preview
            </a>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Notifications
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Bell className="h-5 w-5 text-muted-foreground/30" />
                  <p className="mt-2 text-xs text-muted-foreground">No new notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3" asChild>
                    <Link href={notification.href}>
                      <div className="flex items-center gap-2">
                        <Circle className={`h-1.5 w-1.5 ${notification.read ? 'fill-muted-foreground/50 text-muted-foreground/50' : 'fill-primary text-primary'}`} />
                        <span className="text-sm font-medium">{notification.title}</span>
                      </div>
                      <div className="ml-3.5 flex items-center justify-between w-full">
                        <span className="text-xs text-muted-foreground">
                          {notification.description}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatTimeAgo(notification.time)}
                        </span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
