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
    const channelName = extractTwitchChannel(platforms.twitch.url);
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
    const videoId = YouTubeChatClient.extractVideoId(platforms.youtube.url);
    if (videoId && youtubeApiKey) {
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

  // Initialize Kick client
  if (platforms.kick?.enabled) {
    const channelName = extractKickChannel(platforms.kick.url);
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

/**
 * Extract Twitch channel name from URL
 */
function extractTwitchChannel(url) {
  const patterns = [
    /twitch\.tv\/popout\/([^/]+)\/chat/, // Popout chat
    /twitch\.tv\/([^/]+)/, // Regular channel
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract Kick channel name from URL
 */
function extractKickChannel(url) {
  const patterns = [
    /kick\.com\/popout\/([^/]+)\/chat/, // Popout chat
    /kick\.com\/([^/]+)/, // Regular channel
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

module.exports = {
  initializeChatClients,
  disconnectAll,
  getClientsStatus,
  getActiveClients: () => activeClients,
};
