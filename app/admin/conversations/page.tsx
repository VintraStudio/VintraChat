'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Loader2, 
  Search, 
  MessageSquare, 
  Send,
  User,
  Bot,
  MoreVertical,
  Archive,
  Trash2,
  RefreshCw,
  Circle,
  Mail,
  Clock
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface ChatSession {
  id: string
  visitor_name: string | null
  visitor_email: string | null
  status: string
  created_at: string
  updated_at: string
  chat_messages: ChatMessage[]
}

interface ChatMessage {
  id: string
  content: string
  sender_type: 'visitor' | 'admin' | 'bot'
  created_at: string
}

export default function ConversationsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const userIdRef = useRef<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Derive selectedSession from sessions + selectedSessionId (no stale closure)
  const selectedSession = sessions.find(s => s.id === selectedSessionId) || null

  // Stable data fetcher that doesn't depend on any state
  const fetchSessions = useCallback(async () => {
    if (!userIdRef.current) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      userIdRef.current = user.id
    }

    const supabase = createClient()
    const { data } = await supabase
      .from('chat_sessions')
      .select(`
        id,
        visitor_name,
        visitor_email,
        status,
        created_at,
        updated_at,
        chat_messages (
          id,
          content,
          sender_type,
          created_at
        )
      `)
      .eq('admin_id', userIdRef.current)
      .order('updated_at', { ascending: false })

    if (!data) return []

    return data.map(session => ({
      ...session,
      chat_messages: [...session.chat_messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }))
  }, [])

  const refreshSessions = useCallback(async () => {
    const data = await fetchSessions()
    setSessions(data)
    return data
  }, [fetchSessions])

  // Initial load
  useEffect(() => {
    let mounted = true
    async function init() {
      const data = await fetchSessions()
      if (!mounted) return
      setSessions(data)
      if (data.length > 0) {
        setSelectedSessionId(data[0].id)
      }
      setLoading(false)
    }
    init()
    return () => { mounted = false }
  }, [fetchSessions])

  // Realtime subscription -- stable, no dependency on sessions/selectedSession
  useEffect(() => {
    const supabase = createClient()
    
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userIdRef.current = user.id

      const channel = supabase
        .channel('admin-chat-updates')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          () => {
            refreshSessions().then(() => {
              setTimeout(scrollToBottom, 100)
            })
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_sessions' },
          () => { refreshSessions() }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chat_sessions' },
          () => { refreshSessions() }
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED')
        })

      channelRef.current = channel
    }

    setupRealtime()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [refreshSessions])

  // Scroll to bottom when selected session messages change
  useEffect(() => {
    scrollToBottom()
  }, [selectedSession?.chat_messages?.length])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedSession) return
    setSending(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('chat_messages').insert({
      session_id: selectedSession.id,
      admin_id: user.id,
      content: newMessage,
      sender_type: 'admin',
    })

    if (!error) {
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedSession.id)
    }

    setNewMessage('')
    setSending(false)
    // Realtime will handle the refresh, but also do an immediate one
    await refreshSessions()
    setTimeout(scrollToBottom, 100)
  }

  const handleArchive = async (sessionId: string) => {
    const supabase = createClient()
    await supabase
      .from('chat_sessions')
      .update({ status: 'closed' })
      .eq('id', sessionId)
    await refreshSessions()
  }

  const handleReopen = async (sessionId: string) => {
    const supabase = createClient()
    await supabase
      .from('chat_sessions')
      .update({ status: 'active' })
      .eq('id', sessionId)
    await refreshSessions()
  }

  const handleDelete = async (sessionId: string) => {
    const supabase = createClient()
    
    await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId)
    
    await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
    
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null)
    }
    
    await refreshSessions()
  }

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const filteredSessions = sessions.filter((session) => {
    if (filter === 'active' && session.status !== 'active') return false
    if (filter === 'closed' && session.status !== 'closed') return false

    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    return (
      session.visitor_name?.toLowerCase().includes(searchLower) ||
      session.visitor_email?.toLowerCase().includes(searchLower) ||
      session.chat_messages.some((m) => m.content.toLowerCase().includes(searchLower))
    )
  })

  const activeSessions = sessions.filter(s => s.status === 'active').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Conversations</h1>
          <p className="text-sm text-muted-foreground">
            Manage and respond to chats in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border px-2.5 py-1">
            <Circle 
              className={`h-2 w-2 ${isConnected ? 'fill-emerald-400 text-emerald-400' : 'fill-amber-400 text-amber-400'}`} 
            />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refreshSessions()}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid h-[calc(100vh-200px)] gap-4 lg:grid-cols-3">
        {/* Sessions List */}
        <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
          {/* Search and Filter */}
          <div className="space-y-3 border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="h-9 pl-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList className="h-8 w-full">
                <TabsTrigger value="all" className="flex-1 text-xs h-7">
                  All ({sessions.length})
                </TabsTrigger>
                <TabsTrigger value="active" className="flex-1 text-xs h-7">
                  Active ({activeSessions})
                </TabsTrigger>
                <TabsTrigger value="closed" className="flex-1 text-xs h-7">
                  Closed ({sessions.length - activeSessions})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Sessions */}
          <ScrollArea className="flex-1">
            {filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="rounded-full bg-muted p-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="mt-3 text-sm font-medium">No conversations</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'Waiting for visitors to start chatting'}
                </p>
              </div>
            ) : (
              <div>
                {filteredSessions.map((session) => {
                  const lastMessage = session.chat_messages[session.chat_messages.length - 1]
                  const isSelected = selectedSessionId === session.id
                  const isUnread = lastMessage?.sender_type === 'visitor' && session.status === 'active'
                  
                  return (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`w-full border-b border-border/50 p-3 text-left transition-colors hover:bg-muted/50 ${
                        isSelected ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={`text-xs ${isSelected ? 'bg-primary/15 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                              {session.visitor_name?.[0]?.toUpperCase() || 'V'}
                            </AvatarFallback>
                          </Avatar>
                          {session.status === 'active' && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`truncate text-sm ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                              {session.visitor_name || 'Anonymous'}
                            </span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {formatTimeAgo(session.updated_at || session.created_at)}
                            </span>
                          </div>
                          {lastMessage && (
                            <p className={`mt-0.5 line-clamp-1 text-xs ${isUnread ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                              {lastMessage.sender_type === 'admin' && (
                                <span className="text-muted-foreground">{'You: '}</span>
                              )}
                              {lastMessage.content}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-1.5">
                            {session.visitor_email && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                                <Mail className="h-2.5 w-2.5" />
                                {session.visitor_email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat View */}
        <div className="flex flex-col overflow-hidden rounded-lg border bg-card lg:col-span-2">
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {selectedSession.visitor_name?.[0]?.toUpperCase() || 'V'}
                      </AvatarFallback>
                    </Avatar>
                    {selectedSession.status === 'active' && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">
                        {selectedSession.visitor_name || 'Anonymous Visitor'}
                      </h3>
                      <Badge 
                        variant={selectedSession.status === 'active' ? 'default' : 'secondary'}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {selectedSession.status}
                      </Badge>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {selectedSession.visitor_email || 'No email'}
                      <span className="text-muted-foreground/40">{'|'}</span>
                      <Clock className="h-3 w-3" />
                      {new Date(selectedSession.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {selectedSession.status === 'active' ? (
                      <DropdownMenuItem onClick={() => handleArchive(selectedSession.id)}>
                        <Archive className="mr-2 h-4 w-4" />
                        Close Conversation
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleReopen(selectedSession.id)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reopen Conversation
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDelete(selectedSession.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedSession.chat_messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="rounded-full bg-muted p-3">
                        <MessageSquare className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                      <p className="mt-3 text-sm font-medium">No messages yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Send a message to start the conversation.
                      </p>
                    </div>
                  ) : (
                    selectedSession.chat_messages.map((message) => {
                      const isAdmin = message.sender_type === 'admin'
                      const isBot = message.sender_type === 'bot'
                      return (
                        <div
                          key={message.id}
                          className={`flex gap-2.5 ${isAdmin ? 'flex-row-reverse' : ''}`}
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className={`text-[10px] ${
                              isAdmin 
                                ? 'bg-primary text-primary-foreground' 
                                : isBot 
                                ? 'bg-secondary text-secondary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {isAdmin ? 'A' : isBot ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`max-w-[70%] ${isAdmin ? 'text-right' : ''}`}>
                            <div
                              className={`inline-block rounded-xl px-3.5 py-2 text-sm leading-relaxed ${
                                isAdmin
                                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                  : 'bg-muted rounded-tl-sm'
                              }`}
                            >
                              {message.content}
                            </div>
                            <p className="mt-1 text-[10px] text-muted-foreground/60">
                              {new Date(message.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t p-3">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    rows={1}
                    className="min-h-[40px] resize-none text-sm"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={sending || !newMessage.trim()}
                    size="icon"
                    className="h-10 w-10 shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center px-4">
              <div className="rounded-full bg-muted p-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <h3 className="mt-4 text-sm font-medium">Select a conversation</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-[240px]">
                Choose a conversation from the list to view messages and reply
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
