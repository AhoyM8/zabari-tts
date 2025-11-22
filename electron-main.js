const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const TTSServerManager = require('./lib/tts-server-manager.js');
const TTSDependencySetup = require('./lib/setup-tts-dependencies.js');

let mainWindow = null;
let tray = null;
let nextJsProcess = null;
let ttsManager = null;
let ttsSetup = null;
const NEXT_JS_PORT = 3000;
const NEXT_JS_URL = `http://localhost:${NEXT_JS_PORT}`;

// Determine if running in production (packaged) or development
const isDev = !app.isPackaged;
const resourcesPath = isDev
  ? path.join(__dirname)
  : process.resourcesPath;

// ============================================================================
// AUTO-UPDATER CONFIGURATION
// ============================================================================

// Configure auto-updater
autoUpdater.autoDownload = false; // Manual download control
autoUpdater.autoInstallOnAppQuit = true; // Install update when app quits

// Disable auto-updater in development mode
if (isDev) {
  autoUpdater.updateConfigPath = null;
  console.log('[Auto-Updater] Disabled in development mode');
} else {
  console.log('[Auto-Updater] Enabled');
  console.log('[Auto-Updater] Current version:', app.getVersion());
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('[Auto-Updater] Checking for updates...');
  sendStatusToWindow('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('[Auto-Updater] Update available:', info.version);
  sendStatusToWindow(`Update available: ${info.version}`);

  // Send notification to renderer process
  if (mainWindow) {
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('[Auto-Updater] No updates available. Current version:', info.version);
  sendStatusToWindow('App is up to date');
});

autoUpdater.on('error', (err) => {
  console.error('[Auto-Updater] Error:', err);
  sendStatusToWindow(`Update error: ${err.message}`);

  if (mainWindow) {
    mainWindow.webContents.send('update-error', {
      message: err.message
    });
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
  log_message += ` (${progressObj.transferred}/${progressObj.total})`;
  console.log('[Auto-Updater]', log_message);
  sendStatusToWindow(log_message);

  // Send progress to renderer
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[Auto-Updater] Update downloaded:', info.version);
  sendStatusToWindow(`Update ${info.version} downloaded. Ready to install.`);

  // Notify renderer that update is ready
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', {
      version: info.version
    });
  }
});

// Helper function to send status messages
function sendStatusToWindow(text) {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { message: text });
  }
}

// Path to the frontend directory
const frontendPath = path.join(__dirname, 'frontend');

// Path to Next.js standalone server (production)
const standalonePath = isDev
  ? null
  : path.join(frontendPath, '.next', 'standalone');

function createWindow() {
  // Try multiple icon paths (PNG or ICO)
  const iconPaths = [
    path.join(__dirname, 'assets', 'icon.png'),
    path.join(__dirname, 'assets', 'icon.ico')
  ];

  const windowOptions = {
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js'),
      devTools: true // Enable DevTools for debugging
    },
    title: 'Zabari TTS - Chat Logger'
  };

  // Set icon if any format exists
  for (const iconPath of iconPaths) {
    if (fs.existsSync(iconPath)) {
      windowOptions.icon = iconPath;
      break;
    }
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Open DevTools automatically in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Show loading screen
  mainWindow.loadFile(path.join(__dirname, 'assets', 'loading.html'));

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Try multiple icon paths
  const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const fallbackIconPath = path.join(__dirname, 'assets', 'icon.ico');

  let iconToUse = null;
  if (fs.existsSync(trayIconPath)) {
    iconToUse = trayIconPath;
  } else if (fs.existsSync(fallbackIconPath)) {
    iconToUse = fallbackIconPath;
  }

  // If no icon found, skip tray creation (optional feature)
  if (!iconToUse) {
    console.warn('[Electron] No tray icon found, skipping system tray. Add assets/icon.ico to enable.');
    return;
  }

  tray = new Tray(iconToUse);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Hide App',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Toggle DevTools',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.toggleDevTools();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Restart Server',
      click: () => {
        stopNextJs();
        setTimeout(() => startNextJs(), 1000);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Zabari TTS - Chat Logger');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function startNextJs() {
  console.log('[Electron] Starting Next.js server...');
  console.log('[Electron] Frontend path:', frontendPath);
  console.log('[Electron] Is Dev:', isDev);

  if (isDev) {
    // Development mode: use npm run dev
    console.log('[Electron] Starting in development mode with npm run dev');
    nextJsProcess = spawn('npm', ['run', 'dev'], {
      cwd: frontendPath,
      shell: true,
      env: { ...process.env, PORT: NEXT_JS_PORT.toString() }
    });
  } else {
    // Production mode: use standalone server
    // Next.js standalone preserves workspace structure, so server.js is at standalone/frontend/server.js
    const standaloneServerPath = path.join(standalonePath, 'frontend', 'server.js');
    const standaloneWorkingDir = path.join(standalonePath, 'frontend');
    console.log('[Electron] Starting in production mode with standalone server');
    console.log('[Electron] Server path:', standaloneServerPath);
    console.log('[Electron] Working dir:', standaloneWorkingDir);

    nextJsProcess = spawn('node', [standaloneServerPath], {
      cwd: standaloneWorkingDir,
      shell: false,
      env: {
        ...process.env,
        PORT: NEXT_JS_PORT.toString(),
        HOSTNAME: 'localhost',
        NODE_ENV: 'production'
      }
    });
  }

  nextJsProcess.stdout.on('data', (data) => {
    console.log(`[Next.js] ${data.toString().trim()}`);

    // Detect when server is ready
    const output = data.toString();
    if (output.includes('Local:') || output.includes('started server') || output.includes('Ready') || output.includes('Listening on')) {
      console.log('[Electron] Next.js server is ready!');
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.loadURL(NEXT_JS_URL);
        }
      }, 1000);
    }
  });

  nextJsProcess.stderr.on('data', (data) => {
    console.error(`[Next.js Error] ${data.toString().trim()}`);
  });

  nextJsProcess.on('close', (code) => {
    console.log(`[Electron] Next.js process exited with code ${code}`);
  });

  nextJsProcess.on('error', (err) => {
    console.error('[Electron] Failed to start Next.js:', err);
  });
}

function stopNextJs() {
  if (nextJsProcess) {
    console.log('[Electron] Stopping Next.js server...');
    nextJsProcess.kill();
    nextJsProcess = null;
  }
}

// Check if server is already running on the port
async function isServerRunning(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch (err) {
    return false;
  }
}

// Wait for server to be ready before loading
async function waitForServer(url, maxAttempts = 30) {
  console.log('[Electron] Waiting for server to be ready...');

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log('[Electron] Server is ready!');
        return true;
      }
    } catch (err) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.error('[Electron] Server failed to start within timeout');
  return false;
}

// App lifecycle
app.whenReady().then(async () => {
  console.log('='.repeat(80));
  console.log('ZABARI TTS - ELECTRON APP STARTING');
  console.log('='.repeat(80));
  console.log('[Electron] isDev:', isDev);
  console.log('[Electron] __dirname:', __dirname);
  console.log('[Electron] resourcesPath:', resourcesPath);
  console.log('[Electron] frontendPath:', frontendPath);
  console.log('[Electron] process.cwd():', process.cwd());
  console.log('='.repeat(80));

  // Setup Playwright browsers if in packaged mode
  if (!isDev) {
    try {
      const { ensurePlaywrightBrowsers } = require('./lib/ensure-playwright-browsers.js');
      const result = await ensurePlaywrightBrowsers();
      if (!result.success) {
        console.warn('[Electron] Warning: Playwright browsers may not be available');
        console.warn('[Electron]', result.error);
      }
    } catch (error) {
      console.warn('[Electron] Warning: Could not setup Playwright browsers:', error.message);
      console.warn('[Electron] Playwright mode may not work. API mode will still function.');
    }
  }

  // Initialize TTS Server Manager and Dependency Setup
  console.log('[Electron] Initializing TTS Server Manager...');
  ttsManager = new TTSServerManager(isDev, resourcesPath);
  ttsSetup = new TTSDependencySetup(isDev, resourcesPath);

  createWindow();
  createTray();

  // Check for updates (only in production)
  if (!isDev) {
    console.log('[Auto-Updater] Checking for updates on startup...');
    // Check for updates 5 seconds after app starts
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.error('[Auto-Updater] Failed to check for updates:', err);
      });
    }, 5000);

    // Check for updates every 4 hours
    setInterval(() => {
      console.log('[Auto-Updater] Periodic update check...');
      autoUpdater.checkForUpdates().catch(err => {
        console.error('[Auto-Updater] Failed to check for updates:', err);
      });
    }, 4 * 60 * 60 * 1000);
  }

  // Check if server is already running
  const alreadyRunning = await isServerRunning(NEXT_JS_URL);
  if (alreadyRunning) {
    console.log('[Electron] Next.js server already running on port', NEXT_JS_PORT);
    console.log('[Electron] Skipping server start, connecting to existing server...');
    if (mainWindow) {
      mainWindow.loadURL(NEXT_JS_URL);
    }
  } else {
    // Start Next.js server
    console.log('[Electron] Starting Next.js server...');
    startNextJs();

    // Wait for server and load URL
    const serverReady = await waitForServer(NEXT_JS_URL);
    if (serverReady && mainWindow) {
      console.log('[Electron] Loading app UI...');
      mainWindow.loadURL(NEXT_JS_URL);
    } else if (mainWindow) {
      console.error('[Electron] Server failed to start, showing error page');
      mainWindow.loadFile(path.join(__dirname, 'assets', 'error.html'));
    }
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep app running when windows closed
  if (process.platform !== 'darwin') {
    // On Windows/Linux, we keep running in tray
    // Don't quit the app
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopNextJs();
  if (ttsManager) {
    ttsManager.stopAll();
  }
});

app.on('will-quit', () => {
  stopNextJs();
  if (ttsManager) {
    ttsManager.stopAll();
  }
});

// Handle IPC messages from renderer
ipcMain.on('quit-app', () => {
  app.isQuitting = true;
  app.quit();
});

// ============================================================================
// AUTO-UPDATER IPC HANDLERS
// ============================================================================

// Get current app version
ipcMain.handle('app-get-version', () => {
  return {
    version: app.getVersion(),
    isDev: isDev
  };
});

// Check for updates manually
ipcMain.handle('app-check-for-updates', async () => {
  if (isDev) {
    return {
      success: false,
      message: 'Updates are disabled in development mode'
    };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      success: true,
      updateInfo: result?.updateInfo
    };
  } catch (error) {
    console.error('[Auto-Updater] Check failed:', error);
    return {
      success: false,
      message: error.message
    };
  }
});

// Download update
ipcMain.handle('app-download-update', async () => {
  if (isDev) {
    return {
      success: false,
      message: 'Updates are disabled in development mode'
    };
  }

  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('[Auto-Updater] Download failed:', error);
    return {
      success: false,
      message: error.message
    };
  }
});

// Install update and restart
ipcMain.handle('app-install-update', () => {
  if (isDev) {
    return {
      success: false,
      message: 'Updates are disabled in development mode'
    };
  }

  try {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (error) {
    console.error('[Auto-Updater] Install failed:', error);
    return {
      success: false,
      message: error.message
    };
  }
});

// TTS Server IPC handlers
ipcMain.handle('tts-start-server', async (event, engine, options) => {
  if (!ttsManager) {
    return { success: false, error: 'TTS Manager not initialized' };
  }
  console.log(`[Electron IPC] Starting TTS server: ${engine}`);
  return await ttsManager.startServer(engine, options);
});

ipcMain.handle('tts-stop-server', async (event, engine) => {
  if (!ttsManager) {
    return { success: false, error: 'TTS Manager not initialized' };
  }
  console.log(`[Electron IPC] Stopping TTS server: ${engine}`);
  ttsManager.stopServer(engine);
  return { success: true };
});

ipcMain.handle('tts-get-status', async () => {
  if (!ttsManager) {
    return { success: false, error: 'TTS Manager not initialized' };
  }
  const status = await ttsManager.getStatus();
  return { success: true, status };
});

// TTS Dependency Setup IPC handlers
ipcMain.handle('tts-check-dependencies', async (event, engine) => {
  if (!ttsSetup) {
    return { success: false, error: 'TTS Setup not initialized' };
  }
  const status = ttsSetup.checkVenv(engine);
  return { success: true, ...status };
});

ipcMain.handle('tts-setup-dependencies', async (event, engine) => {
  if (!ttsSetup) {
    return { success: false, error: 'TTS Setup not initialized' };
  }

  console.log(`[Electron IPC] Setting up dependencies for ${engine || 'all engines'}`);

  // Send progress updates to renderer
  const sendProgress = (message) => {
    console.log(`[TTS Setup] ${message}`);
    if (mainWindow) {
      mainWindow.webContents.send('tts-setup-progress', message);
    }
  };

  if (engine) {
    return await ttsSetup.setupVenv(engine, sendProgress);
  } else {
    return await ttsSetup.setupAll(sendProgress);
  }
});
