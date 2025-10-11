const Pusher = require('pusher-js');

/**
 * Kick Chat Client using Pusher WebSockets
 * Direct WebSocket connection without Playwright
 */
class KickChatClient {
  constructor(options) {
    this.channelName = options.channelName;
    this.onMessage = options.onMessage;
    this.onError = options.onError || console.error;
    this.pusher = null;
    this.channel = null;
    this.chatroomId = null;
  }

  /**
   * Fetch chatroom ID from Kick API
   */
  async getChatroomId() {
    try {
      const response = await fetch(`https://kick.com/api/v2/channels/${this.channelName}`);

      if (!response.ok) {
        throw new Error(`Kick API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.chatroom || !data.chatroom.id) {
        throw new Error('Chatroom ID not found in API response');
      }

      return data.chatroom.id;
    } catch (error) {
      this.onError('Failed to fetch Kick chatroom ID:', error);
      throw error;
    }
  }

  /**
   * Connect to Kick chat via Pusher WebSocket
   */
  async connect() {
    try {
      // Get chatroom ID
      this.chatroomId = await this.getChatroomId();
      console.log(`Kick chatroom ID: ${this.chatroomId}`);

      // Initialize Pusher client with Kick's credentials
      this.pusher = new Pusher('32cbd69e4b950bf97679', {
        cluster: 'us2',
        encrypted: true,
      });

      // Subscribe to chatroom channel
      this.channel = this.pusher.subscribe(`chatrooms.${this.chatroomId}.v2`);

      // Handle chat messages
      this.channel.bind('App\\Events\\ChatMessageEvent', (data) => {
        try {
          const username = data.sender?.username || 'Unknown';
          const message = data.content || '';

          if (username && message) {
            this.onMessage('kick', username, message);
          }
        } catch (error) {
          this.onError('Error processing Kick message:', error);
        }
      });

      // Handle connection state
      this.pusher.connection.bind('connected', () => {
        console.log(`Connected to Kick channel: ${this.channelName}`);
      });

      this.pusher.connection.bind('error', (error) => {
        this.onError('Kick Pusher connection error:', error);
      });

      this.pusher.connection.bind('disconnected', () => {
        console.log('Disconnected from Kick');
      });

    } catch (error) {
      this.onError('Failed to connect to Kick:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kick chat
   */
  async disconnect() {
    if (this.channel) {
      this.pusher.unsubscribe(this.channel.name);
    }

    if (this.pusher) {
      this.pusher.disconnect();
    }

    console.log('Disconnected from Kick');
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.pusher && this.pusher.connection.state === 'connected';
  }
}

module.exports = KickChatClient;
