import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  let token: string | null = null

  try {
    const cookieStore = await cookies()
    
    // Check for our custom auth cookie first
    const customCookie = cookieStore.get('sb-auth-token')
    if (customCookie?.value) {
      token = customCookie.value
    }
    
    // Fallback: check for default Supabase auth cookie
    if (!token) {
      const allCookies = cookieStore.getAll()
      const supabaseCookie = allCookies.find(
        (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token') && c.name !== 'sb-auth-token'
      )
      if (supabaseCookie?.value) {
        try {
          const parsed = JSON.parse(supabaseCookie.value)
          if (Array.isArray(parsed) && parsed[0]) token = parsed[0]
          else if (parsed?.access_token) token = parsed.access_token
        } catch {
          token = supabaseCookie.value
        }
      }
    }
  } catch {
    // Cookies not available (e.g. during static generation)
  }

  const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  })

  return client
}
