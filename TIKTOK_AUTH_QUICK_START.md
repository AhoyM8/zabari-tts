# TikTok Authentication - Quick Start Guide

## One-Time Setup (5 minutes)

### Step 1: Create Session Files
```bash
npm run tiktok:login
```

Follow the browser window:
- Log in to your TikTok account
- Complete 2FA if prompted
- **After successful login, press Enter in the terminal**

Result: `tiktok-sessions/tiktok_session.json` is created

### Step 2: Verify Session
```bash
node lib/tiktok-auth/session-loader.js
```

Expected output:
```
✅ Loaded TikTok session from tiktok_session.json
📅 Saved at: 2025-11-17T...
```

### Step 3: Add to .gitignore
```bash
echo "tiktok-sessions/" >> .gitignore
```

Done! Session is ready to use.

---

## Usage in Code

### Use Case 1: Standalone Script
```javascript
const { chromium } = require('playwright');
const TikTokSessionManager = require('./lib/tiktok-auth/session-manager');

(async () => {
  const browser = await chromium.launch();
  const manager = new TikTokSessionManager();
  
  const context = await manager.createAuthenticatedContext(browser);
  const page = await context.newPage();
  
  await page.goto('https://www.tiktok.com/@your_account');
  // You're now logged in!
  
  await browser.close();
})();
```

### Use Case 2: In chat-logger-webspeech.js
```javascript
const TikTokSessionManager = require('./lib/tiktok-auth/session-manager');

async function setupTikTok(browser) {
  try {
    const manager = new TikTokSessionManager();
    const context = await manager.createAuthenticatedContext(browser);
    const page = await context.newPage();
    
    console.log('📱 TikTok opened with saved session');
    return { context, page };
  } catch (error) {
    console.error('❌ TikTok setup failed:', error.message);
    return null;
  }
}
```

### Use Case 3: Check Session Health
```javascript
const TikTokSessionManager = require('./lib/tiktok-auth/session-manager');

(async () => {
  const manager = new TikTokSessionManager();
  const health = await manager.checkSessionHealth();
  
  console.log(health);
  // Output: { exists: true, expired: false, valid: true, message: '...' }
})();
```

---

## File Structure Created

```
zabari-tts/
├── lib/tiktok-auth/
│   ├── session-saver.js        # Manual login, capture session
│   ├── session-loader.js       # Load session from file
│   ├── session-manager.js      # Create authenticated contexts
│   └── index.js                # (Optional) exports all classes
├── tiktok-sessions/
│   ├── .gitignore              # Prevent accidental commits
│   └── tiktok_session.json     # Your saved session (PRIVATE!)
├── scripts/
│   └── tiktok-login.js         # CLI entry point
└── TIKTOK_AUTH_IMPLEMENTATION_GUIDE.md  # Full documentation
```

---

## Package.json Scripts to Add

Add to `package.json`:
```json
{
  "scripts": {
    "tiktok:login": "node scripts/tiktok-login.js",
    "tiktok:check": "node lib/tiktok-auth/session-loader.js",
    "tiktok:logout": "node -e \"require('./lib/tiktok-auth/session-manager').deleteSession()\""
  }
}
```

Then use:
```bash
npm run tiktok:login    # Create/refresh session
npm run tiktok:check    # Verify session is valid
npm run tiktok:logout   # Delete saved session
```

---

## Common Commands

| Task | Command |
|------|---------|
| Create/refresh session | `npm run tiktok:login` |
| Check if session exists | `npm run tiktok:check` |
| Delete session | `npm run tiktok:logout` |
| Test in browser | `node -e "require('./lib/tiktok-auth/session-loader').loadSession()"` |

---

## Troubleshooting Checklist

### Session won't create?
- [ ] Running `npm run tiktok:login`?
- [ ] Browser window appearing?
- [ ] Able to log in manually?
- [ ] Pressing Enter after login?
- [ ] Check console for errors

### Session file exists but won't load?
- [ ] File at `tiktok-sessions/tiktok_session.json`?
- [ ] File has read permissions?
- [ ] JSON valid? (Try opening in editor)
- [ ] Not older than 30 days?

### Authentication fails when using session?
- [ ] Session expired? (Run `npm run tiktok:login` again)
- [ ] TikTok changed DOM? (Try manual login)
- [ ] Session file corrupted? (Delete and recreate)

### 2FA Issues?
- [ ] Complete 2FA in browser before pressing Enter
- [ ] Session saved successfully after 2FA?
- [ ] Try refreshing session if expired

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         First Time: Manual Login                │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. Run: npm run tiktok:login                   │
│     ↓                                           │
│  2. SessionSaver opens TikTok in browser        │
│     ↓                                           │
│  3. User logs in manually                       │
│     ↓                                           │
│  4. User presses Enter                          │
│     ↓                                           │
│  5. Cookies + localStorage + sessionStorage     │
│     saved to tiktok_session.json                │
│                                                 │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│     Subsequent Runs: Automatic Login            │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. App starts (no manual login)                │
│     ↓                                           │
│  2. SessionManager loads tiktok_session.json    │
│     ↓                                           │
│  3. Creates context with:                       │
│     - Cookies restored                          │
│     - localStorage restored                     │
│     - sessionStorage restored                   │
│     ↓                                           │
│  4. Page loads with full authentication         │
│     (No login page needed!)                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Security Notes

⚠️ **Important**: 
- `tiktok_session.json` contains live authentication cookies
- **Never commit to git** - it's in `.gitignore` for this reason
- **Never upload to cloud** without encryption
- **Share carefully** - whoever has this file can access your account
- **Delete before sharing machine** - or sessions will be exposed

---

## Implementation Checklist

### Phase 1: Basic Implementation
- [ ] Create `lib/tiktok-auth/` directory
- [ ] Add `session-saver.js`
- [ ] Add `session-loader.js`
- [ ] Add `session-manager.js`
- [ ] Create `tiktok-sessions/.gitignore`
- [ ] Create `scripts/tiktok-login.js`
- [ ] Add npm scripts to `package.json`

### Phase 2: Integration
- [ ] Test manual login: `npm run tiktok:login`
- [ ] Verify session creation: `npm run tiktok:check`
- [ ] Integrate into `chat-logger-webspeech.js`
- [ ] Add TikTok to frontend config
- [ ] Update `dynamic-config.json` structure

### Phase 3: Testing
- [ ] Test session persistence across restarts
- [ ] Test chat message detection on TikTok live
- [ ] Verify session refresh (delete and recreate)
- [ ] Test 2FA handling

### Phase 4: Documentation
- [ ] Update main `CLAUDE.md` with TikTok auth info
- [ ] Document TikTok chat selectors (if different)
- [ ] Add troubleshooting guide for TikTok issues

---

## Next Steps

1. **Copy the implementation files** from the full guide
2. **Run** `npm run tiktok:login`
3. **Follow browser prompts** to log in
4. **Integrate** into your chat logger
5. **Test** chat message detection

For detailed implementation, see: **TIKTOK_AUTH_IMPLEMENTATION_GUIDE.md**

---

## Reference Documents

- Full Implementation: `TIKTOK_AUTH_IMPLEMENTATION_GUIDE.md`
- Playwright Docs: https://playwright.dev/docs/auth
- Session Management: https://playwright.dev/python/docs/auth#reuse-authentication-state
