import type { NextConfig } from 'next'

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]

const nextConfig: NextConfig = {
  // sharp, resvg and satori are native or wasm backed: they must stay outside
  // the bundle and off the edge runtime.
  serverExternalPackages: ['sharp', '@resvg/resvg-js', 'satori'],
  // satori loads harfbuzz's wasm at runtime rather than requiring it, so file
  // tracing never sees it and the deployed function 500s on the first render.
  outputFileTracingIncludes: {
    '/api/poster': ['./node_modules/.pnpm/harfbuzzjs@*/**/*.wasm'],
    '/api/poster/bulk': ['./node_modules/.pnpm/harfbuzzjs@*/**/*.wasm'],
  },
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
