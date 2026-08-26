/**
 * Resize + compress a single photo to a specific destination path.
 * Companion to resize-images.js, for one-off bio/hero shots that need
 * an exact site-expected filename rather than gallery numbering.
 *
 * USAGE:
 *   node resize-single.js "C:\path\to\source.jpg" "images\about\hero.jpg"
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const MAX_WIDTH = 2000;
const JPEG_QUALITY = 82;

const [srcArg, outArg] = process.argv.slice(2);
if (!srcArg || !outArg) {
  console.error("Usage: node resize-single.js <source-file> <output-file>");
  process.exit(1);
}

const srcPath = path.resolve(srcArg);
const outPath = path.resolve(outArg);

async function main() {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const image = sharp(srcPath).rotate();
  const metadata = await image.metadata();

  let pipeline = image;
  if (metadata.width && metadata.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH });
  }

  await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(outPath);

  const beforeKB = (fs.statSync(srcPath).size / 1024).toFixed(0);
  const afterKB = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`${outArg}  <-  ${path.basename(srcPath)}  (${beforeKB}KB -> ${afterKB}KB)`);
}

main();
