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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  let body: { chatbot_id?: string; visitor_name?: string; visitor_email?: string }

  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { chatbot_id, visitor_name, visitor_email } = body

  if (!chatbot_id) {
    return json({ error: 'Missing chatbot_id' }, 400)
  }

  const supabase = getSupabase()
  if (!supabase) {
    return json({ error: 'Server configuration error' }, 500)
  }

  try {
    // Get the admin_id from the chatbot config
    const { data: config, error: configError } = await supabase
      .from('chatbot_configs')
      .select('admin_id')
      .eq('id', chatbot_id)
      .single()

    if (configError || !config) {
      return json({ error: 'Chatbot not found', detail: configError?.message }, 404)
    }

    // Generate a unique visitor ID
    const visitorId = crypto.randomUUID()

    // Create new chat session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        chatbot_id,
        admin_id: config.admin_id,
        visitor_id: visitorId,
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
      return json({ error: 'Failed to create session', detail: sessionError.message }, 500)
    }

    // Log analytics event (non-blocking)
    supabase
      .from('analytics_events')
      .insert({
        admin_id: config.admin_id,
        chatbot_id,
        session_id: session.id,
        event_type: 'session_started',
        event_data: { visitor_name, visitor_email },
      })
      .then(() => {})
      .catch(() => {})

    return json({ session_id: session.id })
  } catch (err) {
    return json({ error: 'Internal server error', detail: String(err) }, 500)
  }
}
