import { createPublicClient } from '@/lib/supabase/public'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function POST(request: NextRequest) {
  try {
    const { chatbot_id, visitor_name, visitor_email } = await request.json()

    console.log('[v0] Session API called with chatbot_id:', chatbot_id, 'visitor_name:', visitor_name)
    console.log('[v0] SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log('[v0] NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)

    if (!chatbot_id) {
      return NextResponse.json({ error: 'Missing chatbot_id' }, { status: 400, headers: corsHeaders })
    }

    const supabase = createPublicClient()

    // Get the admin_id from the chatbot config
    const { data: config, error: configError } = await supabase
      .from('chatbot_configs')
      .select('admin_id')
      .eq('id', chatbot_id)
      .single()

    if (configError || !config) {
      console.log('[v0] Config fetch error:', configError?.message, configError?.code, configError?.details)
      return NextResponse.json({ error: 'Chatbot not found', detail: configError?.message }, { status: 404, headers: corsHeaders })
    }

    console.log('[v0] Found config for chatbot_id:', chatbot_id, 'admin_id:', config.admin_id)

    // Create new chat session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        chatbot_id,
        admin_id: config.admin_id,
        visitor_name: visitor_name || 'Visitor',
        visitor_email: visitor_email || null,
        status: 'active',
        metadata: {
          user_agent: request.headers.get('user-agent'),
          referrer: request.headers.get('referer'),
        },
      })
      .select('id')
      .single()

    if (sessionError) {
      console.log('[v0] Session creation error:', sessionError.message, sessionError.code, sessionError.details, sessionError.hint)
      return NextResponse.json({ error: 'Failed to create session', detail: sessionError.message }, { status: 500, headers: corsHeaders })
    }

    console.log('[v0] Session created successfully:', session.id)

    // Log analytics event (non-blocking)
    supabase.from('analytics_events').insert({
      admin_id: config.admin_id,
      chatbot_id,
      session_id: session.id,
      event_type: 'session_started',
      event_data: { visitor_name, visitor_email },
    }).then(() => {}).catch(() => {})

    return NextResponse.json({ session_id: session.id }, { headers: corsHeaders })
  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}
