"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function TeacherDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [meetings, setMeetings] = useState<any[]>([])
  
  // Note editing state
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null)
  const [tempNotes, setTempNotes] = useState("")

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

    // Fetch meetings assigned to teacher
    const { data: meets, error } = await supabase
      .from('meetings')
      .select(`
        *,
        children(
          name,
          profiles(name)
        )
      `)
      .eq('teacher_id', user.id)
      .order('meeting_time', { ascending: true })
      
    if (meets) setMeetings(meets)
  }

  async function handleSaveNotes(meetingId: string) {
    const { error } = await supabase
      .from('meetings')
      .update({ teacher_notes: tempNotes })
      .eq('id', meetingId)

    if (error) {
      alert("Error saving notes: " + error.message)
      return
    }
    setEditingMeetingId(null)
    fetchData()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 sm:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/50">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Teacher Dashboard</h1>
            <p className="text-gray-500 mt-1">Review upcoming consultations and provide feedback to parents.</p>
          </div>
          <button onClick={handleLogout} className="bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 px-6 py-2.5 rounded-xl font-semibold transition shadow-sm">
            Log Out
          </button>
        </div>

        <section className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-indigo-50/50">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">My Schedule</h2>
            <p className="text-gray-500 mt-1">Consultations booked with you.</p>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold">Date & Time</th>
                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold">Parent & Child</th>
                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold">Topic</th>
                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold w-[35%]">Notes & Feedback</th>
                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {meetings.map((m: any) => (
                    <tr key={m.id} className="hover:bg-indigo-50/30 transition-colors align-top group">
                      <td className="py-5 px-6 whitespace-nowrap">
                        <div className="font-semibold text-gray-800">
                          {new Date(m.meeting_time).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-indigo-600 font-medium text-sm mt-1">
                          {new Date(m.meeting_time).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </td>
                      
                      <td className="py-5 px-6">
                        <div className="font-semibold text-gray-800">{m.children?.profiles?.name || 'Unknown Parent'}</div>
                        <div className="text-gray-500 text-sm mt-1">Child: <span className="font-medium text-gray-700">{m.children?.name}</span></div>
                      </td>
                      
                      <td className="py-5 px-6">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                          {m.topic}
                        </div>
                      </td>
                      
                      <td className="py-5 px-6">
                        {editingMeetingId === m.id ? (
                          <div className="space-y-3">
                            <textarea 
                              className="w-full bg-white border border-indigo-200 text-gray-900 placeholder-gray-400 p-3 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 transition duration-200 resize-none shadow-sm" 
                              rows={3}
                              value={tempNotes}
                              onChange={(e) => setTempNotes(e.target.value)}
                              placeholder="Type your feedback to the parent here..."
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingMeetingId(null)} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium text-sm transition">
                                Cancel
                              </button>
                              <button onClick={() => handleSaveNotes(m.id)} className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 font-medium text-sm shadow-sm transition">
                                Save Notes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className={`p-3 rounded-xl border ${m.teacher_notes ? 'bg-gray-50 border-gray-100 text-gray-700' : 'bg-transparent border-dashed border-gray-200 text-gray-400 italic'} text-sm w-full`}
                          >
                            {m.teacher_notes || "No notes provided yet."}
                          </div>
                        )}
                      </td>
                      
                      <td className="py-5 px-6 text-right">
                        {editingMeetingId !== m.id && (
                          <button 
                            onClick={() => {
                              setTempNotes(m.teacher_notes || "")
                              setEditingMeetingId(m.id)
                            }} 
                            className="bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-medium text-sm px-4 py-2 rounded-lg transition shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            {m.teacher_notes ? "Edit" : "Add Notes"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {meetings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-gray-500 bg-gray-50/50">
                        <div className="flex flex-col items-center justify-center">
                          <svg className="w-16 h-16 text-indigo-100 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <p className="text-lg font-medium text-gray-600">Your schedule is clear</p>
                          <p className="text-sm mt-1">No consultations have been booked with you yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
