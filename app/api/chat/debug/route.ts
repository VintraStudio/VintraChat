import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  const checks: Record<string, unknown> = {
    has_supabase_url: !!url,
    has_service_role_key: !!key,
    supabase_url_prefix: url ? url.substring(0, 30) + '...' : null,
    node_env: process.env.NODE_ENV,
  }

  if (url && key) {
    try {
      const supabase = createSupabaseClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      // Test: can we read chatbot_configs?
      const { data: configs, error: configError } = await supabase
        .from('chatbot_configs')
        .select('id, name')
        .limit(1)

      checks.config_read = configError ? `ERROR: ${configError.message}` : `OK (${configs?.length} rows)`

      // Test: can we read chat_sessions schema?
      const { data: sessions, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id')
        .limit(1)

      checks.session_read = sessionError ? `ERROR: ${sessionError.message}` : `OK (${sessions?.length} rows)`

      // Test: can we insert a session and immediately delete it?
      if (configs && configs.length > 0) {
        const testId = crypto.randomUUID()
        const { error: insertError } = await supabase
          .from('chat_sessions')
          .insert({
            chatbot_id: configs[0].id,
            admin_id: testId, // fake admin_id, will delete right away
            visitor_id: testId,
            visitor_name: '__debug_test__',
            status: 'active',
          })

        if (insertError) {
          checks.session_insert = `ERROR: ${insertError.message} (code: ${insertError.code}, details: ${insertError.details})`
        } else {
          checks.session_insert = 'OK'
          // Clean up
          await supabase
            .from('chat_sessions')
            .delete()
            .eq('visitor_name', '__debug_test__')
        }
      }
    } catch (err) {
      checks.supabase_error = String(err)
    }
  }

  return NextResponse.json(checks, { headers: corsHeaders })
}
