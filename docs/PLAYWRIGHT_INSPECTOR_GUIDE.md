# Playwright Inspector Guide

A comprehensive guide to using Playwright's built-in debugging and code generation tool.

## Table of Contents
- [What is Playwright Inspector?](#what-is-playwright-inspector)
- [Getting Started](#getting-started)
- [Key Features](#key-features)
- [Common Use Cases](#common-use-cases)
- [Advanced Tips](#advanced-tips)
- [Keyboard Shortcuts](#keyboard-shortcuts)

---

## What is Playwright Inspector?

Playwright Inspector is a GUI tool that helps you:
- **Record** browser interactions and generate code automatically
- **Debug** your Playwright scripts step-by-step
- **Inspect** elements and find the perfect selectors
- **Explore** the page structure and state

Think of it as a browser automation IDE that writes code for you!

---

## Getting Started

### Launch Inspector

```bash
# Basic launch - opens Chromium
npx playwright codegen http://localhost:3000

# Specific browser
npx playwright codegen --browser=firefox https://example.com
npx playwright codegen --browser=webkit https://example.com

# Generate TypeScript code
npx playwright codegen --target=typescript http://localhost:3000

# With device emulation
npx playwright codegen --device="iPhone 13" https://mobile-site.com

# With custom viewport
npx playwright codegen --viewport-size=800,600 https://example.com

# Save output directly to file
npx playwright codegen --output=test.spec.js https://example.com
```

### Inspector Layout

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Window                        │
│  (Your app runs here - interact normally)              │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Playwright Inspector Window                │
│  ┌────────────────────────────────────────────────┐    │
│  │  🔴 Record  👁️ Pick  ⏸️ Pause  ▶️ Resume      │    │
│  ├────────────────────────────────────────────────┤    │
│  │  Generated Code (auto-updates as you interact) │    │
│  │                                                 │    │
│  │  await page.goto('http://localhost:3000')      │    │
│  │  await page.click('#submit-button')            │    │
│  │  await page.fill('#username', 'john')          │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. 🔴 Record Mode

**What it does:** Records your browser interactions and generates Playwright code.

**How to use:**
1. Click the **Record** button (red dot icon)
2. Interact with your web app:
   - Click buttons
   - Fill forms
   - Navigate pages
   - Check checkboxes
   - Select dropdowns
3. Watch the code generate in real-time
4. Copy the code to use in your scripts

**Example Output:**
```javascript
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('button', { name: 'Twitch' }).click();
  await page.getByPlaceholder('Enter Twitch username').fill('xqc');
  await page.getByRole('button', { name: 'Start Chat Logger' }).click();
  await expect(page.getByText('Status: Running')).toBeVisible();
});
```

### 2. 👁️ Pick Locator (Element Inspector)

**What it does:** Helps you find the perfect selector for any element.

**How to use:**
1. Click the **Pick Locator** button (crosshair icon)
2. Hover over elements on the page
3. See the selector highlighted in the Inspector
4. Click to copy the selector

**Example:**
```javascript
// Hovering over "Start Chat Logger" button shows:
page.getByRole('button', { name: 'Start Chat Logger' })

// Hovering over username input shows:
page.getByPlaceholder('Enter Twitch username')

// You can use these selectors in your code!
```

**Pro Tip:** Playwright generates smart, resilient selectors using:
- Role-based selectors (best practice)
- Text content
- Placeholder text
- ARIA labels
- Only falls back to CSS/XPath when necessary

### 3. ⏸️ Debug Mode

**What it does:** Step through your test execution line by line.

**How to use:**
1. Add `await page.pause()` in your test code
2. Run your test: `npx playwright test --headed`
3. When it hits the pause, Inspector opens automatically
4. Use the controls:
   - **Resume** (▶️): Continue execution
   - **Step Over** (⤵️): Run current line, move to next
   - **Step Into** (↓): Dive into function calls
   - **Step Out** (↑): Exit current function

**Example:**
```javascript
test('debug my test', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  await page.pause(); // 🛑 Inspector opens here

  await page.click('#submit');
  // Now you can step through the test manually
});
```

### 4. 📋 Tabs and Panels

The Inspector has multiple tabs for different information:

**Locator Tab:**
- Shows current element selectors
- Test selector validity
- Try different locator strategies

**Log Tab:**
- View console.log output
- See Playwright actions
- Track page events

**Aria Tab:**
- View accessibility tree
- Check ARIA attributes
- Test screen reader compatibility

---

## Common Use Cases

### Use Case 1: Creating Tests for Your TTS App

```bash
# Start recording interactions
npx playwright codegen http://localhost:3000

# Then interact with the app:
# 1. Toggle Twitch ON
# 2. Enter username "xqc"
# 3. Click "Start Chat Logger"
# 4. Verify status shows "Running"
```

**Generated Code:**
```javascript
import { test, expect } from '@playwright/test';

test('start twitch chat logger', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Toggle Twitch
  await page.getByRole('button', { name: 'Twitch Live chat streaming' }).click();

  // Enter username
  await page.getByPlaceholder('Enter Twitch username (e.g., xqc)').fill('xqc');

  // Start logger
  await page.getByRole('button', { name: '▶ Start Chat Logger' }).click();

  // Verify running
  await expect(page.getByText('Status: Running')).toBeVisible();
});
```

### Use Case 2: Finding a Stubborn Selector

**Problem:** You can't figure out the right selector for an element.

**Solution:**
```bash
npx playwright codegen http://localhost:3000
```

1. Click **Pick Locator** (crosshair icon)
2. Hover over the element you need
3. Inspector shows the best selector
4. Copy and use in your code!

### Use Case 3: Debugging a Failing Test

**Problem:** Your test fails and you don't know why.

**Solution:**
```javascript
test('my failing test', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Add pause before the failing step
  await page.pause();

  // This line is failing - now you can debug why
  await page.click('#mysterious-button');
});
```

Run with:
```bash
npx playwright test --headed
```

When it pauses, use Inspector to:
- Inspect the page state
- Try selectors in the console
- Step through line by line
- See what's actually on the page

### Use Case 4: Mobile Testing

```bash
# Test on iPhone 13
npx playwright codegen --device="iPhone 13" http://localhost:3000

# Test on iPad Pro
npx playwright codegen --device="iPad Pro" http://localhost:3000

# Available devices
npx playwright show-devices
```

### Use Case 5: Testing Responsive Design

```bash
# Custom viewport size
npx playwright codegen --viewport-size=375,667 http://localhost:3000

# Desktop
npx playwright codegen --viewport-size=1920,1080 http://localhost:3000

# Tablet
npx playwright codegen --viewport-size=768,1024 http://localhost:3000
```

---

## Advanced Tips

### Tip 1: Generate Better Selectors

Playwright prioritizes selectors in this order:
1. **Role-based** → `page.getByRole('button', { name: 'Submit' })`
2. **Text content** → `page.getByText('Welcome')`
3. **Placeholder** → `page.getByPlaceholder('Enter email')`
4. **Label** → `page.getByLabel('Username')`
5. **Test ID** → `page.getByTestId('submit-btn')` (if you add data-testid)
6. **CSS/XPath** → Only as last resort

**Pro Tip:** Add `data-testid` attributes to important elements:
```html
<button data-testid="start-chat-logger">Start Chat Logger</button>
```

Then use:
```javascript
await page.getByTestId('start-chat-logger').click();
```

### Tip 2: Record with Authentication

```bash
# Save authentication state first
npx playwright codegen --save-storage=auth.json https://example.com

# Then use it in future recordings
npx playwright codegen --load-storage=auth.json https://example.com
```

### Tip 3: Generate Code for Specific Framework

```bash
# JavaScript (default)
npx playwright codegen http://localhost:3000

# TypeScript
npx playwright codegen --target=typescript http://localhost:3000

# Python
npx playwright codegen --target=python http://localhost:3000

# C#
npx playwright codegen --target=csharp http://localhost:3000

# Java
npx playwright codegen --target=java http://localhost:3000
```

### Tip 4: Combine with VS Code

Install the **Playwright Test for VS Code** extension:

1. Open VS Code
2. Install "Playwright Test for VS Code" extension
3. You get:
   - Run tests from editor
   - Debug tests with breakpoints
   - Pick locators directly in VS Code
   - See test results inline

### Tip 5: Explore with Console

When Inspector is open, you have access to special variables:

```javascript
// In the Inspector console:
playwright  // Playwright API
page       // Current page object
context    // Browser context
browser    // Browser instance

// Try things out:
await page.click('#button')
await page.screenshot({ path: 'test.png' })
const text = await page.textContent('h1')
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `F8` or `F10` | Resume (continue execution) |
| `F10` | Step over (next line) |
| `F11` | Step into (dive into function) |
| `Shift+F11` | Step out (exit function) |
| `Ctrl+Shift+P` | Pick locator |
| `Ctrl+C` | Copy generated code |

---

## Real-World Example: Complete Test Suite

Let's create a full test suite for your TTS app using what we learned:

```javascript
// tests/tts-app.spec.js
import { test, expect } from '@playwright/test';

test.describe('Zabari TTS Application', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/');
  });

  test('should load homepage with all sections', async ({ page }) => {
    // Check title
    await expect(page.getByRole('heading', { name: 'Zabari TTS' })).toBeVisible();

    // Check all platform cards exist
    await expect(page.getByText('Twitch')).toBeVisible();
    await expect(page.getByText('YouTube')).toBeVisible();
    await expect(page.getByText('Kick')).toBeVisible();
  });

  test('should enable Twitch and show username input', async ({ page }) => {
    // Click Twitch toggle
    const twitchToggle = page.locator('text=Twitch').locator('..').locator('button');
    await twitchToggle.click();

    // Verify input appears
    const usernameInput = page.getByPlaceholder('Enter Twitch username (e.g., xqc)');
    await expect(usernameInput).toBeVisible();

    // Fill username
    await usernameInput.fill('xqc');
    await expect(usernameInput).toHaveValue('xqc');
  });

  test('should enable all platforms with usernames', async ({ page }) => {
    // Enable Twitch
    await page.locator('text=Twitch').locator('..').locator('button').click();
    await page.getByPlaceholder('Enter Twitch username').fill('xqc');

    // Enable YouTube
    await page.locator('text=YouTube').locator('..').locator('button').click();
    await page.getByPlaceholder('Video ID or channel username').fill('zabariyarin');

    // Enable Kick
    await page.locator('text=Kick').locator('..').locator('button').click();
    await page.getByPlaceholder('Enter Kick username').fill('trainwreckstv');

    // All inputs should have values
    await expect(page.getByPlaceholder('Enter Twitch username')).toHaveValue('xqc');
    await expect(page.getByPlaceholder('Video ID or channel username')).toHaveValue('zabariyarin');
    await expect(page.getByPlaceholder('Enter Kick username')).toHaveValue('trainwreckstv');
  });

  test('should switch between Playwright and API mode', async ({ page }) => {
    // Click API mode
    await page.getByText('Direct API Connection').click();
    await expect(page.getByText('Direct API Connection')).toBeVisible();

    // Click Playwright mode
    await page.getByText('Playwright (Browser Automation)').click();
    await expect(page.getByText('Playwright (Browser Automation)')).toBeVisible();
  });

  test('should show TTS settings', async ({ page }) => {
    // Check TTS settings section
    await expect(page.getByRole('heading', { name: 'TTS Settings' })).toBeVisible();

    // Check voice dropdown
    const voiceSelect = page.locator('select').first();
    await expect(voiceSelect).toBeVisible();

    // Check sliders
    await expect(page.getByText('Volume:')).toBeVisible();
    await expect(page.getByText('Rate:')).toBeVisible();
    await expect(page.getByText('Pitch:')).toBeVisible();
  });

  test('should add and remove excluded users', async ({ page }) => {
    // Find excluded user input
    const excludeInput = page.getByPlaceholder('Username to exclude');
    await excludeInput.fill('testbot');

    // Click Add button
    await page.getByRole('button', { name: 'Add' }).click();

    // Verify user was added
    await expect(page.getByText('testbot')).toBeVisible();

    // Remove user
    await page.locator('text=testbot').locator('..').locator('button').click();

    // Verify user was removed
    await expect(page.getByText('testbot')).not.toBeVisible();
  });
});
```

Run the tests:
```bash
# Run all tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test tts-app.spec.js

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

---

## Troubleshooting

### Inspector Doesn't Open

```bash
# Check if Playwright browsers are installed
npx playwright install

# Try with explicit headed flag
npx playwright codegen --headed http://localhost:3000
```

### Can't Find Element

```bash
# Use Pick Locator mode (crosshair icon) to:
# 1. See what Playwright sees
# 2. Get the exact selector
# 3. Test if selector works

# Or try different selector strategies:
page.getByRole('button', { name: 'Submit' })  // Best
page.getByText('Submit')                      // Good
page.locator('button:has-text("Submit")')     // OK
page.locator('#submit-btn')                   // Last resort
```

### Code Generation Stops Working

```bash
# Restart Inspector
# Close browser and Inspector
# Run again:
npx playwright codegen http://localhost:3000
```

---

## Resources

- **Official Docs:** https://playwright.dev/docs/codegen
- **Inspector Guide:** https://playwright.dev/docs/debug#playwright-inspector
- **Best Practices:** https://playwright.dev/docs/best-practices
- **VS Code Extension:** https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright

---

## Quick Reference Card

```bash
# Most Common Commands
npx playwright codegen <url>              # Record interactions
npx playwright codegen --target=typescript <url>  # Generate TS
npx playwright test                       # Run tests
npx playwright test --ui                  # Interactive test runner
npx playwright test --debug               # Debug mode
npx playwright show-report                # View test report
```

---

**Pro Tip:** The Inspector is your best friend when building tests. Don't write selectors manually - let the Inspector find them for you! 🎯
