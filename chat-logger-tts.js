const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// TTS Configuration
const TTS_SERVER_URL = 'http://localhost:8765';
const TTS_VOICE = 'dave'; // Can be 'dave' or 'jo' (or any other voice in samples folder)
const AUDIO_OUTPUT_DIR = path.join(__dirname, 'audio_output');

// Create audio output directory if it doesn't exist
if (!fs.existsSync(AUDIO_OUTPUT_DIR)) {
  fs.mkdirSync(AUDIO_OUTPUT_DIR, { recursive: true });
}

// Queue for TTS requests to prevent overwhelming the server
const ttsQueue = [];
let isProcessingQueue = false;

async function synthesizeSpeech(text, platform, username) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text: `${username} says: ${text}`,
      voice: TTS_VOICE
    });

    const options = {
      hostname: 'localhost',
      port: 8765,
      path: '/synthesize',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          const audioBuffer = Buffer.concat(chunks);

          // Save audio file
          const timestamp = Date.now();
          const filename = `${platform}_${username}_${timestamp}.wav`;
          const filepath = path.join(AUDIO_OUTPUT_DIR, filename);

          fs.writeFileSync(filepath, audioBuffer);
          console.log(`🔊 TTS audio saved: ${filename}`);
          resolve(filepath);
        } else {
          reject(new Error(`TTS request failed with status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('TTS request error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function processQueue() {
  if (isProcessingQueue || ttsQueue.length === 0) return;

  isProcessingQueue = true;

  while (ttsQueue.length > 0) {
    const { text, platform, username } = ttsQueue.shift();

    try {
      await synthesizeSpeech(text, platform, username);
      // Small delay between TTS requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to synthesize speech for "${text}":`, error.message);
    }
  }

  isProcessingQueue = false;
}

function queueTTS(text, platform, username) {
  // Skip empty messages or very short ones
  if (!text || text.trim().length < 2) return;

  ttsQueue.push({ text, platform, username });
  processQueue();
}

async function checkTTSServer() {
  return new Promise((resolve) => {
    const req = http.get(`${TTS_SERVER_URL}/health`, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function logChatMessages() {
  // Check if TTS server is running
  console.log('Checking TTS server...');
  const ttsServerRunning = await checkTTSServer();

  if (!ttsServerRunning) {
    console.warn('\n⚠️  Warning: TTS server is not running!');
    console.warn('Start the TTS server with: python tts-server.py');
    console.warn('Chat messages will be logged but not converted to speech.\n');
  } else {
    console.log('✓ TTS server is running\n');
  }

  // Launch browser with headed mode to see the chats
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized', '--autoplay-policy=no-user-gesture-required']
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

  console.log('\n=== Starting to log chat messages with TTS ===\n');

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
              if (message) {
                console.log(`TWITCH:${username}:${message}`);
              }
            });

            // Check if the node itself is a message
            if (node.matches && node.matches('[data-a-target="chat-line-message"]')) {
              const username = node.querySelector('[data-a-target="chat-message-username"]')?.textContent || 'Unknown';
              const message = node.querySelector('[data-a-target="chat-line-message-body"]')?.textContent || '';
              if (message) {
                console.log(`TWITCH:${username}:${message}`);
              }
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
              if (message) {
                console.log(`YOUTUBE:${username}:${message}`);
              }
            });

            // Check if the node itself is a message
            if (node.matches && node.matches('yt-live-chat-text-message-renderer')) {
              const username = node.querySelector('#author-name')?.textContent || 'Unknown';
              const message = node.querySelector('#message')?.textContent || '';
              if (message) {
                console.log(`YOUTUBE:${username}:${message}`);
              }
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

  // Capture console messages from Twitch page and send to TTS
  twitchPage.on('console', async (msg) => {
    const text = msg.text();
    if (text.startsWith('TWITCH:')) {
      const parts = text.substring(7).split(':');
      const username = parts[0];
      const message = parts.slice(1).join(':');

      console.log(`[Twitch Chat] ${username}: ${message}`);

      if (ttsServerRunning) {
        queueTTS(message, 'twitch', username);
      }
    }
  });

  // Capture console messages from YouTube page and send to TTS
  youtubePage.on('console', async (msg) => {
    const text = msg.text();
    if (text.startsWith('YOUTUBE:')) {
      const parts = text.substring(8).split(':');
      const username = parts[0];
      const message = parts.slice(1).join(':');

      console.log(`[YouTube Chat] ${username}: ${message}`);

      if (ttsServerRunning) {
        queueTTS(message, 'youtube', username);
      }
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
                  console.log(`KICK:${username}:${messageText}`);
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

  // Capture console messages from Kick page and send to TTS
  kickPage.on('console', async (msg) => {
    const text = msg.text();
    if (text.startsWith('KICK:')) {
      const parts = text.substring(5).split(':');
      const username = parts[0];
      const message = parts.slice(1).join(':');

      console.log(`[Kick Chat] ${username}: ${message}`);

      if (ttsServerRunning) {
        queueTTS(message, 'kick', username);
      }
    }
  });

  console.log('Chat logger with TTS is running. Press Ctrl+C to stop.\n');
  console.log(`Audio files will be saved to: ${AUDIO_OUTPUT_DIR}\n`);

  // Keep the script running
  await new Promise(() => {});
}

// Run the function
logChatMessages().catch(console.error);
