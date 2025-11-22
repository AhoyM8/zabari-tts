/**
 * Beautiful TikTok Chat Logger
 * Simplified workflow - just logs chat messages beautifully
 */

const { chromium } = require("playwright");
const fs = require("fs").promises;
const path = require("path");

// ANSI color codes for beautiful console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Text colors
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Background colors
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
};

// Beautiful console logger
function logMessage(username, message, timestamp) {
  const time = new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  console.log(
    `${colors.gray}[${time}]${colors.reset} ` +
      `${colors.bgMagenta}${colors.bright} ${username} ${colors.reset} ` +
      `${colors.cyan}${message}${colors.reset}`
  );
}

function logHeader(text) {
  console.log(
    `\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(`${colors.bright}${colors.yellow}  ${text}${colors.reset}`);
  console.log(
    `${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
  );
}

function logInfo(icon, text) {
  console.log(
    `${colors.green}${icon}${colors.reset} ${colors.white}${text}${colors.reset}`
  );
}

function logError(text) {
  console.log(`${colors.bright}❌ ${colors.reset}${text}`);
}

async function beautifulTikTokChat() {
  logHeader("🎬 TikTok Beautiful Chat Logger");

  // Load session
  const sessionPath = path.join(__dirname, "..", "tiktok_session.json");
  let sessionData;

  try {
    const sessionFile = await fs.readFile(sessionPath, "utf8");
    sessionData = JSON.parse(sessionFile);
    logInfo("✅", "Session loaded successfully");
  } catch (error) {
    logError("No session found - Run npm run tiktok:login first");
    process.exit(1);
  }

  // Launch browser
  logInfo("🌐", "Launching browser...");
  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
  });

  const context = await browser.newContext({
    viewport: null,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });

  await context.addCookies(sessionData.cookies);
  await context.addInitScript(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
  });

  const page = await context.newPage();

  // Restore storage
  await page.addInitScript((storageData) => {
    for (const [key, value] of Object.entries(storageData.localStorage)) {
      window.localStorage.setItem(key, value);
    }
    for (const [key, value] of Object.entries(storageData.sessionStorage)) {
      window.sessionStorage.setItem(key, value);
    }
  }, sessionData);

  // Navigate to TikTok live
  logInfo("📺", "Opening TikTok live stream...");
  await page.goto("https://www.tiktok.com/@zabariyarin/live", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  logInfo("⏳", "Waiting for chat to load...");
  await page.waitForTimeout(10000);

  // Set up polling-based chat monitor (simpler than MutationObserver)
  logInfo("🎧", "Setting up chat monitor...");

  let messageCount = 0;
  const processedIndexes = new Set();

  // Get initial messages to skip
  const initialMessages = await page.evaluate(() => {
    const messages = document.querySelectorAll("div.w-full.pt-4[data-index]");
    return Array.from(messages).map((el) => el.getAttribute("data-index"));
  });

  // Mark initial messages as processed
  initialMessages.forEach((index) => processedIndexes.add(index));
  logInfo("📋", `Skipping ${initialMessages.length} existing messages`);

  // Poll for new messages every 3 seconds
  const pollInterval = setInterval(async () => {
    try {
      const newMessages = await page.evaluate(() => {
        const messages = document.querySelectorAll(
          "div.w-full.pt-4[data-index]"
        );
        const results = [];

        messages.forEach((el) => {
          const dataIndex = el.getAttribute("data-index");
          const innerText = el.innerText || "";

          // Split by newline: first line is username, rest is message
          const lines = innerText.split("\n");
          if (lines.length >= 2) {
            const username = lines[0].trim();
            const message = lines.slice(1).join("\n").trim();

            results.push({
              dataIndex,
              username,
              message,
            });
          }
        });

        return results;
      });

      // Process only new messages
      newMessages.forEach((msg) => {
        if (!processedIndexes.has(msg.dataIndex) && msg.username && msg.message) {
          processedIndexes.add(msg.dataIndex);
          messageCount++;
          logMessage(msg.username, msg.message, Date.now());
        }
      });
    } catch (error) {
      console.error("Error polling messages:", error.message);
    }
  }, 3000);

  // Ready!
  logHeader("💬 Chat Monitor Active - Listening for Messages");
  console.log(`${colors.gray}Press Ctrl+C to stop${colors.reset}\n`);

  // Handle exit
  process.on("SIGINT", () => {
    clearInterval(pollInterval);
    console.log(`\n`);
    logHeader(`👋 Stopped - Logged ${messageCount} messages`);
    browser.close();
    process.exit(0);
  });

  // Keep running
  await new Promise(() => {});
}

beautifulTikTokChat().catch(console.error);
