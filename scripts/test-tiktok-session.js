/**
 * Test TikTok Session - Verify saved session works
 * This will load the saved session and open a live stream to check chat access
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testTikTokSession() {
  console.log('🧪 Testing TikTok Session');

  // Load session data
  const sessionPath = path.join(__dirname, '..', 'tiktok_session.json');

  let sessionData;
  try {
    const sessionFile = await fs.readFile(sessionPath, 'utf8');
    sessionData = JSON.parse(sessionFile);
    console.log(`✅ Loaded session from ${new Date(sessionData.savedAt).toLocaleString()}`);
  } catch (error) {
    console.error('❌ Failed to load session file');
    console.error('💡 Run "node scripts/login-tiktok.js" first to create a session');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
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
    // Restore localStorage
    for (const [key, value] of Object.entries(storageData.localStorage)) {
      window.localStorage.setItem(key, value);
    }
    // Restore sessionStorage
    for (const [key, value] of Object.entries(storageData.sessionStorage)) {
      window.sessionStorage.setItem(key, value);
    }
  }, sessionData);

  // Navigate to TikTok live stream
  console.log('🌐 Opening TikTok live stream...');
  const username = 'zabariyarin'; // Replace with any live user
  await page.goto(`https://www.tiktok.com/@${username}/live`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForTimeout(3000);

  // Check if logged in
  const isLoggedIn = await page.evaluate(() => {
    // Check for login button (if exists, not logged in)
    const loginButton = document.querySelector('[data-e2e="top-login-button"]');
    return !loginButton;
  });

  console.log('\n=== Session Test Results ===');
  console.log(`Logged in: ${isLoggedIn ? '✅ Yes' : '❌ No'}`);

  // Check for bot detection
  const botDetected = await page.evaluate(() => {
    return document.body.innerText.includes('Try another browser');
  });

  console.log(`Bot detection: ${botDetected ? '❌ Detected' : '✅ Clear'}`);

  // Check if stream is live
  const streamInfo = await page.evaluate(() => {
    return {
      isOffline: document.body.innerText.toLowerCase().includes('offline'),
      title: document.title
    };
  });

  console.log(`Stream: ${streamInfo.isOffline ? '⚠️  Offline' : '✅ Live'}`);

  // Take screenshot
  await page.screenshot({ path: 'tiktok-session-test.png' });
  console.log('\n📸 Screenshot saved: tiktok-session-test.png');

  // Search for chat elements
  console.log('\n=== Searching for chat elements ===');
  const chatElements = await page.evaluate(() => {
    const possibleSelectors = [
      '[data-e2e*="chat"]',
      '[data-e2e*="comment"]',
      '[class*="Chat"]',
      '[class*="Comment"]'
    ];

    const found = [];
    for (const selector of possibleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        found.push({
          selector,
          hasContent: element.textContent.length > 0
        });
      }
    }
    return found;
  });

  if (chatElements.length > 0) {
    console.log('✅ Chat elements found:');
    chatElements.forEach(el => {
      console.log(`  - ${el.selector} (has content: ${el.hasContent})`);
    });
  } else {
    console.log('⚠️  No chat elements found (stream might be offline)');
  }

  console.log('\n💡 Browser will stay open for manual inspection');
  console.log('Press Ctrl+C to close\n');

  // Keep browser open
  await new Promise(() => {});
}

testTikTokSession().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
