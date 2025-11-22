const fs = require('fs-extra');
const path = require('path');

console.log('[Post-Build] Copying static assets for standalone mode...');

const frontendDir = path.join(__dirname, '..', 'frontend');
const standaloneDir = path.join(frontendDir, '.next', 'standalone', 'frontend');
const staticSource = path.join(frontendDir, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
const publicSource = path.join(frontendDir, 'public');
const publicDest = path.join(standaloneDir, 'public');

try {
  // Copy .next/static to standalone/frontend/.next/static
  if (fs.existsSync(staticSource)) {
    console.log('[Post-Build] Copying .next/static...');
    fs.copySync(staticSource, staticDest);
    console.log('[Post-Build] ✓ Copied .next/static');
  }

  // Copy public to standalone/frontend/public
  if (fs.existsSync(publicSource)) {
    console.log('[Post-Build] Copying public folder...');
    fs.copySync(publicSource, publicDest);
    console.log('[Post-Build] ✓ Copied public folder');
  }

  console.log('[Post-Build] ✓ Post-build complete!');
} catch (error) {
  console.error('[Post-Build] Error during post-build:', error);
  process.exit(1);
}
