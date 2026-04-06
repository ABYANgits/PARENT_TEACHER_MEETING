import Link from "next/link";
import { createServerSupabase } from "@/lib/supabaseServer";

export default async function Home() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  let destinationUrl = "/choose-role";
  if (user) {
    // If they are logged in, we check their specific role so we can point 
    // the "Go to Dashboard" directly to /parent or /teacher
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      destinationUrl = `/${profile.role}`; 
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <main className="text-center space-y-6 max-w-2xl bg-white/80 backdrop-blur-xl p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-shadow duration-300">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4 pb-2">
          Parent-Teacher Connect
        </h1>
        <p className="text-lg text-gray-700 leading-relaxed font-medium">
          Welcome to the consultation platform! Parents can easily book meetings with teachers to discuss their child's progress, and teachers can manage their schedules and feedback efficiently.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10 pt-4">
          {user ? (
            <Link 
              href={destinationUrl}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transform transition hover:-translate-y-0.5 hover:from-indigo-600 hover:to-purple-700"
            >
              Go to Dashboard &rarr;
            </Link>
          ) : (
            <>
              <Link 
                href="/login"
                className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transform transition hover:-translate-y-0.5 hover:from-indigo-600 hover:to-purple-700"
              >
                Log In
              </Link>
              <Link 
                href="/signup"
                className="px-8 py-3.5 bg-white text-indigo-600 font-bold border-2 border-indigo-100 rounded-xl hover:bg-indigo-50 transition shadow-sm transform hover:-translate-y-0.5"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
