const tmi = require('tmi.js');

/**
 * Twitch Chat Client using TMI.js
 * Direct IRC connection without Playwright
 */
class TwitchChatClient {
  constructor(options) {
    this.channelName = options.channelName;
    this.onMessage = options.onMessage;
    this.onError = options.onError || console.error;
    this.client = null;
  }

  /**
   * Connect to Twitch IRC chat
   */
  async connect() {
    try {
      this.client = new tmi.Client({
        connection: {
          secure: true,
          reconnect: true,
        },
        channels: [this.channelName],
      });

      // Handle incoming messages
      this.client.on('message', (channel, tags, message, self) => {
        if (self) return; // Ignore own messages

        const username = tags['display-name'] || tags.username;
        this.onMessage('twitch', username, message);
      });

      // Handle connection errors
      this.client.on('error', (error) => {
        this.onError('Twitch connection error:', error);
      });

      // Handle disconnections
      this.client.on('disconnected', (reason) => {
        console.log('Twitch disconnected:', reason);
      });

      // Connect to IRC
      await this.client.connect();
      console.log(`Connected to Twitch channel: ${this.channelName}`);

    } catch (error) {
      this.onError('Failed to connect to Twitch:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Twitch IRC
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.disconnect();
        console.log('Disconnected from Twitch');
      } catch (error) {
        this.onError('Error disconnecting from Twitch:', error);
      }
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.client && this.client.readyState() === 'OPEN';
  }
}

module.exports = TwitchChatClient;
