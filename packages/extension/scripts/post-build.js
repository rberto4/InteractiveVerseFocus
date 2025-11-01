#!/usr/bin/env node
import { copyFileSync, mkdirSync, existsSync, readdirSync, renameSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

// Copy manifest
copyFileSync(
  join(rootDir, 'public', 'manifest.json'),
  join(distDir, 'manifest.json')
);

// Move index.html from src/popup/ to root as popup.html
const htmlSource = join(distDir, 'src', 'popup', 'index.html');
const htmlDest = join(distDir, 'popup.html');
if (existsSync(htmlSource)) {
  renameSync(htmlSource, htmlDest);
  
  // Fix script paths in popup.html (absolute to relative)
  let htmlContent = readFileSync(htmlDest, 'utf-8');
  htmlContent = htmlContent.replace(/src="\/popup\.js"/g, 'src="./popup.js"');
  htmlContent = htmlContent.replace(/href="\/popup\.css"/g, 'href="./popup.css"');
  writeFileSync(htmlDest, htmlContent);
  
  // Remove empty src directory
  try {
    rmSync(join(distDir, 'src'), { recursive: true, force: true });
  } catch (e) {
    // Ignore errors
  }
}

console.log('✓ Extension build finalized');
console.log('  - manifest.json copied');
console.log('  - popup.html moved to root');
console.log('  - Script paths fixed');
