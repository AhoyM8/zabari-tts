/**
 * Test the actual TikTok client class with improved error handling
 */

const TikTokChatClient = require('./lib/chat-api/tiktok-client.js');

console.log('🧪 Testing TikTok Chat Client\n');

// Track messages
let messageCount = 0;

// Create client with message and error handlers
const client = new TikTokChatClient({
  channelName: 'zabariyarin',
  onMessage: (platform, username, message) => {
    messageCount++;
    console.log(`\n📨 Message ${messageCount}:`);
    console.log(`   Platform: ${platform}`);
    console.log(`   User: ${username}`);
    console.log(`   Message: ${message}`);
  },
  onError: (error) => {
    console.error(`\n⚠️  Error callback triggered: ${error}`);
  }
});

// Connect to TikTok
console.log('Connecting to TikTok live stream...\n');

client.connect()
  .then((state) => {
    console.log('\n✅ Connection successful!');
    console.log(`   Room ID: ${state.roomId}`);
    console.log('   Listening for chat messages...\n');
    console.log('Press Ctrl+C to stop\n');

    // Keep running
    setTimeout(() => {
      console.log(`\n📊 Summary: Received ${messageCount} messages`);
      client.disconnect();
      process.exit(0);
    }, 60000); // Run for 60 seconds
  })
  .catch((error) => {
    console.error('\n❌ Connection failed!');
    console.error(`   Error: ${error.message || error}`);
    process.exit(1);
  });

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping...');
  console.log(`   Total messages received: ${messageCount}`);
  client.disconnect();
  process.exit(0);
});
