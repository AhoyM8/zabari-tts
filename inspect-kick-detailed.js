const { chromium } = require('playwright');

async function inspectKickChat() {
  const browser = await chromium.launch({
    headless: false,
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

  console.log('\n=== Watching for new messages with detailed structure ===\n');

  // Listen to all mutations with detailed logging
  await page.evaluate(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.textContent) {
            // Get all child elements and their structure
            const structure = {
              outerHTML: node.outerHTML?.substring(0, 500),
              tag: node.tagName,
              classes: Array.from(node.classList || []),
              children: []
            };

            // Get all child elements
            Array.from(node.children || []).forEach(child => {
              structure.children.push({
                tag: child.tagName,
                classes: Array.from(child.classList || []),
                text: child.textContent?.substring(0, 100),
                innerHTML: child.innerHTML?.substring(0, 200)
              });
            });

            console.log('KICK_MESSAGE:', JSON.stringify(structure, null, 2));
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
    if (msg.text().startsWith('KICK_MESSAGE:')) {
      console.log(msg.text());
    }
  });

  console.log('Watching for chat messages... (wait 30 seconds)');
  await new Promise(resolve => setTimeout(resolve, 30000));

  await browser.close();
}

inspectKickChat().catch(console.error);
