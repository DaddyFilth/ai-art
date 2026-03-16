/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  images: {
    domains: ['localhost', 'placeholder.ai'],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_PAYPAL_CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
  },

  async rewrites() {
    // In Docker, INTERNAL_API_URL uses the service name
    // In local dev, falls back to localhost:3001
    const internalApi = process.env.INTERNAL_API_URL
      || process.env.NEXT_PUBLIC_API_URL
      || 'http://localhost:3001';

    return [
      {
        // /api/health → backend health (no v1 prefix)
        source: '/api/health',
        destination: `${internalApi}/health`,
      },
      {
        // /api/anything → backend /api/v1/anything (injects v1)
        source: '/api/:path*',
        destination: `${internalApi}/api/v1/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options',       value: 'DENY'                            },
          { key: 'X-Content-Type-Options', value: 'nosniff'                         },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
