import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/**
 * @type {import('next').NextConfig}
 * */

const baseConfig = {
  transpilePackages: ['shared'],
  async redirects() {
    return [
      {
        source: '/',
        destination: '/courses',
        permanent: true,
      },
    ];
  }
};

const nextConfig = (phase) => {
  // Dev config
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return {
      ...baseConfig,
      async rewrites() {
        return [
          {
            // Exclude /api/auth since handled by nextauth
            source: '/api/auth/:path*',
            destination: '/api/auth/:path*',
          },
          {
            source: '/api/:path*',
            destination: 'http://localhost:3003/api/:path*',
          },
        ];
      }
    };
  }

  // Prod config
  return baseConfig;
};

export default nextConfig;
