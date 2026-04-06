import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client — safe to use in:
 * - Server Components
 * - Route Handlers (app/api/*)
 * - Server Actions
 *
 * Uses httpOnly cookies to read/refresh the session securely.
 * The anon key is used here; the RLS policies on the DB enforce
 * what each authenticated user can actually access.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // In Server Components, cookies() is read-only.
            // This is safe to ignore — the middleware will handle refresh.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Same as above — safe to ignore in Server Components.
          }
        },
      },
    }
  )
}
