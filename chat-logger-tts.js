const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load configuration from dynamic config or use defaults
function loadConfig() {
  const configPath = process.env.ZABARI_CONFIG || path.join(__dirname, 'dynamic-config.json');

  if (fs.existsSync(configPath)) {
    try {
      const dynamicConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Build URLs object from platforms
      const urls = {};
      if (dynamicConfig.platforms) {
        Object.keys(dynamicConfig.platforms).forEach(platform => {
          if (dynamicConfig.platforms[platform].enabled) {
            urls[platform] = dynamicConfig.platforms[platform].url;
          }
        });
      }

      // Determine TTS engine and configuration
      const ttsEngine = dynamicConfig.ttsEngine || 'neutts';
      let ttsServerUrl, ttsVoice, ttsSpeed;

      if (ttsEngine === 'kokoro') {
        // Kokoro configuration
        ttsServerUrl = dynamicConfig.ttsConfig?.serverUrl || 'http://localhost:8766';
        ttsVoice = dynamicConfig.ttsConfig?.voice || 'af_heart';
        ttsSpeed = dynamicConfig.ttsConfig?.speed || 1.0;
      } else {
        // NeuTTS configuration (default)
        ttsServerUrl = dynamicConfig.ttsConfig?.serverUrl || 'http://localhost:8765';
        ttsVoice = dynamicConfig.ttsConfig?.voice || 'dave';
        ttsSpeed = null; // NeuTTS doesn't use speed parameter
      }

      return {
        urls,
        ttsEngine,
        ttsServerUrl,
        ttsVoice,
        ttsSpeed
      };
    } catch (error) {
      console.error('Error loading dynamic config, using defaults:', error);
    }
  }

  // Default configuration (NeuTTS)
  return {
    urls: {
      twitch: 'https://www.twitch.tv/popout/zabariyarin/chat?popout=',
      youtube: 'https://www.youtube.com/live_chat?is_popout=1&v=S6ATuj2NnUU',
      kick: 'https://kick.com/popout/zabariyarin/chat'
    },
    ttsEngine: 'neutts',
    ttsServerUrl: 'http://localhost:8765',
    ttsVoice: 'dave',
    ttsSpeed: null
  };
}

const CONFIG = loadConfig();
console.log('TTS Configuration:', {
  engine: CONFIG.ttsEngine,
  serverUrl: CONFIG.ttsServerUrl,
  voice: CONFIG.ttsVoice,
  speed: CONFIG.ttsSpeed
});

const AUDIO_OUTPUT_DIR = path.join(__dirname, 'audio_output');

// Create audio output directory if it doesn't exist
if (!fs.existsSync(AUDIO_OUTPUT_DIR)) {
  fs.mkdirSync(AUDIO_OUTPUT_DIR, { recursive: true });
}

// Queue for TTS requests to prevent overwhelming the server
const ttsQueue = [];
let isProcessingQueue = false;

async function synthesizeSpeech(text, platform, username, page) {
  console.log(`\n🎤 [TTS] Processing: "${text}" (${platform}/${username})`);

  return new Promise((resolve, reject) => {
    // Build request payload based on TTS engine
    const payload = {
      text: `${username} says: ${text}`,
      voice: CONFIG.ttsVoice
    };

    // Kokoro supports speed parameter
    if (CONFIG.ttsEngine === 'kokoro' && CONFIG.ttsSpeed !== null) {
      payload.speed = CONFIG.ttsSpeed;
    }

    console.log(`📤 [TTS] Sending request to ${CONFIG.ttsServerUrl}/synthesize`);
    console.log(`   Payload:`, JSON.stringify(payload, null, 2));

    const postData = JSON.stringify(payload);

    // Parse server URL
    const serverUrl = new URL(CONFIG.ttsServerUrl);

    const options = {
      hostname: serverUrl.hostname,
      port: serverUrl.port || (serverUrl.protocol === 'https:' ? 443 : 80),
      path: '/synthesize',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      console.log(`📥 [TTS] Response status: ${res.statusCode}`);
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', async () => {
        if (res.statusCode === 200) {
          const audioBuffer = Buffer.concat(chunks);
          console.log(`✓ [TTS] Received audio data: ${audioBuffer.length} bytes`);

          // Save audio file to disk
          const timestamp = Date.now();
          const filename = `${platform}_${username}_${timestamp}.wav`;
          const filepath = path.join(AUDIO_OUTPUT_DIR, filename);

          fs.writeFileSync(filepath, audioBuffer);
          console.log(`💾 [TTS] Audio saved: ${filename}`);

          // Play audio in browser using Web Audio API
          try {
            console.log(`🔊 [TTS] Starting audio playback in browser...`);
            const base64Audio = audioBuffer.toString('base64');
            await page.evaluate((audioData) => {
              return new Promise((resolvePlay) => {
                console.log('[Browser] Decoding audio data...');
                const binaryString = atob(audioData);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('[Browser] AudioContext created, state:', audioContext.state);

                audioContext.decodeAudioData(bytes.buffer, (audioBuffer) => {
                  console.log('[Browser] Audio decoded successfully! Duration:', audioBuffer.duration, 'seconds');
                  const source = audioContext.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(audioContext.destination);

                  source.onended = () => {
                    console.log('[Browser] ✓ Audio playback finished');
                    resolvePlay();
                  };

                  source.start(0);
                  console.log('[Browser] 🔊 Audio playback started!');
                }, (error) => {
                  console.error('[Browser] Error decoding audio:', error);
                  resolvePlay();
                });
              });
            }, base64Audio);

            console.log('✅ [TTS] Audio playback completed successfully!\n');
            resolve(filepath);
          } catch (error) {
            console.error('❌ [TTS] Error playing audio:', error.message);
            resolve(filepath); // Still resolve even if playback fails
          }
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
    const { text, platform, username, page } = ttsQueue.shift();

    try {
      await synthesizeSpeech(text, platform, username, page);
      // Small delay between TTS requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to synthesize speech for "${text}":`, error.message);
    }
  }

  isProcessingQueue = false;
}

function queueTTS(text, platform, username, page) {
  // Skip empty messages or very short ones
  if (!text || text.trim().length < 2) {
    console.log(`⏭️  [TTS] Skipping message (too short): "${text}"`);
    return;
  }

  console.log(`➕ [TTS] Added to queue: "${text}" (Queue size: ${ttsQueue.length + 1})`);
  ttsQueue.push({ text, platform, username, page });
  processQueue();
}

async function checkTTSServer() {
  return new Promise((resolve) => {
    const req = http.get(`${CONFIG.ttsServerUrl}/health`, (res) => {
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
  // Check if TTS server is running (initial check only for user feedback)
  console.log('Checking TTS server...');
  const ttsServerInitiallyRunning = await checkTTSServer();

  if (!ttsServerInitiallyRunning) {
    console.warn('\n⚠️  Warning: TTS server is not running at startup!');
    console.warn(`Start the ${CONFIG.ttsEngine.toUpperCase()} TTS server to enable TTS.`);
    console.warn('Chat messages will be logged. If TTS server starts later, it will be used automatically.\n');
  } else {
    console.log(`✓ ${CONFIG.ttsEngine.toUpperCase()} TTS server is running\n`);
  }

  // Launch browser with headed mode to see the chats and enable audio playback
  // IMPORTANT: Must be headless: false for audio to actually play through speakers!
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized', '--autoplay-policy=no-user-gesture-required', '--enable-audio-service-sandbox=false']
  });

  const context = await browser.newContext({
    viewport: null
  });

  // Open chat pages for enabled platforms
  const pages = {};
  const enabledPlatforms = Object.keys(CONFIG.urls);

  for (const platform of enabledPlatforms) {
    const page = await context.newPage();
    console.log(`Opening ${platform} chat...`);
    await page.goto(CONFIG.urls[platform]);
    pages[platform] = page;
  }

  // Wait for pages to load (with timeout handling)
  for (const platform of enabledPlatforms) {
    try {
      await pages[platform].waitForLoadState('domcontentloaded', { timeout: 15000 });
    } catch (e) {
      console.log(`${platform} page took longer to load, continuing anyway...`);
    }
  }

  // Legacy support - assign pages to individual variables if needed
  const twitchPage = pages['twitch'];
  const youtubePage = pages['youtube'];
  const kickPage = pages['kick'];

  // Give the pages a moment to initialize chat
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n=== Starting to log chat messages with TTS ===\n');
  console.log(`Enabled platforms: ${enabledPlatforms.join(', ')}\n`);

  // Listen for new Twitch chat messages using MutationObserver
  if (twitchPage) {
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
  }

  // Listen for YouTube chat messages
  if (youtubePage) {
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
  }

  // Capture console messages from Twitch page and send to TTS
  if (twitchPage) {
    twitchPage.on('console', async (msg) => {
    const text = msg.text();
    if (text.startsWith('TWITCH:')) {
      const parts = text.substring(7).split(':');
      const username = parts[0];
      const message = parts.slice(1).join(':');

      // Output in both formats: for frontend parsing and for readability
      console.log(`TWITCH:${username}:${message}`);
      console.log(`[Twitch Chat] ${username}: ${message}`);

      // Always try to send to TTS (will fail gracefully if server not available)
      queueTTS(message, 'twitch', username, twitchPage);
    }
  });
  }

  // Capture console messages from YouTube page and send to TTS
  if (youtubePage) {
    youtubePage.on('console', async (msg) => {
    const text = msg.text();
    if (text.startsWith('YOUTUBE:')) {
      const parts = text.substring(8).split(':');
      const username = parts[0];
      const message = parts.slice(1).join(':');

      // Output in both formats: for frontend parsing and for readability
      console.log(`YOUTUBE:${username}:${message}`);
      console.log(`[YouTube Chat] ${username}: ${message}`);

      // Always try to send to TTS (will fail gracefully if server not available)
      queueTTS(message, 'youtube', username, youtubePage);
    }
  });
  }

  // Listen for Kick chat messages
  if (kickPage) {
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
  }

  // Capture console messages from Kick page and send to TTS
  if (kickPage) {
    kickPage.on('console', async (msg) => {
    const text = msg.text();
    if (text.startsWith('KICK:')) {
      const parts = text.substring(5).split(':');
      const username = parts[0];
      const message = parts.slice(1).join(':');

      // Output in both formats: for frontend parsing and for readability
      console.log(`KICK:${username}:${message}`);
      console.log(`[Kick Chat] ${username}: ${message}`);

      // Always try to send to TTS (will fail gracefully if server not available)
      queueTTS(message, 'kick', username, kickPage);
    }
  });
  }

  console.log('Chat logger with TTS is running. Press Ctrl+C to stop.\n');
  console.log(`Audio files will be saved to: ${AUDIO_OUTPUT_DIR}\n`);

  // Keep the script running
  await new Promise(() => {});
}

// Run the function
logChatMessages().catch(console.error);
