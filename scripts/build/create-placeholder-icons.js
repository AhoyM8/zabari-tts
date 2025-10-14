// Simple script to create placeholder icon files
// This creates basic placeholder icons so the app can run with icons
// Replace these with proper icons later

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

console.log('Creating placeholder icon files...\n');

// Create a simple SVG that can be used as placeholder
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="url(#grad)"/>
  <text x="128" y="140" font-family="Arial, sans-serif" font-size="100" font-weight="bold"
        text-anchor="middle" fill="white">Z</text>
  <text x="128" y="200" font-family="Arial, sans-serif" font-size="32"
        text-anchor="middle" fill="white">TTS</text>
</svg>`;

const svgPath = path.join(assetsDir, 'icon.svg');
fs.writeFileSync(svgPath, svgIcon);
console.log('✓ Created: assets/icon.svg (base SVG)');

console.log('\n📋 Next Steps:\n');
console.log('Option 1: Use Online Converter (Recommended)');
console.log('  1. Go to https://icoconvert.com/');
console.log('  2. Upload assets/icon.svg');
console.log('  3. Download as .ico');
console.log('  4. Save to assets/icon.ico\n');

console.log('Option 2: Use ImageMagick (if installed)');
console.log('  Run: magick convert assets/icon.svg -define icon:auto-resize=256,128,64,48,32,16 assets/icon.ico\n');

console.log('Option 3: Use Existing Image');
console.log('  1. Find any PNG/JPG image (logo, photo, etc.)');
console.log('  2. Convert to .ico at https://icoconvert.com/');
console.log('  3. Save to assets/icon.ico\n');

console.log('For System Tray Icon:');
console.log('  Create a 32x32 PNG and save as assets/tray-icon.png');
console.log('  (Optional - will use icon.ico as fallback)\n');

console.log('After adding icons, run: npm run electron:dev');
