#!/usr/bin/env node
// Compresses images in public/images/ that exceed 100KB using sharp.
// Run: node scripts/optimize-images.js
const fs = require("fs");
const path = require("path");

const THRESHOLD_BYTES = 100 * 1024; // 100KB
const IMG_DIR = path.join(__dirname, "../public/images");

async function optimizeDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log("No public/images/ directory found — skipping.");
    return;
  }

  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error("sharp not installed. Run: npm install -D sharp");
    process.exit(1);
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let optimized = 0;
  let skipped = 0;

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await optimizeDir(full);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) continue;

    const stat = fs.statSync(full);
    if (stat.size <= THRESHOLD_BYTES) {
      skipped++;
      continue;
    }

    const sizeBefore = stat.size;
    const tmp = full + ".tmp";

    try {
      if (ext === ".png") {
        await sharp(full).png({ compressionLevel: 9, quality: 85 }).toFile(tmp);
      } else {
        await sharp(full).jpeg({ quality: 82, progressive: true }).toFile(tmp);
      }

      const sizeAfter = fs.statSync(tmp).size;
      if (sizeAfter < sizeBefore) {
        fs.renameSync(tmp, full);
        console.log(
          `  ✓ ${entry.name}: ${(sizeBefore / 1024).toFixed(0)}KB → ${(sizeAfter / 1024).toFixed(0)}KB`,
        );
        optimized++;
      } else {
        fs.unlinkSync(tmp);
        skipped++;
      }
    } catch (e) {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      console.warn(`  ⚠ Skipped ${entry.name}: ${e.message}`);
    }
  }

  if (optimized + skipped > 0) {
    console.log(`\nOptimized: ${optimized} | Already optimal: ${skipped}`);
  }
}

optimizeDir(IMG_DIR).catch(console.error);
