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

    // Fetch chatbot config – auto-create a default one if none exists
    const { data: chatbotData } = await supabase
      .from('chatbot_configs')
      .select('*')
      .eq('admin_id', user.id)
      .single()

    if (chatbotData) {
      chatbot = chatbotData
    } else {
      const { data: newChatbot } = await supabase
        .from('chatbot_configs')
        .insert({
          admin_id: user.id,
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
      chatbot = newChatbot
    }
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
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
