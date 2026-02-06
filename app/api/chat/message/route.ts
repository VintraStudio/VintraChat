import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders })
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  let body: { session_id?: string; content?: string; sender_type?: string }

  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { session_id, content, sender_type } = body

  if (!session_id || !content) {
    return json({ error: 'Missing required fields' }, 400)
  }

  const supabase = getSupabase()
  if (!supabase) {
    return json({ error: 'Server configuration error' }, 500)
  }

  try {
    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('admin_id, chatbot_id')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return json({ error: 'Session not found' }, 404)
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
      return json({ error: 'Failed to send message', detail: messageError.message }, 500)
    }

    // Update session's updated_at and last_message_at (non-blocking)
    supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() })
      .eq('id', session_id)
      .then(() => {})
      .catch(() => {})

    // Log analytics event (non-blocking)
    supabase
      .from('analytics_events')
      .insert({
        admin_id: session.admin_id,
        chatbot_id: session.chatbot_id,
        session_id,
        event_type: 'message_sent',
        event_data: { sender_type, message_length: content.length },
      })
      .then(() => {})
      .catch(() => {})

    return json({ message_id: message.id, created_at: message.created_at })
  } catch (err) {
    return json({ error: 'Internal server error', detail: String(err) }, 500)
  }
}
