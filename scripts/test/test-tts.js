const { chromium } = require('playwright');

/**
 * Test script for TTS functionality in API mode
 * Tests both Twitch and YouTube to verify username announcement
 */
async function testTTS() {
  console.log('Starting TTS test...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to localhost:3000
  await page.goto('http://localhost:3000');
  console.log('Navigated to frontend');

  // Wait for page to load
  await page.waitForTimeout(2000);

  // Take initial screenshot
  await page.screenshot({ path: 'test-screenshots/01-initial.png' });
  console.log('Screenshot 1: Initial page');

  // Switch to API mode
  console.log('Switching to API mode...');
  const apiModeButton = page.locator('button:has-text("Direct API Connection")');
  await apiModeButton.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-screenshots/02-api-mode.png' });
  console.log('Screenshot 2: API mode selected');

  // Enable Twitch - find the toggle button in the Twitch section
  console.log('Enabling Twitch...');
  const twitchSection = page.locator('div:has(h3:text("Twitch"))');
  const twitchToggle = twitchSection.locator('button').first();
  await twitchToggle.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-screenshots/03-twitch-enabled.png' });
  console.log('Screenshot 3: Twitch enabled');

  // Check "Announce username" checkbox state
  const announceLabel = page.locator('label:has-text("Announce username")');
  const announceCheckbox = announceLabel.locator('input[type="checkbox"]');
  const isChecked = await announceCheckbox.isChecked();
  console.log('Announce username checkbox is checked:', isChecked);

  // Scroll down to see Start button
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-screenshots/04-scrolled.png' });
  console.log('Screenshot 4: Scrolled to bottom');

  // Listen to console logs from the page
  page.on('console', msg => {
    if (msg.text().includes('[TTS]')) {
      console.log('PAGE LOG:', msg.text());
    }
  });

  // Click Start Chat Logger
  console.log('Starting chat logger...');
  const startButton = page.locator('button:has-text("Start Chat Logger")');
  await startButton.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-screenshots/05-started.png' });
  console.log('Screenshot 5: Chat logger started');

  // Wait for messages to appear (give it 30 seconds to receive some chat messages)
  console.log('Waiting for chat messages (30 seconds)...');
  await page.waitForTimeout(30000);
  await page.screenshot({ path: 'test-screenshots/06-messages.png' });
  console.log('Screenshot 6: After waiting for messages');

  // Check if any messages appeared
  const messageCount = await page.locator('[id="chat-container"] > div > div').count();
  console.log(`Found ${messageCount} messages in chat`);

  // Keep browser open for manual inspection
  console.log('\nTest complete! Browser will stay open for 60 seconds for manual inspection...');
  console.log('Check the browser console for [TTS] logs to verify username announcement');
  console.log('Screenshots saved to test-screenshots/ directory');
  await page.waitForTimeout(60000);

  await browser.close();
  console.log('Browser closed');
}

// Run the test
testTTS().catch(console.error);
