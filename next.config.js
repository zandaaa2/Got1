/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure webhook routes are not parsed
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh4.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh5.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh6.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://vercel.live https://*.stripe.com https://m.stripe.network https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://vercel.live wss://*.supabase.co https://*.stripe.com https://m.stripe.network https://va.vercel-scripts.com",
              "frame-src 'self' https://*.supabase.co https://*.stripe.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    // Suppress Stripe.js localization warnings
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /@stripe\/stripe-js/,
        message: /Cannot find module/,
      },
      /Cannot find module '\.\/en'/,
      /Critical dependency: the request of a dependency is an expression/,
    ]
    
    return config
  },
}

module.exports = nextConfig

