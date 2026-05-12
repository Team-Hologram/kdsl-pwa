// scripts/generate-icons-splash.mjs
// Generates all icon sizes and iOS splash screens from source assets
// Run: node scripts/generate-icons-splash.mjs

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ICON_SRC = path.join(ROOT, 'public/icons/icon-source.png');
const SPLASH_SRC = path.join(ROOT, '..', 'kdrama-sl', 'assets', 'splash.png');

// ── Icon sizes ─────────────────────────────────────────────────────────────
const iconSizes = [96, 180, 192, 512];

async function generateIcons() {
  for (const size of iconSizes) {
    const out = path.join(ROOT, `public/icons/icon-${size}.png`);
    await sharp(ICON_SRC).resize(size, size).png().toFile(out);
    console.log(`✅ icon-${size}.png`);
  }
}

// ── iOS Splash Screens ─────────────────────────────────────────────────────
// Portrait dimensions for each iPhone
const splashSizes = [
  { w: 1290, h: 2796, name: 'splash-1290x2796.png' }, // iPhone 14 Pro Max
  { w: 1179, h: 2556, name: 'splash-1179x2556.png' }, // iPhone 14 Pro
  { w: 1170, h: 2532, name: 'splash-1170x2532.png' }, // iPhone 12/13
  { w: 1125, h: 2436, name: 'splash-1125x2436.png' }, // iPhone X/11 Pro
  { w: 828,  h: 1792, name: 'splash-828x1792.png'  }, // iPhone 11/XR
  { w: 750,  h: 1334, name: 'splash-750x1334.png'  }, // iPhone 8/SE2
  { w: 640,  h: 1136, name: 'splash-640x1136.png'  }, // iPhone SE 1st gen
];

const BG_COLOR = { r: 10, g: 14, b: 39, alpha: 1 }; // #0A0E27

async function generateSplash() {
  const splashDir = path.join(ROOT, 'public/splash');
  fs.mkdirSync(splashDir, { recursive: true });

  for (const { w, h, name } of splashSizes) {
    // Create background
    const bg = sharp({
      create: { width: w, height: h, channels: 4, background: BG_COLOR },
    });

    // Resize logo to ~40% of smaller dimension
    const logoSize = Math.round(Math.min(w, h) * 0.38);
    const logoBuffer = await sharp(ICON_SRC)
      .resize(logoSize, logoSize)
      .png()
      .toBuffer();

    const out = path.join(splashDir, name);
    await bg
      .composite([{
        input: logoBuffer,
        gravity: 'center',
      }])
      .png()
      .toFile(out);

    console.log(`✅ ${name}`);
  }
}

(async () => {
  console.log('Generating icons...');
  await generateIcons();
  console.log('\nGenerating splash screens...');
  await generateSplash();
  console.log('\n✅ All assets generated!');
})();
