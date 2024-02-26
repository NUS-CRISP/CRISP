import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/**
 * @type {import('next').NextConfig}
 * */
const nextConfig = (phase) => {
  // Dev config
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return {
      transpilePackages: ['shared'],
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
  return {
    transpilePackages: ['shared'],
  }
};

export default nextConfig;
