const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// Apply stealth plugin
chromium.use(stealth);

async function inspectTikTokChat() {
  console.log('Starting TikTok chat inspection with stealth mode...');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: ['geolocation'],
    geolocation: { latitude: 40.7128, longitude: -74.0060 }, // NYC
    colorScheme: 'dark',
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    javaScriptEnabled: true
  });

  const page = await context.newPage();

  // Additional anti-detection measures
  await page.addInitScript(() => {
    // Hide webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

    // Mock plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });

    // Mock languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });

    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );

    // Add chrome object
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };
  });

  console.log('Navigating to TikTok live stream...');
  try {
    // Use domcontentloaded instead of networkidle - less strict
    await page.goto('https://www.tiktok.com/@zabariyarin/live', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('Page loaded. Waiting for content...');
    await page.waitForTimeout(3000);

    // Check if we hit bot detection
    const botDetected = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Try another browser') ||
             text.includes('Verify') ||
             text.includes('captcha');
    });

    if (botDetected) {
      console.log('⚠️  Bot detection triggered! TikTok is blocking automation.');
      await page.screenshot({ path: 'tiktok-bot-detection.png', fullPage: true });
      console.log('Screenshot saved to tiktok-bot-detection.png');

      console.log('\n=== Recommendations ===');
      console.log('1. TikTok has strong bot detection');
      console.log('2. Consider using TikTok\'s official API if available');
      console.log('3. Alternative: Use browser extension approach');
      console.log('4. Or: Manual browser with message interception');
      return;
    }

    // Check if stream is offline
    const isOffline = await page.evaluate(() => {
      return document.body.innerText.includes('offline') ||
             document.body.innerText.includes('not live');
    });

    if (isOffline) {
      console.log('ℹ️  The stream appears to be offline');
    }

    // Try to find chat elements
    console.log('\n=== Searching for chat elements ===');

    // Take screenshot first
    await page.screenshot({ path: 'tiktok-loaded.png', fullPage: false });
    console.log('Screenshot saved to tiktok-loaded.png');

    // Common TikTok selectors
    const selectors = [
      '[data-e2e="live-chat-messages"]',
      '[data-e2e="comment-container"]',
      '[data-e2e="live-comment"]',
      'div[class*="ChatRoom"]',
      'div[class*="chat"]',
      'div[class*="Comment"]'
    ];

    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✓ Found: ${selector}`);
          const html = await element.evaluate(el => el.outerHTML.substring(0, 300));
          console.log(`  HTML: ${html}...`);
        }
      } catch (e) {
        // Selector not found
      }
    }

    // Dump all data-e2e attributes
    console.log('\n=== All data-e2e attributes ===');
    const dataE2eAttrs = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-e2e]');
      return Array.from(elements).slice(0, 50).map(el => ({
        tag: el.tagName,
        attr: el.getAttribute('data-e2e'),
        text: el.textContent?.substring(0, 40)
      }));
    });
    console.log(JSON.stringify(dataE2eAttrs, null, 2));

    // Search for chat-like classes
    console.log('\n=== Chat-related classes ===');
    const chatClasses = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const chatElements = [];

      for (const el of allElements) {
        const className = el.className?.toString() || '';
        if (className.toLowerCase().includes('chat') ||
            className.toLowerCase().includes('comment') ||
            className.toLowerCase().includes('message')) {
          chatElements.push({
            tag: el.tagName,
            class: className,
            text: el.textContent?.substring(0, 50)
          });

          if (chatElements.length >= 20) break;
        }
      }
      return chatElements;
    });
    console.log(JSON.stringify(chatClasses, null, 2));

    // Set up mutation observer
    console.log('\n=== Setting up MutationObserver ===');
    await page.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.textContent) {
              const text = node.textContent.trim();
              const className = node.className?.toString() || '';

              // Log potential chat messages
              if (text.length > 0 && text.length < 300) {
                console.log('MUTATION:', JSON.stringify({
                  tag: node.tagName,
                  class: className,
                  text: text.substring(0, 100)
                }));
              }
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });

    page.on('console', msg => {
      const text = msg.text();
      if (text.startsWith('MUTATION:')) {
        console.log('🔴', text.substring(9));
      }
    });

    console.log('\n✓ Browser is open and monitoring. Press Ctrl+C to close.\n');

    // Keep alive
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'tiktok-error.png', fullPage: true });
    console.log('Error screenshot saved');
  }
}

inspectTikTokChat().catch(console.error);
