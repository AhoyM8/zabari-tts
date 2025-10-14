const { chromium } = require('playwright');

async function inspectKickChat() {
  const browser = await chromium.launch({
    headless: false, // Run in headed mode to see what's happening
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();

  // Use a popular streamer who is likely live
  const kickChannel = 'trainwreckstv'; // Popular channel, change if needed
  console.log(`Opening Kick chat for: ${kickChannel}...`);
  await page.goto(`https://kick.com/popout/${kickChannel}/chat`);

  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  console.log('Page loaded, waiting 5 seconds for chat to initialize...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n=== Inspecting Initial Chat Structure ===\n');

  // Inspect existing chat messages on the page
  const initialStructure = await page.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    const chatRelated = [];

    // Find elements with text content (potential messages)
    allElements.forEach(el => {
      const classList = Array.from(el.classList);
      const text = el.textContent?.trim();

      // Look for elements that might be chat messages
      if (text && text.length > 3 && text.length < 500) {
        // Check for chat-related classes or structure
        if (
          classList.some(c => c.includes('chat') || c.includes('message') || c.includes('entry')) ||
          el.tagName === 'DIV' && el.querySelector('button')
        ) {
          chatRelated.push({
            tag: el.tagName,
            classes: classList,
            id: el.id,
            text: text.substring(0, 200),
            childrenTags: Array.from(el.children).map(c => c.tagName),
            hasButton: !!el.querySelector('button'),
            buttonText: el.querySelector('button')?.textContent,
            outerHTML: el.outerHTML.substring(0, 300)
          });
        }
      }
    });

    return {
      totalElements: allElements.length,
      chatRelatedCount: chatRelated.length,
      chatElements: chatRelated.slice(0, 10), // First 10 potential messages
      containerIds: Array.from(document.querySelectorAll('[id*="chat"]')).map(el => ({
        id: el.id,
        classes: Array.from(el.classList)
      }))
    };
  });

  console.log('Total DOM elements:', initialStructure.totalElements);
  console.log('Chat-related elements found:', initialStructure.chatRelatedCount);
  console.log('\nContainers with "chat" in ID:');
  console.log(JSON.stringify(initialStructure.containerIds, null, 2));
  console.log('\nFirst 10 potential chat messages:');
  console.log(JSON.stringify(initialStructure.chatElements, null, 2));

  console.log('\n\n=== Starting MutationObserver ===\n');

  // Set up mutation observer
  await page.evaluate(() => {
    let messageCount = 0;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const text = node.textContent?.trim();

            // Log any node with substantial text
            if (text && text.length > 3) {
              messageCount++;

              const info = {
                count: messageCount,
                tag: node.tagName,
                classes: Array.from(node.classList || []),
                id: node.id,
                text: text.substring(0, 150),
                outerHTML: node.outerHTML?.substring(0, 400),
                parentTag: node.parentElement?.tagName,
                parentClasses: Array.from(node.parentElement?.classList || []),
                hasButton: !!node.querySelector('button'),
                buttonText: node.querySelector('button')?.textContent,
                allButtons: Array.from(node.querySelectorAll('button')).map(b => b.textContent)
              };

              console.log('MUTATION_DETECTED:', JSON.stringify(info, null, 2));
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('MutationObserver started on document.body');
  });

  page.on('console', msg => {
    console.log(msg.text());
  });

  console.log('Watching for new chat messages for 45 seconds...');
  console.log('(Browser window will stay open - watch for new messages)\n');

  await new Promise(resolve => setTimeout(resolve, 45000));

  console.log('\n=== Done watching, closing browser ===');
  await browser.close();
}

inspectKickChat().catch(console.error);
