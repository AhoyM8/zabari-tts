const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * TikTok Chat Client using Playwright
 * Uses browser automation with polling to monitor chat
 * Note: Requires session file from tiktok-login script
 */
class TikTokChatClient {
  constructor(options) {
    this.channelName = options.channelName; // TikTok username
    this.onMessage = options.onMessage;
    this.onError = options.onError || console.error;
    this.ttsConfig = options.ttsConfig; // TTS configuration
    this.browser = null;
    this.page = null;
    this.pollInterval = null;
    this.processedIndexes = new Set();
    this.connected = false;
    this.messageQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Connect to TikTok live stream and start monitoring chat
   */
  async connect() {
    try {
      // Load TikTok session
      const sessionPath = path.join(process.cwd(), 'tiktok_session.json');
      let sessionData;

      try {
        const sessionFile = await fs.readFile(sessionPath, 'utf8');
        sessionData = JSON.parse(sessionFile);
      } catch (error) {
        throw new Error('TikTok session not found - Run npm run tiktok:login first');
      }

      // Launch browser
      // Note: Don't use 'channel: chrome' as it requires system Chrome
      // which may not be available in packaged builds. Use bundled Chromium instead.
      this.browser = await chromium.launch({
        headless: false
      });

      const context = await this.browser.newContext({
        viewport: null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      // Restore session
      await context.addCookies(sessionData.cookies);
      await context.addInitScript(() => {
        delete Object.getPrototypeOf(navigator).webdriver;
      });

      this.page = await context.newPage();

      // Restore storage
      await this.page.addInitScript((storageData) => {
        for (const [key, value] of Object.entries(storageData.localStorage)) {
          window.localStorage.setItem(key, value);
        }
        for (const [key, value] of Object.entries(storageData.sessionStorage)) {
          window.sessionStorage.setItem(key, value);
        }
      }, sessionData);

      // Navigate to TikTok live stream
      const url = `https://www.tiktok.com/@${this.channelName}/live`;
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Wait for chat to load
      await this.page.waitForTimeout(10000);

      // Get initial messages to skip
      const initialMessages = await this.page.evaluate(() => {
        const messages = document.querySelectorAll('div.w-full.pt-4[data-index]');
        return Array.from(messages).map((el) => el.getAttribute('data-index'));
      });

      initialMessages.forEach((index) => this.processedIndexes.add(index));
      console.log(`TikTok: Skipping ${initialMessages.length} existing messages`);

      // Start polling for new messages every 3 seconds
      this.pollInterval = setInterval(async () => {
        try {
          await this.pollMessages();
        } catch (error) {
          this.onError('Error polling TikTok messages:', error);
        }
      }, 3000);

      this.connected = true;
      console.log(`Connected to TikTok channel: ${this.channelName}`);

    } catch (error) {
      this.onError('Failed to connect to TikTok:', error);
      throw error;
    }
  }

  /**
   * Poll for new chat messages
   */
  async pollMessages() {
    if (!this.page) return;

    const newMessages = await this.page.evaluate(() => {
      const messages = document.querySelectorAll('div.w-full.pt-4[data-index]');
      const results = [];

      messages.forEach((el) => {
        const dataIndex = el.getAttribute('data-index');
        const innerText = el.innerText || '';

        // Split by newline: first line is username, rest is message
        const lines = innerText.split('\n');
        if (lines.length >= 2) {
          const username = lines[0].trim();
          const message = lines.slice(1).join('\n').trim();

          results.push({
            dataIndex,
            username,
            message,
          });
        }
      });

      return results;
    });

    // Process only new messages
    newMessages.forEach((msg) => {
      if (!this.processedIndexes.has(msg.dataIndex) && msg.username && msg.message) {
        this.processedIndexes.add(msg.dataIndex);
        this.onMessage('tiktok', msg.username, msg.message);

        // Queue message for TTS if enabled
        if (this.ttsConfig && this.shouldSpeak(msg.username, msg.message)) {
          this.queueMessage(msg.username, msg.message);
        }
      }
    });
  }

  /**
   * Detect if text is primarily Hebrew or English
   * @param {string} text - Text to analyze
   * @returns {string} - 'hebrew' or 'english'
   */
  detectLanguage(text) {
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
   * Check if message should be spoken based on filters
   */
  shouldSpeak(username, message) {
    if (!this.ttsConfig) return false;

    const lowerMessage = message.toLowerCase();
    const lowerUsername = username.toLowerCase();

    // Check excluded users
    if (this.ttsConfig.excludeUsers && this.ttsConfig.excludeUsers.some(user => lowerUsername === user.toLowerCase())) {
      return false;
    }

    // Check for commands
    if (this.ttsConfig.excludeCommands && message.startsWith('!')) {
      return false;
    }

    // Check for links
    if (this.ttsConfig.excludeLinks) {
      const linkPattern = /(https?:\/\/|www\.)\S+/gi;
      if (linkPattern.test(message)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Queue message for TTS
   */
  queueMessage(username, message) {
    this.messageQueue.push({ username, message });
    this.processQueue();
  }

  /**
   * Process TTS queue
   */
  async processQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0 || !this.page) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const { username, message } = this.messageQueue.shift();

      try {
        // Check if auto-detect language is enabled
        if (this.ttsConfig.autoDetectLanguage) {
          // Detect language separately for username and message
          const usernameLanguage = this.detectLanguage(username);
          const messageLanguage = this.detectLanguage(message);

          console.log(`[TikTok] Language detection: username="${username}" (${usernameLanguage}), message="${message}" (${messageLanguage})`);

          if (this.ttsConfig.announceUsername) {
            // Speak username with appropriate voice
            await this.page.evaluate(({ text, voiceName, config }) => {
              return new Promise((resolve) => {
                if (!window.speechSynthesis) {
                  resolve();
                  return;
                }

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.volume = config.volume || 1.0;
                utterance.rate = config.rate || 1.0;
                utterance.pitch = config.pitch || 1.0;

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
              voiceName: usernameLanguage === 'hebrew' ? this.ttsConfig.hebrewVoice : this.ttsConfig.englishVoice,
              config: this.ttsConfig
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            // Speak "says:" in English
            await this.page.evaluate(({ text, voiceName, config }) => {
              return new Promise((resolve) => {
                if (!window.speechSynthesis) {
                  resolve();
                  return;
                }

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.volume = config.volume || 1.0;
                utterance.rate = config.rate || 1.0;
                utterance.pitch = config.pitch || 1.0;

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
              voiceName: this.ttsConfig.englishVoice,
              config: this.ttsConfig
            });

            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Speak message with appropriate voice
          await this.page.evaluate(({ text, voiceName, config }) => {
            return new Promise((resolve) => {
              if (!window.speechSynthesis) {
                resolve();
                return;
              }

              const utterance = new SpeechSynthesisUtterance(text);
              utterance.volume = config.volume || 1.0;
              utterance.rate = config.rate || 1.0;
              utterance.pitch = config.pitch || 1.0;

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
            voiceName: messageLanguage === 'hebrew' ? this.ttsConfig.hebrewVoice : this.ttsConfig.englishVoice,
            config: this.ttsConfig
          });

        } else {
          // Original behavior: use single voice
          const textToSpeak = this.ttsConfig.announceUsername
            ? `${username} says: ${message}`
            : message;

          await this.page.evaluate(({ text, config }) => {
            return new Promise((resolve) => {
              if (!window.speechSynthesis) {
                console.error('Speech synthesis not available');
                resolve();
                return;
              }

              const utterance = new SpeechSynthesisUtterance(text);
              utterance.volume = config.volume || 1.0;
              utterance.rate = config.rate || 1.0;
              utterance.pitch = config.pitch || 1.0;

              const voices = window.speechSynthesis.getVoices();
              const selectedVoice = voices.find(v => v.name === config.voice);
              if (selectedVoice) {
                utterance.voice = selectedVoice;
              } else if (voices.length > 0) {
                utterance.voice = voices[0];
              }

              utterance.onend = () => resolve();
              utterance.onerror = (error) => {
                console.error('Speech synthesis error:', error);
                resolve();
              };

              window.speechSynthesis.speak(utterance);
            });
          }, { text: textToSpeak, config: this.ttsConfig });
        }

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error('[TikTok TTS] Error speaking message:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Disconnect from TikTok chat
   */
  async disconnect() {
    // Clear polling interval
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Clear TTS queue
    this.messageQueue = [];
    this.isProcessingQueue = false;

    // Close browser
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        console.log('Disconnected from TikTok');
      } catch (error) {
        this.onError('Error disconnecting from TikTok:', error);
      }
    }

    this.connected = false;
    this.processedIndexes.clear();
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.browser && this.page;
  }
}

module.exports = TikTokChatClient;
