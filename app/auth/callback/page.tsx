"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState("Signing you in...")

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          // Check if user already has a profile with a role
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single()

          if (profile?.role) {
            if (profile.role === "parent") {
              router.push("/parent")
            } else if (profile.role === "teacher") {
              router.push("/teacher")
            } else {
              router.push("/")
            }
          } else {
            // New Google user — no role yet
            router.push("/choose-role")
          }
        }
      }
    )

    // Also check if already signed in (e.g., page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setStatus("Authentication failed. Redirecting...")
        setTimeout(() => router.push("/login"), 2000)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{status}</p>
      </div>
    </div>
  )
}
