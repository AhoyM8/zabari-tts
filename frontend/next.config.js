/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled to prevent error overlay loop in dev
  output: 'standalone', // Required for Electron bundling
  // Disable image optimization for standalone build
  images: {
    unoptimized: true
  },
  // Exclude Playwright and related packages from webpack bundling
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle Playwright on the server
      config.externals = [
        ...config.externals,
        'playwright',
        'playwright-core',
        'chromium-bidi'
      ]
    }
    return config
  }
}

module.exports = nextConfig
