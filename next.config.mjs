/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: [
    'https://*.replit.dev',
    'https://*.repl.co',
    'https://*.kirk.replit.dev',
    'http://127.0.0.1',
    'http://127.0.0.1:5000',
    `https://${process.env.REPLIT_DEV_DOMAIN || ''}`,
  ],
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/api/chat/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ]
  },
}

export default nextConfig
