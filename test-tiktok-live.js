/**
 * Standalone TikTok Live Chat Test
 * Tests tiktok-live-connector library before full integration
 */

const { WebcastPushConnection } = require('tiktok-live-connector');

// Get username from command line or use default
const username = process.argv[2] || 'zabariyarin';

console.log('🎬 TikTok Live Chat Test\n');
console.log(`Connecting to @${username}'s live stream...\n`);

// Create connection
const connection = new WebcastPushConnection(username, {
  processInitialData: false,
  enableExtendedGiftInfo: false,
  enableWebsocketUpgrade: true,
  requestPollingIntervalMs: 1000,
});

// Track message count
let messageCount = 0;

// Handle chat messages
connection.on('chat', (data) => {
  messageCount++;
  const username = data.uniqueId || data.nickname || 'Unknown';
  const message = data.comment || '';

  console.log(`\n[${messageCount}] ${username}: ${message}`);
  console.log(`   └─ Data:`, {
    uniqueId: data.uniqueId,
    nickname: data.nickname,
    userId: data.userId,
    comment: data.comment
  });
});

// Handle connection events
connection.on('connected', (state) => {
  console.log('✅ Connected to TikTok live stream!');
  console.log(`   Room ID: ${state.roomId}`);
  console.log(`   Waiting for chat messages...\n`);
});

connection.on('disconnected', () => {
  console.log('\n❌ Disconnected from TikTok');
});

connection.on('error', (error) => {
  console.error('\n🚫 Connection error:', error.message);
});

connection.on('streamEnd', () => {
  console.log('\n🏁 Live stream has ended');
  process.exit(0);
});

// Additional events for debugging
connection.on('member', (data) => {
  console.log(`👤 ${data.uniqueId} joined the stream`);
});

connection.on('like', (data) => {
  console.log(`❤️  ${data.uniqueId} sent ${data.likeCount} likes`);
});

connection.on('gift', (data) => {
  console.log(`🎁 ${data.uniqueId} sent gift: ${data.giftName} (x${data.repeatCount})`);
});

// Connect to the live stream
connection.connect().then((state) => {
  console.log('Connection state:', state);
}).catch((error) => {
  console.error('\n❌ Failed to connect:', error.message);

  if (error.message?.includes('LIVE has ended')) {
    console.log('\n💡 This user is not currently live. Try another username or wait until they go live.');
  } else if (error.message?.includes('User not found')) {
    console.log('\n💡 User not found. Make sure the username is correct.');
  } else if (error.message?.includes('rate limit')) {
    console.log('\n💡 Rate limited. Wait a few minutes and try again.');
  }

  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Disconnecting...');
  connection.disconnect();
  process.exit(0);
});

console.log('Press Ctrl+C to stop\n');
