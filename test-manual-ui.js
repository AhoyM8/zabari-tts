const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Navigate to the app
  await page.goto('http://localhost:3000');

  console.log('\n🌐 Browser opened at http://localhost:3000');
  console.log('\n📋 Test Instructions:');
  console.log('1. Toggle Twitch ON - verify username input appears');
  console.log('2. Enter a username like "xqc" - verify it accepts it');
  console.log('3. Toggle YouTube ON - verify video ID input appears');
  console.log('4. Enter a video ID or username like "dQw4w9WgXcQ" or "@username"');
  console.log('5. Toggle Kick ON - verify username input appears');
  console.log('6. Enter a username like "trainwreckstv"');
  console.log('\n✅ All inputs should show helpful placeholders explaining what to enter');
  console.log('\n⏳ Browser will stay open for 2 minutes for manual testing...\n');

  // Keep browser open for manual testing
  await page.waitForTimeout(120000); // 2 minutes

  await browser.close();
  console.log('\n✅ Test session ended.');
})();
