# Quick Release Guide

## First-Time Setup

### 1. Configure GitHub Username

Edit `package.json`:

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "YOUR_GITHUB_USERNAME",  ← Change this!
        "repo": "zabari-tts"
      }
    ]
  }
}
```

### 2. Create GitHub Token

1. Go to: https://github.com/settings/tokens
2. "Generate new token (classic)"
3. Enable scope: `repo` ✓
4. Copy token: `ghp_xxxxxxxxxxxxxxxxxxxx`

### 3. Set Environment Variable

**Windows PowerShell:**
```powershell
$env:GH_TOKEN="ghp_YOUR_TOKEN_HERE"
```

**Windows CMD:**
```cmd
set GH_TOKEN=ghp_YOUR_TOKEN_HERE
```

**Linux/Mac:**
```bash
export GH_TOKEN="ghp_YOUR_TOKEN_HERE"
```

**Make it permanent** (Windows):
1. Search "Environment Variables" in Start Menu
2. System Properties > Environment Variables
3. New User Variable: `GH_TOKEN` = `ghp_...`

## Creating a Release

### Quick Method

```bash
# 1. Check if everything is ready
npm run release:check

# 2. Create release (automatically bumps version, builds, and publishes)
npm run release:patch    # Bug fixes:     1.0.0 → 1.0.1
npm run release:minor    # New features:  1.0.0 → 1.1.0
npm run release:major    # Breaking:      1.0.0 → 2.0.0
```

That's it! The script handles everything automatically.

### What the Script Does

1. ✓ Checks git status is clean
2. ✓ Bumps version in `package.json` and `frontend/package.json`
3. ✓ Creates git commit: "Release vX.Y.Z"
4. ✓ Creates git tag: `vX.Y.Z`
5. ✓ Pushes commit and tag to GitHub
6. ✓ Builds the application
7. ✓ Uploads to GitHub Releases
8. ✓ Publishes the release

**Time:** ~5-10 minutes depending on build speed

## Manual Release (Advanced)

If you prefer manual control:

```bash
# 1. Update version manually
# Edit package.json: "version": "1.0.1"

# 2. Commit and tag
git add package.json frontend/package.json
git commit -m "Release v1.0.1"
git tag v1.0.1

# 3. Push
git push origin master
git push origin v1.0.1

# 4. Build and publish
npm run publish:github
```

## Draft Releases

Create a release without publishing immediately:

```bash
npm run release:draft
```

Then go to GitHub to:
- Edit release notes
- Add screenshots
- Test the release
- Click "Publish release" when ready

## Version Numbers

Follow [Semantic Versioning](https://semver.org/):

| Type | Example | When to Use |
|------|---------|-------------|
| **Patch** | 1.0.0 → 1.0.1 | Bug fixes, typos, small tweaks |
| **Minor** | 1.0.0 → 1.1.0 | New features, enhancements (backwards-compatible) |
| **Major** | 1.0.0 → 2.0.0 | Breaking changes, major rewrites |

**Examples:**
- Fixed crash when closing app → **Patch**
- Added new Kokoro voice → **Minor**
- Rewrote TTS engine API → **Major**

## Troubleshooting

### "GitHub token not found"

```powershell
# Set token again
$env:GH_TOKEN="ghp_YOUR_TOKEN_HERE"

# Verify it's set
echo $env:GH_TOKEN
```

### "Working directory has uncommitted changes"

```bash
# Commit or stash your changes first
git status
git add .
git commit -m "Your changes"

# Then run release script
npm run release:patch
```

### "Permission denied" or "404 Not Found"

**Check:**
1. GitHub token has `repo` scope? ✓
2. Repository name matches package.json? ✓
3. Token is valid (not expired)? ✓

**Fix:**
```bash
# Test token manually
curl -H "Authorization: token $env:GH_TOKEN" https://api.github.com/user
# Should return your GitHub user info
```

### Build fails

```bash
# Clean and rebuild
rm -rf dist
rm -rf frontend/.next
npm run build:frontend
npm run dist

# Check logs for specific error
```

## Post-Release

### 1. Verify Release on GitHub

Go to: `https://github.com/YOUR_USERNAME/zabari-tts/releases`

**Check:**
- ✓ Release is published (not draft)
- ✓ Files are uploaded:
  - `latest.yml` (critical for auto-updates!)
  - `Zabari-TTS-{version}-win-x64.exe`
  - `Zabari-TTS-{version}-portable.exe`
- ✓ Release notes are clear

### 2. Test Auto-Update

1. Install previous version on a test machine
2. Launch the app
3. Wait for update notification (or click "Check for Updates")
4. Download and install update
5. Verify new version is running

### 3. Announce Release

- Post on social media
- Update documentation
- Notify users in Discord/community

## Release Checklist

Before running `npm run release:*`:

- [ ] All changes committed and pushed
- [ ] Git status is clean
- [ ] Tests pass (if you have tests)
- [ ] Documentation updated
- [ ] Release notes prepared
- [ ] GitHub token is set: `$env:GH_TOKEN`
- [ ] Package.json has correct GitHub username
- [ ] Icons are generated: `npm run generate-icons`

## Prerequisites for Users

**Important:** Users installing your app need:
- ✓ **Node.js** installed (v18 or higher)
- ✓ **Python** installed (for Kokoro TTS) with dependencies
- ✓ **npm dependencies** installed in both root and frontend directories

The app does NOT bundle Node.js or Python - it uses the system installations.

Run checklist automatically:
```bash
npm run release:check
```

## Files Generated

After building, you'll see:

```
dist/
├── latest.yml                       ← Required for auto-updates!
├── Zabari-TTS-1.0.1-win-x64.exe     ← Installer
├── Zabari-TTS-1.0.1-portable.exe    ← Portable version
└── win-unpacked/                    ← Unpacked app (for testing)
```

**Important:** `latest.yml` contains version metadata and checksums. Without it, auto-updates won't work!

## How Users Get Updates

1. **User launches Zabari TTS**
2. App checks GitHub Releases (5 seconds after launch)
3. **If update available:**
   - Notification appears: "Update available: vX.Y.Z"
   - User clicks "Download Update"
4. **Download in background** (progress bar shown)
5. **Update ready:**
   - User clicks "Install & Restart"
   - App closes, installs update, relaunches
6. **User is now on latest version**

**Frequency:** App checks for updates every 4 hours while running.

## Common Workflows

### Bug Fix Release

```bash
# 1. Fix the bug
git add .
git commit -m "Fix: Resolved crash on startup"
git push

# 2. Release patch
npm run release:patch

# Done! Users will get update automatically
```

### Feature Release

```bash
# 1. Develop feature on branch
git checkout -b feature/new-voice
# ... code changes ...
git commit -m "Add new Kokoro voice"

# 2. Merge to main
git checkout master
git merge feature/new-voice
git push

# 3. Release minor version
npm run release:minor

# 4. Announce new feature
```

### Emergency Hotfix

```bash
# 1. Fix critical bug immediately
git add .
git commit -m "HOTFIX: Fix data loss bug"
git push

# 2. Create release (skip checks)
npm run release:patch

# 3. Monitor GitHub Actions for completion

# 4. Notify users to update ASAP
```

## Need Help?

- **Auto-update details:** See `docs/AUTO-UPDATE.md`
- **GitHub Issues:** https://github.com/YOUR_USERNAME/zabari-tts/issues
- **electron-updater docs:** https://www.electron.build/auto-update

---

**Quick Commands:**

```bash
npm run release:check   # Verify everything is ready
npm run release:patch   # Bug fix release
npm run release:minor   # Feature release
npm run release:major   # Breaking change release
npm run release:draft   # Create draft (test before publishing)
```
