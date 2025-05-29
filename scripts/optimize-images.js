// This script optimizes all images in the assets directory
// To run: node scripts/optimize-images.js

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if sharp is installed
let sharp;
try {
  sharp = await import('sharp');
  sharp = sharp.default;
} catch (e) {
  console.log('Sharp is not installed. Installing now...');
  execSync('npm install --save-dev sharp');
  console.log('Sharp has been installed.');
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
}

const assetsDir = path.join(__dirname, '../src/assets');
const publicDir = path.join(__dirname, '../public');

// Create output directories if they don't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Process images
async function processImages() {
  try {
    // Get all files in the assets directory
    const files = fs.readdirSync(assetsDir);
    
    // Filter for images
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
    });
    
    console.log(`Found ${imageFiles.length} images to optimize`);
    
    // Process each image
    for (const file of imageFiles) {
      const filePath = path.join(assetsDir, file);
      const fileExt = path.extname(file).toLowerCase();
      const fileName = path.basename(file, fileExt);
      
      console.log(`Optimizing: ${file}`);
      
      // Create WebP version
      await sharp(filePath)
        .webp({ quality: 80 })
        .toFile(path.join(publicDir, `${fileName}.webp`));
      
      // Create optimized original format
      await sharp(filePath)
        .toFile(path.join(publicDir, file));
      
      // Create PWA icons if it's a logo
      if (file.includes('logo') || file.includes('icon')) {
        await sharp(filePath)
          .resize(192, 192)
          .png()
          .toFile(path.join(publicDir, 'pwa-192x192.png'));
        
        await sharp(filePath)
          .resize(512, 512)
          .png()
          .toFile(path.join(publicDir, 'pwa-512x512.png'));
        
        await sharp(filePath)
          .resize(180, 180)
          .png()
          .toFile(path.join(publicDir, 'apple-touch-icon.png'));
      }
    }
    
    console.log('Image optimization complete!');
    
  } catch (err) {
    console.error('Error optimizing images:', err);
  }
}

processImages(); 

