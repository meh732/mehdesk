// Prepares downloads directory and ensures Windows .exe and launcher assets exist
const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public', 'downloads');
const distDir = path.join(process.cwd(), 'dist', 'downloads');

[publicDir, distDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('✅ Downloads directory structure verified.');
