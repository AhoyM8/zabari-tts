const { chromium } = require('playwright');

async function logChatMessages() {
  // Launch browser with headed mode to see the chats
  const browser = await chromium.launch({
    headless: true,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  // Open Twitch chat in first page
  const twitchPage = await context.newPage();
  console.log('Opening Twitch chat...');
  await twitchPage.goto('https://www.twitch.tv/popout/zabariyarin/chat?popout=');

  // Open YouTube chat in second page
  const youtubePage = await context.newPage();
  console.log('Opening YouTube chat...');
  await youtubePage.goto('https://www.youtube.com/live_chat?is_popout=1&v=S6ATuj2NnUU');

  // Open Kick chat in third page
  const kickPage = await context.newPage();
  console.log('Opening Kick chat...');
  await kickPage.goto('https://kick.com/popout/sprayitupjay/chat');

  // Wait for pages to load (with timeout handling)
  try {
    await twitchPage.waitForLoadState('domcontentloaded', { timeout: 15000 });
  } catch (e) {
    console.log('Twitch page took longer to load, continuing anyway...');
  }

  try {
    await youtubePage.waitForLoadState('domcontentloaded', { timeout: 15000 });
  } catch (e) {
    console.log('YouTube page took longer to load, continuing anyway...');
  }

  try {
    await kickPage.waitForLoadState('domcontentloaded', { timeout: 15000 });
  } catch (e) {
    console.log('Kick page took longer to load, continuing anyway...');
  }

  // Give the pages a moment to initialize chat
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n=== Starting to log chat messages ===\n');

  // Monitor Twitch chat messages
  twitchPage.on('console', msg => {
    if (msg.type() === 'log') {
      console.log(`[TWITCH CONSOLE] ${msg.text()}`);
    }
  });

  // Listen for new Twitch chat messages using MutationObserver
  await twitchPage.evaluate(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Look for chat message elements
            const messageElements = node.querySelectorAll('[data-a-target="chat-line-message"]');
            messageElements.forEach((el) => {
              const username = el.querySelector('[data-a-target="chat-message-username"]')?.textContent || 'Unknown';
              const message = el.querySelector('[data-a-target="chat-line-message-body"]')?.textContent || '';
              console.log(`TWITCH: ${username}: ${message}`);
            });

            // Check if the node itself is a message
            if (node.matches && node.matches('[data-a-target="chat-line-message"]')) {
              const username = node.querySelector('[data-a-target="chat-message-username"]')?.textContent || 'Unknown';
              const message = node.querySelector('[data-a-target="chat-line-message-body"]')?.textContent || '';
              console.log(`TWITCH: ${username}: ${message}`);
            }
          }
        });
      });
    });

    // Start observing the chat container
    const chatContainer = document.querySelector('.chat-scrollable-area__message-container') ||
                         document.querySelector('.stream-chat') ||
                         document.body;

    if (chatContainer) {
      observer.observe(chatContainer, {
        childList: true,
        subtree: true
      });
    }
  });

  // Listen for YouTube chat messages
  await youtubePage.evaluate(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Look for YouTube chat message elements
            const messageElements = node.querySelectorAll('yt-live-chat-text-message-renderer');
            messageElements.forEach((el) => {
              const username = el.querySelector('#author-name')?.textContent || 'Unknown';
              const message = el.querySelector('#message')?.textContent || '';
              console.log(`YOUTUBE: ${username}: ${message}`);
            });

            // Check if the node itself is a message
            if (node.matches && node.matches('yt-live-chat-text-message-renderer')) {
              const username = node.querySelector('#author-name')?.textContent || 'Unknown';
              const message = node.querySelector('#message')?.textContent || '';
              console.log(`YOUTUBE: ${username}: ${message}`);
            }
          }
        });
      });
    });

    // Start observing the YouTube chat container
    const chatContainer = document.querySelector('#items') ||
                         document.querySelector('yt-live-chat-item-list-renderer') ||
                         document.body;

    if (chatContainer) {
      observer.observe(chatContainer, {
        childList: true,
        subtree: true
      });
    }
  });

  // Capture console messages from Twitch page
  twitchPage.on('console', async (msg) => {
    const text = msg.text();
    if (text.startsWith('TWITCH:')) {
      console.log(`[Twitch Chat] ${text.substring(8)}`);
    }
  });

  // Capture console messages from YouTube page
  youtubePage.on('console', async (msg) => {
    const text = msg.text();
    if (text.startsWith('YOUTUBE:')) {
      console.log(`[YouTube Chat] ${text.substring(9)}`);
    }
  });

  // Listen for Kick chat messages
  await kickPage.evaluate(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Kick messages have a button with the username somewhere inside
            const button = node.querySelector('button');

            if (button) {
              const username = button.textContent?.trim();
              const fullText = node.textContent || '';

              // Extract message: find "username:" pattern and get text after it
              // This handles cases where there might be timestamps or other text before
              const usernamePattern = `${username}:`;
              const usernameIndex = fullText.lastIndexOf(usernamePattern);

              if (usernameIndex > -1 && username) {
                const messageText = fullText.substring(usernameIndex + usernamePattern.length).trim();

                if (messageText && messageText.length > 0) {
                  console.log(`KICK: ${username}: ${messageText}`);
                }
              }
            }
          }
        });
      });
    });

    // Start observing the Kick chat container
    const chatContainer = document.querySelector('[id*="channel-chatroom"]') ||
                         document.querySelector('main') ||
                         document.body;

    if (chatContainer) {
      observer.observe(chatContainer, {
        childList: true,
        subtree: true
      });
    }
  });

  // Capture console messages from Kick page
  kickPage.on('console', async (msg) => {
    const text = msg.text();
    if (text.startsWith('KICK:')) {
      console.log(`[Kick Chat] ${text.substring(6)}`);
    }
  });

  console.log('Chat logger is running. Press Ctrl+C to stop.\n');

  // Keep the script running
  await new Promise(() => {});
}

// Run the function
logChatMessages().catch(console.error);
