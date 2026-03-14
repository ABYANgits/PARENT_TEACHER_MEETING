"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Signup(){
  const router = useRouter()
  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [name,setName] = useState("")
  const [role,setRole] = useState("parent")
  const [subject, setSubject] = useState("")
  const [experience, setExperience] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSignup(){
    setErrorMsg("")
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("Signing up with:", { email, name, role })

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
            subject: role === 'teacher' ? subject : null,
            experience: role === 'teacher' ? experience : null,
          }
        }
      })

      if(error){
        console.error("Signup error:", error)
        setErrorMsg(error.message)
        return
      }

      alert("Signup successful. Please login.")
      router.push("/login")
    } catch (err: any) {
      console.error("Catch error:", err)
      setErrorMsg(err.message || "An unexpected error occurred")
    }
  }

  const inputTheme = "w-full bg-white/60 border border-purple-100 text-gray-900 placeholder-gray-400 p-3 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition duration-200"

  return(
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-shadow duration-300">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-8 text-center">Create Account</h1>
        
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <input className={inputTheme} placeholder="Full Name" onChange={(e)=>setName(e.target.value)} />
          </div>
          <div>
            <input className={inputTheme} placeholder="Email Address" onChange={(e)=>setEmail(e.target.value)} />
          </div>
          <div className="relative">
            <input className={inputTheme} type={showPassword ? "text" : "password"} placeholder="Password" onChange={(e)=>setPassword(e.target.value)} />
            <button 
              type="button" 
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          
          <div className="relative">
            <select className={`${inputTheme} appearance-none cursor-pointer`} value={role} onChange={(e)=>setRole(e.target.value)}>
              <option className="text-gray-900" value="parent">I am a Parent</option>
              <option className="text-gray-900" value="teacher">I am a Teacher</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

          {role === 'teacher' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
              <input className={inputTheme} placeholder="Subject (e.g., Math, Science)" onChange={(e)=>setSubject(e.target.value)} />
              <input className={inputTheme} placeholder="Experience (e.g., 5 years)" onChange={(e)=>setExperience(e.target.value)} />
            </div>
          )}

          <button className="mt-4 w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transform transition hover:-translate-y-0.5" onClick={handleSignup}>
            Sign Up
          </button>
          
          <div className="mt-4 text-center">
            <button className="text-sm text-purple-600 hover:text-indigo-800 font-medium transition-colors hover:underline" onClick={() => router.push("/login")}>
              Already have an account? Log in
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}