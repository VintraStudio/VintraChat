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
  Circle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadSessions = useCallback(async (selectFirst = false) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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
      .eq('admin_id', user.id)
      .order('updated_at', { ascending: false })

    if (data) {
      // Sort messages within each session
      const sortedData = data.map(session => ({
        ...session,
        chat_messages: [...session.chat_messages].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }))
      
      setSessions(sortedData)
      
      // Update selected session if it exists in new data
      if (selectedSession) {
        const updated = sortedData.find(s => s.id === selectedSession.id)
        if (updated) {
          setSelectedSession(updated)
        }
      } else if (selectFirst && sortedData.length > 0) {
        setSelectedSession(sortedData[0])
      }
    }
    setLoading(false)
  }, [selectedSession])

  // Setup real-time subscription
  useEffect(() => {
    const supabase = createClient()
    
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Subscribe to new messages
      const channel = supabase
        .channel('admin-chat-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
          },
          async (payload) => {
            console.log('[v0] New message received:', payload)
            // Reload sessions to get updated data
            await loadSessions()
            scrollToBottom()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_sessions',
          },
          async (payload) => {
            console.log('[v0] New session received:', payload)
            await loadSessions()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_sessions',
          },
          async (payload) => {
            console.log('[v0] Session updated:', payload)
            await loadSessions()
          }
        )
        .subscribe((status) => {
          console.log('[v0] Realtime subscription status:', status)
          setIsConnected(status === 'SUBSCRIBED')
        })

      channelRef.current = channel
    }

    setupRealtime()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [loadSessions])

  // Initial load
  useEffect(() => {
    loadSessions(true)
  }, [])

  // Scroll to bottom when selected session changes or new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [selectedSession?.chat_messages])

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
      // Update session's updated_at timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedSession.id)
    }

    setNewMessage('')
    setSending(false)
    // The realtime subscription will handle the update
  }

  const handleArchive = async (sessionId: string) => {
    const supabase = createClient()
    await supabase
      .from('chat_sessions')
      .update({ status: 'closed' })
      .eq('id', sessionId)
  }

  const handleDelete = async (sessionId: string) => {
    const supabase = createClient()
    
    // First delete all messages
    await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId)
    
    // Then delete the session
    await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
    
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null)
    }
    
    await loadSessions()
  }

  const filteredSessions = sessions.filter((session) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      session.visitor_name?.toLowerCase().includes(searchLower) ||
      session.visitor_email?.toLowerCase().includes(searchLower) ||
      session.chat_messages.some((m) => m.content.toLowerCase().includes(searchLower))
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
          <p className="text-muted-foreground">
            Manage and respond to chat conversations in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Circle 
              className={`h-2 w-2 ${isConnected ? 'fill-green-500 text-green-500' : 'fill-yellow-500 text-yellow-500'}`} 
            />
            <span className="text-muted-foreground">
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadSessions()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid h-[calc(100vh-220px)] gap-6 lg:grid-cols-3">
        {/* Sessions List */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No conversations found
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredSessions.map((session) => {
                    const lastMessage = session.chat_messages[session.chat_messages.length - 1]
                    const isSelected = selectedSession?.id === session.id
                    const hasNewMessages = lastMessage?.sender_type === 'visitor'
                    
                    return (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSession(session)}
                        className={`w-full p-4 text-left transition-colors hover:bg-muted/50 ${
                          isSelected ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {session.visitor_name?.[0]?.toUpperCase() || 'V'}
                                </AvatarFallback>
                              </Avatar>
                              {hasNewMessages && session.status === 'active' && (
                                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">
                                  {session.visitor_name || 'Anonymous'}
                                </span>
                                <Badge
                                  variant={session.status === 'active' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {session.status}
                                </Badge>
                              </div>
                              {lastMessage && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                  {lastMessage.sender_type === 'admin' && 'You: '}
                                  {lastMessage.content}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {new Date(session.updated_at || session.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat View */}
        <Card className="flex flex-col lg:col-span-2">
          {selectedSession ? (
            <>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedSession.visitor_name?.[0]?.toUpperCase() || 'V'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {selectedSession.visitor_name || 'Anonymous Visitor'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {selectedSession.visitor_email || 'No email provided'}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleArchive(selectedSession.id)}>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDelete(selectedSession.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {selectedSession.chat_messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                        <p className="mt-3 text-sm text-muted-foreground">
                          No messages yet. Send a message to start the conversation.
                        </p>
                      </div>
                    ) : (
                      selectedSession.chat_messages.map((message) => {
                        const isAdmin = message.sender_type === 'admin'
                        const isBot = message.sender_type === 'bot'
                        return (
                          <div
                            key={message.id}
                            className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}
                          >
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className={
                                isAdmin 
                                  ? 'bg-primary text-primary-foreground' 
                                  : isBot 
                                  ? 'bg-secondary text-secondary-foreground'
                                  : 'bg-muted'
                              }>
                                {isAdmin ? 'A' : isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`max-w-[70%] ${isAdmin ? 'text-right' : ''}`}>
                              <div
                                className={`inline-block rounded-lg px-4 py-2 text-sm ${
                                  isAdmin
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                {message.content}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
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
              </CardContent>
              <div className="border-t p-4">
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
                    className="min-h-[44px] resize-none"
                  />
                  <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
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
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 font-medium">No conversation selected</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a conversation from the list to view messages
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
