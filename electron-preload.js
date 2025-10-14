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
  }
});
