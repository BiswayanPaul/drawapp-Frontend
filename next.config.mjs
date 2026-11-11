/** @type {import('next').NextConfig} */
// The API is proxied under this origin so its session cookie is first-party;
// browsers that block third-party cookies (Safari, Brave) would drop it otherwise.
const BACKEND_URL =
  process.env.BACKEND_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://drawapp-backend-gzkk.onrender.com"
    : "http://localhost:8080");

const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
