'use client'

import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const VINTRA_LOGO = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/vintratext-skOk2ureyF4j9EWL7jotcLG1aD5kpr.png"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  Palette,
  Settings,
  BarChart3,
  MessagesSquare,
  LogOut,
  ChevronUp,
  Code2,
} from 'lucide-react'

interface AdminSidebarProps {
  user: User
  profile: {
    company_name: string | null
    avatar_url: string | null
  } | null
}

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin',
  },
  {
    title: 'Conversations',
    icon: MessageSquare,
    href: '/admin/conversations',
  },
  {
    title: 'Canned Responses',
    icon: MessagesSquare,
    href: '/admin/responses',
  },
  {
    title: 'Appearance',
    icon: Palette,
    href: '/admin/appearance',
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    href: '/admin/analytics',
  },
  {
    title: 'Integration',
    icon: Code2,
    href: '/admin/integration',
  },
  {
    title: 'Settings',
    icon: Settings,
    href: '/admin/settings',
  },
]

export function AdminSidebar({ user, profile }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // Clear auth cookies
    document.cookie = 'sb-auth-token=; path=/; max-age=0'
    document.cookie = 'sb-refresh-token=; path=/; max-age=0'
    router.push('/auth/login')
    router.refresh()
  }

  const getInitials = () => {
    if (profile?.company_name) {
      return profile.company_name.slice(0, 2).toUpperCase()
    }
    return user.email?.slice(0, 2).toUpperCase() || 'VS'
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/admin" className="flex items-center px-2 py-3">
              <Image 
                src={VINTRA_LOGO} 
                alt="Vintra" 
                width={100} 
                height={32} 
                className="h-7 w-auto"
              />
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.href === '/admin'
                        ? pathname === '/admin'
                        : pathname.startsWith(item.href)
                    }
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col items-start text-left">
                    <span className="truncate text-sm font-medium text-sidebar-foreground">
                      {profile?.company_name || 'My Workspace'}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      {user.email}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 text-sidebar-foreground/60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
