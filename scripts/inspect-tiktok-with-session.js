/**
 * TikTok Inspector with Saved Session
 * Opens Playwright Inspector (codegen) with saved TikTok session
 * This lets you manually inspect the DOM to find chat selectors
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function inspectWithSession() {
  console.log('🔍 TikTok Inspector with Session\n');

  // Load session
  const sessionPath = path.join(__dirname, '..', 'tiktok_session.json');
  let sessionData;

  try {
    const sessionFile = await fs.readFile(sessionPath, 'utf8');
    sessionData = JSON.parse(sessionFile);
    console.log(`✅ Loaded session from ${new Date(sessionData.savedAt).toLocaleString()}\n`);
  } catch (error) {
    console.error('❌ Failed to load session file');
    console.error('💡 Run "node scripts/login-tiktok.js" first');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    colorScheme: 'dark'
  });

  // Restore cookies
  await context.addCookies(sessionData.cookies);

  // Anti-detection
  await context.addInitScript(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
  });

  const page = await context.newPage();

  // Restore localStorage and sessionStorage
  await page.addInitScript((storageData) => {
    for (const [key, value] of Object.entries(storageData.localStorage)) {
      window.localStorage.setItem(key, value);
    }
    for (const [key, value] of Object.entries(storageData.sessionStorage)) {
      window.sessionStorage.setItem(key, value);
    }
  }, sessionData);

  console.log('🌐 Opening TikTok live stream...');
  const username = 'zabariyarin';
  await page.goto(`https://www.tiktok.com/@${username}/live`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  console.log('\n✅ Page loaded with your saved session');
  console.log('🔍 You can now inspect the page manually');
  console.log('\n💡 HOW TO FIND CHAT SELECTORS:');
  console.log('   1. Right-click on a chat message in the browser');
  console.log('   2. Select "Inspect Element"');
  console.log('   3. Look for class names, data-* attributes');
  console.log('   4. Find the parent container that holds all messages');
  console.log('   5. Note the selectors for username and message text\n');
  console.log('📋 Common patterns to look for:');
  console.log('   - Chat container: div[class*="Chat"], div[data-e2e*="chat"]');
  console.log('   - Message item: div[class*="Comment"], div[class*="Message"]');
  console.log('   - Username: span[class*="username"], [data-e2e*="username"]');
  console.log('   - Message text: span[class*="text"], p[class*="comment"]\n');
  console.log('Press Ctrl+C when done inspecting\n');

  // Open DevTools programmatically
  await page.evaluate(() => {
    console.log('%c🔍 INSPECTOR TIPS:', 'color: #00ff00; font-size: 16px; font-weight: bold;');
    console.log('%c1. Right-click on chat messages and select "Inspect"', 'color: #00aaff;');
    console.log('%c2. Look for class names containing: Chat, Comment, Message, LiveChat', 'color: #00aaff;');
    console.log('%c3. Check data-e2e attributes for: chat, comment, message', 'color: #00aaff;');
    console.log('%c4. Find the container that holds ALL chat messages', 'color: #00aaff;');
  });

  // Keep browser open
  await new Promise(() => {});
}

inspectWithSession().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
