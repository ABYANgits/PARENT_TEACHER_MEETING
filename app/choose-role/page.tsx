"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function ChooseRole() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState("")
  const [experience, setExperience] = useState("")
  const [showTeacherFields, setShowTeacherFields] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState("")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Listen for auth state changes — this ensures we have a fully valid session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUserId(session.user.id)
          setUserName(
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split("@")[0] || ""
          )
          setReady(true)
        } else {
          router.push("/login")
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  async function selectRole(role: "parent" | "teacher") {
    if (role === "teacher") {
      setShowTeacherFields(true)
      return
    }
    await saveRole(role)
  }

  async function saveRole(role: "parent" | "teacher") {
    if (!userId) return
    setLoading(true)

    try {
      // Insert profile (use insert instead of upsert to avoid conflict issues)
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single()

      if (existing) {
        // Profile exists (trigger created it) — update role
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ name: userName, role: role })
          .eq("id", userId)

        if (updateError) {
          console.error("Profile update error:", updateError)
          alert("Failed to save role: " + updateError.message)
          setLoading(false)
          return
        }
      } else {
        // No profile yet — insert
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ id: userId, name: userName, role: role })

        if (insertError) {
          console.error("Profile insert error:", insertError)
          alert("Failed to save role: " + insertError.message)
          setLoading(false)
          return
        }
      }

      // If teacher, also create teacher record
      if (role === "teacher") {
        const { error: teacherError } = await supabase
          .from("teachers")
          .insert({
            id: userId,
            subject: subject || "General",
            experience: experience || null,
          })

        if (teacherError) {
          console.error("Teacher error:", teacherError)
          alert("Failed to save teacher info: " + teacherError.message)
          setLoading(false)
          return
        }
      }

      // Redirect to dashboard
      router.push(role === "parent" ? "/parent" : "/teacher")
    } catch (err: any) {
      console.error("Unexpected error:", err)
      alert("Something went wrong: " + err.message)
      setLoading(false)
    }
  }

  const inputTheme = "w-full bg-white/60 border border-purple-100 text-gray-900 placeholder-gray-400 p-3 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition duration-200"

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2 text-center">
          Welcome, {userName || "there"}!
        </h1>
        <p className="text-gray-500 text-center mb-8 text-sm">
          Choose your role to get started
        </p>

        {!showTeacherFields ? (
          <div className="flex flex-col gap-4">
            {/* Parent option */}
            <button
              onClick={() => selectRole("parent")}
              disabled={loading}
              className="group relative w-full p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-100 hover:border-indigo-300 rounded-2xl text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                  👨‍👩‍👧
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">I'm a Parent</h3>
                  <p className="text-gray-500 text-sm">Book meetings & track progress</p>
                </div>
              </div>
            </button>

            {/* Teacher option */}
            <button
              onClick={() => selectRole("teacher")}
              disabled={loading}
              className="group relative w-full p-5 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-100 hover:border-purple-300 rounded-2xl text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                  👩‍🏫
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">I'm a Teacher</h3>
                  <p className="text-gray-500 text-sm">Manage meetings & notes</p>
                </div>
              </div>
            </button>

            {loading && (
              <p className="text-center text-sm text-purple-500 animate-pulse">Saving your role...</p>
            )}
          </div>
        ) : (
          /* Teacher details form */
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500 text-center mb-1">Tell us a bit more</p>
            <input
              className={inputTheme}
              placeholder="Subject (e.g., Math, Science)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <input
              className={inputTheme}
              placeholder="Experience (e.g., 5 years)"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            />

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowTeacherFields(false)}
                className="flex-1 py-3 rounded-xl border border-purple-200 text-purple-600 font-semibold hover:bg-purple-50 transition"
              >
                Back
              </button>
              <button
                onClick={() => saveRole("teacher")}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Continue"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
