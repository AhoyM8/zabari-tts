const WebSocket = require('ws');

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

console.log('WebSocket server started on ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Export function to broadcast messages to all clients
function broadcastMessage(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

module.exports = { broadcastMessage, wss };
