/**
 * Test script for Kokoro TTS audio playback
 * Tests the entire flow: HTTP request -> TTS server -> audio playback
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const KOKORO_SERVER = 'http://localhost:8766';
const TEST_TEXT = 'Hello, this is a test of the Kokoro TTS system';
const TEST_VOICE = 'af_heart';
const TEST_SPEED = 1.0;

async function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(`${KOKORO_SERVER}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function synthesizeAndPlay() {
  console.log('='.repeat(60));
  console.log('KOKORO TTS PLAYBACK TEST');
  console.log('='.repeat(60));

  // Check server
  console.log('\n1. Checking Kokoro server...');
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.error('❌ Kokoro server is not running on port 8766!');
    console.error('   Start it with: cd kokoro-tts && .venv/Scripts/python tts-server.py');
    process.exit(1);
  }
  console.log('✓ Kokoro server is running');

  // Launch browser in HEADED mode (critical for audio!)
  console.log('\n2. Launching browser in HEADED mode...');
  const browser = await chromium.launch({
    headless: false,  // MUST be false for audio to work!
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage();
  await page.goto('about:blank');
  console.log('✓ Browser launched');

  // Synthesize speech
  console.log('\n3. Requesting TTS synthesis...');
  const payload = {
    text: TEST_TEXT,
    voice: TEST_VOICE,
    speed: TEST_SPEED
  };
  console.log('   Payload:', payload);

  const audioBuffer = await new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 8766,
      path: '/synthesize',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  console.log(`✓ Received ${audioBuffer.length} bytes of audio data`);

  // Play audio in browser
  console.log('\n4. Playing audio in browser...');
  const base64Audio = audioBuffer.toString('base64');

  await page.evaluate((audioData) => {
    return new Promise((resolve) => {
      console.log('[Browser] Decoding audio...');
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioContext = new AudioContext();
      console.log('[Browser] AudioContext state:', audioContext.state);

      audioContext.decodeAudioData(bytes.buffer, (audioBuffer) => {
        console.log('[Browser] Audio decoded! Duration:', audioBuffer.duration, 'seconds');
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        source.onended = () => {
          console.log('[Browser] ✓ Playback finished!');
          resolve();
        };

        source.start(0);
        console.log('[Browser] 🔊 Playing audio NOW!');
      }, (error) => {
        console.error('[Browser] Decode error:', error);
        resolve();
      });
    });
  }, base64Audio);

  console.log('\n✅ TEST COMPLETE - You should have heard audio!');
  console.log('   If you heard the voice say the test message, everything is working!');
  console.log('\n   Press Ctrl+C to close the browser and exit...\n');

  // Keep browser open so user can verify
  await new Promise(() => {});
}

synthesizeAndPlay().catch(console.error);
