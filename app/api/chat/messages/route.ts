import { createPublicClient } from '@/lib/supabase/public'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')
  const afterId = request.nextUrl.searchParams.get('after')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  try {
    const supabase = createPublicClient()

    let query = supabase
      .from('chat_messages')
      .select('id, content, sender_type, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    // Only get messages after a certain ID for polling
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
      console.error('Messages fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json(messages || [], {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Messages API error:', error)
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
