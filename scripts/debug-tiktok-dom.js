/**
 * Debug TikTok DOM Changes
 * Logs ALL mutations to find chat message pattern
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function debugTikTokDOM() {
  console.log('🔍 TikTok DOM Debug Mode\n');

  const sessionPath = path.join(__dirname, '..', 'tiktok_session.json');
  let sessionData;

  try {
    const sessionFile = await fs.readFile(sessionPath, 'utf8');
    sessionData = JSON.parse(sessionFile);
    console.log(`✅ Session loaded\n`);
  } catch (error) {
    console.error('❌ No session found');
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

  await page.addInitScript((storageData) => {
    for (const [key, value] of Object.entries(storageData.localStorage)) {
      window.localStorage.setItem(key, value);
    }
    for (const [key, value] of Object.entries(storageData.sessionStorage)) {
      window.sessionStorage.setItem(key, value);
    }
  }, sessionData);

  console.log('🌐 Opening live stream...');
  await page.goto('https://www.tiktok.com/@zabariyarin/live', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForTimeout(3000);

  console.log('🔍 Starting aggressive DOM monitoring...\n');
  console.log('📝 When you see a NEW chat message appear:');
  console.log('   - Check the console output below');
  console.log('   - Look for the mutation that matches the message\n');

  await page.evaluate(() => {
    let mutationCount = 0;

    // Find chat container
    const chatContainer = document.querySelector('[class*="overflow-y-scroll"]');

    if (!chatContainer) {
      console.log('ERROR: No chat container');
      return;
    }

    console.log('✅ Monitoring chat container:', chatContainer.className);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;

          mutationCount++;
          const text = node.textContent?.trim() || '';

          // Log EVERYTHING that gets added
          console.log(`\n=== MUTATION #${mutationCount} ===`);
          console.log('Tag:', node.tagName);
          console.log('Classes:', node.className);
          console.log('ID:', node.id);
          console.log('Attributes:', Array.from(node.attributes || []).map(a => `${a.name}="${a.value}"`).join(', '));
          console.log('Text (first 100 chars):', text.substring(0, 100));
          console.log('HTML (first 200 chars):', node.outerHTML?.substring(0, 200));

          // Check children
          const children = node.children;
          if (children && children.length > 0) {
            console.log('Children count:', children.length);
            for (let i = 0; i < Math.min(3, children.length); i++) {
              console.log(`  Child ${i}:`, children[i].tagName, children[i].className);
            }
          }
        });
      });
    });

    observer.observe(chatContainer, {
      childList: true,
      subtree: true
    });

    console.log('\n✅ Observer active! Send a test message in chat...\n');
  });

  // Listen to ALL console logs
  page.on('console', msg => {
    console.log(msg.text());
  });

  console.log('✅ Debug mode active!');
  console.log('💬 Type a message in the TikTok chat');
  console.log('📊 Watch the console output to see what DOM elements are created\n');

  await new Promise(() => {});
}

debugTikTokDOM().catch(console.error);
