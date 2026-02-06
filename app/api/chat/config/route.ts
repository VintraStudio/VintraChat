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

export async function GET(request: NextRequest) {
  const chatbotId = request.nextUrl.searchParams.get('chatbot_id')

  if (!chatbotId) {
    return json({ error: 'Missing chatbot_id' }, 400)
  }

  const supabase = getSupabase()
  if (!supabase) {
    return json({ error: 'Server configuration error' }, 500)
  }

  try {
    const { data, error } = await supabase
      .from('chatbot_configs')
      .select('widget_title, welcome_message, primary_color, position, avatar_url, show_branding, placeholder_text, offline_message')
      .eq('id', chatbotId)
      .single()

    if (error || !data) {
      return json({ error: 'Chatbot not found' }, 404)
    }

    return json(data)
  } catch (err) {
    return json({ error: 'Internal server error', detail: String(err) }, 500)
  }
}
