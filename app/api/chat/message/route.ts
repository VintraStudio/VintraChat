import { createPublicClient } from '@/lib/supabase/public'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { session_id, content, sender_type } = await request.json()

    if (!session_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createPublicClient()

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('admin_id, chatbot_id')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      console.error('Session fetch error:', sessionError)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id,
        admin_id: session.admin_id,
        content,
        sender_type: sender_type || 'visitor',
      })
      .select('id, created_at')
      .single()

    if (messageError) {
      console.error('Message creation error:', messageError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Update session's updated_at (non-blocking)
    supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', session_id)
      .then(() => {}).catch(() => {})

    // Log analytics event (non-blocking)
    supabase.from('analytics_events').insert({
      admin_id: session.admin_id,
      chatbot_id: session.chatbot_id,
      session_id,
      event_type: 'message_sent',
      event_data: { sender_type, message_length: content.length },
    }).then(() => {}).catch(() => {})

    return NextResponse.json({ 
      message_id: message.id, 
      created_at: message.created_at 
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Message API error:', error)
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
