const fs = require('fs-extra');
const path = require('path');

console.log('📦 Preparing Next.js standalone build for Electron...');

const frontendDir = path.join(__dirname, 'frontend');
const standaloneDir = path.join(frontendDir, '.next', 'standalone');
const staticDir = path.join(frontendDir, '.next', 'static');
const publicDir = path.join(frontendDir, 'public');

// Copy static files to standalone/.next/static
const targetStaticDir = path.join(standaloneDir, '.next', 'static');
if (fs.existsSync(staticDir)) {
  console.log('✓ Copying .next/static to standalone...');
  fs.copySync(staticDir, targetStaticDir);
}

// Copy public files to standalone/public
const targetPublicDir = path.join(standaloneDir, 'public');
if (fs.existsSync(publicDir)) {
  console.log('✓ Copying public to standalone...');
  fs.copySync(publicDir, targetPublicDir);
}

console.log('✅ Next.js standalone build is ready for Electron!');
