// Generate icons from SVG using sharp
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, 'assets');
const svgPath = path.join(assetsDir, 'icon.svg');

async function generateIcons() {
  console.log('Generating icons from SVG...\n');

  try {
    // Read SVG
    const svgBuffer = fs.readFileSync(svgPath);

    // Generate PNG at 256x256 for main icon
    const png256Path = path.join(assetsDir, 'icon-256.png');
    await sharp(svgBuffer)
      .resize(256, 256)
      .png()
      .toFile(png256Path);
    console.log('✓ Created: assets/icon-256.png');

    // Generate PNG at 32x32 for tray icon
    const trayIconPath = path.join(assetsDir, 'tray-icon.png');
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(trayIconPath);
    console.log('✓ Created: assets/tray-icon.png');

    // Generate additional sizes for ICO
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const pngFiles = [];

    for (const size of sizes) {
      const pngPath = path.join(assetsDir, `icon-${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      pngFiles.push(pngPath);
      console.log(`✓ Created: assets/icon-${size}.png`);
    }

    console.log('\n✅ Icons generated successfully!\n');
    console.log('Note: For .ico file, you have two options:\n');
    console.log('Option 1: Use icon-256.png directly (Electron supports PNG)');
    console.log('  - Rename assets/icon-256.png to assets/icon.png');
    console.log('  - Update electron-main.js to use .png instead of .ico\n');

    console.log('Option 2: Convert to .ico online');
    console.log('  1. Go to https://icoconvert.com/');
    console.log('  2. Upload assets/icon-256.png');
    console.log('  3. Download as icon.ico');
    console.log('  4. Save to assets/icon.ico\n');

    console.log('The tray icon (assets/tray-icon.png) is ready to use!\n');

    // Let's also create a PNG version with .ico extension for now
    const iconPngPath = path.join(assetsDir, 'icon.png');
    fs.copyFileSync(png256Path, iconPngPath);
    console.log('✓ Created: assets/icon.png (copy of 256x256)\n');

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
