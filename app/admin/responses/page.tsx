'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loader2, Plus, MoreVertical, Pencil, Trash2, MessagesSquare, Search } from 'lucide-react'

interface CannedResponse {
  id: string
  title: string
  content: string
  shortcut: string | null
  category: string | null
  created_at: string
}

export default function ResponsesPage() {
  const [responses, setResponses] = useState<CannedResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    shortcut: '',
    category: '',
  })

  const loadResponses = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('canned_responses')
      .select('*')
      .eq('admin_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setResponses(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadResponses()
  }, [loadResponses])

  const handleOpenDialog = (response?: CannedResponse) => {
    if (response) {
      setEditingResponse(response)
      setFormData({
        title: response.title,
        content: response.content,
        shortcut: response.shortcut || '',
        category: response.category || '',
      })
    } else {
      setEditingResponse(null)
      setFormData({ title: '', content: '', shortcut: '', category: '' })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editingResponse) {
      await supabase
        .from('canned_responses')
        .update({
          title: formData.title,
          content: formData.content,
          shortcut: formData.shortcut || null,
          category: formData.category || null,
        })
        .eq('id', editingResponse.id)
    } else {
      await supabase.from('canned_responses').insert({
        admin_id: user.id,
        title: formData.title,
        content: formData.content,
        shortcut: formData.shortcut || null,
        category: formData.category || null,
      })
    }

    setDialogOpen(false)
    setSaving(false)
    await loadResponses()
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('canned_responses').delete().eq('id', id)
    await loadResponses()
  }

  const filteredResponses = responses.filter((response) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      response.title.toLowerCase().includes(searchLower) ||
      response.content.toLowerCase().includes(searchLower) ||
      response.shortcut?.toLowerCase().includes(searchLower) ||
      response.category?.toLowerCase().includes(searchLower)
    )
  })

  const categories = Array.from(new Set(responses.map((r) => r.category).filter(Boolean)))

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
          <h1 className="text-2xl font-bold text-foreground">Canned Responses</h1>
          <p className="text-muted-foreground">
            Create quick replies for common questions
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Response
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingResponse ? 'Edit Response' : 'Create New Response'}
              </DialogTitle>
              <DialogDescription>
                {editingResponse
                  ? 'Update your canned response'
                  : 'Create a quick reply for common questions'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Greeting"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Response Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Type your response message..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shortcut">Shortcut (optional)</Label>
                  <Input
                    id="shortcut"
                    value={formData.shortcut}
                    onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                    placeholder="/hello"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category (optional)</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="General"
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map((cat) => (
                      <option key={cat} value={cat || ''} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.title || !formData.content}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingResponse ? 'Save Changes' : 'Create Response'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search responses..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Responses Grid */}
      {filteredResponses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessagesSquare className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No canned responses yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first canned response to quickly reply to common questions.
            </p>
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Response
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResponses.map((response) => (
            <Card key={response.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{response.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      {response.shortcut && (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {response.shortcut}
                        </Badge>
                      )}
                      {response.category && (
                        <Badge variant="outline" className="text-xs">
                          {response.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(response)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(response.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="line-clamp-3 text-sm">
                  {response.content}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
