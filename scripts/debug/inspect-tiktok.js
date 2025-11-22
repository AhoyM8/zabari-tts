const { chromium } = require('playwright');

async function inspectTikTokChat() {
  console.log('Starting TikTok chat inspection...');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York'
  });

  const page = await context.newPage();

  // Hide webdriver property
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
  });

  console.log('Navigating to TikTok live stream...');
  try {
    await page.goto('https://www.tiktok.com/@zabariyarin/live', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    console.log('Page loaded. Waiting for chat elements...');
    await page.waitForTimeout(5000);

    // Try to find chat container
    console.log('\n=== Searching for chat elements ===');

    // Common TikTok live chat selectors
    const possibleSelectors = [
      '[data-e2e="live-chat-messages"]',
      '[data-e2e="comment-container"]',
      '[class*="chat"]',
      '[class*="comment"]',
      '[class*="message"]',
      'div[role="list"]',
      '[data-e2e*="chat"]',
      '[data-e2e*="comment"]'
    ];

    for (const selector of possibleSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`✓ Found element with selector: ${selector}`);
        const outerHTML = await element.evaluate(el => el.outerHTML.substring(0, 500));
        console.log(`  Preview: ${outerHTML}...`);
      }
    }

    // Get all elements with data-e2e attributes
    console.log('\n=== All data-e2e attributes ===');
    const dataE2eElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-e2e]');
      return Array.from(elements).map(el => ({
        tag: el.tagName,
        dataE2e: el.getAttribute('data-e2e'),
        classList: Array.from(el.classList),
        text: el.textContent?.substring(0, 50)
      }));
    });
    console.log(dataE2eElements.slice(0, 20));

    // Inspect the entire page structure
    console.log('\n=== Page structure analysis ===');
    const pageStructure = await page.evaluate(() => {
      const findChatLikeElements = (element, depth = 0, maxDepth = 5) => {
        if (depth > maxDepth) return [];

        const results = [];
        const text = element.textContent || '';
        const classes = Array.from(element.classList || []).join(' ');
        const dataE2e = element.getAttribute('data-e2e') || '';

        // Check if this might be chat-related
        const isChatRelated =
          classes.toLowerCase().includes('chat') ||
          classes.toLowerCase().includes('comment') ||
          classes.toLowerCase().includes('message') ||
          dataE2e.toLowerCase().includes('chat') ||
          dataE2e.toLowerCase().includes('comment');

        if (isChatRelated) {
          results.push({
            tag: element.tagName,
            classes: classes,
            dataE2e: dataE2e,
            childCount: element.children.length,
            textPreview: text.substring(0, 100)
          });
        }

        // Recurse into children
        for (const child of element.children) {
          results.push(...findChatLikeElements(child, depth + 1, maxDepth));
        }

        return results;
      };

      return findChatLikeElements(document.body);
    });

    console.log('Chat-like elements found:', pageStructure.length);
    console.log(JSON.stringify(pageStructure.slice(0, 10), null, 2));

    // Take a screenshot
    await page.screenshot({ path: 'tiktok-chat-screenshot.png', fullPage: false });
    console.log('\n✓ Screenshot saved to tiktok-chat-screenshot.png');

    // Monitor for new chat messages using MutationObserver
    console.log('\n=== Setting up MutationObserver ===');
    console.log('Watching for DOM changes (will log new messages)...');
    console.log('Press Ctrl+C to stop\n');

    await page.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              // Log any element that might contain chat messages
              const text = node.textContent || '';
              const classes = node.className || '';
              const dataE2e = node.getAttribute?.('data-e2e') || '';

              if (text.length > 0 && text.length < 500) {
                console.log('NEW_NODE:', JSON.stringify({
                  tag: node.tagName,
                  classes: classes,
                  dataE2e: dataE2e,
                  text: text.substring(0, 200)
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

    // Listen to console messages from the page
    page.on('console', msg => {
      const text = msg.text();
      if (text.startsWith('NEW_NODE:')) {
        console.log('🔵', text.substring(9));
      }
    });

    // Keep the browser open for manual inspection
    console.log('Browser will stay open. Check the page manually and observe console output.');
    console.log('Press Ctrl+C to close.\n');

    // Wait indefinitely
    await new Promise(() => {});

  } catch (error) {
    console.error('Error during inspection:', error.message);
    await page.screenshot({ path: 'tiktok-error-screenshot.png' });
    console.log('Error screenshot saved to tiktok-error-screenshot.png');
  }
}

inspectTikTokChat().catch(console.error);
