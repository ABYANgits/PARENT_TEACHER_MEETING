import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabaseServer'
import DOMPurify from 'isomorphic-dompurify'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { childId, teacherId, meetingTime, topic } = body

    if (!childId || !teacherId || !meetingTime || !topic) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 🛡️ XSS Prevention: Strip malicious JS/DOM nodes from raw text 
    const cleanTopic = DOMPurify.sanitize(topic)

    // 1. Authenticate Request
    const supabase = await createServerSupabase()
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // --- SECURITY PATCH: IDOR & Quota DoS Prevention ---
    // 1. Verify Parent Ownership (IDOR Mitigation)
    const { data: childData, error: childError } = await supabase
      .from('children')
      .select('parent_id')
      .eq('id', childId)
      .single()

    if (childError || !childData) {
      return NextResponse.json({ error: 'Invalid child specified' }, { status: 400 })
    }

    if (childData.parent_id !== session.user.id) {
       return NextResponse.json({ error: 'Forbidden: You do not have permission to book for this child' }, { status: 403 })
    }

    // 2. Enforce Semantic Quota (Volume DoS Mitigation)
    const now = new Date().toISOString()
    const { count, error: countError } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .gte('meeting_time', now)

    if (countError) {
      return NextResponse.json({ error: 'Database bounds check failed' }, { status: 500 })
    }

    if (count !== null && count >= 3) {
      return NextResponse.json({ error: 'Rate limit exceeded: A single child cannot have more than 3 upcoming meetings scheduled simultaneously.' }, { status: 429 })
    }
    // ----------------------------------------------------

    // 2. Fetch Zoom Server-to-Server OAuth Token
    const authString = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')
    
    const tokenResponse = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`
      }
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("Zoom Token Error:", errorData)
      return NextResponse.json({ error: 'Failed to authenticate with Zoom API' }, { status: 500 })
    }

    const { access_token } = await tokenResponse.json()

    // 3. Resolve Admin User ID dynamically
    // Server-To-Server Apps need to know who the "host" is. 
    // We check for a hardcoded email in .env, or fetch the first active user.
    let hostEmail = process.env.ZOOM_HOST_EMAIL

    if (!hostEmail) {
      const usersResponse = await fetch('https://api.zoom.us/v2/users?status=active', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })
      
      if (!usersResponse.ok) {
          const errorData = await usersResponse.text()
          console.error("Zoom Users Error:", errorData)
          return NextResponse.json({ error: 'Missing user:read:admin scope on Zoom App. Please add it, or specify ZOOM_HOST_EMAIL in your .env.local' }, { status: 500 })
      }

      const usersData = await usersResponse.json()
      if (!usersData.users || usersData.users.length === 0) {
          return NextResponse.json({ error: 'No active Zoom users found on this master account.' }, { status: 500 })
      }
      
      hostEmail = usersData.users[0].email
    }

    // 4. Create Scheduled Zoom Meeting
    const meetingResponse = await fetch(`https://api.zoom.us/v2/users/${hostEmail}/meetings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: cleanTopic,
        type: 2, // 2 = scheduled meeting
        start_time: new Date(meetingTime).toISOString(),
        duration: 30, // Default duration in minutes
        settings: {
          join_before_host: true, // Allow parents to join if teacher is late
          waiting_room: false,
          host_video: true,
          participant_video: true
        }
      })
    })

    if (!meetingResponse.ok) {
      const errorData = await meetingResponse.text()
      console.error("Zoom Meeting Gen Error:", errorData)
      return NextResponse.json({ error: 'Failed to generate Zoom Meeting' }, { status: 500 })
    }

    const meetingData = await meetingResponse.json()
    const zoomJoinUrl = meetingData.join_url

    // 5. Save Meeting to Database
    const { error: dbError } = await supabase.from('meetings').insert({
      child_id: childId,
      teacher_id: teacherId,
      meeting_time: new Date(meetingTime).toISOString(), // ensure ISO standard
      topic: cleanTopic,
      meeting_link: zoomJoinUrl
    })

    if (dbError) {
      console.error("Supabase Insertion Error:", dbError)
      return NextResponse.json({ error: 'Failed to save meeting in database' }, { status: 500 })
    }

    // Success!
    return NextResponse.json({ success: true, join_url: zoomJoinUrl })
    
  } catch (error: any) {
    console.error("Server API Exception:", error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}
