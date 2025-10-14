const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Setup TTS Dependencies
 * Creates virtual environments and installs Python packages
 */
class TTSDependencySetup {
  constructor(isDev, resourcesPath) {
    this.isDev = isDev;
    this.resourcesPath = resourcesPath;
  }

  getBasePath() {
    if (this.isDev) {
      return path.join(__dirname, '..');
    } else {
      return this.resourcesPath;
    }
  }

  /**
   * Check if venv exists and has packages installed
   * Also checks for embedded Python in production builds
   */
  checkVenv(engine) {
    const basePath = this.getBasePath();

    console.log(`[TTS Setup] Checking dependencies for ${engine}`);
    console.log(`[TTS Setup] Base path: ${basePath}`);
    console.log(`[TTS Setup] Is Dev: ${this.isDev}`);

    // PRIORITY 1: Check embedded Python first (for standalone builds)
    const embeddedPythonPath = path.join(this.resourcesPath, 'python-embedded');
    const embeddedSitePackages = path.join(embeddedPythonPath, 'Lib', 'site-packages');

    console.log(`[TTS Setup] Checking embedded Python at: ${embeddedPythonPath}`);

    if (fs.existsSync(embeddedSitePackages)) {
      console.log(`[TTS Setup] Found embedded Python site-packages`);
      const keyPackage = engine === 'neutts' ? 'neutts' : 'kokoro';
      const packagePath = path.join(embeddedSitePackages, keyPackage);
      const hasPackages = fs.existsSync(packagePath);

      console.log(`[TTS Setup] Embedded Python - Key package (${keyPackage}) exists: ${hasPackages}`);

      if (hasPackages) {
        console.log(`[TTS Setup] ✓ Using embedded Python with ${keyPackage} installed`);
        return { exists: true, hasPackages: true, usingEmbedded: true };
      }
    }

    // PRIORITY 2: Check for venv in engine directory (for development)
    const engineDir = engine === 'neutts' ? 'neutts-air' : 'kokoro-tts';
    const venvDir = path.join(basePath, engineDir, '.venv');

    console.log(`[TTS Setup] Checking venv at: ${venvDir}`);
    console.log(`[TTS Setup] Venv exists: ${fs.existsSync(venvDir)}`);

    // Check if venv directory exists
    if (!fs.existsSync(venvDir)) {
      console.log(`[TTS Setup] ❌ No venv found and no embedded Python with packages`);
      return { exists: false, hasPackages: false };
    }

    // Check if Scripts/python.exe (Windows) or bin/python (Linux/Mac) exists
    const pythonPaths = [
      path.join(venvDir, 'Scripts', 'python.exe'),
      path.join(venvDir, 'bin', 'python')
    ];

    const pythonPath = pythonPaths.find(p => fs.existsSync(p));
    console.log(`[TTS Setup] Venv Python path found: ${pythonPath}`);

    if (!pythonPath) {
      return { exists: true, hasPackages: false };
    }

    // Check if packages are installed by looking for site-packages
    const sitePackagesPaths = [
      path.join(venvDir, 'Lib', 'site-packages'),
      path.join(venvDir, 'lib', 'python3.8', 'site-packages'),
      path.join(venvDir, 'lib', 'python3.9', 'site-packages'),
      path.join(venvDir, 'lib', 'python3.10', 'site-packages'),
      path.join(venvDir, 'lib', 'python3.11', 'site-packages'),
      path.join(venvDir, 'lib', 'python3.12', 'site-packages')
    ];

    const sitePackagesPath = sitePackagesPaths.find(p => fs.existsSync(p));
    console.log(`[TTS Setup] Venv site-packages found: ${sitePackagesPath}`);

    // Check if key packages exist
    let hasPackages = false;
    if (sitePackagesPath) {
      const keyPackage = engine === 'neutts' ? 'neutts' : 'kokoro';
      const packagePath = path.join(sitePackagesPath, keyPackage);
      hasPackages = fs.existsSync(packagePath);
      console.log(`[TTS Setup] Venv - Key package (${keyPackage}) exists: ${hasPackages}`);
    }

    if (hasPackages) {
      console.log(`[TTS Setup] ✓ Using venv with packages installed`);
    }

    return { exists: true, hasPackages };
  }

  /**
   * Setup venv for a specific engine
   */
  async setupVenv(engine, onProgress) {
    const basePath = this.getBasePath();
    const engineDir = engine === 'neutts' ? 'neutts-air' : 'kokoro-tts';
    const enginePath = path.join(basePath, engineDir);
    const requirementsPath = path.join(enginePath, 'requirements.txt');

    if (!fs.existsSync(requirementsPath)) {
      return {
        success: false,
        error: `Requirements file not found: ${requirementsPath}`
      };
    }

    onProgress?.(`Creating virtual environment for ${engine}...`);

    // Create venv
    const createVenvResult = await this.runCommand('python', ['-m', 'venv', '.venv'], enginePath, onProgress);
    if (!createVenvResult.success) {
      return {
        success: false,
        error: `Failed to create venv: ${createVenvResult.error}`
      };
    }

    onProgress?.(`Upgrading pip...`);

    // Find pip in venv
    const pipPaths = [
      path.join(enginePath, '.venv', 'Scripts', 'pip.exe'),
      path.join(enginePath, '.venv', 'bin', 'pip')
    ];

    const pipPath = pipPaths.find(p => fs.existsSync(p)) || 'pip';

    // Upgrade pip first
    const upgradePipResult = await this.runCommand(
      pipPath,
      ['install', '--upgrade', 'pip'],
      enginePath,
      onProgress
    );

    if (!upgradePipResult.success) {
      console.warn('[TTS Setup] Failed to upgrade pip, continuing anyway...');
    }

    onProgress?.(`Installing packages for ${engine}...`);

    // Install packages one by one with --only-binary to ensure we get prebuilt wheels
    const packages = [
      'numpy==1.26.4',
      'soundfile==0.13.1',
      'torch==2.2.0',
      'kokoro==0.7.16'
    ];

    for (const pkg of packages) {
      onProgress?.(`Installing ${pkg}...`);
      const installResult = await this.runCommand(
        pipPath,
        ['install', '--only-binary', ':all:', pkg],
        enginePath,
        onProgress
      );

      if (!installResult.success) {
        return {
          success: false,
          error: `Failed to install ${pkg}: ${installResult.error}`
        };
      }
    }

    onProgress?.(`✓ ${engine} setup complete!`);

    return { success: true };
  }

  /**
   * Run a command and capture output
   */
  runCommand(command, args, cwd, onProgress) {
    return new Promise((resolve) => {
      const proc = spawn(command, args, {
        cwd,
        shell: true,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'
        }
      });

      let output = '';
      let errorOutput = '';

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        onProgress?.(text.trim());
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        onProgress?.(text.trim());
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          resolve({
            success: false,
            error: errorOutput || output,
            code
          });
        }
      });

      proc.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });
    });
  }

  /**
   * Check if Python is installed
   */
  async checkPython() {
    const result = await this.runCommand('python', ['--version'], process.cwd());
    return result.success;
  }

  /**
   * Setup all TTS engines
   */
  async setupAll(onProgress) {
    onProgress?.('Checking Python installation...');

    const pythonInstalled = await this.checkPython();
    if (!pythonInstalled) {
      return {
        success: false,
        error: 'Python is not installed or not in PATH. Please install Python 3.8+ from python.org'
      };
    }

    onProgress?.('Python found!');

    // Setup NeuTTS
    const neuttsStatus = this.checkVenv('neutts');
    if (!neuttsStatus.exists || !neuttsStatus.hasPackages) {
      onProgress?.('Setting up NeuTTS Air...');
      const neuttsResult = await this.setupVenv('neutts', onProgress);
      if (!neuttsResult.success) {
        return neuttsResult;
      }
    } else {
      onProgress?.('✓ NeuTTS Air already setup');
    }

    // Setup Kokoro
    const kokoroStatus = this.checkVenv('kokoro');
    if (!kokoroStatus.exists || !kokoroStatus.hasPackages) {
      onProgress?.('Setting up Kokoro-82M...');
      const kokoroResult = await this.setupVenv('kokoro', onProgress);
      if (!kokoroResult.success) {
        return kokoroResult;
      }
    } else {
      onProgress?.('✓ Kokoro-82M already setup');
    }

    onProgress?.('🎉 All TTS engines ready!');

    return { success: true };
  }
}

module.exports = TTSDependencySetup;
