"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import useSWR from "swr"

export default function TeacherDashboardClient({ 
  initialMeetings, 
  initialMeetingsCount,
  userId 
}: { 
  initialMeetings: any[], 
  initialMeetingsCount: number,
  userId: string 
}) {
  const router = useRouter()
  
  // Note editing state
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null)
  const [tempNotes, setTempNotes] = useState("")
  const [mounted, setMounted] = useState(false)
  const [page, setPage] = useState(0)
  const pageSize = 5

  useEffect(() => {
    setMounted(true)
  }, [])

  // SWR Fetcher
  const fetcher = async () => {
    const { data, count, error } = await supabase
      .from('teacher_meetings_view')
      .select('meeting_id, meeting_link, meeting_time, topic, teacher_notes, child_name, parent_name', { count: 'exact' })
      .eq('teacher_id', userId)
      .order('meeting_time', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1)
      
    if (error) throw error
    return { data: data || [], count: count || 0 }
  }

  // Client-Side Caching with SWR Pagination
  const { data: meetingsData, mutate } = useSWR(`teacher_meetings_${userId}_page_${page}`, fetcher, {
    fallbackData: page === 0 ? { data: initialMeetings, count: initialMeetingsCount } : undefined,
  })

  const meetings = meetingsData?.data || []
  const totalCount = meetingsData?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  async function handleSaveNotes(meetingId: string) {
    // Optimistic Update
    const optimisticData = { count: totalCount, data: meetings.map((m: any) => m.meeting_id === meetingId ? { ...m, teacher_notes: tempNotes } : m) }
    mutate(optimisticData, false)

    const { error } = await supabase
      .from('meetings')
      .update({ teacher_notes: tempNotes })
      .eq('id', meetingId)

    if (error) {
      alert("Error saving notes: " + error.message)
    }
    setEditingMeetingId(null)
    
    // Confirmed background revalidation
    mutate()
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
                  {meetings && meetings.map((m: any) => (
                    <tr key={m.meeting_id} className="hover:bg-indigo-50/30 transition-colors align-top group">
                      <td className="py-5 px-6 whitespace-nowrap">
                        <div className="font-semibold text-gray-800">
                          {mounted ? new Date(m.meeting_time).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="opacity-0">Loading</span>}
                        </div>
                        <div className="text-indigo-600 font-medium text-sm mt-1">
                          {mounted ? new Date(m.meeting_time).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' }) : <span className="opacity-0">Loading</span>}
                        </div>
                      </td>
                      
                      <td className="py-5 px-6">
                        <div className="font-semibold text-gray-800">{m.parent_name || 'Unknown Parent'}</div>
                        <div className="text-gray-500 text-sm mt-1">Child: <span className="font-medium text-gray-700">{m.child_name || 'Unknown Child'}</span></div>
                      </td>
                      
                      <td className="py-5 px-6">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                          {m.topic}
                        </div>
                      </td>
                      
                      <td className="py-5 px-6">
                        {editingMeetingId === m.meeting_id ? (
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
                              <button onClick={() => handleSaveNotes(m.meeting_id)} className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 font-medium text-sm shadow-sm transition">
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
                        <div className="flex flex-col items-end gap-2">
                          {mounted && new Date(new Date(m.meeting_time).getTime() + 10 * 60000) > new Date() ? (
                            m.meeting_link ? (
                              <a 
                                href={m.meeting_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition text-xs"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                Join
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs italic">No Link</span>
                            )
                          ) : (
                            <span className="text-gray-400 font-medium text-xs bg-gray-100 py-1 px-2 rounded-full">Ended</span>
                          )}

                          {editingMeetingId !== m.meeting_id && (
                            <button 
                              onClick={() => {
                                setTempNotes(m.teacher_notes || "")
                                setEditingMeetingId(m.meeting_id)
                              }} 
                              className="bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-medium text-xs px-3 py-1.5 rounded-lg transition shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                              {m.teacher_notes ? "Edit Notes" : "Add Notes"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {meetings && meetings.length === 0 && (
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

          {/* Pagination Controls */}
          {totalCount > pageSize && (
            <div className="flex justify-between items-center mt-6">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-900">{page * pageSize + 1}</span> to <span className="font-medium text-gray-900">{Math.min((page + 1) * pageSize, totalCount)}</span> of <span className="font-medium text-gray-900">{totalCount}</span> meetings
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
