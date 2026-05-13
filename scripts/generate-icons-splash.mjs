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
const SPLASH_SRC = path.join(ROOT, 'public/splash/kdsl.png');

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
  { w: 1320, h: 2868, name: 'splash-1320x2868.png' }, // iPhone 16 Pro Max
  { w: 1290, h: 2796, name: 'splash-1290x2796.png' }, // iPhone 14/15 Pro Max
  { w: 1284, h: 2778, name: 'splash-1284x2778.png' }, // iPhone 12/13 Pro Max, 14/15 Plus
  { w: 1206, h: 2622, name: 'splash-1206x2622.png' }, // iPhone 16 Pro
  { w: 1179, h: 2556, name: 'splash-1179x2556.png' }, // iPhone 14/15 Pro
  { w: 1170, h: 2532, name: 'splash-1170x2532.png' }, // iPhone 12/13/14
  { w: 1125, h: 2436, name: 'splash-1125x2436.png' }, // iPhone X/XS/11 Pro
  { w: 1242, h: 2688, name: 'splash-1242x2688.png' }, // iPhone XS Max/11 Pro Max
  { w: 828,  h: 1792, name: 'splash-828x1792.png'  }, // iPhone XR/11
  { w: 1242, h: 2208, name: 'splash-1242x2208.png' }, // iPhone 6/7/8 Plus
  { w: 750,  h: 1334, name: 'splash-750x1334.png'  }, // iPhone 6/7/8/SE2/SE3
  { w: 640,  h: 1136, name: 'splash-640x1136.png'  }, // iPhone SE 1st gen/5
  { w: 2048, h: 2732, name: 'splash-2048x2732.png' }, // iPad Pro 12.9
  { w: 1668, h: 2388, name: 'splash-1668x2388.png' }, // iPad Pro 11
  { w: 1668, h: 2224, name: 'splash-1668x2224.png' }, // iPad Pro 10.5/Air
  { w: 1536, h: 2048, name: 'splash-1536x2048.png' }, // iPad Mini/9.7
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

    // Center KDSL artwork. Trim white/transparent margins so the logo feels
    // balanced across small phones and large Pro/iPad launch screens.
    const logoSize = Math.round(Math.min(w, h) * 0.62);
    const logoBuffer = await sharp(SPLASH_SRC)
      .trim({ background: '#ffffff', threshold: 12 })
      .resize(logoSize, logoSize, { fit: 'contain' })
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
