# 🎨 Icons Quick Start Guide

## ✅ Current Status

Your app already has placeholder icons generated and ready to use!

**What's already created:**
- ✅ `assets/icon.png` - Main window icon (256x256)
- ✅ `assets/tray-icon.png` - System tray icon (32x32)
- ✅ `assets/icon.svg` - Source SVG
- ✅ All sizes (16, 24, 32, 48, 64, 128, 256px)

**Your app is ready to run with icons!**

## 🚀 To Use Your Own Logo/Icon

### Super Easy Method
Just have **any image file** (PNG, JPG, WEBP, SVG, etc.)?

```bash
npm run generate-icons path/to/your/logo.png
```

**Examples:**
```bash
# From Downloads folder
npm run generate-icons ~/Downloads/my-logo.png

# From Desktop
npm run generate-icons C:\Users\YourName\Desktop\logo.jpg

# From current directory
npm run generate-icons my-logo.webp
```

**Supported formats:** PNG, JPG, JPEG, WEBP, SVG, GIF, BMP, TIFF

That's it! The script will automatically:
1. Resize your image to all needed sizes
2. Create `icon.png` (main icon)
3. Create `tray-icon.png` (system tray)
4. Generate all intermediate sizes

## 📂 Where Icons Are Used

### Main Window Icon (`icon.png`)
- Window title bar
- Taskbar icon
- Alt+Tab switcher
- Installer icon

### System Tray Icon (`tray-icon.png`)
- System tray (notification area)
- Right-click menu icon
- Shows when app is minimized

## 🎯 Recommended Icon Design

**Best practices:**
- **Size**: Minimum 256x256px (higher is fine)
- **Format**: PNG with transparency, or JPG
- **Design**: Simple, recognizable logo/symbol
- **Colors**: High contrast (works well at small sizes)

**Good examples:**
- Company logo
- App symbol/icon
- Single letter on colored background
- Simple geometric shape

## 🧪 Test Your Icons

After generating icons:

```bash
# Test in development
npm run electron:dev
```

You should see:
- ✅ Your icon in the window title bar
- ✅ Your icon in the taskbar
- ✅ Your tray icon in the system tray (bottom-right on Windows)

## 🔧 Advanced: Manual Control

If you want full control:

### 1. Place Your Images in assets/
```
assets/
  icon.png      ← Main icon (256x256 or larger)
  tray-icon.png ← Tray icon (32x32)
```

### 2. Or Use .ico Format
For better Windows support, convert to .ico:
1. Go to https://icoconvert.com/
2. Upload your PNG
3. Download as .ico
4. Save as `assets/icon.ico`

The app will automatically use .ico if available, otherwise .png.

## ❓ FAQ

**Q: What if I don't have a logo yet?**
A: The placeholder icons work fine! You can replace them later.

**Q: Can I use the same image for both icons?**
A: Yes! The script automatically creates both from one source image.

**Q: Will the installer use my icon?**
A: Yes, when you run `npm run dist`, the installer will use your custom icon.

**Q: What about macOS/Linux icons?**
A: The same icons work! Electron handles the conversion automatically.

**Q: The icon looks blurry/pixelated?**
A: Use a higher resolution source image (512x512 or larger).

## 🎨 Example Workflow

1. **Find or create your logo** (any size, any format)
2. **Run the generator:**
   ```bash
   npm run generate-icons my-logo.png
   ```
3. **Test it:**
   ```bash
   npm run electron:dev
   ```
4. **Build the installer:**
   ```bash
   npm run dist
   ```
5. **Done!** Your installer now has your custom icon.

## 📋 Summary

**To set your app icon:**
```bash
npm run generate-icons path/to/your/image.png
```

**That's literally it!** 🎉

No complex tools, no Photoshop, no manual resizing. Just one command and you're done.
