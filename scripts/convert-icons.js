#!/usr/bin/env node
/**
 * Convert yarin_img.webp to PNG and ICO formats for Electron
 */

const sharp = require('sharp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');
const fs = require('fs');
const path = require('path');

const INPUT_IMAGE = path.join(__dirname, '..', 'yarin_img.webp');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const TEMP_DIR = path.join(__dirname, '..', 'temp-icons');

// Create directories
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function convertIcons() {
  console.log('🎨 Converting yarin_img.webp to icon formats...\n');

  try {
    // Check if input exists
    if (!fs.existsSync(INPUT_IMAGE)) {
      console.error('❌ Error: yarin_img.webp not found!');
      process.exit(1);
    }

    console.log('📝 Input:', INPUT_IMAGE);
    console.log('📁 Output:', ASSETS_DIR);
    console.log('');

    // 1. Create PNG icon (256x256 for app icon)
    console.log('🖼️  Creating icon.png (256x256)...');
    const iconPng = path.join(ASSETS_DIR, 'icon.png');
    await sharp(INPUT_IMAGE)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(iconPng);
    console.log('✅ Created:', iconPng);

    // 2. Create tray icon (32x32 for system tray)
    console.log('🖼️  Creating tray-icon.png (32x32)...');
    const trayPng = path.join(ASSETS_DIR, 'tray-icon.png');
    await sharp(INPUT_IMAGE)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(trayPng);
    console.log('✅ Created:', trayPng);

    // 3. Create temporary PNGs for ICO conversion (multiple sizes)
    console.log('🖼️  Creating temporary PNGs for ICO...');
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const tempPngs = [];

    for (const size of sizes) {
      const tempPng = path.join(TEMP_DIR, `icon-${size}.png`);
      await sharp(INPUT_IMAGE)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(tempPng);
      tempPngs.push(tempPng);
      console.log(`   ✓ ${size}x${size}`);
    }

    // 4. Convert to ICO (Windows taskbar icon)
    console.log('🖼️  Creating icon.ico (multi-size)...');
    const iconIco = path.join(ASSETS_DIR, 'icon.ico');
    const icoBuffer = await pngToIco(tempPngs);
    fs.writeFileSync(iconIco, icoBuffer);
    console.log('✅ Created:', iconIco);

    // 5. Cleanup temp files
    console.log('🧹 Cleaning up temporary files...');
    for (const tempPng of tempPngs) {
      fs.unlinkSync(tempPng);
    }
    fs.rmdirSync(TEMP_DIR);
    console.log('✅ Cleanup complete');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Icon conversion complete!');
    console.log('='.repeat(60));
    console.log('\nCreated files:');
    console.log('  ✓', iconPng, '(256x256 app icon)');
    console.log('  ✓', trayPng, '(32x32 tray icon)');
    console.log('  ✓', iconIco, '(multi-size Windows icon)');
    console.log('\nThese icons will be used by Electron automatically.');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during conversion:', error.message);
    console.error(error);
    process.exit(1);
  }
}

convertIcons();
