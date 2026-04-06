import { createServerSupabase } from "@/lib/supabaseServer"
import { redirect } from "next/navigation"
import ParentDashboardClient from "./ParentDashboardClient"

export default async function ParentDashboard() {
  const supabase = await createServerSupabase()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Use Promise.all to fetch children and meetings simultaneously (Fixes the slow waterfall!)
  const [childrenRes, meetingsRes] = await Promise.all([
    supabase
      .from('children')
      .select('id, name, grade, section')
      .eq('parent_id', user.id),
    supabase
      .from('parent_meetings_view')
      .select('meeting_id, meeting_link, meeting_time, topic, teacher_notes, child_name, teacher_name', { count: 'exact' })
      .eq('parent_id', user.id)
      .order('meeting_time', { ascending: false })
      .range(0, 4)
  ])

  if (childrenRes.error) console.error("Children fetch error:", childrenRes.error.message)
  if (meetingsRes.error) console.error("Meetings view error:", meetingsRes.error.message)

  return (
    <ParentDashboardClient 
      initialChildren={childrenRes.data || []} 
      initialMeetings={meetingsRes.data || []} 
      initialMeetingsCount={meetingsRes.count || 0}
      userId={user.id} 
    />
  )
}
