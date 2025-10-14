const { chromium } = require('playwright');

async function inspectKickChat() {
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

  console.log('\n=== Inspecting Kick Chat DOM Structure ===\n');

  // Inspect the chat structure
  const chatStructure = await page.evaluate(() => {
    // Find chat messages
    const messages = document.querySelectorAll('*');
    const chatElements = [];

    messages.forEach((el) => {
      const classes = Array.from(el.classList);
      const tagName = el.tagName.toLowerCase();

      // Look for elements that might contain chat messages
      if (classes.some(c => c.includes('message') || c.includes('chat') || c.includes('entry'))) {
        chatElements.push({
          tag: tagName,
          classes: classes,
          id: el.id,
          textContent: el.textContent?.substring(0, 100),
          childCount: el.children.length
        });
      }
    });

    return {
      chatElements: chatElements.slice(0, 20), // First 20 relevant elements
      bodyHTML: document.body.innerHTML.substring(0, 5000)
    };
  });

  console.log('Chat Elements Found:');
  console.log(JSON.stringify(chatStructure.chatElements, null, 2));

  console.log('\n\n=== Watching for new messages ===\n');

  // Listen to all mutations
  await page.evaluate(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            console.log('NEW_NODE:', {
              tag: node.tagName,
              classes: Array.from(node.classList || []),
              id: node.id,
              text: node.textContent?.substring(0, 100)
            });
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
    if (msg.text().startsWith('NEW_NODE:')) {
      console.log(msg.text());
    }
  });

  console.log('Watching for chat messages... (wait 30 seconds)');
  await new Promise(resolve => setTimeout(resolve, 30000));

  await browser.close();
}

inspectKickChat().catch(console.error);
