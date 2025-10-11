const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Multi-platform chat logger with Web Speech API TTS
 * Based on browser's native speechSynthesis API (similar to twitchtts.net)
 *
 * Features:
 * - No external TTS server required
 * - Uses system voices available in browser
 * - Real-time speech synthesis
 * - Configurable voice, volume, and rate
 * - Username announcement option
 * - Message filtering (commands, links, specific users)
 */

// Load configuration from environment or use defaults
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

      return {
        urls,
        tts: {
          enabled: true,
          voice: dynamicConfig.ttsConfig?.voice || 'Microsoft David - English (United States)',
          volume: dynamicConfig.ttsConfig?.volume || 1.0,
          rate: dynamicConfig.ttsConfig?.rate || 1.0,
          pitch: dynamicConfig.ttsConfig?.pitch || 1.0,
          announceUsername: dynamicConfig.ttsConfig?.announceUsername ?? true
        },
        filters: {
          excludeCommands: dynamicConfig.ttsConfig?.excludeCommands ?? true,
          excludeLinks: dynamicConfig.ttsConfig?.excludeLinks ?? true,
          excludeUsers: dynamicConfig.ttsConfig?.excludeUsers || ['nightbot', 'moobot', 'streamelements', 'streamlabs', 'fossabot'],
          onlyMentions: false,
          channelName: 'xqc'
        }
      };
    } catch (error) {
      console.error('Error loading dynamic config, using defaults:', error);
    }
  }

  // Default configuration
  return {
    urls: {
      twitch: 'https://www.twitch.tv/popout/zabariyarin/chat?popout=',
      youtube: 'https://www.youtube.com/live_chat?is_popout=1&v=S6ATuj2NnUU',
      kick: 'https://kick.com/popout/xqc/chat'
    },
    tts: {
      enabled: true,
      voice: 'Microsoft David - English (United States)',
      volume: 1.0,
      rate: 1.0,
      pitch: 1.0,
      announceUsername: true
    },
    filters: {
      excludeCommands: true,
      excludeLinks: true,
      excludeUsers: ['nightbot', 'moobot', 'streamelements', 'streamlabs', 'fossabot'],
      onlyMentions: false,
      channelName: 'xqc'
    }
  };
}

const CONFIG = loadConfig();

// Message queue for sequential TTS
const messageQueue = [];
let isProcessingQueue = false;

/**
 * Validates if message should be spoken based on filters
 */
function shouldSpeak(username, message) {
  const lowerMessage = message.toLowerCase();
  const lowerUsername = username.toLowerCase();

  // Check excluded users
  if (CONFIG.filters.excludeUsers.some(user => lowerUsername === user.toLowerCase())) {
    return false;
  }

  // Check for commands
  if (CONFIG.filters.excludeCommands && message.startsWith('!')) {
    return false;
  }

  // Check for links (simple regex)
  if (CONFIG.filters.excludeLinks) {
    const linkPattern = /(https?:\/\/|www\.)\S+/gi;
    if (linkPattern.test(message)) {
      return false;
    }
  }

  // Check for mentions
  if (CONFIG.filters.onlyMentions) {
    const channelName = CONFIG.filters.channelName.toLowerCase();
    if (!lowerMessage.includes(`@${channelName}`)) {
      return false;
    }
  }

  return true;
}

/**
 * Process message queue sequentially
 */
async function processQueue(page) {
  if (isProcessingQueue || messageQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    const { username, message } = messageQueue.shift();

    try {
      // Speak the message using Web Speech API in browser context
      await page.evaluate(({ text, config }) => {
        return new Promise((resolve) => {
          // Check if speechSynthesis is available
          if (!window.speechSynthesis) {
            console.error('Speech synthesis not available in this browser');
            resolve();
            return;
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.volume = config.volume;
          utterance.rate = config.rate;
          utterance.pitch = config.pitch;

          // Try to find the requested voice
          const voices = window.speechSynthesis.getVoices();
          const selectedVoice = voices.find(v => v.name === config.voice);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          } else if (voices.length > 0) {
            // Use first available voice as fallback
            utterance.voice = voices[0];
            console.log(`Voice "${config.voice}" not found. Using "${voices[0].name}" instead.`);
          }

          utterance.onend = () => resolve();
          utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            resolve();
          };

          window.speechSynthesis.speak(utterance);
        });
      }, {
        text: CONFIG.tts.announceUsername ? `${username} says: ${message}` : message,
        config: CONFIG.tts
      });

      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error('Error speaking message:', error);
    }
  }

  isProcessingQueue = false;
}

/**
 * Add message to TTS queue
 */
function queueMessage(platform, username, message, page) {
  console.log(`${platform.toUpperCase()}:${username}:${message}`);

  if (CONFIG.tts.enabled && shouldSpeak(username, message)) {
    messageQueue.push({ username, message });
    processQueue(page);
  }
}

/**
 * Setup chat monitoring for a platform
 */
async function setupChatMonitoring(page, platform) {
  // Wait for page to load voices
  await page.evaluate(() => {
    return new Promise((resolve) => {
      // Load voices
      window.speechSynthesis.getVoices();

      // Chrome loads voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          resolve();
        };
        // Timeout in case voices are already loaded
        setTimeout(resolve, 1000);
      } else {
        resolve();
      }
    });
  });

  // Log available voices
  const voices = await page.evaluate(() => {
    return window.speechSynthesis.getVoices().map(v => ({
      name: v.name,
      lang: v.lang
    }));
  });
  console.log(`\n${platform.toUpperCase()} - Available voices:`, voices.length);
  if (voices.length > 0) {
    console.log('First 5 voices:', voices.slice(0, 5));
  }

  // Platform-specific selectors
  const selectors = {
    twitch: {
      container: 'body',
      messageSelector: '[data-a-target="chat-line-message"]',
      usernameSelector: '[data-a-target="chat-message-username"]',
      messageBodySelector: '[data-a-target="chat-line-message-body"]'
    },
    youtube: {
      container: 'body',
      messageSelector: 'yt-live-chat-text-message-renderer',
      usernameSelector: '#author-name',
      messageBodySelector: '#message'
    },
    kick: {
      container: '[id*="channel-chatroom"]',
      messageSelector: '.chat-entry',
      usernameSelector: 'button',
      messageBodySelector: null // Extract from full text
    }
  };

  const config = selectors[platform];

  await page.evaluate(({ config, platform }) => {
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
                let username = '';
                let message = '';

                if (platform === 'kick') {
                  // Kick requires special handling
                  const usernameButton = element.querySelector(config.usernameSelector);
                  if (usernameButton) {
                    username = usernameButton.textContent.trim();
                  }

                  const fullText = element.textContent.trim();
                  const usernameIndex = fullText.lastIndexOf(username + ':');
                  if (usernameIndex !== -1) {
                    message = fullText.substring(usernameIndex + username.length + 1).trim();
                  }
                } else {
                  // Twitch and YouTube
                  const usernameEl = element.querySelector(config.usernameSelector);
                  const messageEl = element.querySelector(config.messageBodySelector);

                  if (usernameEl && messageEl) {
                    username = usernameEl.textContent.trim();
                    message = messageEl.textContent.trim();
                  }
                }

                if (username && message) {
                  console.log(`${platform}:${username}:${message}`);
                }
              } catch (err) {
                // Silently ignore parsing errors
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
      console.log(`${platform} observer started`);
    } else {
      console.error(`${platform} container not found`);
    }
  }, { config, platform });

  // Listen for console messages from the page
  page.on('console', async (msg) => {
    const text = msg.text();

    // Parse platform-specific chat messages
    const match = text.match(/^(twitch|youtube|kick):(.+?):(.+)$/);
    if (match) {
      const [, msgPlatform, username, message] = match;
      if (msgPlatform === platform) {
        queueMessage(platform, username, message, page);
      }
    }
  });
}

/**
 * Main function
 */
async function main() {
  console.log('Starting multi-platform chat logger with Web Speech API TTS...\n');
  console.log('Configuration:', JSON.stringify(CONFIG, null, 2));

  // Write PID file for process management
  const pidPath = path.join(__dirname, 'chat-logger.pid');
  fs.writeFileSync(pidPath, process.pid.toString());

  const browser = await chromium.launch({
    headless: false,
    args: ['--enable-speech-dispatcher'] // Enable speech on Linux
  });

  const context = await browser.newContext();

  console.log('\nNavigating to chat pages...');

  const pages = {};
  const enabledPlatforms = Object.keys(CONFIG.urls);

  // Create and navigate pages only for enabled platforms
  for (const platform of enabledPlatforms) {
    const page = await context.newPage();
    await page.goto(CONFIG.urls[platform]);
    pages[platform] = page;
    console.log(`Opened ${platform} chat`);
  }

  console.log('Pages loaded. Waiting for chat elements...\n');

  // Wait a bit for pages to load
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Setup monitoring for each enabled platform
  for (const platform of enabledPlatforms) {
    await setupChatMonitoring(pages[platform], platform);
  }

  console.log('\nMonitoring active chats. TTS is', CONFIG.tts.enabled ? 'ENABLED' : 'DISABLED');
  console.log('Enabled platforms:', enabledPlatforms.join(', '));
  console.log('Press Ctrl+C to stop.\n');

  // Keep the script running
  await new Promise(() => {});
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  // Clean up PID file
  const pidPath = path.join(__dirname, 'chat-logger.pid');
  if (fs.existsSync(pidPath)) {
    fs.unlinkSync(pidPath);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down...');
  // Clean up PID file
  const pidPath = path.join(__dirname, 'chat-logger.pid');
  if (fs.existsSync(pidPath)) {
    fs.unlinkSync(pidPath);
  }
  process.exit(0);
});

// Run the main function
main().catch(console.error);
