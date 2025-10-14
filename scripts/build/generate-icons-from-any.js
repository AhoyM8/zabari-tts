// Generate icons from ANY image format (PNG, JPG, WEBP, SVG, etc.)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, '..', '..', 'assets');

// Find source image (supports multiple formats)
function findSourceImage() {
  const extensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.bmp', '.tiff'];
  const possibleNames = ['source', 'logo', 'icon-source', 'original'];

  // First check for files explicitly named as source
  for (const name of possibleNames) {
    for (const ext of extensions) {
      const filePath = path.join(assetsDir, name + ext);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
  }

  // If no source found, list available images
  return null;
}

async function generateIcons(sourcePath) {
  console.log(`\n🎨 Generating icons from: ${path.basename(sourcePath)}\n`);

  try {
    // Read source image
    const sourceBuffer = fs.readFileSync(sourcePath);
    const metadata = await sharp(sourceBuffer).metadata();
    console.log(`Source image: ${metadata.width}x${metadata.height} (${metadata.format})\n`);

    // Generate main PNG icon at 256x256
    const png256Path = path.join(assetsDir, 'icon-256.png');
    await sharp(sourceBuffer)
      .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(png256Path);
    console.log('✓ Created: assets/icon-256.png');

    // Copy to icon.png (main icon)
    const iconPngPath = path.join(assetsDir, 'icon.png');
    fs.copyFileSync(png256Path, iconPngPath);
    console.log('✓ Created: assets/icon.png');

    // Generate tray icon at 32x32
    const trayIconPath = path.join(assetsDir, 'tray-icon.png');
    await sharp(sourceBuffer)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(trayIconPath);
    console.log('✓ Created: assets/tray-icon.png');

    // Generate additional sizes for potential ICO conversion
    const sizes = [16, 24, 32, 48, 64, 128];
    for (const size of sizes) {
      const pngPath = path.join(assetsDir, `icon-${size}.png`);
      await sharp(sourceBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(pngPath);
      console.log(`✓ Created: assets/icon-${size}.png`);
    }

    console.log('\n✅ All icons generated successfully!\n');
    console.log('📋 Ready to use:');
    console.log('  - assets/icon.png (main window icon)');
    console.log('  - assets/tray-icon.png (system tray icon)\n');

    console.log('Optional: Convert to .ico for better Windows support');
    console.log('  1. Go to https://icoconvert.com/');
    console.log('  2. Upload assets/icon-256.png');
    console.log('  3. Download as icon.ico');
    console.log('  4. Save to assets/icon.ico\n');

    console.log('🚀 Run: npm run electron:dev\n');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Main
(async () => {
  // Check if source image path provided as argument
  const args = process.argv.slice(2);
  let sourcePath;

  if (args.length > 0) {
    sourcePath = path.resolve(args[0]);
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Error: File not found: ${sourcePath}`);
      process.exit(1);
    }
  } else {
    // Auto-detect source image
    sourcePath = findSourceImage();

    if (!sourcePath) {
      console.log('📸 Icon Generator\n');
      console.log('Usage:');
      console.log('  node generate-icons-from-any.js <path-to-image>\n');
      console.log('Supported formats:');
      console.log('  PNG, JPG, JPEG, WEBP, SVG, GIF, BMP, TIFF\n');
      console.log('Examples:');
      console.log('  node generate-icons-from-any.js my-logo.png');
      console.log('  node generate-icons-from-any.js ~/Downloads/logo.webp');
      console.log('  node generate-icons-from-any.js C:\\Users\\Name\\Desktop\\icon.jpg\n');
      console.log('Or place an image named "source.*", "logo.*", or "icon-source.*"');
      console.log('in the assets/ folder and run without arguments.\n');

      // List available images in assets
      const files = fs.readdirSync(assetsDir).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.bmp', '.tiff'].includes(ext);
      });

      if (files.length > 0) {
        console.log('Available images in assets/:');
        files.forEach(f => console.log(`  - ${f}`));
        console.log('\nTo use one of these, run:');
        console.log(`  node generate-icons-from-any.js assets/${files[0]}`);
      }

      process.exit(0);
    }
  }

  await generateIcons(sourcePath);
})();
