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

  const kickChannel = 'zabariyarin';
  console.log(`\nOpening Kick chat for: ${kickChannel}\n`);

  await page.goto(`https://kick.com/popout/${kickChannel}/chat`);
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });

  console.log('Waiting 15 seconds for messages to appear...\n');
  await new Promise(resolve => setTimeout(resolve, 15000));

  console.log('========================================');
  console.log('INSPECTING VISIBLE MESSAGES');
  console.log('========================================\n');

  // Inspect all text nodes that look like messages
  const messagesInfo = await page.evaluate(() => {
    const results = [];

    // Strategy 1: Find elements containing ":" which might be username:message format
    const allElements = document.querySelectorAll('*');

    allElements.forEach((el, index) => {
      const text = el.textContent?.trim();

      // Look for elements with pattern "username: message"
      if (text && text.includes(':') && text.length < 500 && text.length > 3) {
        // Check if this might be a chat message (has both text before and after colon)
        const colonIndex = text.indexOf(':');
        const beforeColon = text.substring(0, colonIndex).trim();
        const afterColon = text.substring(colonIndex + 1).trim();

        if (beforeColon.length > 0 && beforeColon.length < 50 &&
            afterColon.length > 0 && afterColon.length < 300 &&
            !beforeColon.includes(' ') && // username typically has no spaces
            !text.includes('Send a message') &&
            !text.includes('Connection to')) {

          results.push({
            possibleUsername: beforeColon,
            possibleMessage: afterColon,
            fullText: text,
            tag: el.tagName,
            classes: Array.from(el.classList),
            id: el.id || '(none)',
            parentTag: el.parentElement?.tagName,
            parentClasses: Array.from(el.parentElement?.classList || []),
            hasButton: !!el.querySelector('button'),
            buttonInside: el.querySelector('button') ? {
              text: el.querySelector('button').textContent,
              classes: Array.from(el.querySelector('button').classList)
            } : null,
            children: Array.from(el.children).map(child => ({
              tag: child.tagName,
              classes: Array.from(child.classList),
              text: child.textContent?.substring(0, 50)
            })),
            outerHTML: el.outerHTML.substring(0, 600)
          });
        }
      }
    });

    return {
      totalPotentialMessages: results.length,
      messages: results,
      containerIds: {
        chatroomMessages: !!document.getElementById('chatroom-messages'),
        channelChatroom: !!document.getElementById('channel-chatroom')
      }
    };
  });

  console.log(`Found ${messagesInfo.totalPotentialMessages} potential message elements\n`);

  if (messagesInfo.messages.length > 0) {
    console.log('=== MESSAGE STRUCTURES ===\n');
    messagesInfo.messages.forEach((msg, i) => {
      console.log(`\n--- Message ${i + 1} ---`);
      console.log(`Username: "${msg.possibleUsername}"`);
      console.log(`Message: "${msg.possibleMessage}"`);
      console.log(`Tag: ${msg.tag}`);
      console.log(`Classes: ${msg.classes.join(', ') || '(none)'}`);
      console.log(`ID: ${msg.id}`);
      console.log(`Parent: ${msg.parentTag} (${msg.parentClasses.join(', ')})`);
      console.log(`Has Button: ${msg.hasButton}`);
      if (msg.buttonInside) {
        console.log(`Button Text: "${msg.buttonInside.text}"`);
        console.log(`Button Classes: ${msg.buttonInside.classes.join(', ')}`);
      }
      console.log(`Children (${msg.children.length}):`);
      msg.children.forEach(child => {
        console.log(`  - ${child.tag}: "${child.text}"`);
      });
      console.log(`\nHTML Preview:\n${msg.outerHTML}\n`);
      console.log('---');
    });
  } else {
    console.log('❌ No messages found with username:message pattern');
    console.log('\nTrying alternative search...\n');

    // Alternative: just show all elements with reasonable text content
    const allText = await page.evaluate(() => {
      const elements = [];
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 3 && text.length < 200 &&
            !text.includes('Send a message') &&
            el.children.length < 10) {
          elements.push({
            text: text,
            tag: el.tagName,
            classes: Array.from(el.classList)
          });
        }
      });
      return elements.slice(0, 30);
    });

    console.log('Elements with text content:');
    allText.forEach(el => {
      console.log(`${el.tag}: "${el.text}"`);
    });
  }

  console.log('\n========================================');
  console.log('Keeping browser open for 30 seconds...');
  console.log('You can manually inspect the elements');
  console.log('========================================\n');

  await new Promise(resolve => setTimeout(resolve, 30000));

  await browser.close();
}

inspectKickChat().catch(console.error);
