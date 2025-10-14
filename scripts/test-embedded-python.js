#!/usr/bin/env node
/**
 * Test Embedded Python Setup
 * Verifies that embedded Python has all required packages installed
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PYTHON_PATH = path.join(__dirname, '..', 'python-embedded', 'python.exe');
const REQUIRED_PACKAGES = [
  'numpy',
  'torch',
  'soundfile',
  'kokoro',
  'phonemizer',
  'espeakng_loader'
];

console.log('🔍 Testing Embedded Python Setup...\n');

// Check if Python executable exists
if (!fs.existsSync(PYTHON_PATH)) {
  console.error('❌ Python executable not found at:', PYTHON_PATH);
  process.exit(1);
}

console.log('✅ Python executable found:', PYTHON_PATH);

// Function to run Python command
function runPython(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_PATH, args, {
      cwd: path.join(__dirname, '..'),
      shell: false
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || stdout));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    // Test 1: Check Python version
    console.log('\n📝 Test 1: Python Version');
    const version = await runPython(['--version']);
    console.log('✅', version.trim());

    // Test 2: Check pip
    console.log('\n📝 Test 2: Pip Available');
    await runPython(['-m', 'pip', '--version']);
    console.log('✅ Pip is working');

    // Test 3: Check required packages
    console.log('\n📝 Test 3: Required Packages');
    for (const pkg of REQUIRED_PACKAGES) {
      try {
        await runPython(['-c', `import ${pkg}; print('${pkg}')`]);
        console.log(`✅ ${pkg}`);
      } catch (err) {
        console.error(`❌ ${pkg} - NOT FOUND`);
        throw err;
      }
    }

    // Test 4: Check Kokoro version
    console.log('\n📝 Test 4: Kokoro Version');
    const kokoroVersion = await runPython(['-c', 'import kokoro; print(kokoro.__version__)']);
    console.log('✅ Kokoro version:', kokoroVersion.trim());

    // Test 5: Check espeak-ng loader
    console.log('\n📝 Test 5: espeak-ng Loader');
    await runPython(['-c', 'import espeakng_loader; lib = espeakng_loader.load_library(); print("loaded")']);
    console.log('✅ espeak-ng can be loaded');

    // Test 6: Check torch device
    console.log('\n📝 Test 6: PyTorch Device');
    const torchInfo = await runPython(['-c', 'import torch; print(f"CPU: {torch.cpu.is_available()}"); print(f"CUDA: {torch.cuda.is_available()}")']);
    console.log('✅ PyTorch info:');
    console.log(torchInfo.trim().split('\n').map(line => '   ' + line).join('\n'));

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\nEmbedded Python is ready for standalone deployment.');
    console.log('You can now build the app with: npm run dist');
    console.log('');

  } catch (err) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error('\nError:', err.message);
    console.error('\nPlease check the embedded Python setup.');
    process.exit(1);
  }
}

main();
