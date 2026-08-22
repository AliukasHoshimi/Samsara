/**
 * Batch resize + compress photos for the website.
 *
 * SETUP (run once):
 *   npm install sharp
 *
 * USAGE:
 *   node resize-images.js "C:\path\to\source-folder" "C:\path\to\output-folder"
 *
 * What it does:
 *   - Recursively finds all .jpg/.jpeg/.png files in the source folder
 *     (keeps subfolder structure, so "Portfolio - Nature/photo.jpg"
 *     stays organized the same way in the output)
 *   - Resizes anything wider than MAX_WIDTH down to MAX_WIDTH
 *     (upscaling never happens — smaller originals are left alone)
 *   - Compresses to reasonable web-quality JPG
 *   - Skips a file if it's already been processed (safe to re-run)
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// ---- Settings you can tweak ----
const MAX_WIDTH = 2000;      // good balance for large hero/full-bleed images
const JPEG_QUALITY = 82;     // 75-85 is the sweet spot for photos
// ---------------------------------

const [, , srcArg, outArg] = process.argv;

if (!srcArg || !outArg) {
  console.error("Usage: node resize-images.js <source-folder> <output-folder>");
  process.exit(1);
}

const srcDir = path.resolve(srcArg);
const outDir = path.resolve(outArg);

const VALID_EXT = new Set([".jpg", ".jpeg", ".png"]);

function walk(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (VALID_EXT.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

async function processFile(srcPath) {
  const relPath = path.relative(srcDir, srcPath);
  const outPath = path.join(outDir, relPath).replace(/\.(png|jpeg)$/i, ".jpg");

  if (fs.existsSync(outPath)) {
    console.log(`skip (already done): ${relPath}`);
    return;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const image = sharp(srcPath).rotate(); // auto-orient using EXIF, then strip it
  const metadata = await image.metadata();

  let pipeline = image;
  if (metadata.width && metadata.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH });
  }

  await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(outPath);

  const beforeKB = (fs.statSync(srcPath).size / 1024).toFixed(0);
  const afterKB = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`done: ${relPath}  (${beforeKB}KB -> ${afterKB}KB)`);
}

async function main() {
  if (!fs.existsSync(srcDir)) {
    console.error(`Source folder not found: ${srcDir}`);
    process.exit(1);
  }

  const files = walk(srcDir);
  console.log(`Found ${files.length} images in ${srcDir}\n`);

  for (const file of files) {
    try {
      await processFile(file);
    } catch (err) {
      console.error(`FAILED: ${file}\n  ${err.message}`);
    }
  }

  console.log(`\nAll done. Output in: ${outDir}`);
}

main();
