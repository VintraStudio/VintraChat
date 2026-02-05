'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Copy, Check, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function WidgetPreviewPage() {
  const [chatbotId, setChatbotId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [widgetLoaded, setWidgetLoaded] = useState(false)

  useEffect(() => {
    async function loadConfig() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data } = await supabase
          .from('chatbot_configs')
          .select('id')
          .eq('admin_id', user.id)
          .single()
        
        setChatbotId(data?.id || null)
      }
      setLoading(false)
    }

    loadConfig()
  }, [])

  useEffect(() => {
    if (chatbotId && !widgetLoaded) {
      // Dynamically load the widget script
      const script = document.createElement('script')
      script.src = '/api/widget.js'
      script.dataset.chatbotId = chatbotId
      script.async = true
      document.body.appendChild(script)
      setWidgetLoaded(true)

      return () => {
        // Cleanup widget on unmount
        const widgetContainer = document.getElementById('vintra-chat-widget')
        if (widgetContainer) {
          widgetContainer.remove()
        }
        script.remove()
      }
    }
  }, [chatbotId, widgetLoaded])

  const handleCopy = () => {
    if (chatbotId) {
      navigator.clipboard.writeText(
        `<script src="${window.location.origin}/api/widget.js" data-chatbot-id="${chatbotId}" async></script>`
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-foreground">
            Vintra
          </Link>
          <Badge variant="secondary">Preview Mode</Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Widget Preview</h1>
          <p className="mt-3 text-muted-foreground">
            This is a preview of how the chat widget will appear on your website.
            Look for the chat button in the bottom-right corner.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {chatbotId ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Chatbot ID</CardTitle>
                  <CardDescription>
                    Use this ID when installing the widget
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 font-mono text-sm">
                      {chatbotId}
                    </code>
                    <Button variant="outline" size="icon" onClick={handleCopy}>
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Installation Code</CardTitle>
                  <CardDescription>
                    Add this script to your website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-xs text-zinc-100">
                    <code>{`<script
  src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/widget.js"
  data-chatbot-id="${chatbotId}"
  async
></script>`}</code>
                  </pre>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Not Logged In</CardTitle>
                <CardDescription>
                  Log in to your admin panel to see your chatbot ID and test the widget.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/auth/login">
                    Go to Login
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview Area */}
        <Card className="mt-10">
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              The chat widget should appear in the bottom-right corner of this page.
              Try clicking on it to test the functionality.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[300px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
              <div className="text-center">
                <p className="text-muted-foreground">
                  {chatbotId 
                    ? 'Chat widget is active - look for the button in the bottom-right corner'
                    : 'Log in to test the chat widget'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Admin */}
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/admin">
              Back to Admin Dashboard
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
