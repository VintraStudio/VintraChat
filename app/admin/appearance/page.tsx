'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, Bot, Check, RotateCcw, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

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

const COLOR_PRESETS = [
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Slate', value: '#475569' },
]

export default function AppearancePage() {
  const [config, setConfig] = useState<ChatbotConfig | null>(null)
  const [originalConfig, setOriginalConfig] = useState<ChatbotConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let { data } = await supabase
      .from('chatbot_configs')
      .select('*')
      .eq('admin_id', user.id)
      .single()

    // Auto-create default config if none exists
    if (!data) {
      const { data: newConfig } = await supabase
        .from('chatbot_configs')
        .insert({
          admin_id: user.id,
          name: 'My Chatbot',
          widget_title: 'Chat with us',
          welcome_message: 'Hi! How can we help you today?',
          primary_color: '#14b8a6',
          position: 'bottom-right',
          show_branding: true,
          placeholder_text: 'Type your message...',
          offline_message: "We're currently offline. Leave a message and we'll get back to you!",
        })
        .select('*')
        .single()
      data = newConfig
    }

    if (data) {
      setConfig(data)
      setOriginalConfig(data)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
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

    if (error) {
      toast.error('Failed to save changes', {
        description: 'Please try again or check your connection.',
      })
    } else {
      setOriginalConfig(config)
      toast.success('Changes saved', {
        description: 'Your widget appearance has been updated. Changes are live immediately.',
      })
    }
  }

  const handleReset = () => {
    if (originalConfig) {
      setConfig(originalConfig)
      toast.info('Changes reverted', {
        description: 'All unsaved changes have been discarded.',
      })
    }
  }

  const hasChanges = config && originalConfig && JSON.stringify(config) !== JSON.stringify(originalConfig)

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appearance</h1>
          <p className="text-sm text-muted-foreground">
            Customize how your chatbot looks and feels
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">
                Unsaved changes
              </Badge>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Revert
              </Button>
            </>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
            {saving ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-2 h-3.5 w-3.5" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Settings */}
        <div className="space-y-6 lg:col-span-3">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Messages</CardTitle>
                  <CardDescription>
                    Configure the text displayed in your chat widget
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
                    <p className="text-xs text-muted-foreground">Shown in the chat header</p>
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
                    <p className="text-xs text-muted-foreground">First message visitors see when they start a chat</p>
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
                    <p className="text-xs text-muted-foreground">Shown when you are not available</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="style" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Colors</CardTitle>
                  <CardDescription>
                    Choose a primary color for your widget
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label>Color Presets</Label>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => setConfig({ ...config, primary_color: preset.value })}
                          className="group relative flex h-10 w-10 items-center justify-center rounded-lg border-2 transition-all hover:scale-105"
                          style={{
                            backgroundColor: preset.value,
                            borderColor: config.primary_color === preset.value ? 'white' : 'transparent',
                          }}
                          title={preset.name}
                        >
                          {config.primary_color === preset.value && (
                            <Check className="h-4 w-4 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Custom Color</Label>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Position</CardTitle>
                  <CardDescription>
                    Where the widget appears on your website
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="behavior" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Branding</CardTitle>
                  <CardDescription>
                    Control VintraStudio branding visibility
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Branding</Label>
                      <p className="text-xs text-muted-foreground">
                        {'Display "Powered by VintraStudio" in the widget'}
                      </p>
                    </div>
                    <Switch
                      checked={config.show_branding}
                      onCheckedChange={(checked) => setConfig({ ...config, show_branding: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-20">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Live Preview</CardTitle>
                <CardDescription>
                  Real-time preview of your widget
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative rounded-lg border bg-muted/30 p-4" style={{ minHeight: '480px' }}>
                  {/* Simulated website background */}
                  <div className="mb-4 space-y-2 opacity-20">
                    <div className="h-3 w-3/4 rounded bg-muted-foreground" />
                    <div className="h-3 w-1/2 rounded bg-muted-foreground" />
                    <div className="h-3 w-2/3 rounded bg-muted-foreground" />
                    <div className="mt-6 h-24 rounded bg-muted-foreground" />
                    <div className="h-3 w-3/4 rounded bg-muted-foreground" />
                    <div className="h-3 w-1/3 rounded bg-muted-foreground" />
                  </div>

                  {/* Chat Window Preview */}
                  <div
                    className={`absolute bottom-14 ${config.position === 'bottom-left' ? 'left-4' : 'right-4'}`}
                  >
                    <div
                      className="w-72 overflow-hidden rounded-xl shadow-2xl"
                      style={{ border: '1px solid hsl(var(--border))' }}
                    >
                      {/* Header */}
                      <div
                        className="flex items-center gap-3 p-3.5"
                        style={{ backgroundColor: config.primary_color, color: 'white' }}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                          <Bot className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-semibold">{config.widget_title || 'Chat with us'}</h4>
                          <p className="text-[11px] opacity-80">Online</p>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="h-48 space-y-2.5 bg-white p-3.5">
                        {/* Welcome message */}
                        <div
                          className="max-w-[85%] rounded-lg rounded-tl-sm p-2.5 text-[12px] leading-relaxed text-white"
                          style={{ backgroundColor: config.primary_color }}
                        >
                          {config.welcome_message || 'Hi! How can we help you today?'}
                        </div>
                        {/* Sample visitor reply */}
                        <div className="ml-auto max-w-[75%] rounded-lg rounded-tr-sm bg-gray-100 p-2.5 text-[12px] leading-relaxed text-gray-700">
                          Hi, I have a question!
                        </div>
                        {/* Sample bot reply */}
                        <div
                          className="max-w-[85%] rounded-lg rounded-tl-sm p-2.5 text-[12px] leading-relaxed text-white"
                          style={{ backgroundColor: config.primary_color }}
                        >
                          Sure! How can I help you?
                        </div>
                      </div>

                      {/* Input */}
                      <div className="border-t border-gray-100 bg-white p-2.5">
                        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                          <span className="flex-1 text-[11px] text-gray-400">
                            {config.placeholder_text || 'Type your message...'}
                          </span>
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full"
                            style={{ backgroundColor: config.primary_color }}
                          >
                            <MessageSquare className="h-3 w-3 text-white" />
                          </div>
                        </div>
                        {config.show_branding && (
                          <p className="mt-1.5 text-center text-[9px] text-gray-400">
                            Powered by VintraStudio
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Launcher Button */}
                  <div
                    className={`absolute bottom-3 ${config.position === 'bottom-left' ? 'left-4' : 'right-4'} flex h-11 w-11 items-center justify-center rounded-full shadow-lg`}
                    style={{ backgroundColor: config.primary_color }}
                  >
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
