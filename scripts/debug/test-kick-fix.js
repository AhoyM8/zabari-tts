const { chromium } = require('playwright');

/**
 * Test script to verify Kick message detection with updated selectors
 */
async function testKickFix() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();

  const kickChannel = 'zabariyarin';
  console.log(`\n========================================`);
  console.log(`Testing Kick Message Detection`);
  console.log(`Channel: ${kickChannel}`);
  console.log(`========================================\n`);

  await page.goto(`https://kick.com/popout/${kickChannel}/chat`);
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  console.log('✓ Page loaded, waiting 5 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Use the same selectors as in the fixed code
  const config = {
    container: 'body',
    messageSelector: 'div[data-index]',
    usernameSelector: 'button.inline.font-bold',
    messageBodySelector: 'span:last-child'
  };

  console.log('Setting up MutationObserver with NEW selectors:');
  console.log(`  messageSelector: ${config.messageSelector}`);
  console.log(`  usernameSelector: ${config.usernameSelector}`);
  console.log(`  messageBodySelector: ${config.messageBodySelector}\n`);

  // Test existing messages first
  console.log('=== Testing Existing Messages ===\n');
  const existingMessages = await page.evaluate(({ config }) => {
    const messages = [];
    const messageElements = document.querySelectorAll(config.messageSelector);

    messageElements.forEach((element, index) => {
      const usernameButton = element.querySelector(config.usernameSelector);
      const messageSpan = element.querySelector(config.messageBodySelector);

      if (usernameButton && messageSpan) {
        const username = usernameButton.textContent.trim();
        const message = messageSpan.textContent.trim();

        // Filter out empty messages and timestamps
        if (message && message !== ':' && !message.match(/^\d{2}:\d{2}/) && message.length > 0) {
          messages.push({
            index,
            username,
            message,
            fullText: element.textContent.trim().substring(0, 100)
          });
        }
      }
    });

    return messages;
  }, { config });

  if (existingMessages.length > 0) {
    console.log(`✓ Found ${existingMessages.length} existing messages:\n`);
    existingMessages.forEach(msg => {
      console.log(`  KICK:${msg.username}:${msg.message}`);
    });
  } else {
    console.log('✗ No existing messages found (or selectors not working)');
  }

  console.log('\n=== Setting up MutationObserver for New Messages ===\n');

  // Set up mutation observer
  await page.evaluate(({ config }) => {
    let detectedCount = 0;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            let messageElements = [];

            // Check if the node itself matches
            if (node.matches && node.matches(config.messageSelector)) {
              messageElements.push(node);
            }

            // Check child nodes
            if (node.querySelectorAll) {
              messageElements.push(...node.querySelectorAll(config.messageSelector));
            }

            messageElements.forEach((element) => {
              try {
                const usernameButton = element.querySelector(config.usernameSelector);
                const messageSpan = element.querySelector(config.messageBodySelector);

                if (usernameButton && messageSpan) {
                  const username = usernameButton.textContent.trim();
                  const message = messageSpan.textContent.trim();

                  // Filter out empty messages and timestamps
                  if (message && message !== ':' && !message.match(/^\d{2}:\d{2}/) && message.length > 0) {
                    detectedCount++;
                    console.log(`🟢 DETECTED #${detectedCount}: kick:${username}:${message}`);
                  }
                }
              } catch (err) {
                console.log('❌ Error parsing:', err.message);
              }
            });
          }
        });
      });
    });

    const container = document.querySelector(config.container);
    if (container) {
      observer.observe(container, {
        childList: true,
        subtree: true
      });
      console.log(`✓ MutationObserver started on: ${config.container}`);
    } else {
      console.log('❌ Container not found');
    }
  }, { config });

  page.on('console', msg => {
    console.log(msg.text());
  });

  console.log('\n========================================');
  console.log('🔴 READY - Please send messages in the chat!');
  console.log('========================================');
  console.log('\nWatching for 60 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 60000));

  console.log('\n========================================');
  console.log('✓ Test complete');
  console.log('========================================\n');

  await browser.close();
}

testKickFix().catch(console.error);
