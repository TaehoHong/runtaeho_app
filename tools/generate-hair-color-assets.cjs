#!/usr/bin/env node

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT_DIR = path.resolve(__dirname, '..');
const HAIR_DIR = path.join(ROOT_DIR, 'assets', 'items', 'Hair');
const GENERATED_TS_PATH = path.join(
  ROOT_DIR,
  'src',
  'shared',
  'constants',
  'generated',
  'hairColorImages.generated.ts'
);

const HAIR_COLORS = [
  { id: 1, name: '검정', hex: '#1A1A1A' },
  { id: 2, name: '갈색', hex: '#8B4513' },
  { id: 3, name: '금발', hex: '#FFD700' },
  { id: 4, name: '빨강', hex: '#DC143C' },
  { id: 5, name: '파랑', hex: '#4169E1' },
  { id: 6, name: '보라', hex: '#9370DB' },
  { id: 7, name: '흰색', hex: '#FFFFFF' },
];

function parseHexToRgb(hex) {
  const normalized = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function getSourceHairFiles() {
  return fs
    .readdirSync(HAIR_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function colorizePng(buffer, rgb) {
  const png = PNG.sync.read(buffer);
  const out = new PNG({ width: png.width, height: png.height });

  for (let i = 0; i < png.data.length; i += 4) {
    out.data[i] = Math.round((png.data[i] * rgb.r) / 255);
    out.data[i + 1] = Math.round((png.data[i + 1] * rgb.g) / 255);
    out.data[i + 2] = Math.round((png.data[i + 2] * rgb.b) / 255);
    out.data[i + 3] = png.data[i + 3];
  }

  return PNG.sync.write(out);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function generateImages() {
  const sourceFiles = getSourceHairFiles();
  if (sourceFiles.length === 0) {
    throw new Error(`No source hair png files found in ${HAIR_DIR}`);
  }

  for (const color of HAIR_COLORS) {
    const colorRgb = parseHexToRgb(color.hex);
    const outputDir = path.join(HAIR_DIR, String(color.id));
    ensureDir(outputDir);

    for (const fileName of sourceFiles) {
      const inputPath = path.join(HAIR_DIR, fileName);
      const outputPath = path.join(outputDir, fileName);
      const sourceBuffer = fs.readFileSync(inputPath);
      const tintedBuffer = colorizePng(sourceBuffer, colorRgb);
      fs.writeFileSync(outputPath, tintedBuffer);
    }
  }

  return sourceFiles;
}

function buildGeneratedTs(sourceFiles) {
  ensureDir(path.dirname(GENERATED_TS_PATH));

  const fileKeys = sourceFiles.map((fileName) => fileName.replace(/\.png$/i, ''));

  const lines = [];
  lines.push('/**');
  lines.push(' * AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.');
  lines.push(' * Run: npm run assets:generate-hair-colors');
  lines.push(' */');
  lines.push('');
  lines.push(
    'export const HAIR_COLOR_IMAGES: Readonly<Record<number, Readonly<Record<string, number>>>> = {'
  );

  for (const color of HAIR_COLORS) {
    lines.push(`  ${color.id}: {`);
    for (const key of fileKeys) {
      lines.push(`    '${key}': require('#/assets/items/Hair/${color.id}/${key}.png'),`);
    }
    lines.push('  },');
  }

  lines.push('};');
  lines.push('');
  lines.push(`export const HAIR_COLOR_IDS = [${HAIR_COLORS.map((color) => color.id).join(', ')}] as const;`);
  lines.push('');
  lines.push("export type HairColorImageName = keyof typeof HAIR_COLOR_IMAGES[1];");
  lines.push('');

  fs.writeFileSync(GENERATED_TS_PATH, `${lines.join('\n')}\n`);
}

function verify() {
  const sourceFiles = getSourceHairFiles();
  const expectedCount = sourceFiles.length * HAIR_COLORS.length;
  let missingCount = 0;

  for (const color of HAIR_COLORS) {
    for (const fileName of sourceFiles) {
      const outputPath = path.join(HAIR_DIR, String(color.id), fileName);
      if (!fs.existsSync(outputPath)) {
        missingCount += 1;
        console.error(`[missing] ${path.relative(ROOT_DIR, outputPath)}`);
      }
    }
  }

  if (!fs.existsSync(GENERATED_TS_PATH)) {
    missingCount += 1;
    console.error(`[missing] ${path.relative(ROOT_DIR, GENERATED_TS_PATH)}`);
  }

  if (missingCount > 0) {
    console.error(
      `[verify] failed: source=${sourceFiles.length}, expectedGenerated=${expectedCount}, missing=${missingCount}`
    );
    process.exit(1);
  }

  console.log(
    `[verify] ok: source=${sourceFiles.length}, generated=${expectedCount}, map=${path.relative(
      ROOT_DIR,
      GENERATED_TS_PATH
    )}`
  );
}

function main() {
  const isVerifyOnly = process.argv.includes('--verify');

  if (isVerifyOnly) {
    verify();
    return;
  }

  const sourceFiles = generateImages();
  buildGeneratedTs(sourceFiles);
  verify();
}

main();
