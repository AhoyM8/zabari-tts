/**
 * TikTok Interactive Chat Inspector
 * Manual testing of selectors to find chat messages
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function interactiveInspector() {
  console.log('🔍 TikTok Interactive Inspector\n');

  // Load session
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

  await page.waitForTimeout(10000);

  console.log('\n📊 TEST 1: Finding elements with class "w-full pt-4" and data-index\n');

  const result1 = await page.evaluate(() => {
    // Find all elements with class containing "w-full pt-4" and data-index attribute
    const elements = document.querySelectorAll('div.w-full.pt-4[data-index]');

    console.log(`Found ${elements.length} elements with "w-full pt-4" class and data-index`);

    const results = [];
    elements.forEach((el, index) => {
      const dataIndex = el.getAttribute('data-index');
      const fullText = el.textContent?.trim().substring(0, 150);
      const className = el.className;
      const innerHTML = el.innerHTML.substring(0, 300);

      const result = {
        index,
        dataIndex,
        className,
        textContent: fullText,
        htmlPreview: innerHTML,
        children: el.children.length
      };

      results.push(result);

      console.log(`\n--- Element #${index} (data-index="${dataIndex}") ---`);
      console.log('Classes:', className);
      console.log('Text:', fullText);
      console.log('Children count:', el.children.length);
    });

    return results;
  });

  console.log(`\n✅ Found ${result1.length} matching elements\n`);

  result1.forEach((item, i) => {
    console.log(`\n[${i}] data-index="${item.dataIndex}"`);
    console.log(`    Text: ${item.textContent}`);
    console.log(`    Children: ${item.children}`);
  });

  console.log('\n\n📊 TEST 2: Let\'s extract username and message from EACH element\n');

  const detailedResult = await page.evaluate(() => {
    const elements = document.querySelectorAll('div.w-full.pt-4[data-index]');

    console.log(`Analyzing ${elements.length} chat messages...\n`);

    const results = [];

    elements.forEach((el, idx) => {
      const dataIndex = el.getAttribute('data-index');
      console.log(`\n=== Message ${idx} (data-index="${dataIndex}") ===`);

      // Strategy 1: Look for spans with specific patterns
      const spans = Array.from(el.querySelectorAll('span'));
      console.log(`Found ${spans.length} span elements`);

      let username = null;
      let message = null;

      // Try to find username (usually has different styling or title attribute)
      spans.forEach((span, i) => {
        const title = span.getAttribute('title');
        const text = span.textContent?.trim();
        console.log(`  Span ${i}: "${text}" (title="${title || 'none'}")`);

        if (title && !username) {
          username = title;
          console.log(`    ➜ Found username: ${username}`);
        }
      });

      // Get full text
      const fullText = el.textContent?.trim();
      console.log(`Full text: "${fullText}"`);

      // Try to extract message by removing username
      if (username && fullText) {
        message = fullText.replace(username, '').trim();
      } else {
        message = fullText;
      }

      console.log(`Extracted:`);
      console.log(`  Username: ${username || 'NOT FOUND'}`);
      console.log(`  Message: ${message || 'NOT FOUND'}`);

      // Also log HTML structure
      console.log(`HTML preview: ${el.outerHTML.substring(0, 200)}`);

      results.push({ username, message, fullText });
    });

    return results;
  });

  if (detailedResult) {
    console.log('\n✅ Detailed analysis complete');
    console.log('Full text preview:', detailedResult.fullText);
  }

  console.log('\n\n📊 TEST 3: Monitor for NEW elements being added (with proper parsing)\n');

  await page.evaluate(() => {
    console.log('Setting up observer for NEW chat messages...');

    const chatContainer = document.querySelector('[class*="overflow-y-scroll"]');

    if (!chatContainer) {
      console.log('ERROR: Chat container not found');
      return;
    }

    let newMessageCount = 0;

    // Helper function to extract username and message
    function parseMessage(node) {
      try {
        // Look for the actual chat message element
        const messageEl = node.querySelector('[data-e2e="chat-message"]');
        if (!messageEl) {
          return { username: null, message: null, raw: node.textContent?.trim() };
        }

        // Strategy 1: Find all spans and try to identify username vs message
        const spans = Array.from(messageEl.querySelectorAll('span'));

        let username = null;
        let messageText = null;

        // Look for span with title attribute (often contains username)
        const usernameSpan = spans.find(span => span.getAttribute('title'));
        if (usernameSpan) {
          username = usernameSpan.getAttribute('title') || usernameSpan.textContent?.trim();
        }

        // Strategy 2: Try to find text nodes directly
        // The message is usually in a separate span without a title
        const textSpans = spans.filter(span =>
          !span.getAttribute('title') &&
          span.textContent?.trim().length > 0 &&
          !span.querySelector('img') // Exclude emoji containers
        );

        if (textSpans.length > 0) {
          // The longest text span is likely the message
          messageText = textSpans
            .sort((a, b) => b.textContent.length - a.textContent.length)[0]
            .textContent?.trim();
        }

        // Strategy 3: If we have username, extract message by removing it from full text
        if (username && !messageText) {
          const fullText = messageEl.textContent?.trim();
          messageText = fullText.replace(username, '').trim();
        }

        // If still no message, use full text minus username
        if (!messageText) {
          messageText = messageEl.textContent?.trim();
          if (username) {
            messageText = messageText.replace(username, '').trim();
          }
        }

        return {
          username: username || 'Unknown',
          message: messageText || '',
          raw: messageEl.textContent?.trim()
        };
      } catch (error) {
        console.error('Parse error:', error.message);
        return { username: null, message: null, raw: node.textContent?.trim() };
      }
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;

          // Check if it matches our pattern
          if (node.matches && node.matches('div.w-full.pt-4[data-index]')) {
            newMessageCount++;
            const parsed = parseMessage(node);

            console.log(`\n🆕 NEW MESSAGE #${newMessageCount}!`);
            console.log('data-index:', node.getAttribute('data-index'));
            console.log('Username:', parsed.username);
            console.log('Message:', parsed.message);
            console.log('Raw text:', parsed.raw);
            console.log('---');
          }
        });
      });
    });

    observer.observe(chatContainer, {
      childList: true,
      subtree: true
    });

    console.log('✅ Observer active! Waiting for new messages...');
  });

  // Listen to console
  page.on('console', msg => {
    console.log(msg.text());
  });

  console.log('\n\n📊 TEST 4: Deep dive into DOM structure\n');

  await page.evaluate(() => {
    console.log('Analyzing FIRST chat message DOM structure in detail...\n');

    const firstMessage = document.querySelector('div.w-full.pt-4[data-index]');

    if (!firstMessage) {
      console.log('No messages found yet!');
      return;
    }

    // Function to print element tree
    function printElementTree(el, indent = 0) {
      const prefix = '  '.repeat(indent);
      const tagName = el.tagName?.toLowerCase() || 'text';
      const classes = el.className ? `.${el.className.split(' ').slice(0, 3).join('.')}` : '';
      const attributes = [];

      if (el.getAttribute) {
        const attrs = ['data-e2e', 'data-index', 'title', 'role', 'aria-label'];
        attrs.forEach(attr => {
          const val = el.getAttribute(attr);
          if (val) attributes.push(`${attr}="${val}"`);
        });
      }

      const text = el.textContent?.trim().substring(0, 30) || '';
      const hasChildren = el.children?.length > 0;

      console.log(`${prefix}<${tagName}${classes}${attributes.length ? ' ' + attributes.join(' ') : ''}>`);

      if (!hasChildren && text) {
        console.log(`${prefix}  TEXT: "${text}"`);
      }

      // Recursively print children (limit depth to avoid clutter)
      if (hasChildren && indent < 6) {
        Array.from(el.children).forEach(child => printElementTree(child, indent + 1));
      }

      console.log(`${prefix}</${tagName}>`);
    }

    console.log('=== COMPLETE DOM TREE ===\n');
    printElementTree(firstMessage);

    console.log('\n=== KEY SELECTORS FOUND ===');
    const messageEl = firstMessage.querySelector('[data-e2e="chat-message"]');
    if (messageEl) {
      console.log('✓ Found [data-e2e="chat-message"]');

      const spans = messageEl.querySelectorAll('span');
      console.log(`✓ Found ${spans.length} span elements inside`);

      spans.forEach((span, i) => {
        const title = span.getAttribute('title');
        const text = span.textContent?.trim().substring(0, 50);
        console.log(`  Span ${i}: ${title ? `title="${title}"` : 'no title'} | text="${text}"`);
      });
    }
  });

  console.log('\n✅ Inspector ready!');
  console.log('📺 Check the browser window');
  console.log('💬 New chat messages will be logged here automatically\n');
  console.log('\n💡 TIP: The improved parser should now show:');
  console.log('   Username: (extracted from title attribute or text)');
  console.log('   Message: (the actual chat message)');
  console.log('   Raw text: (full combined text for comparison)\n');
  console.log('Press Ctrl+C to stop\n');

  await new Promise(() => {});
}

interactiveInspector().catch(console.error);
