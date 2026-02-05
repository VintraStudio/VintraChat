import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Skip middleware for API routes and static files
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/')
  ) {
    return NextResponse.next()
  }

  // For admin routes, check if the user has a session cookie
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Check for our custom auth cookie or the default Supabase cookie
    const customAuthCookie = request.cookies.get('sb-auth-token')
    const supabaseAuthCookie = request.cookies.getAll().find(
      (cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
    )

    if (!customAuthCookie && !supabaseAuthCookie) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
