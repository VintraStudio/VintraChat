
import { createPublicClient } from '@/lib/supabase/public'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const chatbotId = request.nextUrl.searchParams.get('chatbot_id')

  if (!chatbotId) {
    return NextResponse.json({ error: 'Missing chatbot_id' }, { status: 400 })
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
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 })
    }

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Config API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
