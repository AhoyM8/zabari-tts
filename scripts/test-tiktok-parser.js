/**
 * Test TikTok chat parser with correct selectors
 * Based on DOM analysis from interactive inspector
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testParser() {
  console.log('🧪 Testing TikTok Chat Parser\n');

  // Load session
  const sessionPath = path.join(__dirname, '..', 'tiktok_session.json');
  let sessionData;

  try {
    const sessionFile = await fs.readFile(sessionPath, 'utf8');
    sessionData = JSON.parse(sessionFile);
    console.log('✅ Session loaded\n');
  } catch (error) {
    console.error('❌ No session found - Run npm run tiktok:login first');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome'
  });

  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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

  console.log('🌐 Opening TikTok live stream...');
  await page.goto('https://www.tiktok.com/@zabariyarin/live', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  console.log('⏳ Waiting for chat to load...');
  await page.waitForTimeout(10000); // Increased wait time for chat to fully load

  console.log('\n📊 Parsing existing chat messages...\n');

  // Parse existing messages to verify selectors work
  const existingMessages = await page.evaluate(() => {
    const messages = [];
    const chatElements = document.querySelectorAll('div.w-full.pt-4[data-index]');

    chatElements.forEach((el, idx) => {
      try {
        // Get username from data-e2e="message-owner-name" with title attribute
        const usernameEl = el.querySelector('[data-e2e="message-owner-name"]');
        const username = usernameEl?.getAttribute('title') || usernameEl?.textContent?.trim() || 'Unknown';

        // Get message from div.w-full.break-words.align-middle
        const messageEl = el.querySelector('div.w-full.break-words.align-middle');
        const message = messageEl?.textContent?.trim() || '';

        if (username && message) {
          messages.push({ username, message, index: idx });
        }
      } catch (error) {
        console.error(`Error parsing message ${idx}:`, error.message);
      }
    });

    return messages;
  });

  console.log(`Found ${existingMessages.length} existing messages:\n`);
  existingMessages.forEach((msg, i) => {
    console.log(`[${i}] ${msg.username}: ${msg.message.substring(0, 80)}${msg.message.length > 80 ? '...' : ''}`);
  });

  console.log('\n\n📡 Setting up real-time chat monitor...\n');

  // Set up console listener BEFORE page.evaluate() to catch all logs
  let newMessageCount = 0;
  page.on('console', msg => {
    const text = msg.text();

    // Check for our TIKTOK: format (TIKTOK:username:message:timestamp)
    if (text.startsWith('TIKTOK:')) {
      newMessageCount++;
      const parts = text.split(':');
      const username = parts[1];
      const timestamp = parts[parts.length - 1]; // Last part is timestamp
      const message = parts.slice(2, parts.length - 1).join(':'); // Everything between username and timestamp

      const date = new Date(parseInt(timestamp));
      const timeStr = date.toLocaleTimeString();

      console.log(`\n🆕 NEW MESSAGE #${newMessageCount}:`);
      console.log(`   Time: ${timeStr}`);
      console.log(`   User: ${username}`);
      console.log(`   Message: ${message}`);
    } else {
      console.log(`[Page] ${text}`);
    }
  });

  // Set up MutationObserver for new messages
  await page.evaluate(() => {
    let messageCount = 0;
    const processedDataIndexes = new Set(); // Track processed messages by data-index

    // Helper to parse chat message
    function parseMessage(node) {
      try {
        const usernameEl = node.querySelector('[data-e2e="message-owner-name"]');
        const username = usernameEl?.getAttribute('title') || usernameEl?.textContent?.trim() || 'Unknown';

        const messageEl = node.querySelector('div.w-full.break-words.align-middle');
        const message = messageEl?.textContent?.trim() || '';

        return { username, message };
      } catch (error) {
        console.error('Parse error:', error.message);
        return null;
      }
    }

    // Pre-populate Set with existing messages to avoid re-logging them
    const existingMessages = document.querySelectorAll('div.w-full.pt-4[data-index]');
    existingMessages.forEach(el => {
      const dataIndex = el.getAttribute('data-index');
      if (dataIndex) {
        processedDataIndexes.add(dataIndex);
      }
    });
    console.log(`✅ Pre-loaded ${processedDataIndexes.size} existing messages (will not log these)`);

    // Find chat container - try multiple possible selectors
    let chatContainer = document.querySelector('[class*="overflow-y-scroll"]');
    if (!chatContainer) {
      chatContainer = document.querySelector('[class*="chat"]');
    }
    if (!chatContainer) {
      chatContainer = document.body;
      console.log('⚠️  Using document.body as container (chat container not found)');
    } else {
      console.log(`✅ Found chat container: ${chatContainer.className.substring(0, 50)}`);
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;

          // Check if it's a chat message
          if (node.matches && node.matches('div.w-full.pt-4[data-index]')) {
            const dataIndex = node.getAttribute('data-index');

            // Skip if already processed
            if (processedDataIndexes.has(dataIndex)) {
              return;
            }

            processedDataIndexes.add(dataIndex);

            const parsed = parseMessage(node);

            if (parsed && parsed.username && parsed.message) {
              messageCount++;
              const timestamp = Date.now();
              console.log(`TIKTOK:${parsed.username}:${parsed.message}:${timestamp}`);
            }
          }
        });
      });
    });

    observer.observe(chatContainer, {
      childList: true,
      subtree: true
    });

    console.log('✅ MutationObserver active - watching for new messages');
  }).catch(err => {
    console.error('❌ Error setting up MutationObserver:', err.message);
  });

  console.log('✅ Chat monitor active!');
  console.log('💬 Waiting for new messages...');
  console.log('📺 Check the browser and send a chat message\n');
  console.log('Press Ctrl+C to stop\n');

  // Keep running
  process.on('SIGINT', () => {
    console.log(`\n\n👋 Stopping... Received ${newMessageCount} new messages`);
    browser.close();
    process.exit(0);
  });

  await new Promise(() => {});
}

testParser().catch(console.error);
