// Global message buffer to store recent chat messages
let messageBuffer = [];
const MAX_MESSAGES = 100;

// Store reference to the chat process stdout handlers
let messageListeners = [];

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

export function clearMessages() {
  messageBuffer = [];
}

export function getMessages() {
  return messageBuffer;
}

// GET endpoint for polling messages
export async function GET() {
  return Response.json({
    messages: messageBuffer
  });
}
