'use client'

import { User } from '@supabase/supabase-js'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, ExternalLink } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AdminHeaderProps {
  user: User
  chatbotId?: string
}

export function AdminHeader({ chatbotId }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-3">
          {chatbotId && (
            <Badge variant="secondary" className="font-mono text-xs">
              ID: {chatbotId.slice(0, 8)}...
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-2 sm:flex bg-transparent"
            asChild
          >
            <a href="/widget-preview" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Preview Widget
            </a>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 text-sm font-medium">Notifications</div>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <span className="text-sm font-medium">New conversation started</span>
                <span className="text-xs text-muted-foreground">
                  A visitor started a new chat 5 minutes ago
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <span className="text-sm font-medium">Widget installed successfully</span>
                <span className="text-xs text-muted-foreground">
                  Your chatbot is now live on your website
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <span className="text-sm font-medium">Weekly report ready</span>
                <span className="text-xs text-muted-foreground">
                  View your chatbot performance metrics
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
