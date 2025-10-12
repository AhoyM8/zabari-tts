// Global message buffer to store recent chat messages
let messageBuffer = [];
const MAX_MESSAGES = 100;

// Store reference to the chat process stdout handlers
let messageListeners = [];

// Track current connection mode
let currentMode = null;

export function setConnectionMode(mode) {
  currentMode = mode;
}

export function addMessage(message) {
  messageBuffer.push({
    ...message,
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString()
  });

  // Keep only last MAX_MESSAGES
  if (messageBuffer.length > MAX_MESSAGES) {
    messageBuffer = messageBuffer.slice(-MAX_MESSAGES);
  }
}

export async function clearMessages() {
  messageBuffer = [];

  // Also clear API mode buffer if available
  try {
    const { getMessageBuffer } = await import('../../../../lib/chat-api/message-buffer.js');
    const apiBuffer = getMessageBuffer();
    apiBuffer.clear();
  } catch (error) {
    // API mode buffer not available, ignore
  }
}

export function getMessages() {
  return messageBuffer;
}

// GET endpoint for polling messages
export async function GET() {
  try {
    let messages = messageBuffer;

    // Only check API buffer if we're in API mode
    if (currentMode === 'api') {
      try {
        const { getMessageBuffer } = await import('../../../../lib/chat-api/message-buffer.js');
        const apiBuffer = getMessageBuffer();
        const apiMessages = apiBuffer.getAll();

        // Use API buffer messages
        if (apiMessages && apiMessages.length > 0) {
          messages = apiMessages;
        }
      } catch (error) {
        console.log('[Messages API] Error loading API buffer:', error.message);
      }
    }

    return Response.json({
      messages: messages
    });
  } catch (error) {
    console.error('[Messages API] Error:', error);
    return Response.json({
      messages: messageBuffer
    });
  }
}
