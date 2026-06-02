/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@threadmerge/shared'],
  experimental: {
    serverActions: {
      allowedOrigins: [
        'psychic-space-dollop-gxqwx47r99r3vg4q-3001.app.github.dev',
        'localhost:3001',
      ],
    },
  },
};
export default nextConfig;
