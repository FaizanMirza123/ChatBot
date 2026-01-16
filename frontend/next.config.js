/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', 
  reactStrictMode: true,
   eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://chatbot.dipietroassociates.com/', // Replace with your backend domain
          },
        ],
      }
    ]
  }
};

module.exports = nextConfig;
