import { createServerSupabase } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

/**
 * GET /api/meetings
 *
 * Server-side protected API route.
 * Returns meetings relevant to the currently logged-in user:
 *  - Parent: meetings for their children
 *  - Teacher: meetings assigned to them
 *
 * The session is validated on the server — the client never touches
 * the raw Supabase URL for this call (it goes through Next.js).
 * RLS on the DB enforces data isolation regardless.
 */
export async function GET() {
  const supabase = await createServerSupabase()

  // Server-side session check — rejects the request if no valid session cookie
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

  // Fetch meetings — RLS policies on the DB automatically filter by role
  const { data: meetings, error } = await supabase
    .from('meetings')
    .select(`
      id,
      meeting_time,
      topic,
      teacher_notes,
      children (
        id,
        name,
        grade
      ),
      teachers (
        id,
        subject,
        profiles (
          name
        )
      )
    `)
    .order('meeting_time', { ascending: true })

  if (error) {
    console.error('[API /meetings] DB error:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch meetings.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ user_id: user.id, meetings })
}
