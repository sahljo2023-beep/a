const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// إنشاء مجلد مؤقت خفيف للرفع
const sourceDir = path.resolve(__dirname);
const targetDir = path.resolve(__dirname, '..', 'hotel-attendance-clean');

if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// نسخ الملفات الضرورية فقط
['src', 'prisma', 'package.json', 'netlify.toml', 'next.config.ts', 'tsconfig.json', 'README.md'].forEach((item) => {
  const p = path.join(sourceDir, item);
  if (fs.existsSync(p)) {
    copyRecursiveSync(p, path.join(targetDir, item));
  }
});

console.log('CLEAN_FOLDER_CREATED_AT:', targetDir);
