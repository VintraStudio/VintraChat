'use client'

import { User } from '@supabase/supabase-js'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, ExternalLink, Circle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AdminHeaderProps {
  user: User
  chatbotId?: string
}

export function AdminHeader({ chatbotId }: AdminHeaderProps) {
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
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Notifications
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <div className="flex items-center gap-2">
                  <Circle className="h-1.5 w-1.5 fill-primary text-primary" />
                  <span className="text-sm font-medium">New conversation started</span>
                </div>
                <span className="ml-3.5 text-xs text-muted-foreground">
                  A visitor started a new chat 5 minutes ago
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <div className="flex items-center gap-2">
                  <Circle className="h-1.5 w-1.5 fill-primary text-primary" />
                  <span className="text-sm font-medium">Widget installed</span>
                </div>
                <span className="ml-3.5 text-xs text-muted-foreground">
                  Your chatbot is now live on your website
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <div className="flex items-center gap-2">
                  <Circle className="h-1.5 w-1.5 fill-muted-foreground/50 text-muted-foreground/50" />
                  <span className="text-sm font-medium">Weekly report ready</span>
                </div>
                <span className="ml-3.5 text-xs text-muted-foreground">
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
