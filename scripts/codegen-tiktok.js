/**
 * Launch Playwright Codegen with TikTok Session
 * This opens the Playwright Inspector tool with your saved login
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function codegenWithSession() {
  console.log('🔍 Launching Playwright Codegen with TikTok Session\n');

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

  // Create a browser context with saved state
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
    colorScheme: 'dark',
    storageState: {
      cookies: sessionData.cookies,
      origins: [
        {
          origin: 'https://www.tiktok.com',
          localStorage: Object.entries(sessionData.localStorage).map(([name, value]) => ({ name, value }))
        }
      ]
    }
  });

  await context.addInitScript(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
  });

  const page = await context.newPage();

  console.log('🌐 Opening TikTok live stream...');
  console.log('🎯 Use the Playwright Inspector to find chat selectors\n');

  await page.goto('https://www.tiktok.com/@zabariyarin/live', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  console.log('✅ Page loaded with session');
  console.log('\n💡 INSPECTOR TIPS:');
  console.log('   - Click the "Pick locator" button (target icon)');
  console.log('   - Hover over chat messages to see their selectors');
  console.log('   - Look for stable selectors (data-e2e, unique classes)');
  console.log('   - Test selectors in the console\n');

  // Pause to allow inspection
  await page.pause();
}

codegenWithSession().catch(console.error);
