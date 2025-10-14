const { chromium } = require('playwright');

async function debugKick() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();
  console.log('Opening Kick chat...');
  await page.goto('https://kick.com/popout/sprayitupjay/chat');

  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n=== Setting up MutationObserver with detailed logging ===\n');

  // Setup detailed mutation observer
  await page.evaluate(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        console.log('MUTATION_TYPE:', mutation.type);
        console.log('MUTATION_TARGET:', mutation.target.tagName, mutation.target.className);

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            console.log('ADDED_NODE:', {
              tag: node.tagName,
              classes: Array.from(node.classList || []).slice(0, 5),
              hasButton: !!node.querySelector('button'),
              hasButtonDirect: !!node.querySelector(':scope > button'),
              hasButtonNested: !!node.querySelector(':scope > div > button'),
              textPreview: node.textContent?.substring(0, 100)
            });

            // Log ALL buttons found
            const allButtons = node.querySelectorAll('button');
            if (allButtons.length > 0) {
              console.log('ALL_BUTTONS:', Array.from(allButtons).map(b => b.textContent?.trim()));
            }

            // Try to extract message
            const button = node.querySelector(':scope > button') ||
                          node.querySelector(':scope > div > button');

            if (button) {
              console.log('FOUND_BUTTON:', button.textContent);

              const children = Array.from(node.children);
              children.forEach((child, idx) => {
                console.log(`CHILD_${idx}:`, {
                  tag: child.tagName,
                  text: child.textContent?.substring(0, 50)
                });
              });
            }
          }
        });
      });
    });

    const chatContainer = document.querySelector('[id*="channel-chatroom"]') ||
                         document.querySelector('main') ||
                         document.body;

    console.log('OBSERVING:', chatContainer?.id || chatContainer?.tagName);

    if (chatContainer) {
      observer.observe(chatContainer, {
        childList: true,
        subtree: true
      });
      console.log('Observer started');
    }
  });

  page.on('console', msg => {
    console.log('[PAGE]', msg.text());
  });

  console.log('\nWaiting for new messages... (60 seconds)\n');
  await new Promise(resolve => setTimeout(resolve, 60000));

  await browser.close();
}

debugKick().catch(console.error);
