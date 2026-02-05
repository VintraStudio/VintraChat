import { createPublicClient } from '@/lib/supabase/public'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { chatbot_id, visitor_name, visitor_email } = await request.json()

    if (!chatbot_id) {
      return NextResponse.json({ error: 'Missing chatbot_id' }, { status: 400 })
    }

    const supabase = createPublicClient()

    // Get the admin_id from the chatbot config
    const { data: config, error: configError } = await supabase
      .from('chatbot_configs')
      .select('admin_id')
      .eq('id', chatbot_id)
      .single()

    if (configError || !config) {
      console.error('Config fetch error:', configError)
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 })
    }

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
      console.error('Session creation error:', sessionError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Log analytics event (non-blocking)
    supabase.from('analytics_events').insert({
      admin_id: config.admin_id,
      chatbot_id,
      session_id: session.id,
      event_type: 'session_started',
      event_data: { visitor_name, visitor_email },
    }).then(() => {}).catch(() => {})

    return NextResponse.json({ session_id: session.id }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
