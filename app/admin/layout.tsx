import React from "react"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user = null
  let profile = null
  let chatbot = null

  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error } = await supabase.auth.getUser()

    if (!authUser || error) {
      redirect('/auth/login')
    }

    user = authUser

    // Fetch admin profile
    const { data: profileData } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = profileData

    // Fetch chatbot config
    const { data: chatbotData } = await supabase
      .from('chatbot_configs')
      .select('*')
      .eq('admin_id', user.id)
      .single()
    chatbot = chatbotData
  } catch (e) {
    // If it's a redirect, rethrow it
    if (e && typeof e === 'object' && 'digest' in e) throw e
    // Otherwise redirect to login
    redirect('/auth/login')
  }

  return (
    <SidebarProvider>
      <AdminSidebar user={user} profile={profile} />
      <SidebarInset>
        <AdminHeader user={user} chatbotId={chatbot?.id} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
