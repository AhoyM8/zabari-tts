const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Download Python Embedded Distribution for Windows
 * This is a portable Python that doesn't require installation
 */

// Python 3.11.9 embedded (compatible with most packages)
const PYTHON_VERSION = '3.11.9';
const PYTHON_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip`;
const DOWNLOAD_DIR = path.join(__dirname, '..', 'python-embedded');
const ZIP_FILE = path.join(DOWNLOAD_DIR, 'python-embedded.zip');

console.log('📦 Downloading Portable Python...');
console.log(`Version: ${PYTHON_VERSION}`);
console.log(`URL: ${PYTHON_URL}`);

// Create download directory
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// Download Python
const file = fs.createWriteStream(ZIP_FILE);

https.get(PYTHON_URL, (response) => {
  const totalSize = parseInt(response.headers['content-length'], 10);
  let downloadedSize = 0;

  response.on('data', (chunk) => {
    downloadedSize += chunk.length;
    const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
    process.stdout.write(`\rDownloading: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`);
  });

  response.pipe(file);

  file.on('finish', () => {
    file.close(() => {
      console.log('\n✓ Download complete!');
      console.log('📦 Extracting...');

      try {
      // Extract using PowerShell (built into Windows)
      execSync(`powershell -command "Expand-Archive -Force '${ZIP_FILE}' '${DOWNLOAD_DIR}'"`, {
        stdio: 'inherit'
      });

      console.log('✓ Extraction complete!');

      // Delete zip file
      fs.unlinkSync(ZIP_FILE);

      // Enable pip by uncommenting import site in python311._pth
      const pthFile = path.join(DOWNLOAD_DIR, `python${PYTHON_VERSION.split('.').slice(0, 2).join('')}._pth`);
      if (fs.existsSync(pthFile)) {
        let content = fs.readFileSync(pthFile, 'utf8');
        content = content.replace('#import site', 'import site');
        fs.writeFileSync(pthFile, content);
        console.log('✓ Enabled pip support');
      }

      // Download get-pip.py
      console.log('📦 Installing pip...');
      const getPipPath = path.join(DOWNLOAD_DIR, 'get-pip.py');
      const getPipFile = fs.createWriteStream(getPipPath);

      https.get('https://bootstrap.pypa.io/get-pip.py', (response) => {
        response.pipe(getPipFile);
        getPipFile.on('finish', () => {
          getPipFile.close();

          // Install pip
          const pythonExe = path.join(DOWNLOAD_DIR, 'python.exe');
          try {
            execSync(`"${pythonExe}" "${getPipPath}"`, { stdio: 'inherit' });
            fs.unlinkSync(getPipPath);
            console.log('✓ Pip installed successfully');
            console.log('\n🎉 Portable Python is ready!');
            console.log(`Location: ${DOWNLOAD_DIR}`);
          } catch (error) {
            console.error('❌ Failed to install pip:', error.message);
          }
        });
      }).on('error', (err) => {
        console.error('❌ Failed to download get-pip.py:', err.message);
      });

      } catch (error) {
        console.error('❌ Failed to extract:', error.message);
      }
    });
  });
}).on('error', (err) => {
  fs.unlinkSync(ZIP_FILE);
  console.error('❌ Download failed:', err.message);
});
