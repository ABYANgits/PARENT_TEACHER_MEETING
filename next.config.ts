import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Proxy rewrite — forwards /api/proxy/* to your Supabase project.
   *
   * Why: Hides the raw Supabase URL from browser network tabs.
   * Clients call  /api/proxy/rest/v1/...  and Next.js forwards it.
   *
   * Example usage from a client component:
   *   fetch('/api/proxy/rest/v1/meetings', {
   *     headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }
   *   })
   */
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
