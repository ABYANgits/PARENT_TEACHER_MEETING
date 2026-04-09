
import { createServerSupabase } from "@/lib/supabaseServer"
import { redirect } from "next/navigation"
import TeacherDashboardClient from "./TeacherDashboardClient"

export default async function TeacherDashboard() {
  const supabase = await createServerSupabase()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Fetch meetings assigned to teacher using the specialized view
  // Server-Side Fetching + Selective Column Fetching + Pagination
  const { data: meetings, count, error } = await supabase
    .from('teacher_meetings_view')
    .select('meeting_id, meeting_link, meeting_time, topic, teacher_notes, documents, child_name, parent_name', { count: 'exact' })
    .eq('teacher_id', user.id)
    .order('meeting_time', { ascending: true })
    .range(0, 4)
    
  if (error) console.error("Teacher view fetch error:", error.message)
    
  return (
    <TeacherDashboardClient 
      initialMeetings={meetings || []} 
      initialMeetingsCount={count || 0}
      userId={user.id} 
    />
  )
}
