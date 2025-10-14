/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled to prevent error overlay loop in dev
  output: 'standalone', // Required for Electron bundling
  // Disable image optimization for standalone build
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
