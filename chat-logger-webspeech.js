const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { buildUrlsFromPlatforms } = require('./lib/url-builder');

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

      // Build URLs object from platforms using the URL builder utility
      const urls = buildUrlsFromPlatforms(dynamicConfig.platforms || {});

      return {
        urls,
        ttsEngine: dynamicConfig.ttsEngine || 'webspeech',
        tts: {
          enabled: true,
          voice: dynamicConfig.ttsConfig?.voice || 'Microsoft David - English (United States)',
          autoDetectLanguage: dynamicConfig.ttsConfig?.autoDetectLanguage ?? false,
          englishVoice: dynamicConfig.ttsConfig?.englishVoice || 'Microsoft David - English (United States)',
          hebrewVoice: dynamicConfig.ttsConfig?.hebrewVoice || 'Microsoft David - English (United States)',
          volume: dynamicConfig.ttsConfig?.volume || 1.0,
          rate: dynamicConfig.ttsConfig?.rate || 1.0,
          pitch: dynamicConfig.ttsConfig?.pitch || 1.0,
          announceUsername: dynamicConfig.ttsConfig?.announceUsername ?? true
        },
        kokoro: {
          voice: dynamicConfig.ttsConfig?.voice || 'af_heart',
          speed: dynamicConfig.ttsConfig?.speed || 1.0,
          serverUrl: dynamicConfig.ttsConfig?.serverUrl || 'http://localhost:8766'
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

  // Default configuration using URL builder
  const defaultPlatforms = {
    twitch: { enabled: true, username: 'zabariyarin' },
    youtube: { enabled: true, videoId: 'zabariyarin' }, // Can be video ID or @username
    kick: { enabled: true, username: 'zabariyarin' }
  };

  return {
    urls: buildUrlsFromPlatforms(defaultPlatforms),
    ttsEngine: 'webspeech',
    tts: {
      enabled: true,
      voice: 'Microsoft David - English (United States)',
      autoDetectLanguage: false,
      englishVoice: 'Microsoft David - English (United States)',
      hebrewVoice: 'Microsoft David - English (United States)',
      volume: 1.0,
      rate: 1.0,
      pitch: 1.0,
      announceUsername: true
    },
    kokoro: {
      voice: 'af_heart',
      speed: 1.0,
      serverUrl: 'http://localhost:8766'
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
 * Detect if text is primarily Hebrew or English
 * @param {string} text - Text to analyze
 * @returns {string} - 'hebrew' or 'english'
 */
function detectLanguage(text) {
  // Hebrew Unicode range: \u0590-\u05FF
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  // Latin characters (English)
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;

  const totalChars = hebrewChars + latinChars;

  // If less than 30% are identifiable characters, default to English
  if (totalChars === 0) return 'english';

  // If more than 30% Hebrew characters, consider it Hebrew
  const hebrewRatio = hebrewChars / totalChars;
  return hebrewRatio > 0.3 ? 'hebrew' : 'english';
}

/**
 * Synthesize text using Kokoro TTS server and play it in the browser
 */
async function synthesizeWithKokoro(text, page) {
  const http = require('http');
  const url = require('url');

  return new Promise((resolve, reject) => {
    try {
      console.log(`[Kokoro TTS] Synthesizing: "${text}"`);

      const serverUrl = new url.URL(`${CONFIG.kokoro.serverUrl}/synthesize`);
      const postData = JSON.stringify({
        text: text,
        voice: CONFIG.kokoro.voice,
        speed: CONFIG.kokoro.speed
      });

      const options = {
        hostname: serverUrl.hostname,
        port: serverUrl.port || 8766,
        path: serverUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = [];

        res.on('data', (chunk) => {
          data.push(chunk);
        });

        res.on('end', async () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('[Kokoro TTS] Synthesis completed, playing audio...');

            // Convert buffer to base64
            const audioBuffer = Buffer.concat(data);
            const audioBase64 = audioBuffer.toString('base64');

            // Play audio in the browser
            try {
              await page.evaluate((base64Audio) => {
                return new Promise((audioResolve) => {
                  const audio = new Audio('data:audio/wav;base64,' + base64Audio);
                  audio.volume = 1.0;
                  audio.onended = () => audioResolve();
                  audio.onerror = () => audioResolve(); // Continue even if error
                  audio.play().catch(() => audioResolve());
                });
              }, audioBase64);

              console.log('[Kokoro TTS] Audio playback finished');
              resolve();
            } catch (playError) {
              console.error('[Kokoro TTS] Playback error:', playError.message);
              resolve(); // Continue even if playback fails
            }
          } else {
            reject(new Error(`Kokoro server returned ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('[Kokoro TTS] Request error:', error.message);
        reject(error);
      });

      req.write(postData);
      req.end();

    } catch (error) {
      console.error('[Kokoro TTS] Synthesis error:', error.message);
      reject(error);
    }
  });
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
      // Check if using Kokoro TTS (with hybrid Hebrew/English support)
      if (CONFIG.ttsEngine === 'kokoro') {
        console.log('[Hybrid TTS DEBUG] ========================================');
        console.log('[Hybrid TTS DEBUG] Processing message in Playwright mode');
        console.log('[Hybrid TTS DEBUG] Username:', username);
        console.log('[Hybrid TTS DEBUG] Message:', message);
        console.log('[Hybrid TTS DEBUG] Config:', {
          hebrewVoice: CONFIG.tts.hebrewVoice,
          englishVoice: CONFIG.tts.englishVoice,
          announceUsername: CONFIG.tts.announceUsername
        });

        // Detect language separately for username and message for hybrid routing
        const usernameLanguage = detectLanguage(username);
        const messageLanguage = detectLanguage(message);

        console.log(`Hybrid TTS: username="${username}" (${usernameLanguage}), message="${message}" (${messageLanguage})`);

        // OPTIMIZATION: If both username and message are English, use Kokoro for entire text
        if (usernameLanguage === 'english' && messageLanguage === 'english') {
          console.log('[Hybrid TTS] Both username and message are English - using Kokoro for entire text');
          const fullText = CONFIG.tts.announceUsername ? `${username} says: ${message}` : message;
          console.log('[Hybrid TTS DEBUG] Full text:', fullText);
          await synthesizeWithKokoro(fullText, page);
          console.log('[Hybrid TTS DEBUG] English synthesis completed');
        } else {
          // At least one part is Hebrew - use hybrid mode
          console.log('[Hybrid TTS] Using hybrid mode (at least one part is Hebrew)');

          if (CONFIG.tts.announceUsername) {
            // Speak username - Hebrew uses Web Speech, English uses Kokoro
            if (usernameLanguage === 'hebrew') {
              await page.evaluate(({ text, voiceName, config }) => {
                return new Promise((resolve) => {
                  if (!window.speechSynthesis) {
                    resolve();
                    return;
                  }

                  const utterance = new SpeechSynthesisUtterance(text);
                  utterance.volume = config.volume;
                  utterance.rate = config.rate;
                  utterance.pitch = config.pitch;

                  const voices = window.speechSynthesis.getVoices();
                  const selectedVoice = voices.find(v => v.name === voiceName);
                  if (selectedVoice) {
                    utterance.voice = selectedVoice;
                  }

                  utterance.onend = () => resolve();
                  utterance.onerror = () => resolve();

                  window.speechSynthesis.speak(utterance);
                });
              }, {
                text: username,
                voiceName: CONFIG.tts.hebrewVoice,
                config: CONFIG.tts
              });
            } else {
              // English username - use Kokoro
              await synthesizeWithKokoro(username, page);
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            // Speak "says:" - always use Web Speech for this bridge word
            await page.evaluate(({ text, voiceName, config }) => {
              return new Promise((resolve) => {
                if (!window.speechSynthesis) {
                  resolve();
                  return;
                }

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.volume = config.volume;
                utterance.rate = config.rate;
                utterance.pitch = config.pitch;

                const voices = window.speechSynthesis.getVoices();
                const selectedVoice = voices.find(v => v.name === voiceName);
                if (selectedVoice) {
                  utterance.voice = selectedVoice;
                }

                utterance.onend = () => resolve();
                utterance.onerror = () => resolve();

                window.speechSynthesis.speak(utterance);
              });
            }, {
              text: 'says:',
              voiceName: CONFIG.tts.englishVoice,
              config: CONFIG.tts
            });

            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Speak message - Hebrew uses Web Speech, English uses Kokoro
          console.log('[Hybrid TTS DEBUG] About to speak message...');
          if (messageLanguage === 'hebrew') {
            console.log('[Hybrid TTS DEBUG] Using Web Speech for Hebrew message');
            console.log('[Hybrid TTS DEBUG] Message text:', message);
            console.log('[Hybrid TTS DEBUG] Hebrew voice:', CONFIG.tts.hebrewVoice);

            await page.evaluate(({ text, voiceName, config }) => {
              return new Promise((resolve) => {
                console.log('[Hybrid TTS DEBUG Browser] synthesizeWithWebSpeech called for:', text);

                if (!window.speechSynthesis) {
                  console.error('[Hybrid TTS DEBUG Browser] speechSynthesis not available!');
                  resolve();
                  return;
                }

                console.log('[Hybrid TTS DEBUG Browser] Creating utterance...');
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.volume = config.volume;
                utterance.rate = config.rate;
                utterance.pitch = config.pitch;

                console.log('[Hybrid TTS DEBUG Browser] Utterance settings:', {
                  volume: utterance.volume,
                  rate: utterance.rate,
                  pitch: utterance.pitch,
                  text: utterance.text
                });

                const voices = window.speechSynthesis.getVoices();
                console.log('[Hybrid TTS DEBUG Browser] Available voices:', voices.length);

                const selectedVoice = voices.find(v => v.name === voiceName);
                if (selectedVoice) {
                  console.log('[Hybrid TTS DEBUG Browser] Selected voice:', selectedVoice.name, selectedVoice.lang);
                  utterance.voice = selectedVoice;
                } else {
                  console.warn('[Hybrid TTS DEBUG Browser] Voice not found:', voiceName);
                  console.log('[Hybrid TTS DEBUG Browser] Available voice names:', voices.map(v => v.name).slice(0, 5));
                }

                utterance.onstart = () => {
                  console.log('[Hybrid TTS DEBUG Browser] Web Speech started speaking:', text);
                };

                utterance.onend = () => {
                  console.log('[Hybrid TTS DEBUG Browser] Web Speech finished speaking:', text);
                  resolve();
                };

                utterance.onerror = (error) => {
                  console.error('[Hybrid TTS DEBUG Browser] Web Speech error:', error);
                  resolve();
                };

                console.log('[Hybrid TTS DEBUG Browser] Calling speechSynthesis.speak()...');
                window.speechSynthesis.speak(utterance);
                console.log('[Hybrid TTS DEBUG Browser] speechSynthesis.speak() called');
              });
            }, {
              text: message,
              voiceName: CONFIG.tts.hebrewVoice,
              config: CONFIG.tts
            });

            console.log('[Hybrid TTS DEBUG] Hebrew message synthesis completed');
          } else {
            console.log('[Hybrid TTS DEBUG] Using Kokoro for English message');
            console.log('[Hybrid TTS DEBUG] Message text:', message);
            // English message - use Kokoro
            await synthesizeWithKokoro(message, page);
            console.log('[Hybrid TTS DEBUG] English message synthesis completed');
          }
        }

        console.log('[Hybrid TTS DEBUG] ========================================');

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));

      } else if (CONFIG.tts.autoDetectLanguage) {
        // Detect language separately for username and message
        const usernameLanguage = detectLanguage(username);
        const messageLanguage = detectLanguage(message);

        console.log(`Language detection: username="${username}" (${usernameLanguage}), message="${message}" (${messageLanguage})`);

        if (CONFIG.tts.announceUsername) {
          // Speak username with appropriate voice
          await page.evaluate(({ text, voiceName, config }) => {
            return new Promise((resolve) => {
              if (!window.speechSynthesis) {
                resolve();
                return;
              }

              const utterance = new SpeechSynthesisUtterance(text);
              utterance.volume = config.volume;
              utterance.rate = config.rate;
              utterance.pitch = config.pitch;

              const voices = window.speechSynthesis.getVoices();
              const selectedVoice = voices.find(v => v.name === voiceName);
              if (selectedVoice) {
                utterance.voice = selectedVoice;
              }

              utterance.onend = () => resolve();
              utterance.onerror = () => resolve();

              window.speechSynthesis.speak(utterance);
            });
          }, {
            text: username,
            voiceName: usernameLanguage === 'hebrew' ? CONFIG.tts.hebrewVoice : CONFIG.tts.englishVoice,
            config: CONFIG.tts
          });

          await new Promise(resolve => setTimeout(resolve, 100));

          // Speak "says:" in English
          await page.evaluate(({ text, voiceName, config }) => {
            return new Promise((resolve) => {
              if (!window.speechSynthesis) {
                resolve();
                return;
              }

              const utterance = new SpeechSynthesisUtterance(text);
              utterance.volume = config.volume;
              utterance.rate = config.rate;
              utterance.pitch = config.pitch;

              const voices = window.speechSynthesis.getVoices();
              const selectedVoice = voices.find(v => v.name === voiceName);
              if (selectedVoice) {
                utterance.voice = selectedVoice;
              }

              utterance.onend = () => resolve();
              utterance.onerror = () => resolve();

              window.speechSynthesis.speak(utterance);
            });
          }, {
            text: 'says:',
            voiceName: CONFIG.tts.englishVoice,
            config: CONFIG.tts
          });

          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Speak message with appropriate voice
        await page.evaluate(({ text, voiceName, config }) => {
          return new Promise((resolve) => {
            if (!window.speechSynthesis) {
              resolve();
              return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.volume = config.volume;
            utterance.rate = config.rate;
            utterance.pitch = config.pitch;

            const voices = window.speechSynthesis.getVoices();
            const selectedVoice = voices.find(v => v.name === voiceName);
            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }

            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();

            window.speechSynthesis.speak(utterance);
          });
        }, {
          text: message,
          voiceName: messageLanguage === 'hebrew' ? CONFIG.tts.hebrewVoice : CONFIG.tts.englishVoice,
          config: CONFIG.tts
        });

      } else {
        // Original behavior: use single voice
        await page.evaluate(({ text, config }) => {
          return new Promise((resolve) => {
            if (!window.speechSynthesis) {
              console.error('Speech synthesis not available in this browser');
              resolve();
              return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.volume = config.volume;
            utterance.rate = config.rate;
            utterance.pitch = config.pitch;

            const voices = window.speechSynthesis.getVoices();
            const selectedVoice = voices.find(v => v.name === config.voice);
            if (selectedVoice) {
              utterance.voice = selectedVoice;
            } else if (voices.length > 0) {
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
      }

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
      container: 'body',
      messageSelector: 'div[data-index]', // Kick uses virtualized list with data-index
      usernameSelector: 'button.inline.font-bold',
      messageBodySelector: 'span:last-child' // Message is in the last span
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
                  // Kick structure: button contains username, last span contains message
                  const usernameButton = element.querySelector(config.usernameSelector);
                  const messageSpan = element.querySelector(config.messageBodySelector);

                  if (usernameButton && messageSpan) {
                    username = usernameButton.textContent.trim();
                    message = messageSpan.textContent.trim();

                    // Filter out empty messages and timestamps
                    if (message && message !== ':' && !message.match(/^\d{2}:\d{2}/) && message.length > 0) {
                      console.log(`${platform}:${username}:${message}`);
                    }
                  }
                } else {
                  // Twitch and YouTube
                  const usernameEl = element.querySelector(config.usernameSelector);
                  const messageEl = element.querySelector(config.messageBodySelector);

                  if (usernameEl && messageEl) {
                    username = usernameEl.textContent.trim();
                    message = messageEl.textContent.trim();

                    if (username && message) {
                      console.log(`${platform}:${username}:${message}`);
                    }
                  }
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
    headless: false, // MUST be false for Web Speech API to produce audio!
    args: [
      '--enable-speech-dispatcher', // Enable speech on Linux
      '--autoplay-policy=no-user-gesture-required' // Allow audio autoplay
    ]
  });

  const context = await browser.newContext();

  console.log('\nNavigating to chat pages...');

  const pages = {};
  const enabledPlatforms = Object.keys(CONFIG.urls);

  // Create and navigate pages only for enabled platforms
  for (const platform of enabledPlatforms) {
    const page = await context.newPage();
    const url = CONFIG.urls[platform];
    await page.goto(url);

    // Special handling for YouTube channels (not direct video URLs)
    if (platform === 'youtube' && url.includes('youtube.com/@')) {
      console.log('YouTube channel detected. Navigating to live stream...');

      try {
        // Wait for page to load
        await page.waitForTimeout(3000);

        // Look for live stream - try multiple selectors
        const liveSelectors = [
          'a[href*="/watch?v="] ytd-thumbnail-overlay-time-status-renderer[overlay-style="LIVE"]',
          'ytd-video-renderer:has-text("LIVE")',
          'ytd-grid-video-renderer:has-text("LIVE")',
          'a:has-text("LIVE")'
        ];

        let liveStreamFound = false;

        for (const selector of liveSelectors) {
          try {
            const liveElement = await page.locator(selector).first();
            if (await liveElement.isVisible({ timeout: 2000 })) {
              // Found the live stream, get the link
              const videoLink = await liveElement.locator('xpath=ancestor::a[contains(@href, "/watch?v=")]').first();
              const href = await videoLink.getAttribute('href');

              if (href) {
                // Extract video ID
                const match = href.match(/[?&]v=([^&]+)/);
                if (match && match[1]) {
                  const videoId = match[1];
                  console.log(`Found live video ID: ${videoId}`);

                  // Navigate to live chat
                  const chatUrl = `https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`;
                  await page.goto(chatUrl);
                  console.log(`Navigated to live chat: ${chatUrl}`);
                  liveStreamFound = true;
                  break;
                }
              }
            }
          } catch (e) {
            // Try next selector
            continue;
          }
        }

        if (!liveStreamFound) {
          console.log('Warning: Could not find live stream on channel. Chat monitoring may not work.');
        }

      } catch (error) {
        console.error('Error navigating to YouTube live stream:', error.message);
        console.log('Continuing with channel page...');
      }
    }

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
