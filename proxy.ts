import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * MIDDLEWARE — runs on the Edge before every matched request.
 *
 * Responsibilities:
 *  1. Refresh the Supabase session (rotate tokens in cookies)
 *  2. Protect /parent and /teacher — redirect to /login if unauthenticated
 *  3. Redirect already-authenticated users away from /login and /signup
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Write to both the request (for current handler) and response (for browser)
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // IMPORTANT: getUser() — not getSession() — is the secure server-side check.
  // getSession() reads from the cookie without verifying; getUser() validates with Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Protected routes ────────────────────────────────────────────────────────
  // If the user is not logged in and tries to access a dashboard, redirect to login.
  if (!user && (pathname.startsWith('/parent') || pathname.startsWith('/teacher'))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname) // preserve intended destination
    return NextResponse.redirect(loginUrl)
  }

  // ── Role-Based Access Control (RBAC) ──────────────────────────────────────
  // If the user IS logged in and tries to access a dashboard, verify their specific role.
  if (user && (pathname.startsWith('/parent') || pathname.startsWith('/teacher'))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // Block non-teachers from reaching the Teacher routing tree
    if (pathname.startsWith('/teacher') && role !== 'teacher') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Block non-parents from reaching the Parent routing tree
    if (pathname.startsWith('/parent') && role !== 'parent') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── Auth-only routes (already logged in) ────────────────────────────────────
  // If the user IS logged in, don't let them re-visit login/signup pages.
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

/**
 * Route matcher — the middleware only runs on these paths.
 * Static files, images, and Next.js internals are excluded automatically.
 */
export const config = {
  matcher: [
    '/parent/:path*',
    '/teacher/:path*',
    '/login',
    '/signup',
    '/choose-role',
  ],
}
