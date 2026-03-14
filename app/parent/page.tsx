"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function ParentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])

  // Child form state
  const [childName, setChildName] = useState("")
  const [childGrade, setChildGrade] = useState("")
  const [childSection, setChildSection] = useState("")

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

    // Fetch children
    const { data: kids } = await supabase
      .from('children')
      .select('*')
      .eq('parent_id', user.id)
    if (kids) setChildren(kids)

    // Fetch meetings
    // Need to join meeting -> child and meeting -> teacher -> profile
    const { data: meets } = await supabase
      .from('meetings')
      .select(`
        *,
        children(name),
        teachers(
          profiles(name)
        )
      `)
    if (meets) setMeetings(meets)
  }

  async function handleAddChild() {
    if (!childName || !childGrade) return
    const { error } = await supabase.from('children').insert({
      parent_id: user.id,
      name: childName,
      grade: childGrade,
      section: childSection
    })
    if (error) {
      alert(error.message)
      return
    }
    setChildName("")
    setChildGrade("")
    setChildSection("")
    fetchData()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const inputTheme = "flex-1 w-full bg-gray-50 border border-indigo-100 text-gray-900 placeholder-gray-400 p-3 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 transition mb-2 sm:mb-0"

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 sm:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/50">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Parent Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage your children and track consultation meetings.</p>
          </div>
          <button onClick={handleLogout} className="bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 px-6 py-2.5 rounded-xl font-semibold transition shadow-sm">
            Log Out
          </button>
        </div>

        {/* Children Section */}
        <section className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-indigo-50/50">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Family Members</h2>
          
          <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mb-8">
            <h3 className="font-semibold text-indigo-900 mb-4">Add a Child</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <input className={inputTheme} placeholder="Name (e.g., Aarav)" value={childName} onChange={e => setChildName(e.target.value)} />
              <input className={inputTheme} placeholder="Grade (e.g., 5)" value={childGrade} onChange={e => setChildGrade(e.target.value)} />
              <input className={inputTheme} placeholder="Section (e.g., B)" value={childSection} onChange={e => setChildSection(e.target.value)} />
              <button 
                onClick={handleAddChild} 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-8 py-3 rounded-xl shadow-md hover:shadow-lg transform transition hover:-translate-y-0.5"
              >
                Add
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 px-2">My Children List</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {children.map(child => (
                <div key={child.id} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg mb-3">
                    {child.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="font-bold text-gray-800 text-lg">{child.name}</h4>
                  <p className="text-gray-500 text-sm mt-1">
                    Grade {child.grade} {child.section && `• Section ${child.section}`}
                  </p>
                </div>
              ))}
              {children.length === 0 && (
                <div className="col-span-full py-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No children added yet. Add your child above to start booking meetings.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Meetings Section */}
        <section className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-indigo-50/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Meeting History</h2>
              <p className="text-gray-500 mt-1">Review your past and upcoming consultations.</p>
            </div>
            <button 
              onClick={() => router.push('/parent/book')} 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transform transition hover:-translate-y-0.5 whitespace-nowrap"
            >
              + Book New Meeting
            </button>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold">Date & Time</th>
                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold">Child</th>
                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold">Teacher Name</th>
                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold">Topic</th>
                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold">Teacher Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {meetings.map((m: any) => (
                    <tr key={m.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-4 px-6 text-gray-800 font-medium whitespace-nowrap">
                        {new Date(m.meeting_time).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-4 px-6 text-gray-700 whitespace-nowrap">{m.children?.name}</td>
                      <td className="py-4 px-6 text-indigo-600 font-medium whitespace-nowrap">{m.teachers?.profiles?.name || 'Unknown'}</td>
                      <td className="py-4 px-6 text-gray-700">{m.topic}</td>
                      <td className="py-4 px-6">
                        {m.teacher_notes ? (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-700 text-sm">
                            {m.teacher_notes}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-sm">No notes provided yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {meetings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <p>You haven't booked any meetings yet.</p>
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
