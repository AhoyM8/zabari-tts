/**
 * TikTok Chat Monitor - Production Version
 * Monitors TikTok live chat with saved session
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function monitorTikTokChat(username = 'zabariyarin') {
  console.log('💬 TikTok Chat Monitor\n');

  // Load session
  const sessionPath = path.join(__dirname, '..', 'tiktok_session.json');
  let sessionData;

  try {
    const sessionFile = await fs.readFile(sessionPath, 'utf8');
    sessionData = JSON.parse(sessionFile);
    console.log(`✅ Session loaded (${new Date(sessionData.savedAt).toLocaleString()})\n`);
  } catch (error) {
    console.error('❌ No session found. Run: node scripts/login-tiktok.js');
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

  console.log(`🌐 Opening @${username}'s live stream...`);
  await page.goto(`https://www.tiktok.com/@${username}/live`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForTimeout(3000);

  console.log('🔍 Setting up chat observer...\n');

  // Inject MutationObserver for chat monitoring
  await page.evaluate(() => {
    const processedMessages = new Set();

    // Find chat container - try multiple selectors
    let chatContainer = document.querySelector('.flex-1.overflow-y-scroll') ||
                        document.querySelector('[class*="overflow-y-scroll"]') ||
                        document.querySelector('div[class*="flex-1"]');

    if (!chatContainer) {
      console.log('CHAT_ERROR: Chat container not found');
      console.log('DEBUG: Available containers:',
        Array.from(document.querySelectorAll('div[class*="scroll"]'))
          .map(el => el.className)
          .slice(0, 5)
      );
      return;
    }

    console.log('CHAT_READY: Monitoring started on', chatContainer.className.substring(0, 100));

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;

          // Look for chat message elements
          const messageElements = node.querySelectorAll('[data-e2e="chat-message"]');

          if (messageElements.length === 0 && node.getAttribute('data-e2e') === 'chat-message') {
            messageElements = [node];
          }

          messageElements.forEach(msgEl => {
            const fullText = msgEl.textContent?.trim() || '';

            // Skip if already processed or empty
            if (!fullText || processedMessages.has(fullText)) return;
            processedMessages.add(fullText);

            // Try to extract username and message
            // TikTok format is usually: "Username: Message text" or similar
            let username = 'Unknown';
            let message = fullText;

            // Try to find username element
            const usernameEl = msgEl.querySelector('[data-e2e*="user"], [class*="username"], [title]');
            if (usernameEl) {
              username = usernameEl.textContent?.trim() || usernameEl.getAttribute('title') || username;
            }

            // Try to extract message (remove username if present)
            const colonIndex = fullText.indexOf(':');
            if (colonIndex > 0 && colonIndex < 50) {
              const potentialUsername = fullText.substring(0, colonIndex).trim();
              const potentialMessage = fullText.substring(colonIndex + 1).trim();

              if (potentialMessage) {
                username = potentialUsername;
                message = potentialMessage;
              }
            }

            console.log('TIKTOK_MESSAGE:', JSON.stringify({
              username,
              message,
              timestamp: Date.now()
            }));
          });
        });
      });
    });

    observer.observe(chatContainer, {
      childList: true,
      subtree: true
    });
  });

  // Listen for messages
  let messageCount = 0;
  page.on('console', msg => {
    const text = msg.text();

    if (text.startsWith('TIKTOK_MESSAGE:')) {
      try {
        const data = JSON.parse(text.substring(15));
        messageCount++;
        console.log(`\n[${messageCount}] ${data.username}: ${data.message}`);
      } catch (e) {
        console.error('Parse error:', e);
      }
    } else if (text.startsWith('CHAT_')) {
      console.log(`ℹ️  ${text}`);
    }
  });

  console.log('✅ Chat monitor active!');
  console.log('📺 Watching for messages...\n');
  console.log('Press Ctrl+C to stop\n');

  // Keep alive
  await new Promise(() => {});
}

// Get username from command line or use default
const username = process.argv[2] || 'zabariyarin';
monitorTikTokChat(username).catch(console.error);
