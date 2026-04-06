import { createServerSupabase } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

/**
 * GET /api/profile
 *
 * Returns the authenticated user's profile (name, role).
 * Demonstrates server-side session validation — the browser
 * never bypasses this check because it lives on the server.
 */
export async function GET() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized — please log in.' },
      { status: 401 }
    )
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, role, created_at')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'Profile not found.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ profile })
}
