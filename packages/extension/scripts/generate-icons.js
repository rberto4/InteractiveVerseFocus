#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [16, 32, 48, 128];

// Generate PNG icons from SVG
async function generateIcons() {
  for (const size of sizes) {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad${size})" />
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
        fill="white" font-family="Arial, sans-serif" font-weight="bold" 
        font-size="${size * 0.5}">IF</text>
</svg>`;

    const filename = `icon${size}.png`;
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(iconsDir, filename));
    console.log(`✓ Created ${filename}`);
  }
  
  console.log('\n✓ All PNG icons generated!');
}

generateIcons().catch(console.error);
