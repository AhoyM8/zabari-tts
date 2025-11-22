/**
 * TikTok Login and Session Saver
 * Saves cookies, localStorage, and sessionStorage for reuse
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function loginTikTok() {
  console.log('🚀 TikTok Session Saver');
  console.log('📖 This will open TikTok in a browser window');
  console.log('👤 Please log in manually and solve any captchas');
  console.log('💡 Then press Enter in this terminal to save the session\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome', // Use real Chrome if available
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    viewport: null, // Use full window
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    colorScheme: 'dark'
  });

  // Anti-detection
  await context.addInitScript(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
  });

  const page = await context.newPage();

  // Navigate to TikTok
  console.log('🌐 Opening TikTok...');
  await page.goto('https://www.tiktok.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // Wait for user to log in
  console.log('\n✋ Please log in to TikTok in the browser window');
  console.log('🔐 Solve any captchas if prompted');
  console.log('💡 After logging in successfully, press Enter here to save the session...\n');

  // Wait for Enter key
  await new Promise((resolve) => {
    process.stdin.once('data', () => {
      console.log('💾 Saving session...');
      resolve();
    });
  });

  // Get cookies
  const cookies = await context.cookies();

  // Get localStorage
  const localStorage = await page.evaluate(() => {
    const items = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      items[key] = window.localStorage.getItem(key);
    }
    return items;
  });

  // Get sessionStorage
  const sessionStorage = await page.evaluate(() => {
    const items = {};
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      items[key] = window.sessionStorage.getItem(key);
    }
    return items;
  });

  // Save session data
  const sessionData = {
    cookies,
    localStorage,
    sessionStorage,
    savedAt: new Date().toISOString()
  };

  const sessionPath = path.join(__dirname, '..', 'tiktok_session.json');
  await fs.writeFile(
    sessionPath,
    JSON.stringify(sessionData, null, 2),
    'utf8'
  );

  console.log('✅ Session saved to tiktok_session.json');
  console.log('🔑 You can now use TikTok chat with saved authentication');
  console.log('\n📝 Keep tiktok_session.json private and secure!');
  console.log('⚠️  Add tiktok_session.json to .gitignore!\n');

  await browser.close();
  process.exit(0);
}

// Run
loginTikTok().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
