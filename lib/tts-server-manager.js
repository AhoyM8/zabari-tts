const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

/**
 * TTS Server Manager for Electron
 * Manages lifecycle of Kokoro TTS server
 */
class TTSServerManager {
  constructor(isDev, resourcesPath) {
    this.isDev = isDev;
    this.resourcesPath = resourcesPath;
    this.servers = {
      kokoro: null
    };
    this.serverProcesses = {
      kokoro: null
    };
  }

  /**
   * Get the base path for TTS directories
   */
  getBasePath() {
    if (this.isDev) {
      // Development: use project root
      return path.join(__dirname, '..');
    } else {
      // Production: TTS servers are in extraResources, which go to resources/ (not resources/app/)
      // So we use resourcesPath directly
      return this.resourcesPath;
    }
  }

  /**
   * Find Python executable
   * Priority: bundled Python > venv Python > system Python
   */
  findPythonExecutable(ttsEngine) {
    const pythonPaths = [
      // 1. Bundled portable Python (highest priority) - resources/python-embedded/
      path.join(this.resourcesPath, 'python-embedded', 'python.exe'),
      // 2. Venv Python
      path.join(this.getBasePath(), 'kokoro-tts', '.venv', 'Scripts', 'python.exe'),
      path.join(this.getBasePath(), 'kokoro-tts', '.venv', 'bin', 'python'),
      // 3. System Python (fallback)
      'python',
      'python3'
    ];

    for (const pythonPath of pythonPaths) {
      if (fs.existsSync(pythonPath)) {
        console.log(`[TTS Manager] ✓ Found Python for ${ttsEngine}:`, pythonPath);
        return pythonPath;
      }
    }

    // Return system python as last resort
    console.warn(`[TTS Manager] No Python found for ${ttsEngine}, will try system Python`);
    return 'python';
  }

  /**
   * Check if TTS server is running
   */
  async checkServer(port) {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}/health`, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => {
        resolve(false);
      });

      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Wait for server to be ready
   */
  async waitForServer(port, maxAttempts = 30) {
    console.log(`[TTS Manager] Waiting for server on port ${port}...`);
    console.log(`[TTS Manager] This may take a few minutes on first run (downloading models)...`);

    for (let i = 0; i < maxAttempts; i++) {
      if (await this.checkServer(port)) {
        console.log(`[TTS Manager] Server on port ${port} is ready!`);
        return true;
      }

      // Log progress every 10 attempts
      if ((i + 1) % 10 === 0) {
        console.log(`[TTS Manager] Still waiting... (${i + 1}/${maxAttempts} attempts)`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.error(`[TTS Manager] Server on port ${port} failed to start within timeout`);
    console.error(`[TTS Manager] Check the server logs above for details`);
    return false;
  }

  /**
   * Start Kokoro-82M server (port 8766)
   */
  async startKokoro(useGPU = false) {
    if (this.serverProcesses.kokoro) {
      console.log('[TTS Manager] Kokoro server already running');
      return { success: true, alreadyRunning: true };
    }

    // Check if already running (external instance)
    if (await this.checkServer(8766)) {
      console.log('[TTS Manager] Kokoro server already running externally');
      return { success: true, alreadyRunning: true };
    }

    try {
      const basePath = this.getBasePath();
      const kokoroDir = path.join(basePath, 'kokoro-tts');
      const serverScript = path.join(kokoroDir, 'tts-server.py');

      if (!fs.existsSync(serverScript)) {
        return {
          success: false,
          error: `Kokoro server script not found at: ${serverScript}`
        };
      }

      const pythonPath = this.findPythonExecutable('kokoro');

      const args = [serverScript];
      if (useGPU) {
        args.push('--device', 'cuda');
      }

      console.log('[TTS Manager] Starting Kokoro-82M server...');
      console.log('[TTS Manager] Python:', pythonPath);
      console.log('[TTS Manager] Script:', serverScript);
      console.log('[TTS Manager] Device:', useGPU ? 'cuda' : 'cpu');
      console.log('[TTS Manager] Working directory:', kokoroDir);

      // Set up environment for Kokoro (includes phonemizer support)
      const kokoroEnv = {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        // Note: espeak-ng is loaded automatically by espeakng-loader package
        // No need to set PHONEMIZER_ESPEAK_LIBRARY manually
      };

      this.serverProcesses.kokoro = spawn(pythonPath, args, {
        cwd: kokoroDir,
        shell: false,
        env: kokoroEnv
      });

      this.serverProcesses.kokoro.stdout.on('data', (data) => {
        console.log(`[Kokoro] ${data.toString().trim()}`);
      });

      this.serverProcesses.kokoro.stderr.on('data', (data) => {
        console.error(`[Kokoro Error] ${data.toString().trim()}`);
      });

      this.serverProcesses.kokoro.on('close', (code) => {
        console.log(`[TTS Manager] Kokoro server exited with code ${code}`);
        this.serverProcesses.kokoro = null;
      });

      // Wait for server to be ready (increased timeout for model download on first run)
      // First run may take 2-3 minutes to download models
      const ready = await this.waitForServer(8766, 180); // 180 seconds = 3 minutes

      if (ready) {
        console.log('[TTS Manager] ✓ Kokoro-82M server started successfully');
        return { success: true, port: 8766 };
      } else {
        this.stopKokoro();
        return {
          success: false,
          error: 'Kokoro server failed to start within timeout. On first run, models need to be downloaded which can take several minutes. Please check your internet connection and try again.'
        };
      }

    } catch (error) {
      console.error('[TTS Manager] Error starting Kokoro:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Start TTS server based on engine name
   */
  async startServer(engine, options = {}) {
    switch (engine) {
      case 'kokoro':
        return await this.startKokoro(options.useGPU || false);
      default:
        return {
          success: false,
          error: `Unknown TTS engine: ${engine}`
        };
    }
  }

  /**
   * Stop Kokoro server
   */
  stopKokoro() {
    if (this.serverProcesses.kokoro) {
      console.log('[TTS Manager] Stopping Kokoro server...');
      this.serverProcesses.kokoro.kill('SIGTERM');
      this.serverProcesses.kokoro = null;
    }
  }

  /**
   * Stop specific server
   */
  stopServer(engine) {
    switch (engine) {
      case 'kokoro':
        this.stopKokoro();
        break;
    }
  }

  /**
   * Stop all TTS servers
   */
  stopAll() {
    console.log('[TTS Manager] Stopping all TTS servers...');
    this.stopKokoro();
  }

  /**
   * Get status of all servers
   */
  async getStatus() {
    return {
      kokoro: {
        running: this.serverProcesses.kokoro !== null,
        port: 8766,
        reachable: await this.checkServer(8766)
      }
    };
  }
}

module.exports = TTSServerManager;
