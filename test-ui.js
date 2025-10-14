const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to the app
  await page.goto('http://localhost:3000');

  // Wait for page to load
  await page.waitForTimeout(2000);

  // Take screenshot of the platform configuration section
  await page.screenshot({ path: 'test-ui-platforms.png', fullPage: true });
  console.log('Screenshot saved to test-ui-platforms.png');

  // Test enabling Twitch and entering username
  const twitchToggle = page.locator('text=Twitch').locator('..').locator('button');
  await twitchToggle.click();
  await page.waitForTimeout(500);

  // Verify input field is visible
  const twitchInput = page.locator('input[placeholder*="Twitch username"]');
  await twitchInput.waitFor({ state: 'visible' });

  // Enter a test username
  await twitchInput.fill('xqc');

  // Take screenshot showing filled input
  await page.screenshot({ path: 'test-ui-twitch-filled.png', fullPage: true });
  console.log('Screenshot with Twitch username saved to test-ui-twitch-filled.png');

  // Test YouTube
  const youtubeToggle = page.locator('text=YouTube').locator('..').locator('button');
  await youtubeToggle.click();
  await page.waitForTimeout(500);

  const youtubeInput = page.locator('input[placeholder*="Video ID"]');
  await youtubeInput.waitFor({ state: 'visible' });
  await youtubeInput.fill('dQw4w9WgXcQ');

  // Test Kick
  const kickToggle = page.locator('text=Kick').locator('..').locator('button');
  await kickToggle.click();
  await page.waitForTimeout(500);

  const kickInput = page.locator('input[placeholder*="Kick username"]');
  await kickInput.waitFor({ state: 'visible' });
  await kickInput.fill('trainwreckstv');

  // Take final screenshot
  await page.screenshot({ path: 'test-ui-all-platforms.png', fullPage: true });
  console.log('Screenshot with all platforms saved to test-ui-all-platforms.png');

  console.log('\n✅ All tests passed! UI is working correctly with username-based inputs.');

  // Keep browser open for manual inspection
  console.log('\nBrowser will stay open for manual inspection. Close it when done.');
  await page.waitForTimeout(30000);

  await browser.close();
})();
