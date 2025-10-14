/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for Electron bundling
  // Disable image optimization for standalone build
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
