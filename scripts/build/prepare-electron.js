const fs = require('fs-extra');
const path = require('path');

console.log('📦 Preparing Next.js standalone build for Electron...');

// Go up from scripts/build to project root, then to frontend
const projectRoot = path.join(__dirname, '..', '..');
const frontendDir = path.join(projectRoot, 'frontend');
const standaloneDir = path.join(frontendDir, '.next', 'standalone');
const staticDir = path.join(frontendDir, '.next', 'static');
const publicDir = path.join(frontendDir, 'public');

// Next.js standalone creates a nested frontend directory, so we need to copy to standalone/frontend
const standaloneFrontendDir = path.join(standaloneDir, 'frontend');

console.log('  Project root:', projectRoot);
console.log('  Frontend dir:', frontendDir);
console.log('  Standalone dir:', standaloneDir);
console.log('  Standalone frontend dir:', standaloneFrontendDir);

// Copy static files to standalone/frontend/.next/static
const targetStaticDir = path.join(standaloneFrontendDir, '.next', 'static');
if (fs.existsSync(staticDir)) {
  console.log('✓ Copying .next/static to standalone/frontend/.next/static...');
  fs.copySync(staticDir, targetStaticDir);
} else {
  console.warn('⚠ Static directory not found:', staticDir);
}

// Copy public files to standalone/frontend/public
const targetPublicDir = path.join(standaloneFrontendDir, 'public');
if (fs.existsSync(publicDir)) {
  console.log('✓ Copying public to standalone/frontend/public...');
  fs.copySync(publicDir, targetPublicDir);
} else {
  console.warn('⚠ Public directory not found:', publicDir);
}

console.log('✅ Next.js standalone build is ready for Electron!');
