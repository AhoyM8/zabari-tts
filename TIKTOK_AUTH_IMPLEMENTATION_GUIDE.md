# TikTok Authentication Implementation Guide for zabari-tts

## Overview

This guide explains how to implement TikTok login with Playwright, using saved cookies, localStorage, and sessionStorage for session persistence. The pattern is based on the Instagram authentication approach mentioned in the insta-stock project.

## Architecture Pattern

The authentication system has two main components:

1. **Session Saver Script** - Manual login once, saves all authentication data
2. **Session Loader Script** - Reuses saved authentication for subsequent runs

### Why This Pattern?

- **Security**: Manual login only once, then reuse credentials from saved session files
- **Performance**: Eliminates repeated login overhead
- **Reliability**: Reduces bot detection/2FA issues by minimizing login interactions
- **Flexibility**: Can handle cookies, localStorage, and sessionStorage separately

## File Structure for TikTok Authentication

```
zabari-tts/
├── lib/
│   └── tiktok-auth/
│       ├── session-saver.js      # Manual login & session save
│       ├── session-loader.js     # Load saved session into context
│       ├── session-manager.js    # Manage session lifecycle
│       └── .gitignore            # IMPORTANT: Prevent credential commits
├── tiktok-sessions/
│   └── .gitignore               # Store session files here (private!)
├── scripts/
│   └── tiktok-login.js          # CLI script to trigger manual login
└── CLAUDE.md                     # Update with TikTok auth docs
```

## Implementation Details

### 1. Session Saver Script

**File: `lib/tiktok-auth/session-saver.js`**

This script performs manual login and captures all authentication data:

```javascript
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * TikTok Session Saver
 * Performs manual login and saves cookies, localStorage, and sessionStorage
 * 
 * Usage:
 *   node scripts/tiktok-login.js
 * 
 * This opens TikTok in a browser window where you manually log in.
 * After login, press Enter to save the session.
 */

class TikTokSessionSaver {
  constructor(options = {}) {
    this.sessionDir = options.sessionDir || path.join(__dirname, '../../tiktok-sessions');
    this.sessionFile = path.join(this.sessionDir, 'tiktok_session.json');
    this.headless = options.headless === false; // Default to headed mode for manual login
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * Ensure session directory exists
   */
  async ensureSessionDir() {
    try {
      await fs.mkdir(this.sessionDir, { recursive: true });
    } catch (error) {
      console.error('Error creating session directory:', error);
      throw error;
    }
  }

  /**
   * Launch browser and navigate to TikTok
   */
  async openTikTok() {
    console.log('🚀 TikTok Session Saver');
    console.log('📖 This will open TikTok in a browser window');
    console.log('👤 Please log in manually, then press Enter in this terminal\n');

    this.browser = await chromium.launch({
      headless: false, // Must be visible for manual login
      channel: 'chrome' // Use Chrome if available for better compatibility
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    this.page = await this.context.newPage();

    // Navigate to TikTok
    console.log('🌐 Opening TikTok.com...');
    await this.page.goto('https://www.tiktok.com/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // Wait for user to log in
    console.log('\n✋ Please log in to TikTok in the browser window');
    console.log('💡 Complete 2FA if prompted, then press Enter here to save the session...\n');

    // Wait for Enter key from stdin
    await this.waitForUserInput();
  }

  /**
   * Wait for user to press Enter
   */
  async waitForUserInput() {
    return new Promise((resolve) => {
      process.stdin.once('data', () => {
        console.log('\n💾 Saving session...');
        resolve();
      });
    });
  }

  /**
   * Extract all cookies from context
   */
  async getCookies() {
    return await this.context.cookies();
  }

  /**
   * Extract localStorage from page
   */
  async getLocalStorage() {
    return await this.page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        items[key] = window.localStorage.getItem(key);
      }
      return items;
    });
  }

  /**
   * Extract sessionStorage from page
   */
  async getSessionStorage() {
    return await this.page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        items[key] = window.sessionStorage.getItem(key);
      }
      return items;
    });
  }

  /**
   * Save all authentication data to file
   */
  async saveSession() {
    try {
      const cookies = await this.getCookies();
      const localStorage = await this.getLocalStorage();
      const sessionStorage = await this.getSessionStorage();

      // Get additional useful info
      const cookies_string = await this.page.evaluate(() => {
        return document.cookie;
      });

      const sessionData = {
        cookies,
        localStorage,
        sessionStorage,
        cookies_string, // For manual inspection if needed
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };

      await fs.writeFile(
        this.sessionFile,
        JSON.stringify(sessionData, null, 2),
        'utf8'
      );

      console.log('✅ Session saved successfully!');
      console.log(`📁 Location: ${this.sessionFile}`);
      console.log('🔑 Keep this file private and secure!');
      console.log('📝 Add tiktok-sessions/ to your .gitignore\n');

      return sessionData;
    } catch (error) {
      console.error('❌ Error saving session:', error);
      throw error;
    }
  }

  /**
   * Main execution
   */
  async run() {
    try {
      await this.ensureSessionDir();
      await this.openTikTok();
      await this.saveSession();
    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

module.exports = TikTokSessionSaver;

// CLI execution
if (require.main === module) {
  const saver = new TikTokSessionSaver();
  saver.run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}
```

### 2. Session Loader Script

**File: `lib/tiktok-auth/session-loader.js`**

This script loads saved authentication into a new browser context:

```javascript
const fs = require('fs').promises;
const path = require('path');

/**
 * TikTok Session Loader
 * Loads previously saved cookies, localStorage, and sessionStorage
 * into a new browser context
 * 
 * Usage:
 *   const loader = require('./session-loader');
 *   const { cookies, localStorage, sessionStorage } = await loader.loadSession();
 *   const context = await browser.newContext({
 *     storageState: { cookies, origins: [...] }
 *   });
 */

class TikTokSessionLoader {
  constructor(options = {}) {
    this.sessionDir = options.sessionDir || path.join(__dirname, '../../tiktok-sessions');
    this.sessionFile = path.join(this.sessionDir, 'tiktok_session.json');
  }

  /**
   * Check if a saved session exists
   */
  async sessionExists() {
    try {
      await fs.access(this.sessionFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if session has expired (older than 30 days)
   */
  async isSessionExpired() {
    try {
      const data = JSON.parse(await fs.readFile(this.sessionFile, 'utf8'));
      const expiresAt = new Date(data.expiresAt);
      return new Date() > expiresAt;
    } catch {
      return true; // Treat as expired if we can't read
    }
  }

  /**
   * Load session data from file
   */
  async loadSession() {
    try {
      if (!(await this.sessionExists())) {
        throw new Error(`Session file not found at ${this.sessionFile}`);
      }

      if (await this.isSessionExpired()) {
        console.warn('⚠️  Session appears to be expired. You may need to re-login.');
      }

      const sessionData = JSON.parse(
        await fs.readFile(this.sessionFile, 'utf8')
      );

      console.log(`✅ Loaded TikTok session from ${path.basename(this.sessionFile)}`);
      console.log(`📅 Saved at: ${sessionData.savedAt}`);

      return {
        cookies: sessionData.cookies,
        localStorage: sessionData.localStorage,
        sessionStorage: sessionData.sessionStorage,
        userAgent: sessionData.userAgent,
        savedAt: sessionData.savedAt
      };
    } catch (error) {
      console.error('❌ Error loading session:', error.message);
      throw error;
    }
  }

  /**
   * Convert session data to Playwright storageState format
   * This is used for context.addInitScript() to restore localStorage/sessionStorage
   */
  async getStorageState() {
    const session = await this.loadSession();
    
    // Playwright storageState format for cookies
    const storageState = {
      cookies: session.cookies,
      origins: [
        {
          origin: 'https://www.tiktok.com',
          localStorage: Object.entries(session.localStorage).map(([name, value]) => ({
            name,
            value
          })),
          sessionStorage: Object.entries(session.sessionStorage).map(([name, value]) => ({
            name,
            value
          }))
        }
      ]
    };

    return storageState;
  }

  /**
   * Get script to inject localStorage and sessionStorage
   */
  async getInitScript() {
    const session = await this.loadSession();
    
    return () => {
      // Restore localStorage
      if (window.localStorage) {
        for (const [key, value] of Object.entries(session.localStorage)) {
          try {
            window.localStorage.setItem(key, value);
          } catch (e) {
            console.warn(`Could not restore localStorage[${key}]:`, e);
          }
        }
      }

      // Restore sessionStorage
      if (window.sessionStorage) {
        for (const [key, value] of Object.entries(session.sessionStorage)) {
          try {
            window.sessionStorage.setItem(key, value);
          } catch (e) {
            console.warn(`Could not restore sessionStorage[${key}]:`, e);
          }
        }
      }
    };
  }

  /**
   * Validate that session is still valid (basic check)
   * In real scenarios, this would check if login is still active
   */
  async validateSession() {
    try {
      const session = await this.loadSession();
      
      // Check if critical cookies exist
      const hasCriticalCookies = session.cookies && session.cookies.length > 0;
      
      if (!hasCriticalCookies) {
        console.warn('⚠️  No cookies found in session. May need to re-login.');
        return false;
      }

      console.log(`✅ Session validation passed (${session.cookies.length} cookies found)`);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = TikTokSessionLoader;

// Usage example
if (require.main === module) {
  (async () => {
    const loader = new TikTokSessionLoader();
    
    console.log('Checking for saved session...');
    const exists = await loader.sessionExists();
    
    if (!exists) {
      console.log('No saved session found. Run: node scripts/tiktok-login.js');
      process.exit(1);
    }

    const valid = await loader.validateSession();
    if (valid) {
      console.log('Session is ready to use!');
    } else {
      console.log('Session validation failed.');
      process.exit(1);
    }
  })();
}
```

### 3. Session Manager

**File: `lib/tiktok-auth/session-manager.js`**

Orchestrates session loading and context creation:

```javascript
const TikTokSessionLoader = require('./session-loader');

/**
 * TikTok Session Manager
 * 
 * Handles the full lifecycle of session management:
 * - Check if session exists
 * - Load session
 * - Create Playwright context with session
 * - Handle session refresh/expiration
 */

class TikTokSessionManager {
  constructor(options = {}) {
    this.loader = new TikTokSessionLoader(options);
    this.options = options;
  }

  /**
   * Create a new browser context with saved TikTok session
   * 
   * Usage:
   *   const manager = new TikTokSessionManager();
   *   const context = await manager.createAuthenticatedContext(browser);
   */
  async createAuthenticatedContext(browser) {
    try {
      const sessionExists = await this.loader.sessionExists();
      
      if (!sessionExists) {
        throw new Error(
          'No saved TikTok session found. ' +
          'Run "node scripts/tiktok-login.js" to create one first.'
        );
      }

      const isExpired = await this.loader.isSessionExpired();
      if (isExpired) {
        console.warn('⚠️  Session expired. Authentication may fail.');
        console.warn('Consider running "node scripts/tiktok-login.js" to refresh.');
      }

      // Load session data
      const session = await this.loader.loadSession();
      const storageState = await this.loader.getStorageState();

      // Create context with cookies
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: session.userAgent,
        storageState: {
          cookies: session.cookies,
          origins: []
        }
      });

      // Inject localStorage and sessionStorage via init script
      const initScript = await this.loader.getInitScript();
      context.addInitScript(initScript);

      console.log('✅ Authenticated context created with saved TikTok session');
      return context;

    } catch (error) {
      console.error('❌ Failed to create authenticated context:', error.message);
      throw error;
    }
  }

  /**
   * Helper method to check session health
   */
  async checkSessionHealth() {
    try {
      const exists = await this.loader.sessionExists();
      const expired = await this.loader.isSessionExpired();
      const valid = await this.loader.validateSession();

      return {
        exists,
        expired,
        valid,
        message: expired 
          ? 'Session exists but is expired'
          : valid 
          ? 'Session is healthy'
          : 'Session exists but validation failed'
      };
    } catch (error) {
      return {
        exists: false,
        expired: false,
        valid: false,
        message: `Error checking session: ${error.message}`
      };
    }
  }

  /**
   * Delete saved session (for logout/cleanup)
   */
  async deleteSession() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const sessionFile = path.join(
        this.options.sessionDir || require('path').join(__dirname, '../../tiktok-sessions'),
        'tiktok_session.json'
      );

      await fs.unlink(sessionFile);
      console.log('✅ Session deleted successfully');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('❌ Error deleting session:', error);
        throw error;
      }
    }
  }
}

module.exports = TikTokSessionManager;
```

### 4. CLI Script

**File: `scripts/tiktok-login.js`**

Simple CLI entry point for manual login:

```javascript
#!/usr/bin/env node

const TikTokSessionSaver = require('../lib/tiktok-auth/session-saver');

/**
 * CLI script to initiate TikTok manual login and session save
 * 
 * Usage:
 *   npm run tiktok:login
 *   # or
 *   node scripts/tiktok-login.js
 */

(async () => {
  const saver = new TikTokSessionSaver();
  
  try {
    await saver.run();
    console.log('\n✨ TikTok authentication complete!');
    console.log('You can now start the chat logger with TikTok support.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TikTok authentication failed:', error.message);
    process.exit(1);
  }
})();
```

### 5. .gitignore for Session Directory

**File: `tiktok-sessions/.gitignore`**

```
# Keep session directory tracked but ignore session files
*
!.gitignore
```

## Integration with Existing Code

### 1. Update `chat-logger-webspeech.js`

Add TikTok support with session loading:

```javascript
const { chromium } = require('playwright');
const TikTokSessionManager = require('./lib/tiktok-auth/session-manager');

async function logChatMessages() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  // ... existing Twitch/YouTube/Kick code ...

  // Add TikTok with authentication
  if (CONFIG.urls.tiktok) {
    let tiktokContext;
    
    try {
      const sessionManager = new TikTokSessionManager();
      tiktokContext = await sessionManager.createAuthenticatedContext(browser);
      const tiktokPage = await tiktokContext.newPage();
      
      console.log('Opening TikTok with saved session...');
      await tiktokPage.goto(CONFIG.urls.tiktok, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      // Add chat detection for TikTok
      // Similar to existing platform implementations
      
    } catch (error) {
      console.error('Failed to load TikTok with saved session:', error.message);
      console.error('Run: node scripts/tiktok-login.js to create a session first');
    }
  }
}
```

### 2. Update Frontend Configuration

Add TikTok to `frontend/app/page.js`:

```javascript
// Add to platform configuration
const defaultPlatforms = {
  twitch: { enabled: false, username: '' },
  youtube: { enabled: false, videoId: '' },
  kick: { enabled: false, username: '' },
  tiktok: { enabled: false, username: '' }  // NEW
};
```

### 3. Update Dynamic Config

Add TikTok to `dynamic-config.json` structure:

```json
{
  "platforms": {
    "tiktok": {
      "enabled": false,
      "username": "your_tiktok_handle"
    }
  }
}
```

## Usage Workflow

### First Time Setup

```bash
# 1. Create TikTok session (one-time manual login)
npm run tiktok:login
# Follow the browser prompts to log in
# Session saved to tiktok-sessions/tiktok_session.json

# 2. Start frontend
cd frontend
npm run dev

# 3. Enable TikTok in web UI and start chat logger
```

### Subsequent Runs

```bash
# Session is automatically loaded from saved file
npm run dev

# No manual login needed - saved credentials are reused
```

### Session Refresh

```bash
# If session expires or authentication fails
npm run tiktok:login
# Repeat the manual login process
```

## Security Considerations

### Critical: Prevent Credential Leaks

1. **Add to `.gitignore`** (root level):
   ```
   tiktok-sessions/
   ```

2. **Add to `.gitignore`** (frontend/.gitignore if separate):
   ```
   tiktok-sessions/
   ```

3. **Never commit session files** - they contain live cookies that could be used to impersonate your account

### Best Practices

1. **Unique Session Files**: One session file per machine/user
2. **Expiration Tracking**: Sessions expire after 30 days (configurable)
3. **Validation**: Check session validity before use
4. **Access Control**: Restrict file permissions on session files
5. **Local Storage Only**: Never upload sessions to cloud storage without encryption

## Troubleshooting

### "Session file not found" Error

```bash
# Solution: Create session first
npm run tiktok:login
```

### "Authentication may fail - Session expired"

```bash
# Solution: Refresh the session
npm run tiktok:login
```

### Cookies Not Persisting

**Cause**: Browser security policies or TikTok's tracking prevention

**Solutions**:
1. Use Chrome instead of Chromium (better cookie support)
2. Check `channel: 'chrome'` in session-saver.js
3. Increase viewport size and use realistic user agent

### 2FA or CAPTCHA During Login

**Solution**: TikTok may require additional verification
1. Complete the verification in the browser window
2. Press Enter to save after fully authenticated
3. Session will include all required authentication tokens

### sessionStorage Not Restored

**Cause**: Some websites don't allow programmatic sessionStorage modification

**Solution**: Use Playwright's `context.addInitScript()` to inject at page load time (already implemented in session-loader.js)

## Advanced Configuration

### Custom Session Directory

```javascript
const manager = new TikTokSessionManager({
  sessionDir: '/custom/path/to/sessions'
});
```

### Programmatic Session Creation

```javascript
const TikTokSessionSaver = require('./lib/tiktok-auth/session-saver');

const saver = new TikTokSessionSaver({
  sessionDir: '/path/to/sessions',
  headless: false // Always headed for manual login
});

await saver.run();
```

### Session Validation Before Use

```javascript
const manager = new TikTokSessionManager();
const health = await manager.checkSessionHealth();

if (!health.valid) {
  console.error(health.message);
  process.exit(1);
}
```

## Comparison with Other Approaches

| Approach | Pros | Cons | Use Case |
|----------|------|------|----------|
| **Persistent Context** (userDataDir) | Automatic state sync | Large disk footprint, hard to manage | Browser testing |
| **Session Files** (This approach) | Lightweight, portable, granular control | Manual login once | Production deployments |
| **Credentials Storage** (Username/Password) | Scriptable | Risky, breaks with 2FA, detection | Legacy systems |
| **API Keys** | Secure, scalable | Overkill for chat monitoring | Official integrations |

## References

- [Playwright Authentication Docs](https://playwright.dev/docs/auth)
- [Playwright Storage State](https://playwright.dev/python/docs/auth#reuse-authentication-state)
- [localStorage/sessionStorage Persistence](https://frontendrescue.com/posts/2023-07-28-session-storage-playwright)

## FAQ

**Q: How long do sessions last?**
A: By default, 30 days. You'll get a warning when expired and should re-login.

**Q: Can I share session files between machines?**
A: Not recommended - IP addresses and device fingerprints are tracked. Each machine should have its own session.

**Q: What if TikTok detects the bot?**
A: Sessions may be invalidated. Re-login with `npm run tiktok:login`. Consider using realistic user agents and viewport sizes.

**Q: Can I use this for multiple TikTok accounts?**
A: Yes - create multiple session directories and manage them separately.

**Q: How do I logout?**
A: Delete the session file or use `sessionManager.deleteSession()`.

---

**Created**: 2025-11-17
**Last Updated**: 2025-11-17
**Status**: Implementation Ready
