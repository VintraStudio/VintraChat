'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Loader2, 
  Search, 
  Users, 
  MessageSquare, 
  Mail, 
  Clock, 
  MoreVertical,
  ExternalLink,
  Download,
  UserCircle,
  ArrowUpDown,
  Circle
} from 'lucide-react'

interface Visitor {
  visitor_name: string | null
  visitor_email: string | null
  sessions: {
    id: string
    status: string
    created_at: string
    message_count: number
    last_message: string | null
    last_message_at: string | null
  }[]
  total_sessions: number
  total_messages: number
  first_seen: string
  last_seen: string
}

export default function ContactsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'last_seen' | 'total_messages' | 'total_sessions'>('last_seen')

  const loadVisitors = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: sessions } = await supabase
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
          created_at
        )
      `)
      .eq('admin_id', user.id)
      .order('created_at', { ascending: false })

    if (!sessions) {
      setLoading(false)
      return
    }

    // Group sessions by visitor email or name
    const visitorMap = new Map<string, Visitor>()

    for (const session of sessions) {
      const key = session.visitor_email || session.visitor_name || `anon-${session.id}`
      
      const messages = session.chat_messages || []
      const lastMsg = messages.length > 0 
        ? messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null

      if (visitorMap.has(key)) {
        const existing = visitorMap.get(key)!
        existing.sessions.push({
          id: session.id,
          status: session.status,
          created_at: session.created_at,
          message_count: messages.length,
          last_message: lastMsg?.content || null,
          last_message_at: lastMsg?.created_at || null,
        })
        existing.total_sessions += 1
        existing.total_messages += messages.length
        if (new Date(session.created_at) < new Date(existing.first_seen)) {
          existing.first_seen = session.created_at
        }
        if (new Date(session.updated_at || session.created_at) > new Date(existing.last_seen)) {
          existing.last_seen = session.updated_at || session.created_at
        }
      } else {
        visitorMap.set(key, {
          visitor_name: session.visitor_name,
          visitor_email: session.visitor_email,
          sessions: [{
            id: session.id,
            status: session.status,
            created_at: session.created_at,
            message_count: messages.length,
            last_message: lastMsg?.content || null,
            last_message_at: lastMsg?.created_at || null,
          }],
          total_sessions: 1,
          total_messages: messages.length,
          first_seen: session.created_at,
          last_seen: session.updated_at || session.created_at,
        })
      }
    }

    setVisitors(Array.from(visitorMap.values()))
    setLoading(false)
  }, [])

  useEffect(() => {
    loadVisitors()
  }, [loadVisitors])

  const filteredVisitors = visitors.filter((v) => {
    const q = searchQuery.toLowerCase()
    return (
      v.visitor_name?.toLowerCase().includes(q) ||
      v.visitor_email?.toLowerCase().includes(q)
    )
  })

  const sortedVisitors = [...filteredVisitors].sort((a, b) => {
    if (sortBy === 'last_seen') return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
    if (sortBy === 'total_messages') return b.total_messages - a.total_messages
    return b.total_sessions - a.total_sessions
  })

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Sessions', 'Messages', 'First Seen', 'Last Seen']
    const rows = sortedVisitors.map(v => [
      v.visitor_name || 'Anonymous',
      v.visitor_email || 'N/A',
      v.total_sessions.toString(),
      v.total_messages.toString(),
      new Date(v.first_seen).toLocaleDateString(),
      new Date(v.last_seen).toLocaleDateString(),
    ])
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vintra-contacts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleViewDetail = (visitor: Visitor) => {
    setSelectedVisitor(visitor)
    setDetailOpen(true)
  }

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
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            All visitors who have chatted with your widget
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={sortedVisitors.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{visitors.length}</p>
              <p className="text-xs text-muted-foreground">Total Contacts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <Mail className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {visitors.filter(v => v.visitor_email).length}
              </p>
              <p className="text-xs text-muted-foreground">With Email</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <MessageSquare className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {visitors.reduce((sum, v) => sum + v.total_messages, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Messages</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort: {sortBy === 'last_seen' ? 'Recent' : sortBy === 'total_messages' ? 'Messages' : 'Sessions'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortBy('last_seen')}>Most Recent</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('total_messages')}>Most Messages</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('total_sessions')}>Most Sessions</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Contacts Table */}
      {sortedVisitors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="mt-4 text-sm font-medium">No contacts yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Visitors who chat with your widget will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[280px]">Visitor</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVisitors.map((visitor, idx) => {
                  const hasActiveSessions = visitor.sessions.some(s => s.status === 'active')
                  return (
                    <TableRow 
                      key={idx} 
                      className="cursor-pointer"
                      onClick={() => handleViewDetail(visitor)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {visitor.visitor_name?.[0]?.toUpperCase() || 'V'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {visitor.visitor_name || 'Anonymous'}
                            </p>
                            {visitor.visitor_email && (
                              <p className="truncate text-xs text-muted-foreground">
                                {visitor.visitor_email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{visitor.total_sessions}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{visitor.total_messages}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(visitor.last_seen)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasActiveSessions ? (
                          <Badge variant="default" className="gap-1 text-[10px]">
                            <Circle className="h-1.5 w-1.5 fill-current" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Offline
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetail(visitor) }}>
                              <UserCircle className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {visitor.visitor_email && (
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()} asChild>
                                <a href={`mailto:${visitor.visitor_email}`}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Send Email
                                </a>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Visitor Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selectedVisitor?.visitor_name?.[0]?.toUpperCase() || 'V'}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="block">{selectedVisitor?.visitor_name || 'Anonymous Visitor'}</span>
                {selectedVisitor?.visitor_email && (
                  <span className="block text-sm font-normal text-muted-foreground">
                    {selectedVisitor.visitor_email}
                  </span>
                )}
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">Visitor details and session history</DialogDescription>
          </DialogHeader>

          {selectedVisitor && (
            <div className="space-y-5">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-lg font-bold">{selectedVisitor.total_sessions}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-lg font-bold">{selectedVisitor.total_messages}</p>
                  <p className="text-xs text-muted-foreground">Messages</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-lg font-bold">
                    {Math.ceil((new Date().getTime() - new Date(selectedVisitor.first_seen).getTime()) / (1000 * 60 * 60 * 24))}d
                  </p>
                  <p className="text-xs text-muted-foreground">Since First Visit</p>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="mb-3 text-sm font-medium">Session History</h4>
                <ScrollArea className="max-h-[260px]">
                  <div className="space-y-3">
                    {selectedVisitor.sessions.map((session) => (
                      <div key={session.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant={session.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                              {session.status}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(session.created_at).toLocaleDateString()} {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {session.message_count} messages
                          </p>
                          {session.last_message && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/70">
                              {session.last_message}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
