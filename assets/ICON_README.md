# Icon Files for Electron App

This directory contains icon files for the Electron application.

## 🎨 Easiest Method: Auto-Generate from Any Image

**Just have ANY image file? We can generate all icons for you!**

### Method 1: Use the Icon Generator Script
```bash
# Generate from any image format (PNG, JPG, WEBP, SVG, etc.)
npm run generate-icons path/to/your/image.png

# Examples:
npm run generate-icons ~/Downloads/logo.png
npm run generate-icons C:\Users\Name\Desktop\icon.jpg
npm run generate-icons my-logo.webp
```

**Supported formats:** PNG, JPG, JPEG, WEBP, SVG, GIF, BMP, TIFF

This will automatically create:
- ✅ `icon.png` - Main window icon (256x256)
- ✅ `tray-icon.png` - System tray icon (32x32)
- ✅ All intermediate sizes (16, 24, 32, 48, 64, 128, 256)

### Method 2: Auto-Detect from assets/ folder
Place an image named `source.*`, `logo.*`, or `icon-source.*` in this folder, then run:
```bash
npm run generate-icons
```

## 📂 Required Files (Generated Automatically)

### For Windows Build:
- **icon.png** or **icon.ico** - Main application icon
  - Used for taskbar, window title bar, and shortcuts
  - PNG works fine, ICO optional for better Windows support

- **tray-icon.png** - System tray icon (32x32)
  - Appears in the system tray (notification area)
  - If not provided, will use icon.png as fallback

## 🛠️ Manual Creation (If You Prefer)

### Quick Online Converter:
1. Have any image (PNG, JPG, etc.)
2. Go to https://icoconvert.com/
3. Upload your image
4. Download as .ico
5. Save to this directory as `icon.ico`

### Using Existing Logo:
1. Export as PNG at high resolution (512x512 or larger)
2. Run `npm run generate-icons path/to/logo.png`
3. Done!

## ✅ What's Already Created

The following icons are already generated from the default SVG:
- ✅ icon.png (main icon)
- ✅ tray-icon.png (system tray)
- ✅ icon.svg (source SVG)
- ✅ Multiple sizes (16-256px)

**To replace with your own:**
Just run `npm run generate-icons your-image.png`

## 🚀 After Adding Icons

Once icons are in place, test the app:
```bash
npm run electron:dev
```

Or build the installer:
```bash
npm run dist
```

The installer and application will use your custom icons!
