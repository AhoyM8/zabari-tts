/**
 * Shared message buffer for storing chat messages
 * Used in API mode to buffer messages for the frontend
 */
class MessageBuffer {
  constructor(maxSize = 100) {
    this.messages = [];
    this.maxSize = maxSize;
  }

  /**
   * Add a message to the buffer
   */
  add(message) {
    const messageWithId = {
      id: `${message.platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      platform: message.platform,
      username: message.username,
      message: message.message,
      timestamp: message.timestamp || Date.now(),
    };

    this.messages.push(messageWithId);

    // Keep only last N messages
    if (this.messages.length > this.maxSize) {
      this.messages = this.messages.slice(-this.maxSize);
    }

    return messageWithId;
  }

  /**
   * Get all messages
   */
  getAll() {
    return this.messages;
  }

  /**
   * Get messages since a specific timestamp
   */
  getSince(timestamp) {
    return this.messages.filter(msg => msg.timestamp > timestamp);
  }

  /**
   * Clear all messages
   */
  clear() {
    this.messages = [];
  }

  /**
   * Get buffer size
   */
  size() {
    return this.messages.length;
  }
}

// Singleton instance for the server
let instance = null;

/**
 * Get the shared message buffer instance
 */
function getMessageBuffer() {
  if (!instance) {
    instance = new MessageBuffer();
  }
  return instance;
}

module.exports = { MessageBuffer, getMessageBuffer };
