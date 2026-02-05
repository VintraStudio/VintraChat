'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, Copy, Code2, Globe, Loader2, CheckCircle2, Circle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface ChecklistState {
  chatbotCreated: boolean
  hasCustomized: boolean
  hasCannedResponses: boolean
  hasConversations: boolean
}

export default function IntegrationPage() {
  const [chatbotId, setChatbotId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<ChecklistState>({
    chatbotCreated: false,
    hasCustomized: false,
    hasCannedResponses: false,
    hasConversations: false,
  })
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load chatbot config
    const { data: config } = await supabase
      .from('chatbot_configs')
      .select('id, primary_color, widget_title, welcome_message')
      .eq('admin_id', user.id)
      .single()

    if (config) {
      setChatbotId(config.id)

      // Check if they've customized (not using defaults)
      const hasCustomized =
        config.primary_color !== '#14b8a6' ||
        config.widget_title !== 'Chat with us' ||
        config.welcome_message !== 'Hi! How can we help you today?'

      // Check for canned responses
      const { count: responseCount } = await supabase
        .from('canned_responses')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', user.id)

      // Check for conversations
      const { count: sessionCount } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', user.id)

      setChecklist({
        chatbotCreated: true,
        hasCustomized,
        hasCannedResponses: (responseCount || 0) > 0,
        hasConversations: (sessionCount || 0) > 0,
      })
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(null), 2000)
  }

  const scriptCode = `<!-- VintraStudio Chatbot Widget -->
<script
  src="${origin}/api/widget.js"
  data-chatbot-id="${chatbotId || 'YOUR_CHATBOT_ID'}"
  async
></script>`

  const reactCode = `// Install the widget in your React/Next.js app
import { useEffect } from 'react';

export function ChatWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${origin}/api/widget.js';
    script.setAttribute('data-chatbot-id', '${chatbotId || 'YOUR_CHATBOT_ID'}');
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  
  return null;
}`

  const checklistItems = [
    {
      label: 'Chatbot created',
      done: checklist.chatbotCreated,
      description: 'Your chatbot is set up and ready',
    },
    {
      label: 'Widget script added to your website',
      done: checklist.hasConversations,
      description: checklist.hasConversations
        ? 'Widget is installed and receiving chats'
        : 'Copy the script above and add it to your website',
    },
    {
      label: 'Customize appearance',
      done: checklist.hasCustomized,
      description: checklist.hasCustomized
        ? 'Widget appearance customized'
        : 'Change colors, text, and branding',
      href: '/admin/appearance',
    },
    {
      label: 'Add canned responses',
      done: checklist.hasCannedResponses,
      description: checklist.hasCannedResponses
        ? 'Quick replies configured'
        : 'Create quick replies for common questions',
      href: '/admin/responses',
    },
    {
      label: 'Test the widget',
      done: checklist.hasConversations,
      description: checklist.hasConversations
        ? 'First conversation received'
        : 'Open the widget preview to test it',
      href: '/widget-preview',
      external: true,
    },
  ]

  const completedCount = checklistItems.filter(i => i.done).length
  const progressPercent = Math.round((completedCount / checklistItems.length) * 100)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integration</h1>
        <p className="text-sm text-muted-foreground">
          Add the chat widget to your website in seconds
        </p>
      </div>

      {/* Chatbot ID */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-5 w-5" />
            Your Chatbot ID
          </CardTitle>
          <CardDescription>
            Use this unique identifier to connect the widget to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded-lg bg-muted px-4 py-3 font-mono text-sm text-foreground select-all">
              {chatbotId || 'Loading...'}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(chatbotId || '', 'id')}
            >
              {copied === 'id' ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Installation Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="h-5 w-5" />
            Installation
          </CardTitle>
          <CardDescription>
            Choose your preferred method to add the widget
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="script">
            <TabsList className="mb-4 w-full justify-start">
              <TabsTrigger value="script">HTML Script</TabsTrigger>
              <TabsTrigger value="react">React / Next.js</TabsTrigger>
            </TabsList>

            <TabsContent value="script" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add this script tag just before the closing <code className="rounded bg-muted px-1.5 py-0.5 text-xs">&lt;/body&gt;</code> tag on your website.
              </p>
              <div className="relative">
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
                  <code>{scriptCode}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() => copyToClipboard(scriptCode, 'script')}
                >
                  {copied === 'script' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="react" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a component to load the widget in your React or Next.js application.
              </p>
              <div className="relative">
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
                  <code>{reactCode}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() => copyToClipboard(reactCode, 'react')}
                >
                  {copied === 'react' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dynamic Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Setup Checklist</CardTitle>
              <CardDescription>
                {completedCount === checklistItems.length
                  ? 'All steps complete - your widget is fully set up!'
                  : `${completedCount} of ${checklistItems.length} steps complete`}
              </CardDescription>
            </div>
            <Badge variant={completedCount === checklistItems.length ? 'default' : 'secondary'}>
              {progressPercent}%
            </Badge>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {checklistItems.map((item) => (
              <li key={item.label} className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  item.done ? 'bg-primary' : 'border-2 border-border'
                }`}>
                  {item.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                  ) : (
                    <Circle className="h-2 w-2 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1">
                  <span className={`text-sm ${item.done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {item.description}
                  </p>
                </div>
                {!item.done && item.href && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <a
                      href={item.href}
                      {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {item.external ? (
                        <ExternalLink className="mr-1 h-3 w-3" />
                      ) : null}
                      Set up
                    </a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
