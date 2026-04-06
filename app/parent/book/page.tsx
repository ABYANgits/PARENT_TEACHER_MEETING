import { createServerSupabase } from "@/lib/supabaseServer"
import { redirect } from "next/navigation"
import BookMeetingClient from "./BookMeetingClient"

export default async function BookMeeting() {
  const supabase = await createServerSupabase()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Optimize fetch with Promise.all to remove sequential waterfalls
  const [childrenRes, teachersRes] = await Promise.all([
    supabase
      .from('children')
      .select('id, name')
      .eq('parent_id', user.id),
    supabase
      .from('teachers')
      .select(`
        id,
        subject,
        profiles(name)
      `)
  ])

  if (childrenRes.error) console.error("Book meeting children fetch error:", childrenRes.error.message)
  if (teachersRes.error) console.error("Book meeting teachers fetch error:", teachersRes.error.message)

  return (
    <BookMeetingClient 
      initialChildren={childrenRes.data || []} 
      initialTeachers={teachersRes.data || []} 
    />
  )
}
