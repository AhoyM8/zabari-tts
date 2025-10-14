const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Ensure Playwright browsers are installed
 * This is crucial for packaged Electron apps where browsers aren't bundled
 */
async function ensurePlaywrightBrowsers() {
  try {
    // Check if we're in a packaged app
    const isPackaged = process.defaultApp === false;

    console.log('[Playwright Setup] Checking browser installation...');
    console.log('[Playwright Setup] Is packaged:', isPackaged);

    // Set Playwright browsers path to a writable location
    // In production, use userData folder; in dev, use default location
    if (isPackaged) {
      const { app } = require('electron');
      const userDataPath = app.getPath('userData');
      const browsersPath = path.join(userDataPath, 'playwright-browsers');

      // Set environment variable for Playwright to use this location
      process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;

      console.log('[Playwright Setup] Browsers path:', browsersPath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(browsersPath)) {
        fs.mkdirSync(browsersPath, { recursive: true });
      }
    }

    // Try to check if chromium is already installed
    try {
      const { chromium } = require('playwright');
      const browserPath = chromium.executablePath();

      if (browserPath && fs.existsSync(browserPath)) {
        console.log('[Playwright Setup] ✓ Chromium browser already installed');
        console.log('[Playwright Setup] Browser path:', browserPath);
        return { success: true, alreadyInstalled: true };
      }
    } catch (error) {
      console.log('[Playwright Setup] Browser not found, will install...');
    }

    // Install browsers
    console.log('[Playwright Setup] Installing Playwright browsers...');
    console.log('[Playwright Setup] This may take a few minutes...');

    // Use npx to install browsers
    const command = 'npx playwright install chromium';

    try {
      execSync(command, {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      console.log('[Playwright Setup] ✓ Browsers installed successfully');
      return { success: true, installed: true };

    } catch (installError) {
      console.error('[Playwright Setup] Failed to install browsers:', installError.message);
      return {
        success: false,
        error: 'Failed to install Playwright browsers. Please run "npx playwright install chromium" manually.',
        details: installError.message
      };
    }

  } catch (error) {
    console.error('[Playwright Setup] Error:', error.message);
    return {
      success: false,
      error: 'Failed to setup Playwright browsers',
      details: error.message
    };
  }
}

/**
 * Quick check if browsers are available without installing
 */
function areBrowsersInstalled() {
  try {
    const { chromium } = require('playwright');
    const browserPath = chromium.executablePath();
    return browserPath && fs.existsSync(browserPath);
  } catch (error) {
    return false;
  }
}

module.exports = {
  ensurePlaywrightBrowsers,
  areBrowsersInstalled
};
