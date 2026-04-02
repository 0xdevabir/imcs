/** @type {import('next').NextConfig} */
const backendTarget = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001').replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/socket.io',
        destination: `${backendTarget}/socket.io/`,
      },
      {
        source: '/api/socket.io/',
        destination: `${backendTarget}/socket.io/`,
      },
      {
        source: '/api/:path*',
        destination: `${backendTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
