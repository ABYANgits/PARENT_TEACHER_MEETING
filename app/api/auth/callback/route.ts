import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createServerSupabase()
    
    try {
      // Exchange the code for a session on the server.
      // This fully sets the HTTP-only cookies before the redirect.
      const { error, data } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error && data?.user) {
      // Find out their role to redirect properly
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'parent') {
        return NextResponse.redirect(`${origin}/parent`)
      } else if (profile?.role === 'teacher') {
        return NextResponse.redirect(`${origin}/teacher`)
      } else {
        return NextResponse.redirect(`${origin}/choose-role`)
      }
      }
    } catch (e: any) {
      console.error("Critical Auth Callback timeout or crash:", e.message)
      return NextResponse.redirect(`${origin}/login?error=server-timeout`)
    }
  }

  // Fallback if there's no code or an error occurred
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}
