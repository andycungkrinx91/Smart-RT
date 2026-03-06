import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.andy91.com',
        pathname: '/storage/**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    const baseUrl = (process.env.API_BASE_URL || 'http://backend:8000').replace(/\/$/, '')
    return [
      {
        source: '/storage/:path*',
        destination: `${baseUrl}/storage/:path*`,
      },
    ]
  },
}

export default nextConfig
