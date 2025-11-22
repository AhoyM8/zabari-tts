# Auto-Update System Documentation

## Overview

Zabari TTS uses **electron-updater** with **GitHub Releases** to provide seamless automatic updates without requiring users to manually download and reinstall the application.

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User's Computer                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Zabari TTS Application (v1.0.0)                       │ │
│  │                                                        │ │
│  │  [electron-updater]                                    │ │
│  │         ↓                                              │ │
│  │    Check for updates every 4 hours                     │ │
│  └────────────┬───────────────────────────────────────────┘ │
│               │                                             │
└───────────────┼─────────────────────────────────────────────┘
                ↓
        Internet Connection
                ↓
┌───────────────┴─────────────────────────────────────────────┐
│                    GitHub Releases                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  zabari-tts/releases                                   │ │
│  │                                                        │ │
│  │  • v1.0.1 (latest)                                     │ │
│  │    - latest.yml (version metadata)                     │ │
│  │    - Zabari-TTS-1.0.1-win-x64.exe (installer)          │ │
│  │                                                        │ │
│  │  • v1.0.0                                              │ │
│  │    - Zabari-TTS-1.0.0-win-x64.exe                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Update Flow

1. **Automatic Check** (every 4 hours + on app startup):
   - electron-updater queries GitHub Releases API
   - Compares current version with latest release version

2. **Update Available**:
   - User sees notification in bottom-right corner
   - Shows new version number and release notes
   - User can click "Download Update" or "Dismiss"

3. **Download**:
   - Downloads update in background
   - Shows progress bar (percentage, speed, MB downloaded)
   - Does not interrupt user's work

4. **Ready to Install**:
   - Green notification appears: "Update Ready"
   - User clicks "Install & Restart"
   - App closes, installs update, and relaunches automatically

## Configuration

### 1. GitHub Repository Setup

**package.json** (already configured):

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "YOUR_GITHUB_USERNAME",
        "repo": "zabari-tts",
        "releaseType": "release"
      }
    ]
  }
}
```

**Replace `YOUR_GITHUB_USERNAME`** with your actual GitHub username!

### 2. GitHub Token Setup

To publish releases, you need a GitHub Personal Access Token:

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: "Zabari TTS Release Token"
4. Expiration: 90 days or "No expiration"
5. Scopes: Check `repo` (Full control of private repositories)
6. Click "Generate token"
7. **Copy the token** (you won't see it again!)

**Set environment variable:**

Windows (PowerShell):
```powershell
$env:GH_TOKEN="ghp_YOUR_TOKEN_HERE"
```

Windows (CMD):
```cmd
set GH_TOKEN=ghp_YOUR_TOKEN_HERE
```

Linux/Mac:
```bash
export GH_TOKEN="ghp_YOUR_TOKEN_HERE"
```

**Permanent setup (recommended):**

Add to your system environment variables:
- Windows: System Properties > Environment Variables
- Linux/Mac: Add `export GH_TOKEN="..."` to `~/.bashrc` or `~/.zshrc`

## Creating Releases

### Option 1: Automated Release Script (Recommended)

**Pre-release checklist:**
```bash
npm run release:check
```

This checks:
- Git status is clean
- Local branch is synced with remote
- GitHub token is configured
- Dependencies are installed
- Icons are built

**Create a release:**

```bash
# Patch release (bug fixes): 1.0.0 -> 1.0.1
npm run release:patch

# Minor release (new features): 1.0.0 -> 1.1.0
npm run release:minor

# Major release (breaking changes): 1.0.0 -> 2.0.0
npm run release:major

# Draft release (not published immediately)
npm run release:draft
```

The script will:
1. ✓ Verify git status is clean
2. ✓ Bump version in package.json
3. ✓ Create git commit and tag
4. ✓ Push to GitHub
5. ✓ Build application
6. ✓ Upload to GitHub Releases
7. ✓ Publish release (users will be notified)

### Option 2: Manual Release

**Step 1: Update version**
```bash
# Edit package.json and frontend/package.json
# Change "version": "1.0.0" to "1.0.1"
```

**Step 2: Commit and tag**
```bash
git add package.json frontend/package.json
git commit -m "Release v1.0.1"
git tag v1.0.1
git push origin master
git push origin v1.0.1
```

**Step 3: Build and publish**
```bash
# Publish release immediately
npm run publish:github

# Or create draft release
npm run draft:github
```

### Option 3: GitHub CLI

If you have `gh` CLI installed:

```bash
# Build the app first
npm run dist

# Create release and upload files
gh release create v1.0.1 \
  --title "Zabari TTS v1.0.1" \
  --notes "Bug fixes and improvements" \
  dist/Zabari-TTS-*.exe \
  dist/latest.yml
```

## Version Numbering (Semantic Versioning)

Follow [Semantic Versioning](https://semver.org/):

**Format: MAJOR.MINOR.PATCH**

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes, incompatible API changes
- **MINOR** (1.0.0 → 1.1.0): New features, backwards-compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backwards-compatible

Examples:
- Fixed typo in UI → Patch (1.0.0 → 1.0.1)
- Added new TTS engine → Minor (1.0.0 → 1.1.0)
- Rewrote entire architecture → Major (1.0.0 → 2.0.0)

## Update Behavior

### Auto-Update Settings

**Configured in electron-main.js:**

```javascript
autoUpdater.autoDownload = false;       // User confirms download
autoUpdater.autoInstallOnAppQuit = true; // Install on quit
```

**Check frequency:**
- On app startup (5 seconds after launch)
- Every 4 hours while app is running

### User Experience

1. **Notification appears** (bottom-right corner)
2. **User actions:**
   - "Download Update" → Downloads in background
   - "Dismiss" → Hides notification (will check again in 4 hours)
3. **Download progress** shown with percentage bar
4. **Update ready:**
   - "Install & Restart" → Quits app, installs, relaunches
   - "Later" → Update installs automatically when user quits app

### Development Mode

Auto-updater is **disabled in development mode** (npm run electron:dev):
- Prevents accidental updates during development
- "Check for Updates" button shows "disabled in dev mode"

## Files Generated During Release

### Windows Build Artifacts

```
dist/
├── latest.yml                          # Update metadata (version, SHA512, size)
├── Zabari-TTS-1.0.1-win-x64.exe        # NSIS installer
└── Zabari-TTS-1.0.1-portable.exe       # Portable version
```

### What Gets Uploaded to GitHub

electron-builder automatically uploads:
- `latest.yml` - Version metadata (required for auto-updates!)
- `Zabari-TTS-{version}-win-x64.exe` - Installer
- `Zabari-TTS-{version}-portable.exe` - Portable version (optional)

**Important:** `latest.yml` is critical for auto-updates to work!

## Troubleshooting

### Issue: "GitHub token not found"

**Solution:**
```powershell
$env:GH_TOKEN="ghp_YOUR_TOKEN_HERE"
npm run publish:github
```

### Issue: "Resource not accessible by integration"

**Problem:** Token doesn't have `repo` scope

**Solution:**
1. Go to https://github.com/settings/tokens
2. Click on your token
3. Enable `repo` scope
4. Regenerate token if needed

### Issue: "Updates not working for users"

**Checklist:**
1. ✓ `latest.yml` uploaded to GitHub Release?
2. ✓ Release is published (not draft)?
3. ✓ User has internet connection?
4. ✓ User is running production build (not dev mode)?
5. ✓ Firewall/antivirus blocking update check?

**Debug:**
- Check Electron console logs: `[Auto-Updater]` messages
- Verify GitHub API: `https://api.github.com/repos/YOUR_USERNAME/zabari-tts/releases/latest`

### Issue: "Error: ENOENT latest.yml"

**Problem:** `latest.yml` not generated during build

**Solution:**
```bash
# Ensure publish config is in package.json
npm run dist  # Build first
# Check dist/latest.yml exists
npm run publish:github
```

### Issue: Updates fail to install

**Common causes:**
- User doesn't have admin permissions (Windows)
- Antivirus blocking the installer
- App is installed in protected directory

**Solution:**
- Run installer as administrator
- Add app to antivirus whitelist
- Install in user directory instead of Program Files

## Testing Updates Locally

### 1. Create Local Test Release

```bash
# Build the app
npm run dist

# Create a local HTTP server to serve updates
npx http-server dist -p 8080

# Modify electron-main.js temporarily:
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'http://localhost:8080'
});
```

### 2. Test Update Flow

1. Install version 1.0.0 on your machine
2. Bump version to 1.0.1 in package.json
3. Build: `npm run dist`
4. Start local server: `npx http-server dist -p 8080`
5. Launch installed app (v1.0.0)
6. Check for updates → Should find v1.0.1

## Security Considerations

### Code Signing (Recommended for Production)

**Why:** Prevents "Unknown Publisher" warnings on Windows

**How to get certificate:**
1. Purchase from: Sectigo, DigiCert, GlobalSign (~$100-500/year)
2. Or use: Windows Store signing (free for store apps)

**Configure in package.json:**
```json
{
  "win": {
    "certificateFile": "path/to/cert.pfx",
    "certificatePassword": "password",
    "signingHashAlgorithms": ["sha256"]
  }
}
```

**Environment variable (safer):**
```bash
export CSC_LINK="path/to/cert.pfx"
export CSC_KEY_PASSWORD="password"
```

### Update Security

electron-updater verifies updates using:
- **SHA-512 checksums** (in latest.yml)
- **HTTPS** for downloads (GitHub SSL)
- **Signature validation** (if code signed)

## Advanced Configuration

### Custom Update Channels

Support beta/stable channels:

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "YOUR_USERNAME",
        "repo": "zabari-tts",
        "channel": "latest"
      }
    ]
  }
}
```

**Create beta release:**
```bash
git tag v1.1.0-beta.1
npm run publish:github
# Mark as "pre-release" on GitHub
```

**Switch user to beta channel:**
```javascript
autoUpdater.channel = 'beta';
```

### Update Notification Customization

**Modify UpdateNotification.js:**

```javascript
// Change position
<div className="fixed top-4 left-4 z-50">

// Auto-download updates
autoUpdater.autoDownload = true;

// Silent updates (install on quit without prompt)
autoUpdater.autoInstallOnAppQuit = true;
```

## Best Practices

1. **Always test releases:**
   - Test update flow before publishing
   - Keep a test machine with previous version

2. **Semantic versioning:**
   - Follow semver strictly
   - Major changes need clear migration docs

3. **Release notes:**
   - Write clear, user-friendly release notes
   - Highlight breaking changes
   - Include screenshots for UI changes

4. **Staged rollouts:**
   - Release as draft first
   - Test with small user group
   - Publish to all users after validation

5. **Rollback plan:**
   - Keep previous release available
   - Users can manually download older version
   - Fix-forward for critical bugs

6. **Communication:**
   - Announce major updates on GitHub/social media
   - Provide changelog in release notes
   - Respond to update-related issues quickly

## Resources

- **electron-updater docs:** https://www.electron.build/auto-update
- **GitHub Releases API:** https://docs.github.com/en/rest/releases
- **Code signing guide:** https://www.electron.build/code-signing
- **Semantic Versioning:** https://semver.org/

## Support

If you encounter issues with auto-updates:

1. Check logs in Electron console: `[Auto-Updater]` messages
2. Verify release configuration: `npm run release:check`
3. Test manually: Download latest release from GitHub
4. Open issue: https://github.com/YOUR_USERNAME/zabari-tts/issues

---

**Last updated:** 2025-11-22
