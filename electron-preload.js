const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  quitApp: () => ipcRenderer.send('quit-app'),

  // TTS Server Control
  tts: {
    startServer: (engine, options) => ipcRenderer.invoke('tts-start-server', engine, options),
    stopServer: (engine) => ipcRenderer.invoke('tts-stop-server', engine),
    getStatus: () => ipcRenderer.invoke('tts-get-status'),
    checkDependencies: (engine) => ipcRenderer.invoke('tts-check-dependencies', engine),
    setupDependencies: (engine) => ipcRenderer.invoke('tts-setup-dependencies', engine),
    onSetupProgress: (callback) => ipcRenderer.on('tts-setup-progress', (event, message) => callback(message))
  },

  // Auto-Updater API
  updater: {
    // Get app version
    getVersion: () => ipcRenderer.invoke('app-get-version'),

    // Check for updates
    checkForUpdates: () => ipcRenderer.invoke('app-check-for-updates'),

    // Download update
    downloadUpdate: () => ipcRenderer.invoke('app-download-update'),

    // Install update and restart
    installUpdate: () => ipcRenderer.invoke('app-install-update'),

    // Event listeners
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update-available', (event, data) => callback(data));
    },

    onUpdateNotAvailable: (callback) => {
      ipcRenderer.on('update-not-available', (event, data) => callback(data));
    },

    onUpdateDownloadProgress: (callback) => {
      ipcRenderer.on('update-download-progress', (event, data) => callback(data));
    },

    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update-downloaded', (event, data) => callback(data));
    },

    onUpdateError: (callback) => {
      ipcRenderer.on('update-error', (event, data) => callback(data));
    },

    onUpdateStatus: (callback) => {
      ipcRenderer.on('update-status', (event, data) => callback(data));
    }
  }
});
