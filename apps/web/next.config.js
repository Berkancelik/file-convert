/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || 'http://localhost:3001';

const nextConfig = {
  reactStrictMode: true,
  // Frontend her zaman same-origin /api çağırır; Next bunu Nest API'ye proxy'ler.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
