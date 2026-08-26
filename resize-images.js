/**
 * Turn a folder of photos into a site-ready gallery.
 *
 * SETUP (run once):
 *   npm install
 *
 * USAGE:
 *   node resize-images.js "C:\path\to\photos" "images\portfolio\boudoir"
 *   node resize-images.js "C:\path\to\photos" "images\weddings\abby-tyler" --cap=60 --hero=918A8735.jpg
 *
 * What it does:
 *   - Recursively finds all .jpg/.jpeg/.png files in the source folder,
 *     sorted by filename (camera filenames sort chronologically)
 *   - If --cap=N is given and there are more than N files, evenly samples
 *     N of them across the full sorted list (spans the whole shoot,
 *     rather than just taking the first N)
 *   - Resizes anything wider than MAX_WIDTH down to MAX_WIDTH
 *     (upscaling never happens — smaller originals are left alone)
 *   - Compresses to reasonable web-quality JPG, auto-orients from EXIF
 *   - Classifies each photo's real aspect ratio into one of the site's
 *     5 masonry ratio classes (wide/square/tall/portrait/panorama), so
 *     gallery tiles crop close to the actual shot instead of an
 *     arbitrary shape
 *   - Writes everything into the destination folder numbered 01.jpg,
 *     02.jpg, ... — exactly the filenames the site's HTML expects
 *   - Writes hero.jpg: the file named by --hero=<original-filename> if
 *     given, otherwise a copy of the first photo in the set
 *   - Writes manifest.json in the destination folder — one entry per
 *     photo with its number, ratio class, and a rotating ph- color
 *     class — for a page-generation script to consume
 *
 * Every file that's part of the output gets downloaded from Dropbox (or
 * wherever the source lives) and processed, so keep --cap reasonable
 * for large folders. Re-running is safe (it overwrites); if the source
 * folder's contents change, re-run the whole batch rather than topping
 * it up, since numbering is positional.
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// ---- Settings you can tweak ----
const MAX_WIDTH = 2000;      // good balance for large hero/full-bleed images
const JPEG_QUALITY = 82;     // 75-85 is the sweet spot for photos
// ---------------------------------

const RATIO_TARGETS = [
  { name: "ratio-wide", value: 3 / 2 },
  { name: "ratio-square", value: 1 },
  { name: "ratio-tall", value: 4 / 5 },
  { name: "ratio-portrait", value: 2 / 3 },
  { name: "ratio-panorama", value: 2 / 1 },
];

function classifyRatio(width, height) {
  const actual = width / height;
  let best = RATIO_TARGETS[0];
  let bestDist = Infinity;
  for (const t of RATIO_TARGETS) {
    const dist = Math.abs(Math.log(actual) - Math.log(t.value));
    if (dist < bestDist) {
      bestDist = dist;
      best = t;
    }
  }
  return best.name;
}

const args = process.argv.slice(2);
const heroArg = args.find((a) => a.startsWith("--hero="));
const heroFilename = heroArg ? heroArg.slice("--hero=".length) : null;
const capArg = args.find((a) => a.startsWith("--cap="));
const cap = capArg ? parseInt(capArg.slice("--cap=".length), 10) : null;
const [srcArg, outArg] = args.filter((a) => !a.startsWith("--"));

if (!srcArg || !outArg) {
  console.error("Usage: node resize-images.js <source-folder> <output-folder> [--cap=N] [--hero=<original-filename>]");
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

function evenSample(list, n) {
  if (list.length <= n) return list;
  const indices = new Set();
  for (let i = 0; i < n; i++) {
    indices.add(Math.round((i * (list.length - 1)) / (n - 1)));
  }
  return [...indices].sort((a, b) => a - b).map((i) => list[i]);
}

async function processFile(srcPath, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const rawMeta = await sharp(srcPath).metadata();
  let { width, height, orientation } = rawMeta;
  if (orientation && orientation >= 5 && orientation <= 8) {
    [width, height] = [height, width];
  }
  const ratio = width && height ? classifyRatio(width, height) : "ratio-wide";

  const image = sharp(srcPath).rotate(); // auto-orient using EXIF, then strip it
  let pipeline = image;
  if (width && width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH });
  }

  await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(outPath);

  const beforeKB = (fs.statSync(srcPath).size / 1024).toFixed(0);
  const afterKB = (fs.statSync(outPath).size / 1024).toFixed(0);
  return { beforeKB, afterKB, ratio };
}

async function main() {
  if (!fs.existsSync(srcDir)) {
    console.error(`Source folder not found: ${srcDir}`);
    process.exit(1);
  }

  let files = walk(srcDir).sort();
  console.log(`Found ${files.length} images in ${srcDir}`);

  if (!files.length) {
    console.log("Nothing to do.");
    return;
  }

  if (cap) {
    files = evenSample(files, cap);
    console.log(`Sampled down to ${files.length} (--cap=${cap})`);
  }
  console.log("");

  const pad = Math.max(2, String(files.length).length);
  let heroSrc = null;
  const manifest = [];

  for (let i = 0; i < files.length; i++) {
    const srcPath = files[i];
    const num = String(i + 1).padStart(pad, "0");
    const outPath = path.join(outDir, `${num}.jpg`);

    if (heroFilename && path.basename(srcPath) === heroFilename) {
      heroSrc = srcPath;
    }

    try {
      const { beforeKB, afterKB, ratio } = await processFile(srcPath, outPath);
      console.log(`${num}.jpg  <-  ${path.basename(srcPath)}  (${beforeKB}KB -> ${afterKB}KB, ${ratio})`);
      manifest.push({
        num,
        file: `${num}.jpg`,
        ratio,
        phClass: `ph-${(i % 12) + 1}`,
      });
    } catch (err) {
      console.error(`FAILED: ${srcPath}\n  ${err.message}`);
    }
  }

  const heroOutPath = path.join(outDir, "hero.jpg");
  try {
    if (heroSrc) {
      await processFile(heroSrc, heroOutPath);
    } else {
      fs.copyFileSync(path.join(outDir, manifest[0].file), heroOutPath);
    }
    console.log(`hero.jpg written`);
  } catch (err) {
    console.error(`FAILED to write hero.jpg\n  ${err.message}`);
  }

  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`manifest.json written (${manifest.length} entries)`);

  console.log(`\nAll done. Output in: ${outDir}`);
}

main();
