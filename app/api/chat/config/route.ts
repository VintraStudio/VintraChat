import { createPublicClient } from '@/lib/supabase/public'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function GET(request: NextRequest) {
  const chatbotId = request.nextUrl.searchParams.get('chatbot_id')

  if (!chatbotId) {
    return NextResponse.json({ error: 'Missing chatbot_id' }, { status: 400, headers: corsHeaders })
  }

  try {
    const supabase = createPublicClient()

    const { data, error } = await supabase
      .from('chatbot_configs')
      .select('widget_title, welcome_message, primary_color, position, avatar_url, show_branding, placeholder_text, offline_message')
      .eq('id', chatbotId)
      .single()

    if (error || !data) {
      console.error('Config fetch error:', error)
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404, headers: corsHeaders })
    }

    return NextResponse.json(data, { headers: corsHeaders })
  } catch (error) {
    console.error('Config API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}
