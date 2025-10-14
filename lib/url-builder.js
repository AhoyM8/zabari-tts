/**
 * Utility functions to build platform-specific chat URLs from usernames/identifiers
 */

/**
 * Build Twitch popout chat URL from username
 * @param {string} username - Twitch channel username
 * @returns {string} Full Twitch popout chat URL
 */
function buildTwitchUrl(username) {
  return `https://www.twitch.tv/popout/${username}/chat?popout=`
}

/**
 * Build YouTube live chat URL from video ID or channel username
 * @param {string} identifier - YouTube video ID, channel handle (@username), or channel name
 * @returns {string} Full YouTube URL (either live chat or channel page)
 */
function buildYoutubeUrl(identifier) {
  // If it starts with @, it's definitely a channel handle
  if (identifier.startsWith('@')) {
    return `https://www.youtube.com/${identifier}`;
  }

  // Check if it looks like a video ID:
  // - Exactly 11 characters
  // - Contains both uppercase AND lowercase (typical of base64-like video IDs)
  // - OR contains numbers and special chars like _ or -
  const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
  const hasUpperCase = /[A-Z]/.test(identifier);
  const hasLowerCase = /[a-z]/.test(identifier);
  const hasNumbersOrSpecial = /[0-9_-]/.test(identifier);

  if (videoIdPattern.test(identifier) && (hasUpperCase || hasNumbersOrSpecial)) {
    // Likely a video ID - go directly to live chat
    return `https://www.youtube.com/live_chat?is_popout=1&v=${identifier}`;
  } else {
    // It's a channel username - go to channel page
    const handle = identifier.startsWith('@') ? identifier : `@${identifier}`;
    return `https://www.youtube.com/${handle}`;
  }
}

/**
 * Build Kick popout chat URL from username
 * @param {string} username - Kick channel username
 * @returns {string} Full Kick popout chat URL
 */
function buildKickUrl(username) {
  return `https://kick.com/popout/${username}/chat`
}

/**
 * Build URLs object from platforms configuration
 * @param {Object} platforms - Platforms configuration object
 * @returns {Object} URLs object with platform keys and URL values
 */
function buildUrlsFromPlatforms(platforms) {
  const urls = {}

  if (platforms.twitch?.enabled && platforms.twitch?.username) {
    urls.twitch = buildTwitchUrl(platforms.twitch.username)
  }

  if (platforms.youtube?.enabled && platforms.youtube?.videoId) {
    urls.youtube = buildYoutubeUrl(platforms.youtube.videoId)
  }

  if (platforms.kick?.enabled && platforms.kick?.username) {
    urls.kick = buildKickUrl(platforms.kick.username)
  }

  return urls
}

module.exports = {
  buildTwitchUrl,
  buildYoutubeUrl,
  buildKickUrl,
  buildUrlsFromPlatforms
}
