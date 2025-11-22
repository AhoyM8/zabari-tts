# Authentication Pattern Analysis: Instagram to TikTok

## Executive Summary

Based on the Instagram authentication pattern used in `insta-stock` and Playwright best practices, here's a comprehensive analysis of how to implement TikTok login with persistent session management.

---

## Part 1: Instagram Authentication Pattern (insta-stock)

### Architecture Overview

The insta-stock project implements authentication in three main phases:

#### Phase 1: Manual Login & Session Capture
```
User runs: npm run login
     ↓
Opens browser (headless: false)
     ↓
User logs in manually
     ↓
After login → press Enter
     ↓
Script captures:
  • Cookies (via context.cookies())
  • localStorage (via page.evaluate())
  • sessionStorage (via page.evaluate())
     ↓
Saves to: instagram_session.json
```

#### Phase 2: Session Persistence
```
Session file structure:
{
  "cookies": [...],           // HTTP cookies
  "localStorage": {...},       // Browser storage
  "sessionStorage": {...},     // Session storage
  "savedAt": "ISO timestamp",
  "userAgent": "..."           // For compatibility
}
```

#### Phase 3: Session Reuse
```
Next run:
  • Load instagram_session.json
  • Create context with cookies
  • Inject localStorage via context.addInitScript()
  • Inject sessionStorage via page.evaluate()
  • No login page appears
  • Full authentication state restored
```

### Key Implementation Details

#### 1. Browser Launch Configuration
```javascript
// Must be headless: false for manual login
const browser = await chromium.launch({
  headless: false,
  channel: 'chrome'  // Use Chrome for better compatibility
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
});
```

**Why Chrome instead of Chromium?**
- Better cookie persistence
- More realistic user agent
- Fewer bot detection triggers
- Better JavaScript execution

#### 2. Data Capture Methods

**Cookies** (straightforward):
```javascript
const cookies = await context.cookies();
// Array of { name, value, domain, path, expires, httpOnly, secure, sameSite }
```

**localStorage** (DOM-based):
```javascript
const localStorage = await page.evaluate(() => {
  const items = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    items[key] = window.localStorage.getItem(key);
  }
  return items;
});
```

**sessionStorage** (DOM-based):
```javascript
const sessionStorage = await page.evaluate(() => {
  const items = {};
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const key = window.sessionStorage.key(i);
    items[key] = window.sessionStorage.getItem(key);
  }
  return items;
});
```

#### 3. User Interaction Pattern

```javascript
// Wait for user to manually log in and press Enter
await new Promise((resolve) => {
  process.stdin.once('data', () => {
    console.log('Saving session...');
    resolve();
  });
});
```

**Why this approach?**
- No need to store usernames/passwords
- Handles 2FA, CAPTCHA, security questions
- User remains in control of login process
- Only one manual login required

### Advantages of This Pattern

1. **Security**
   - No credentials stored in code
   - No password management needed
   - Handles 2FA/MFA naturally
   - Session tokens instead of long-term passwords

2. **Reliability**
   - Handles dynamic login flows
   - Works with JavaScript-heavy auth pages
   - Captures all necessary state
   - Survives page redirects

3. **Maintainability**
   - Simple to understand flow
   - Decoupled from website structure
   - Easy to refresh expired sessions
   - No need to reverse-engineer login APIs

4. **Usability**
   - One-time manual setup
   - Then fully automated
   - Clear user feedback
   - Easy to debug

---

## Part 2: TikTok Authentication Implementation

### Why TikTok Needs This Pattern

TikTok has several challenges for bot automation:

1. **Complex Authentication**
   - Aggressive bot detection
   - Rate limiting
   - Device fingerprinting

2. **Dynamic Content**
   - JavaScript-heavy rendering
   - Frequent DOM changes
   - Real-time chat updates

3. **Session Requirements**
   - Must maintain authenticated state
   - Cookies expire periodically
   - localStorage essential for UI state

### Implementation Architecture for TikTok

#### Component 1: Session Saver (`session-saver.js`)

**Responsibility**: Capture authentication data

**Key Methods**:
```javascript
openTikTok()          // Launch browser, navigate to TikTok
waitForUserInput()    // Wait for manual login + Enter press
getCookies()          // Extract HTTP cookies
getLocalStorage()     // Extract browser storage
getSessionStorage()   // Extract session storage
saveSession()         // Write to file
```

**Execution Flow**:
```
1. Launch browser (headed mode)
2. Navigate to https://www.tiktok.com/
3. User logs in manually
4. After login, user presses Enter
5. Capture: cookies + localStorage + sessionStorage
6. Save to: tiktok_session.json
7. Close browser
```

#### Component 2: Session Loader (`session-loader.js`)

**Responsibility**: Restore authentication in new context

**Key Methods**:
```javascript
sessionExists()       // Check if file exists
isSessionExpired()    // Check 30-day expiration
loadSession()         // Read from file
getStorageState()     // Format for Playwright
getInitScript()       // Script to inject storage
validateSession()     // Basic health check
```

**Restoration Flow**:
```
1. Read tiktok_session.json
2. Extract: cookies, localStorage, sessionStorage
3. Create new browser context
4. Add cookies via newContext({ storageState })
5. Inject localStorage via addInitScript()
6. Inject sessionStorage via page.evaluate()
7. Page loads fully authenticated
```

#### Component 3: Session Manager (`session-manager.js`)

**Responsibility**: Orchestrate session lifecycle

**Key Methods**:
```javascript
createAuthenticatedContext(browser)  // Main method
checkSessionHealth()                 // Verify validity
deleteSession()                      // Logout
```

**Usage Pattern**:
```javascript
const manager = new TikTokSessionManager();

// Before using session, check health
const health = await manager.checkSessionHealth();
if (!health.valid) {
  console.error('Session invalid, please re-login');
  process.exit(1);
}

// Create authenticated context
const context = await manager.createAuthenticatedContext(browser);
const page = await context.newPage();

// Page is now fully authenticated
await page.goto('https://www.tiktok.com/@username');
```

### File Structure

```
zabari-tts/
│
├── lib/tiktok-auth/
│   ├── session-saver.js        (120 lines) Authentication capture
│   ├── session-loader.js       (150 lines) Authentication restore
│   ├── session-manager.js      (100 lines) Lifecycle management
│   └── index.js                (10 lines)  Exports
│
├── tiktok-sessions/
│   ├── .gitignore              Prevent accidental commits
│   └── tiktok_session.json     LIVE SESSION (PRIVATE!)
│
├── scripts/
│   └── tiktok-login.js         CLI entry point
│
└── Documentation
    ├── TIKTOK_AUTH_IMPLEMENTATION_GUIDE.md
    ├── TIKTOK_AUTH_QUICK_START.md
    └── INSTAGRAM_TIKTOK_AUTH_ANALYSIS.md (this file)
```

### Session Data Structure

```json
{
  "cookies": [
    {
      "name": "sessionid",
      "value": "...",
      "domain": ".tiktok.com",
      "path": "/",
      "expires": 1700000000,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "localStorage": {
    "APPID": "...",
    "webcast_did": "...",
    "tiktok_session": "...",
    ...
  },
  "sessionStorage": {
    "nav_history": "...",
    ...
  },
  "cookies_string": "sessionid=...; other=...;",
  "savedAt": "2025-11-17T12:34:56.789Z",
  "expiresAt": "2025-12-17T12:34:56.789Z",
  "userAgent": "Mozilla/5.0 ..."
}
```

### Comparison: Instagram vs TikTok Implementation

| Aspect | Instagram | TikTok |
|--------|-----------|--------|
| Login Flow | Manual in browser | Manual in browser |
| Session File Format | Same (cookies + localStorage + sessionStorage) | Same |
| User Agent | Chrome preferred | Chrome preferred |
| Viewport | 1920x1080 | 1920x1080 |
| Expiration | 30 days | 30 days |
| 2FA Handling | User completes manually | User completes manually |
| Key Cookies | `sessionid`, etc. | `sessionid`, etc. |
| localStorage Importance | High (UI state) | High (UI state) |
| sessionStorage Importance | Medium | Medium |

---

## Part 3: Integration with zabari-tts

### Current State of zabari-tts

**What exists**:
- Playwright-based chat logging (Twitch, YouTube, Kick)
- Web Speech API TTS and Kokoro-82M support
- Next.js frontend with configuration UI
- Dynamic config loading from `dynamic-config.json`

**What's needed**:
- TikTok platform support
- Authentication handling for TikTok

### Integration Points

#### 1. Configuration System

**Current `dynamic-config.json`**:
```json
{
  "platforms": {
    "twitch": { "enabled": true, "username": "..." },
    "youtube": { "enabled": true, "videoId": "..." },
    "kick": { "enabled": true, "username": "..." }
  }
}
```

**Add TikTok**:
```json
{
  "platforms": {
    "tiktok": { "enabled": true, "username": "..." }
  }
}
```

#### 2. Chat Logger Integration

**In `chat-logger-webspeech.js`**:
```javascript
const TikTokSessionManager = require('./lib/tiktok-auth/session-manager');

async function logChatMessages() {
  // ... existing Twitch/YouTube/Kick setup ...

  // Add TikTok
  if (CONFIG.urls.tiktok) {
    const manager = new TikTokSessionManager();
    const tiktokContext = await manager.createAuthenticatedContext(browser);
    const tiktokPage = await tiktokContext.newPage();
    
    await tiktokPage.goto(CONFIG.urls.tiktok);
    // Add TikTok chat detection (MutationObserver)
  }
}
```

#### 3. Frontend Configuration

**In `frontend/app/page.js`**:
```javascript
// Add TikTok to platform list
const [platforms, setPlatforms] = useState({
  twitch: { enabled: false, username: '' },
  youtube: { enabled: false, videoId: '' },
  kick: { enabled: false, username: '' },
  tiktok: { enabled: false, username: '' }  // NEW
});
```

#### 4. URL Builder Update

**In `lib/url-builder.js`**:
```javascript
function buildUrlsFromPlatforms(platforms) {
  // ... existing platforms ...
  
  const urls = {};
  
  if (platforms.tiktok?.enabled) {
    urls.tiktok = `https://www.tiktok.com/@${platforms.tiktok.username}/live`;
  }
  
  return urls;
}
```

### Step-by-Step Integration

```
Step 1: Setup TikTok Session
├─ Create lib/tiktok-auth/ directory
├─ Add three class files
└─ Run: npm run tiktok:login

Step 2: Update Configuration
├─ Add tiktok to dynamic-config.json
├─ Update URL builder
└─ Add to frontend platform list

Step 3: Chat Detection
├─ Add TikTok page setup in chat-logger-webspeech.js
├─ Implement MutationObserver for TikTok chat
└─ Test message capture

Step 4: Testing
├─ Verify session creation
├─ Test chat message detection
├─ Verify TTS on TikTok messages
└─ Test session persistence
```

---

## Part 4: Technical Comparison with Alternatives

### Approach 1: Session Files (RECOMMENDED)
```javascript
// Pros
✓ Lightweight (JSON file)
✓ Portable across machines (with caveats)
✓ Granular control
✓ Handles 2FA naturally
✓ One manual login

// Cons
✗ Must manage file lifecycle
✗ Expires after 30 days
✗ Sensitive (must keep private)
```

### Approach 2: Persistent Context
```javascript
// Using userDataDir (Playwright feature)
const browser = await chromium.launchPersistentContext(userDataDir);

// Pros
✓ Automatic state persistence
✓ All browser data saved
✓ Works across restarts

// Cons
✗ Large disk footprint (hundreds of MB)
✗ Hard to manage multiple sessions
✗ Difficult to share safely
✗ Overkill for chat logging
```

### Approach 3: Credentials Storage
```javascript
// Using username + password
const username = 'your_username';
const password = 'your_password';
await page.fill('[name="username"]', username);
await page.fill('[name="password"]', password);
await page.click('[type="submit"]');

// Pros
✓ Fully automated
✓ No manual interaction

// Cons
✗ Breaks with 2FA
✗ Security risk (passwords in code)
✗ Hard to change password
✗ Risky with TikTok (aggressive bot detection)
```

### Approach 4: API Keys
```javascript
// Using official TikTok API
const response = await fetch('https://api.tiktok.com/v1/live', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});

// Pros
✓ Official, supported method
✓ Scalable
✓ Secure tokens

// Cons
✗ Requires API approval
✗ Rate limits
✗ May not have all features needed
✗ Overkill for chat monitoring
```

**Verdict**: Session File approach (Approach 1) is best for this use case.

---

## Part 5: Security Deep Dive

### What's in a Session File?

```json
{
  "cookies": [
    {
      "name": "sessionid",
      "value": "abc123def456...",  // ← Can impersonate this account!
      "httpOnly": true,
      "secure": true
    }
  ]
}
```

### Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Cookie theft | CRITICAL | Keep file offline, use .gitignore, file permissions |
| Session hijacking | HIGH | Monitor IP changes, use from same location |
| Expiration | MEDIUM | Refresh monthly, check timestamp |
| Device fingerprint mismatch | MEDIUM | Use same machine, same browser |

### Best Practices Implementation

1. **File Permissions** (Linux/Mac):
```bash
chmod 600 tiktok-sessions/tiktok_session.json
```

2. **.gitignore Entry**:
```
tiktok-sessions/
*.session.json
```

3. **Validation Before Use**:
```javascript
const health = await manager.checkSessionHealth();
if (!health.valid) {
  throw new Error('Session invalid');
}
```

4. **Expiration Tracking**:
```javascript
if (new Date() > new Date(session.expiresAt)) {
  console.warn('Session expired!');
  // Require re-login
}
```

### Disaster Recovery

**If session is compromised**:
1. Change TikTok password immediately
2. Delete `tiktok_session.json`
3. Logout from all devices
4. Re-login: `npm run tiktok:login`

---

## Part 6: TikTok-Specific Considerations

### TikTok Bot Detection

**TikTok is aggressive about bot detection**:

| Detection Method | How It Works | Our Defense |
|------------------|-------------|-------------|
| User Agent | Browser signature | Use Chrome, realistic UA |
| Viewport | Screen resolution | 1920x1080 standard |
| IP Changes | Different location | Use from same IP |
| Rapid Actions | Human-like delays | Add waits, natural scrolling |
| Device Fingerprint | Hardware ID | Use same machine |
| Cookie absence | No auth state | Session file has cookies |
| JavaScript execution | Script detection | Playwright → real browser |

### TikTok Cookies vs Instagram

**Key TikTok Cookies**:
- `sessionid` - Main authentication
- `passport.web` - Web session
- `tiktok.com` domain cookies
- `tt_webid` - Device tracking

**Differences from Instagram**:
- TikTok uses more tracking cookies
- More frequent cookie rotation
- Stricter domain/path restrictions
- Requires same device/IP for reuse

### TikTok localStorage Keys

**Important localStorage values**:
```javascript
{
  "APPID": "...",
  "appType": "web",
  "webcast_did": "device-id",
  "tiktok_session": "auth-token",
  "n_mh": "...",
  "msToken": "..."
}
```

**Why they matter**:
- Device identification
- Authentication tokens
- Analytics tracking
- Session management

---

## Part 7: Implementation Timeline

### Phase 1: Core Implementation (Day 1)
```
- Create lib/tiktok-auth/ directory
- Implement SessionSaver class
- Implement SessionLoader class
- Implement SessionManager class
- Create scripts/tiktok-login.js
- Add npm scripts
Estimated time: 2-3 hours
```

### Phase 2: Integration (Day 2)
```
- Update chat-logger-webspeech.js
- Update frontend configuration
- Update URL builder
- Add TikTok to dynamic-config.json
Estimated time: 1-2 hours
```

### Phase 3: Testing (Day 2)
```
- Test session creation (npm run tiktok:login)
- Test session loading
- Test chat detection on TikTok live
- Test TTS on TikTok messages
- Test session persistence across restarts
Estimated time: 2-3 hours
```

### Phase 4: Documentation (Ongoing)
```
- Create TIKTOK_AUTH_IMPLEMENTATION_GUIDE.md ✓
- Create TIKTOK_AUTH_QUICK_START.md ✓
- Update main CLAUDE.md
- Document troubleshooting
- Add examples to code
Estimated time: 1-2 hours
```

**Total**: 6-10 hours for full implementation

---

## Part 8: Testing Strategy

### Unit Tests

```javascript
// Test session creation
test('SessionSaver should create session file', async () => {
  const saver = new TikTokSessionSaver();
  await saver.run();
  expect(fs.existsSync(saver.sessionFile)).toBe(true);
});

// Test session loading
test('SessionLoader should load existing session', async () => {
  const loader = new TikTokSessionLoader();
  const session = await loader.loadSession();
  expect(session.cookies).toBeDefined();
  expect(session.cookies.length > 0).toBe(true);
});

// Test context creation
test('SessionManager should create authenticated context', async () => {
  const manager = new TikTokSessionManager();
  const context = await manager.createAuthenticatedContext(browser);
  expect(context).toBeDefined();
});
```

### Integration Tests

```javascript
// Test full flow
test('Full authentication flow', async () => {
  // 1. Create session
  await saver.run();
  
  // 2. Load session
  const session = await loader.loadSession();
  
  // 3. Create context
  const context = await manager.createAuthenticatedContext(browser);
  const page = await context.newPage();
  
  // 4. Navigate
  await page.goto('https://www.tiktok.com/');
  
  // 5. Check if authenticated (no login page)
  const hasLoginForm = await page.$('[name="loginForm"]') !== null;
  expect(hasLoginForm).toBe(false);
});
```

### Manual Tests

```
1. Test Session Creation
   [ ] npm run tiktok:login
   [ ] Manually log in
   [ ] Session file created
   [ ] Session file contains cookies

2. Test Session Loading
   [ ] Delete app cache
   [ ] Restart chat logger
   [ ] Session loaded automatically
   [ ] No login page appears
   [ ] Page loads as authenticated

3. Test Chat Detection
   [ ] Open TikTok live
   [ ] Send messages from other account
   [ ] Chat logger captures messages
   [ ] TTS plays messages

4. Test Session Expiration
   [ ] Wait 30+ days (or manually test)
   [ ] Check session warning message
   [ ] Re-login and refresh session
   [ ] Verify works again
```

---

## Part 9: Troubleshooting Reference

### Common Issues

**Issue**: "Session file not found"
```
Root Cause: npm run tiktok:login never run
Solution: npm run tiktok:login
```

**Issue**: "Browser window doesn't open"
```
Root Cause: headless: true set incorrectly
Solution: Ensure headless: false in session-saver.js
```

**Issue**: "Can't press Enter to save"
```
Root Cause: stdin not available
Solution: Run from terminal, not IDE (some IDEs block stdin)
```

**Issue**: "Session loads but shows login page"
```
Root Cause: Cookies expired, IP changed, device fingerprint mismatch
Solution: Re-run npm run tiktok:login
```

**Issue**: "sessionStorage not restored"
```
Root Cause: Website modified sessionStorage after page load
Solution: Use page.evaluate() after navigation to restore
```

### Debug Mode

```javascript
// In session-manager.js, add debug logging
const manager = new TikTokSessionManager({ debug: true });

// Will output:
// ✅ Session file exists
// ✅ Session expires in 25 days
// ✅ Session contains 15 cookies
// ✅ Session contains 23 localStorage items
// ...
```

---

## Conclusion

The **Session File Pattern** is the optimal approach for TikTok authentication in zabari-tts because it:

1. **Handles Complexity**: TikTok's aggressive authentication works naturally
2. **Maintains Security**: No passwords stored, manual login once
3. **Integrates Cleanly**: Works with existing Playwright setup
4. **Scales Well**: Easy to add new platforms
5. **Provides Control**: Granular management of authentication state

The implementation is straightforward, well-documented, and ready to deploy.

---

## Files Created

1. **TIKTOK_AUTH_IMPLEMENTATION_GUIDE.md** - Full implementation details
2. **TIKTOK_AUTH_QUICK_START.md** - Quick reference guide
3. **INSTAGRAM_TIKTOK_AUTH_ANALYSIS.md** - This document

## Next Steps

1. Review the implementation guides
2. Create the authentication module files
3. Run `npm run tiktok:login` to test
4. Integrate into chat logger
5. Test chat detection on TikTok live

---

**Document Version**: 1.0
**Date**: 2025-11-17
**Status**: Ready for Implementation
