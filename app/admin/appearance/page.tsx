'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, Bot } from 'lucide-react'

interface ChatbotConfig {
  id: string
  widget_title: string
  welcome_message: string
  primary_color: string
  position: string
  avatar_url: string | null
  show_branding: boolean
  offline_message: string
  placeholder_text: string
}

export default function AppearancePage() {
  const [config, setConfig] = useState<ChatbotConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('chatbot_configs')
      .select('*')
      .eq('admin_id', user.id)
      .single()

    if (data) {
      setConfig(data)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)

    const supabase = createClient()
    await supabase
      .from('chatbot_configs')
      .update({
        widget_title: config.widget_title,
        welcome_message: config.welcome_message,
        primary_color: config.primary_color,
        position: config.position,
        show_branding: config.show_branding,
        offline_message: config.offline_message,
        placeholder_text: config.placeholder_text,
      })
      .eq('id', config.id)

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appearance</h1>
          <p className="text-muted-foreground">
            No chatbot configuration found. Please contact support.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appearance</h1>
          <p className="text-muted-foreground">
            Customize how your chatbot looks and feels
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Settings</CardTitle>
              <CardDescription>
                Configure the basic appearance of your chat widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Widget Title</Label>
                <Input
                  id="title"
                  value={config.widget_title}
                  onChange={(e) => setConfig({ ...config, widget_title: e.target.value })}
                  placeholder="Chat with us"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcome">Welcome Message</Label>
                <Textarea
                  id="welcome"
                  value={config.welcome_message}
                  onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
                  placeholder="Hi! How can we help you today?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placeholder">Input Placeholder</Label>
                <Input
                  id="placeholder"
                  value={config.placeholder_text}
                  onChange={(e) => setConfig({ ...config, placeholder_text: e.target.value })}
                  placeholder="Type your message..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offline">Offline Message</Label>
                <Textarea
                  id="offline"
                  value={config.offline_message}
                  onChange={(e) => setConfig({ ...config, offline_message: e.target.value })}
                  placeholder="We're currently offline. Leave a message!"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Style & Position</CardTitle>
              <CardDescription>
                Adjust the visual style and positioning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="color">Primary Color</Label>
                <div className="flex gap-3">
                  <Input
                    id="color"
                    type="color"
                    value={config.primary_color}
                    onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                    className="h-10 w-16 cursor-pointer p-1"
                  />
                  <Input
                    value={config.primary_color}
                    onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                    placeholder="#14b8a6"
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Widget Position</Label>
                <Select
                  value={config.position}
                  onValueChange={(value) => setConfig({ ...config, position: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Branding</Label>
                  <p className="text-xs text-muted-foreground">
                    Display &quot;Powered by VintraStudio&quot;
                  </p>
                </div>
                <Switch
                  checked={config.show_branding}
                  onCheckedChange={(checked) => setConfig({ ...config, show_branding: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              See how your chat widget will look
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-lg border bg-muted/50 p-6" style={{ minHeight: '500px' }}>
              {/* Widget Preview */}
              <div 
                className={`absolute bottom-4 ${config.position === 'bottom-left' ? 'left-4' : 'right-4'}`}
              >
                {/* Chat Window */}
                <div 
                  className="mb-4 w-80 overflow-hidden rounded-xl shadow-2xl"
                  style={{ 
                    border: '1px solid hsl(var(--border))',
                  }}
                >
                  {/* Header */}
                  <div 
                    className="flex items-center gap-3 p-4 text-white"
                    style={{ backgroundColor: config.primary_color }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{config.widget_title}</h4>
                      <p className="text-xs opacity-80">Online</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="h-64 space-y-3 bg-background p-4">
                    <div 
                      className="max-w-[80%] rounded-lg rounded-tl-none p-3 text-sm text-white"
                      style={{ backgroundColor: config.primary_color }}
                    >
                      {config.welcome_message}
                    </div>
                  </div>

                  {/* Input */}
                  <div className="border-t bg-background p-3">
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                      <input
                        type="text"
                        placeholder={config.placeholder_text}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        disabled
                      />
                      <button
                        className="rounded-md p-1.5 text-white"
                        style={{ backgroundColor: config.primary_color }}
                        disabled
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                    {config.show_branding && (
                      <p className="mt-2 text-center text-xs text-muted-foreground">
                        Powered by VintraStudio
                      </p>
                    )}
                  </div>
                </div>

                {/* Launcher Button */}
                <div 
                  className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg ${config.position === 'bottom-left' ? '' : 'ml-auto'}`}
                  style={{ backgroundColor: config.primary_color }}
                >
                  <Bot className="h-6 w-6" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
