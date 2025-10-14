const { chromium } = require('playwright');

async function inspectKickChat() {
  const browser = await chromium.launch({
    headless: false, // Keep browser visible
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();

  // Use a channel - you can change this
  const kickChannel = process.argv[2] || 'trainwreckstv';
  console.log(`\n========================================`);
  console.log(`Opening Kick chat for: ${kickChannel}`);
  console.log(`========================================\n`);

  await page.goto(`https://kick.com/popout/${kickChannel}/chat`);

  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  console.log('✓ Page loaded');

  console.log('\nWaiting 10 seconds for chat to connect...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Check connection status
  const connectionStatus = await page.evaluate(() => {
    const statusElement = document.querySelector('[aria-label*="Chat state"]');
    return statusElement ? statusElement.getAttribute('aria-label') : 'Unknown';
  });

  console.log(`Chat status: ${connectionStatus}`);

  console.log('\n========================================');
  console.log('READY FOR TESTING');
  console.log('========================================');
  console.log('\nThe browser is now open and watching for messages.');
  console.log('Please SEND A MESSAGE in the chat now!\n');
  console.log('Watching for 60 seconds...\n');

  // Set up mutation observer
  await page.evaluate(() => {
    let messageCount = 0;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const text = node.textContent?.trim();

            // Log any node with text content
            if (text && text.length > 0) {
              messageCount++;

              // Get detailed structure
              const info = {
                '#': messageCount,
                tag: node.tagName,
                classes: Array.from(node.classList || []),
                id: node.id || '(no id)',
                textPreview: text.substring(0, 100),
                textLength: text.length,
                hasButton: !!node.querySelector('button'),
                buttons: Array.from(node.querySelectorAll('button')).map(b => ({
                  text: b.textContent?.trim(),
                  classes: Array.from(b.classList)
                })),
                parentTag: node.parentElement?.tagName,
                parentClasses: Array.from(node.parentElement?.classList || []),
                htmlPreview: node.outerHTML?.substring(0, 500)
              };

              console.log('🔵 NEW NODE ADDED:', JSON.stringify(info, null, 2));
            }
          }
        });
      });
    });

    // Watch multiple containers
    const containers = [
      document.body,
      document.getElementById('chatroom-messages'),
      document.getElementById('channel-chatroom')
    ].filter(el => el);

    containers.forEach(container => {
      observer.observe(container, {
        childList: true,
        subtree: true
      });
      console.log(`👀 Watching: ${container.id || 'body'}`);
    });
  });

  page.on('console', msg => {
    console.log(msg.text());
  });

  // Wait 60 seconds for messages
  console.log('⏱️  Starting 60-second watch...\n');
  await new Promise(resolve => setTimeout(resolve, 60000));

  console.log('\n========================================');
  console.log('✓ Testing complete');
  console.log('========================================');
  console.log('\nClosing browser in 3 seconds...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  await browser.close();
}

inspectKickChat().catch(console.error);
