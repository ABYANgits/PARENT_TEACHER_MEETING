"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function BookMeeting() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  
  const [children, setChildren] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  
  // Form State
  const [selectedChildId, setSelectedChildId] = useState("")
  const [selectedTeacherId, setSelectedTeacherId] = useState("")
  const [meetingDate, setMeetingDate] = useState("")
  const [meetingTime, setMeetingTime] = useState("")
  const [topic, setTopic] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }
    setUser(user)

    // Fetch parent's children
    const { data: kids } = await supabase
      .from('children')
      .select('*')
      .eq('parent_id', user.id)
    if (kids) {
      setChildren(kids)
      if (kids.length > 0) setSelectedChildId(kids[0].id)
    }

    // Fetch teachers with their profiles
    const { data: tchs } = await supabase
      .from('teachers')
      .select(`
        id,
        subject,
        experience,
        profiles(name)
      `)
    if (tchs) {
      setTeachers(tchs)
      if (tchs.length > 0) setSelectedTeacherId(tchs[0].id)
    }
  }

  async function handleBookMeeting() {
    if (!selectedChildId || !selectedTeacherId || !meetingDate || !meetingTime || !topic) {
      alert("Please fill in all fields.")
      return
    }

    // Combine date and time
    const meetingDateTime = new Date(`${meetingDate}T${meetingTime}`).toISOString()

    const { error } = await supabase.from('meetings').insert({
      child_id: selectedChildId,
      teacher_id: selectedTeacherId,
      meeting_time: meetingDateTime,
      topic: topic
    })

    if (error) {
      alert("Error booking meeting: " + error.message)
      return
    }

    alert("Meeting booked successfully!")
    router.push("/parent")
  }

  const inputTheme = "w-full bg-white border border-indigo-100 text-gray-900 placeholder-gray-400 p-3 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 transition duration-200"

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8 flex justify-center items-center">
      <div className="w-full max-w-lg bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 space-y-6">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Book a Consultation</h1>
        
        {children.length === 0 ? (
          <div className="text-red-500 bg-red-50 p-4 rounded-xl border border-red-100">
            <p className="font-medium">You need to add a child to your profile before booking a meeting.</p>
            <button className="block mt-2 text-indigo-600 font-semibold hover:underline" onClick={() => router.push('/parent')}>Go back to Dashboard</button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Select Child</label>
              <select 
                className={inputTheme}
                value={selectedChildId} 
                onChange={e => setSelectedChildId(e.target.value)}
              >
                <option value="" disabled className="text-gray-500">Select a child</option>
                {children.map(c => <option key={c.id} value={c.id} className="text-gray-900">{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Select Teacher</label>
              <select 
                className={inputTheme}
                value={selectedTeacherId} 
                onChange={e => setSelectedTeacherId(e.target.value)}
              >
                <option value="" disabled className="text-gray-500">Select a teacher</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id} className="text-gray-900">
                    {t.profiles?.name} ({t.subject})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Date</label>
                <input 
                  type="date" 
                  className={inputTheme}
                  value={meetingDate} 
                  onChange={e => setMeetingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Time</label>
                <input 
                  type="time" 
                  className={inputTheme}
                  value={meetingTime} 
                  onChange={e => setMeetingTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Topic</label>
              <input 
                className={inputTheme}
                placeholder="e.g., Math performance discussion" 
                value={topic} 
                onChange={e => setTopic(e.target.value)}
              />
            </div>

            <div className="flex gap-4 pt-4 mt-2">
              <button 
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transform transition hover:-translate-y-0.5" 
                onClick={handleBookMeeting}
              >
                Confirm Booking
              </button>
              <button 
                className="flex-1 bg-white border-2 border-indigo-100 hover:bg-gray-50 text-indigo-700 font-bold py-3.5 rounded-xl transition shadow-sm" 
                onClick={() => router.push('/parent')}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
