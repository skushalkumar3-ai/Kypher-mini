const fs = require('fs');
const https = require('https');
const path = require('path');

const fontDir = path.join(__dirname, '..', 'fonts');
const fontPath = path.join(fontDir, 'SpaceGrotesk.ttf');
const url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf';

fs.mkdirSync(fontDir, { recursive: true });

if (fs.existsSync(fontPath)) {
  console.log('Space Grotesk font already exists.');
  process.exit(0);
}

https.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.warn(`Font download skipped: HTTP ${response.statusCode}`);
    process.exit(0);
  }

  const file = fs.createWriteStream(fontPath);
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Downloaded Space Grotesk font.');
  });
}).on('error', (error) => {
  console.warn(`Font download skipped: ${error.message}`);
});
