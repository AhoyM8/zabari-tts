/**
 * YouTube Live Chat Client using YouTube Data API v3
 * Requires API key for polling live chat messages
 */
class YouTubeChatClient {
  constructor(options) {
    this.videoId = options.videoId;
    this.apiKey = options.apiKey;
    this.onMessage = options.onMessage;
    this.onError = options.onError || console.error;
    this.liveChatId = null;
    this.pageToken = null;
    this.pollInterval = null;
    this.pollingDelay = options.pollingDelay || 2000; // 2 seconds default
    this.processedMessageIds = new Set();
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  static extractVideoId(url) {
    // Handle direct video IDs
    if (!/https?:\/\//.test(url)) {
      return url;
    }

    // Handle various YouTube URL formats
    const patterns = [
      /[?&]v=([^&]+)/, // Regular watch URLs
      /youtu\.be\/([^?]+)/, // Shortened URLs
      /embed\/([^?]+)/, // Embed URLs
      /live_chat\?.*v=([^&]+)/, // Live chat URLs
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    throw new Error('Could not extract video ID from URL');
  }

  /**
   * Get live chat ID from video
   */
  async getLiveChatId() {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${this.videoId}&key=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`YouTube API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found or not a live stream');
      }

      const liveChatId = data.items[0]?.liveStreamingDetails?.activeLiveChatId;

      if (!liveChatId) {
        throw new Error('No active live chat found for this video');
      }

      return liveChatId;
    } catch (error) {
      this.onError('Failed to get YouTube live chat ID:', error);
      throw error;
    }
  }

  /**
   * Poll for new chat messages
   */
  async pollMessages() {
    try {
      let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${this.liveChatId}&part=snippet,authorDetails&key=${this.apiKey}`;

      if (this.pageToken) {
        url += `&pageToken=${this.pageToken}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`YouTube API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      // Process new messages
      if (data.items) {
        data.items.forEach(item => {
          const messageId = item.id;

          // Skip if already processed (prevents duplicates)
          if (this.processedMessageIds.has(messageId)) {
            return;
          }

          this.processedMessageIds.add(messageId);

          // Clean up old message IDs (keep last 1000)
          if (this.processedMessageIds.size > 1000) {
            const firstId = this.processedMessageIds.values().next().value;
            this.processedMessageIds.delete(firstId);
          }

          const username = item.authorDetails.displayName;
          const message = item.snippet.displayMessage;

          if (username && message) {
            this.onMessage('youtube', username, message);
          }
        });
      }

      // Update page token for next poll
      this.pageToken = data.nextPageToken;

      // Update polling interval based on API response
      if (data.pollingIntervalMillis) {
        this.pollingDelay = data.pollingIntervalMillis;
      }

    } catch (error) {
      this.onError('Error polling YouTube messages:', error);
    }
  }

  /**
   * Connect to YouTube live chat
   */
  async connect() {
    try {
      if (!this.apiKey) {
        throw new Error('YouTube API key is required. Get one from https://console.cloud.google.com/');
      }

      // Get live chat ID
      this.liveChatId = await this.getLiveChatId();
      console.log(`YouTube live chat ID: ${this.liveChatId}`);

      // Start polling for messages
      this.pollInterval = setInterval(() => {
        this.pollMessages();
      }, this.pollingDelay);

      // Initial poll
      await this.pollMessages();

      console.log(`Connected to YouTube video: ${this.videoId}`);

    } catch (error) {
      this.onError('Failed to connect to YouTube:', error);
      throw error;
    }
  }

  /**
   * Disconnect from YouTube live chat
   */
  async disconnect() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.processedMessageIds.clear();
    console.log('Disconnected from YouTube');
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.pollInterval !== null;
  }
}

module.exports = YouTubeChatClient;
