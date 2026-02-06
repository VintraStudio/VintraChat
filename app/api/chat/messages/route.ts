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

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')
  const afterId = request.nextUrl.searchParams.get('after')

  if (!sessionId) {
    return json({ error: 'Missing session_id' }, 400)
  }

  const supabase = getSupabase()
  if (!supabase) {
    return json({ error: 'Server configuration error' }, 500)
  }

  try {
    let query = supabase
      .from('chat_messages')
      .select('id, content, sender_type, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (afterId) {
      const { data: afterMessage } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('id', afterId)
        .single()

      if (afterMessage) {
        query = query.gt('created_at', afterMessage.created_at)
      }
    }

    const { data: messages, error } = await query.limit(50)

    if (error) {
      return json({ error: 'Failed to fetch messages', detail: error.message }, 500)
    }

    return json(messages || [])
  } catch (err) {
    return json({ error: 'Internal server error', detail: String(err) }, 500)
  }
}
