/**
 * Test TikTok Chat Monitoring with Saved Session
 * Uses MutationObserver to detect new chat messages
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function monitorTikTokChat() {
  console.log('🧪 TikTok Chat Monitor Test\n');

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

  await context.addCookies(sessionData.cookies);
  await context.addInitScript(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
  });

  const page = await context.newPage();

  // Restore storage
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

  await page.waitForTimeout(3000);

  console.log('🔍 Setting up chat monitoring...\n');

  // Inject MutationObserver to watch for chat messages
  await page.evaluate(() => {
    let messageCount = 0;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;

          const text = node.textContent?.trim() || '';
          const className = node.className?.toString() || '';
          const dataE2e = node.getAttribute?.('data-e2e') || '';

          // Look for chat-related elements
          const isChatRelated =
            className.toLowerCase().includes('chat') ||
            className.toLowerCase().includes('comment') ||
            dataE2e.toLowerCase().includes('chat') ||
            dataE2e.toLowerCase().includes('comment');

          if (isChatRelated && text.length > 0 && text.length < 500) {
            console.log('TIKTOK_CHAT_EVENT:', JSON.stringify({
              type: 'mutation',
              tag: node.tagName,
              class: className.substring(0, 100),
              dataE2e: dataE2e,
              text: text.substring(0, 200)
            }));
          }

          // Also check children for specific chat message patterns
          const chatItems = node.querySelectorAll('[data-e2e*="comment"], [class*="Comment"]');
          chatItems.forEach(item => {
            const itemText = item.textContent?.trim();
            if (itemText && itemText.length > 0) {
              console.log('TIKTOK_CHAT_ITEM:', JSON.stringify({
                type: 'chat_item',
                text: itemText.substring(0, 200)
              }));
            }
          });
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('✅ MutationObserver active');
  });

  // Listen to console messages from the page
  let chatMessageCount = 0;
  page.on('console', msg => {
    const text = msg.text();

    if (text.startsWith('TIKTOK_CHAT_EVENT:')) {
      chatMessageCount++;
      const data = JSON.parse(text.substring(18));
      console.log(`\n📨 Chat Event #${chatMessageCount}:`);
      console.log(`   Tag: ${data.tag}`);
      console.log(`   Class: ${data.class}`);
      console.log(`   Data-e2e: ${data.dataE2e}`);
      console.log(`   Text: ${data.text}`);
    }

    if (text.startsWith('TIKTOK_CHAT_ITEM:')) {
      chatMessageCount++;
      const data = JSON.parse(text.substring(17));
      console.log(`\n💬 Chat Item #${chatMessageCount}:`);
      console.log(`   ${data.text}`);
    }
  });

  console.log('✅ Chat monitor active!');
  console.log('💬 Waiting for chat messages...');
  console.log('📺 Check the browser - stream should be playing');
  console.log('⏰ Will monitor for 5 minutes, then show summary\n');
  console.log('Press Ctrl+C to stop early\n');

  // Wait for 5 minutes
  await page.waitForTimeout(300000);

  console.log('\n\n=== Summary ===');
  console.log(`Total chat events detected: ${chatMessageCount}`);
  console.log('\n💡 If no messages detected, the stream might have chat disabled or no one is chatting');

  await browser.close();
  process.exit(0);
}

monitorTikTokChat().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
