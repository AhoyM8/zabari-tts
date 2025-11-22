const { chromium } = require('playwright');

/**
 * Simple TikTok chat inspection script
 * Strategy: Don't wait for networkidle, proceed even if bot detected
 */
async function inspectTikTokChat() {
  console.log('Starting TikTok chat inspection (simple mode)...');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome', // Use real Chrome if available
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: null, // Use window size
    locale: 'en-US',
    timezoneId: 'America/New_York',
    colorScheme: 'dark'
  });

  const page = await context.newPage();

  // Basic anti-detection
  await page.addInitScript(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
  });

  console.log('Navigating to TikTok live stream...');

  try {
    // Just load, don't wait for networkidle
    await page.goto('https://www.tiktok.com/@zabariyarin/live', {
      waitUntil: 'load',
      timeout: 20000
    });

    console.log('✓ Page loaded');
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: 'tiktok-simple.png', fullPage: false });
    console.log('✓ Screenshot: tiktok-simple.png');

    // Check page content
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body.innerText.substring(0, 500),
        hasBotBlock: document.body.innerText.includes('Try another browser'),
        isOffline: document.body.innerText.toLowerCase().includes('offline'),
        hasChat: !!(
          document.querySelector('[data-e2e*="chat"]') ||
          document.querySelector('[data-e2e*="comment"]') ||
          document.querySelector('[class*="Chat"]') ||
          document.querySelector('[class*="Comment"]')
        )
      };
    });

    console.log('\n=== Page Info ===');
    console.log('Title:', pageInfo.title);
    console.log('Bot blocked:', pageInfo.hasBotBlock);
    console.log('Offline:', pageInfo.isOffline);
    console.log('Has chat elements:', pageInfo.hasChat);

    if (pageInfo.hasBotBlock) {
      console.log('\n⚠️  TikTok bot detection active!');
      console.log('\n=== Findings ===');
      console.log('❌ Playwright is detected by TikTok');
      console.log('ℹ️  TikTok shows "Try another browser" error');
      console.log('\n=== Possible Solutions ===');
      console.log('1. Use TikTok Live API (if available)');
      console.log('2. Use undetected-chromedriver (Python)');
      console.log('3. Use browser extension approach');
      console.log('4. Use puppeteer-extra with stealth plugin');
      console.log('5. Reverse engineer TikTok\'s WebSocket connection');
      console.log('\nLeaving browser open for manual inspection...');
    }

    // Search for all data-e2e attributes
    const dataE2eList = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-e2e]');
      return Array.from(elements).map(el => el.getAttribute('data-e2e'));
    });

    console.log('\n=== data-e2e attributes found ===');
    console.log(dataE2eList.slice(0, 30));

    // Search for chat-like divs
    const chatDivs = await page.evaluate(() => {
      const results = [];
      const allDivs = document.querySelectorAll('div');

      for (const div of allDivs) {
        const className = div.className?.toString() || '';
        const dataE2e = div.getAttribute('data-e2e') || '';

        if (className.toLowerCase().includes('chat') ||
            className.toLowerCase().includes('comment') ||
            dataE2e.toLowerCase().includes('chat') ||
            dataE2e.toLowerCase().includes('comment')) {
          results.push({
            class: className.substring(0, 100),
            dataE2e: dataE2e,
            text: div.textContent?.substring(0, 80)
          });

          if (results.length >= 15) break;
        }
      }
      return results;
    });

    console.log('\n=== Chat-related divs ===');
    console.log(JSON.stringify(chatDivs, null, 2));

    console.log('\n✓ Inspection complete. Browser staying open for manual review.');
    console.log('Press Ctrl+C to close.\n');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'tiktok-error-simple.png' });
  }
}

inspectTikTokChat().catch(console.error);
