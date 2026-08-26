/**
 * Turn a folder of curated photo picks into a site-ready gallery.
 *
 * SETUP (run once):
 *   npm install --save-dev sharp
 *
 * USAGE:
 *   node resize-images.js "C:\path\to\curated-picks" "images\portfolio\boudoir"
 *   node resize-images.js "C:\path\to\curated-picks" "images\weddings\abby-tyler" --hero=918A8735.jpg
 *
 * What it does:
 *   - Recursively finds all .jpg/.jpeg/.png files in the source folder,
 *     sorted by filename (camera filenames sort chronologically)
 *   - Resizes anything wider than MAX_WIDTH down to MAX_WIDTH
 *     (upscaling never happens — smaller originals are left alone)
 *   - Compresses to reasonable web-quality JPG, auto-orients from EXIF
 *   - Writes them into the destination folder numbered 01.jpg, 02.jpg, ...
 *     — exactly the filenames the site's HTML already expects
 *   - Also writes hero.jpg: the file named by --hero=<original-filename>
 *     if given, otherwise a copy of 01.jpg
 *
 * Point this at a SMALL curated folder (the ~10-15 shots you actually
 * want on the site), not a full delivery gallery — every file here gets
 * downloaded from Dropbox and processed. Re-running is safe (it
 * overwrites), but if you add/remove photos from the source folder the
 * numbering shifts, so re-run the whole batch rather than topping it up.
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// ---- Settings you can tweak ----
const MAX_WIDTH = 2000;      // good balance for large hero/full-bleed images
const JPEG_QUALITY = 82;     // 75-85 is the sweet spot for photos
// ---------------------------------

const args = process.argv.slice(2);
const heroArg = args.find((a) => a.startsWith("--hero="));
const heroFilename = heroArg ? heroArg.slice("--hero=".length) : null;
const [srcArg, outArg] = args.filter((a) => !a.startsWith("--"));

if (!srcArg || !outArg) {
  console.error("Usage: node resize-images.js <source-folder> <output-folder> [--hero=<original-filename>]");
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

async function processFile(srcPath, outPath) {
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
  return { beforeKB, afterKB };
}

async function main() {
  if (!fs.existsSync(srcDir)) {
    console.error(`Source folder not found: ${srcDir}`);
    process.exit(1);
  }

  const files = walk(srcDir).sort();
  console.log(`Found ${files.length} images in ${srcDir}\n`);

  if (!files.length) {
    console.log("Nothing to do.");
    return;
  }

  const pad = Math.max(2, String(files.length).length);
  let heroSrc = null;

  for (let i = 0; i < files.length; i++) {
    const srcPath = files[i];
    const num = String(i + 1).padStart(pad, "0");
    const outPath = path.join(outDir, `${num}.jpg`);

    if (heroFilename && path.basename(srcPath) === heroFilename) {
      heroSrc = srcPath;
    }

    try {
      const { beforeKB, afterKB } = await processFile(srcPath, outPath);
      console.log(`${num}.jpg  <-  ${path.basename(srcPath)}  (${beforeKB}KB -> ${afterKB}KB)`);
    } catch (err) {
      console.error(`FAILED: ${srcPath}\n  ${err.message}`);
    }
  }

  const heroOutPath = path.join(outDir, "hero.jpg");
  try {
    if (heroSrc) {
      await processFile(heroSrc, heroOutPath);
    } else {
      fs.copyFileSync(path.join(outDir, `1`.padStart(pad, "0") + ".jpg"), heroOutPath);
    }
    console.log(`hero.jpg written`);
  } catch (err) {
    console.error(`FAILED to write hero.jpg\n  ${err.message}`);
  }

  console.log(`\nAll done. Output in: ${outDir}`);
}

main();
