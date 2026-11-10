#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const source = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/images/splash@3x.png')));
// Reuse the title and characters from the iOS artwork.
const logo = new PNG({ width: 888, height: 528 });
PNG.bitblt(source, logo, 120, 504, logo.width, logo.height, 0, 0);
fs.writeFileSync(path.join(root, 'assets/images/splash-android.png'), PNG.sync.write(logo));

// A 160dp title fits inside Android's 192dp circular safe area on a 288dp canvas.
for (const [density, scale] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
  const size = 288 * scale;
  const width = 160 * scale;
  const height = Math.round(width * logo.height / logo.width);
  const left = (size - width) / 2;
  const top = Math.floor((size - height) / 2);
  const output = new PNG({ width: size, height: size });
  for (let i = 0; i < output.data.length; i += 4) source.data.copy(output.data, i, 0, 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = (Math.floor(y * logo.height / height) * logo.width + Math.floor(x * logo.width / width)) * 4;
      const targetOffset = ((top + y) * size + left + x) * 4;
      logo.data.copy(output.data, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }
  fs.writeFileSync(path.join(root, `android/app/src/main/res/drawable-${density}/splashscreen_logo.png`), PNG.sync.write(output));
}
