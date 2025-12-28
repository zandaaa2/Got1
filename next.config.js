/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true, // Enable gzip compression
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://vercel.live https://*.stripe.com https://m.stripe.network https://va.vercel-scripts.com https://assets.calendly.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co https://vercel.live wss://*.supabase.co https://*.stripe.com https://m.stripe.network https://va.vercel-scripts.com https://api.calendly.com",
              "frame-src 'self' https://*.supabase.co https://*.stripe.com https://calendly.com",
              "media-src 'self' https: blob: data:",
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
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
    
    // Don't bundle pdfkit - it needs to be loaded at runtime
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'pdfkit': 'commonjs pdfkit',
      })
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

