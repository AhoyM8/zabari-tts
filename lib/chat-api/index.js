const TwitchChatClient = require('./twitch-client');
const YouTubeChatClient = require('./youtube-client');
const KickChatClient = require('./kick-client');
const { getMessageBuffer } = require('./message-buffer');

/**
 * Central module for managing chat API clients
 */

// Store active clients
let activeClients = {
  twitch: null,
  youtube: null,
  kick: null,
};

/**
 * Initialize chat clients based on configuration
 */
async function initializeChatClients(config) {
  const { platforms, ttsConfig, onMessage, youtubeApiKey } = config;
  const clients = [];

  // Helper to handle messages and apply filters
  const handleMessage = (platform, username, message) => {
    // Apply filters
    if (shouldFilterMessage(username, message, ttsConfig)) {
      return;
    }

    // Add to message buffer
    const messageBuffer = getMessageBuffer();
    messageBuffer.add({
      platform,
      username,
      message,
      timestamp: Date.now(),
    });

    // Call custom handler if provided
    if (onMessage) {
      onMessage(platform, username, message);
    }
  };

  // Initialize Twitch client
  if (platforms.twitch?.enabled) {
    const channelName = platforms.twitch.username;
    if (channelName) {
      const twitchClient = new TwitchChatClient({
        channelName,
        onMessage: handleMessage,
      });
      await twitchClient.connect();
      activeClients.twitch = twitchClient;
      clients.push(twitchClient);
    }
  }

  // Initialize YouTube client
  if (platforms.youtube?.enabled) {
    let videoId = platforms.youtube.videoId;

    if (videoId && youtubeApiKey) {
      // Check if videoId looks like a username/channel (not a standard video ID)
      // YouTube video IDs are exactly 11 characters with alphanumeric, dash, underscore
      const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

      if (!videoIdPattern.test(videoId)) {
        // Treat as channel username/handle and fetch current live stream
        console.log(`Fetching live stream for YouTube channel: ${videoId}`);
        try {
          videoId = await YouTubeChatClient.getLiveVideoIdFromChannel(videoId, youtubeApiKey);
          console.log(`Found live video ID: ${videoId}`);
        } catch (error) {
          console.error(`Failed to get live stream from channel: ${error.message}`);
          // Don't create client if we can't find live stream
          videoId = null;
        }
      }

      if (videoId) {
        const youtubeClient = new YouTubeChatClient({
          videoId,
          apiKey: youtubeApiKey,
          onMessage: handleMessage,
        });
        await youtubeClient.connect();
        activeClients.youtube = youtubeClient;
        clients.push(youtubeClient);
      }
    }
  }

  // Initialize Kick client
  if (platforms.kick?.enabled) {
    const channelName = platforms.kick.username;
    if (channelName) {
      const kickClient = new KickChatClient({
        channelName,
        onMessage: handleMessage,
      });
      await kickClient.connect();
      activeClients.kick = kickClient;
      clients.push(kickClient);
    }
  }

  return clients;
}

/**
 * Disconnect all active clients
 */
async function disconnectAll() {
  const promises = [];

  for (const [platform, client] of Object.entries(activeClients)) {
    if (client) {
      promises.push(client.disconnect());
      activeClients[platform] = null;
    }
  }

  await Promise.all(promises);

  // Clear message buffer
  const messageBuffer = getMessageBuffer();
  messageBuffer.clear();
}

/**
 * Get status of all clients
 */
function getClientsStatus() {
  return {
    twitch: activeClients.twitch ? activeClients.twitch.isConnected() : false,
    youtube: activeClients.youtube ? activeClients.youtube.isConnected() : false,
    kick: activeClients.kick ? activeClients.kick.isConnected() : false,
  };
}

/**
 * Filter messages based on configuration
 */
function shouldFilterMessage(username, message, ttsConfig) {
  const lowerMessage = message.toLowerCase();
  const lowerUsername = username.toLowerCase();

  // Check excluded users
  if (ttsConfig.excludeUsers) {
    if (ttsConfig.excludeUsers.some(user => lowerUsername === user.toLowerCase())) {
      return true;
    }
  }

  // Check for commands
  if (ttsConfig.excludeCommands && message.startsWith('!')) {
    return true;
  }

  // Check for links
  if (ttsConfig.excludeLinks) {
    const linkPattern = /(https?:\/\/|www\.)\S+/gi;
    if (linkPattern.test(message)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  initializeChatClients,
  disconnectAll,
  getClientsStatus,
  getActiveClients: () => activeClients,
};
