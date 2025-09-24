/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', 
  reactStrictMode: true,
  images: { 
    domains: ['localhost', 'chatbot.dipietroassociates.com'] 
  },
  // Allow cross-origin requests from these domains in development
  allowedDevOrigins: [
    'http://localhost:8000',
    'https://chatbot.dipietroassociates.com',
  ],
   eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      },
      {
        // matching all static assets including _next
        source: "/_next/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET" },
        ]
      },
      {
        // matching all static files
        source: "/static/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET" },
        ]
      }
    ]
  }
};

module.exports = nextConfig;
