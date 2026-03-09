#!/usr/bin/env node

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);
const VIDEO_EXTENSIONS = new Set([".mov", ".mp4", ".m4v"]);
const COPY_ONLY_EXTENSIONS = new Set([".gif", ".glb", ".gltf", ".svg", ".webm"]);

function parseArgs(argv) {
  const args = {
    root: "public/assets",
    out: "public/assets-compressed",
    inPlace: false,
    dryRun: false,
    imagesOnly: false,
    videosOnly: false,
    quality: 72,
    maxWidth: 2200,
    maxHeight: 2200,
    crf: 28,
    preset: "veryfast",
    audioBitrateKbps: 128,
    limit: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const readNext = () => {
      if (i + 1 >= argv.length) {
        throw new Error(`Missing value for ${token}`);
      }
      i += 1;
      return argv[i];
    };

    switch (token) {
      case "--root":
        args.root = readNext();
        break;
      case "--out":
        args.out = readNext();
        break;
      case "--in-place":
        args.inPlace = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--images-only":
        args.imagesOnly = true;
        break;
      case "--videos-only":
        args.videosOnly = true;
        break;
      case "--quality":
        args.quality = Number(readNext());
        break;
      case "--max-width":
        args.maxWidth = Number(readNext());
        break;
      case "--max-height":
        args.maxHeight = Number(readNext());
        break;
      case "--crf":
        args.crf = Number(readNext());
        break;
      case "--preset":
        args.preset = readNext();
        break;
      case "--audio-bitrate":
        args.audioBitrateKbps = Number(readNext());
        break;
      case "--limit":
        args.limit = Number(readNext());
        break;
      case "--help":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown option: ${token}`);
    }
  }

  if (args.imagesOnly && args.videosOnly) {
    throw new Error("Use only one of --images-only or --videos-only.");
  }

  if (!Number.isFinite(args.quality) || args.quality < 1 || args.quality > 100) {
    throw new Error("--quality must be between 1 and 100.");
  }

  if (!Number.isFinite(args.maxWidth) || args.maxWidth < 1) {
    throw new Error("--max-width must be a positive number.");
  }

  if (!Number.isFinite(args.maxHeight) || args.maxHeight < 1) {
    throw new Error("--max-height must be a positive number.");
  }

  if (!Number.isFinite(args.crf) || args.crf < 0 || args.crf > 51) {
    throw new Error("--crf must be between 0 and 51.");
  }

  if (!Number.isFinite(args.audioBitrateKbps) || args.audioBitrateKbps < 32) {
    throw new Error("--audio-bitrate must be >= 32.");
  }

  if (args.limit !== undefined && (!Number.isFinite(args.limit) || args.limit < 1)) {
    throw new Error("--limit must be a positive number.");
  }

  return args;
}

function printHelp() {
  console.log(`Compress assets under /public/assets.

Usage:
  node scripts/compress-assets.mjs [options]

Options:
  --root <path>           Source root (default: public/assets)
  --out <path>            Output root (default: public/assets-compressed)
  --in-place              Replace files in source tree
  --dry-run               Scan only, do not write files
  --images-only           Process only image files
  --videos-only           Process only video files
  --quality <1-100>       Image quality (default: 72)
  --max-width <px>        Resize cap width (default: 2200)
  --max-height <px>       Resize cap height (default: 2200)
  --crf <0-51>            Video CRF for H.264 (default: 28)
  --preset <name>         ffmpeg preset (default: veryfast)
  --audio-bitrate <kbps>  ffmpeg audio bitrate (default: 128)
  --limit <n>             Process only first n files
  --help                  Show this help

Examples:
  npm run compress:assets -- --dry-run
  npm run compress:assets -- --out public/assets-compressed
  npm run compress:assets -- --in-place --images-only --quality 68
`);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(root) {
  const out = [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

function detectType(ext) {
  if (IMAGE_EXTENSIONS.has(ext)) {
    return "image";
  }
  if (VIDEO_EXTENSIONS.has(ext)) {
    return "video";
  }
  if (COPY_ONLY_EXTENSIONS.has(ext)) {
    return "copy";
  }
  return "skip";
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn(command, ["-version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

function tempPathFor(filePath) {
  return `${filePath}.tmp-${process.pid}`;
}

async function compressImage({ srcPath, destPath, ext, options, sharp }) {
  const pipeline = sharp(srcPath).rotate().resize({
    width: options.maxWidth,
    height: options.maxHeight,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (ext === ".jpg" || ext === ".jpeg") {
    pipeline.jpeg({ quality: options.quality, mozjpeg: true, progressive: true });
  } else if (ext === ".png") {
    pipeline.png({ quality: options.quality, compressionLevel: 9, palette: true, progressive: true });
  } else if (ext === ".webp") {
    pipeline.webp({ quality: options.quality });
  } else if (ext === ".avif") {
    pipeline.avif({ quality: Math.min(options.quality, 63) });
  } else {
    pipeline.tiff({ quality: options.quality, compression: "jpeg" });
  }

  const tmpDest = tempPathFor(destPath);
  await ensureDir(tmpDest);
  await pipeline.toFile(tmpDest);
  await fs.rename(tmpDest, destPath);
}

async function compressVideo({ srcPath, destPath, ext, options }) {
  const tmpDest = tempPathFor(destPath);
  await ensureDir(tmpDest);

  const args = [
    "-y",
    "-i",
    srcPath,
    "-map_metadata",
    "0",
    "-c:v",
    "libx264",
    "-preset",
    options.preset,
    "-crf",
    String(options.crf),
    "-c:a",
    "aac",
    "-b:a",
    `${options.audioBitrateKbps}k`,
  ];

  if (ext === ".mp4" || ext === ".m4v") {
    args.push("-movflags", "+faststart");
  }

  args.push(tmpDest);
  await runCommand("ffmpeg", args);
  await fs.rename(tmpDest, destPath);
}

async function copyFile(srcPath, destPath) {
  await ensureDir(destPath);
  await fs.copyFile(srcPath, destPath);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..");
  const srcRoot = path.resolve(projectRoot, options.root);
  const outRoot = options.inPlace ? srcRoot : path.resolve(projectRoot, options.out);

  if (!(await pathExists(srcRoot))) {
    throw new Error(`Source directory does not exist: ${srcRoot}`);
  }

  const shouldProcessImages = !options.videosOnly;
  const shouldProcessVideos = !options.imagesOnly;

  let sharp;
  if (shouldProcessImages) {
    try {
      sharp = (await import("sharp")).default;
    } catch {
      throw new Error('Missing dependency "sharp". Run: npm i -D sharp');
    }
  }

  const hasFfmpeg = shouldProcessVideos ? await commandExists("ffmpeg") : false;
  if (shouldProcessVideos && !hasFfmpeg) {
    console.warn("[warn] ffmpeg not found; video files will be copied unchanged.");
  }

  if (!options.inPlace && !options.dryRun) {
    await fs.mkdir(outRoot, { recursive: true });
  }

  let files = await walkFiles(srcRoot);
  files = files.sort((a, b) => a.localeCompare(b));
  if (options.limit !== undefined) {
    files = files.slice(0, options.limit);
  }

  const summary = {
    scanned: 0,
    compressedImages: 0,
    compressedVideos: 0,
    copied: 0,
    skipped: 0,
    failed: 0,
    inputBytes: 0,
    outputBytes: 0,
  };

  for (const srcPath of files) {
    summary.scanned += 1;
    const ext = path.extname(srcPath).toLowerCase();
    const type = detectType(ext);
    const relPath = path.relative(srcRoot, srcPath);
    const destPath = options.inPlace ? srcPath : path.join(outRoot, relPath);
    const srcStat = await fs.stat(srcPath);
    summary.inputBytes += srcStat.size;

    const processImage = type === "image" && shouldProcessImages;
    const processVideo = type === "video" && shouldProcessVideos;
    const canCopy = type === "copy";

    if (!processImage && !processVideo && !canCopy) {
      summary.skipped += 1;
      continue;
    }

    if (options.dryRun) {
      if (processImage) summary.compressedImages += 1;
      else if (processVideo) summary.compressedVideos += 1;
      else if (canCopy && !options.inPlace) summary.copied += 1;
      summary.outputBytes += srcStat.size;
      continue;
    }

    try {
      if (processImage) {
        await compressImage({ srcPath, destPath, ext, options, sharp });
        summary.compressedImages += 1;
      } else if (processVideo) {
        if (hasFfmpeg) {
          await compressVideo({ srcPath, destPath, ext, options });
          summary.compressedVideos += 1;
        } else if (!options.inPlace) {
          await copyFile(srcPath, destPath);
          summary.copied += 1;
        } else {
          summary.skipped += 1;
        }
      } else if (canCopy && !options.inPlace) {
        await copyFile(srcPath, destPath);
        summary.copied += 1;
      } else {
        summary.skipped += 1;
      }

      const outStat = await fs.stat(destPath);
      summary.outputBytes += outStat.size;
      console.log(`[ok] ${relPath}`);
    } catch (error) {
      summary.failed += 1;
      console.error(`[error] ${relPath}: ${error.message}`);
      const tmpDest = tempPathFor(destPath);
      if (await pathExists(tmpDest)) {
        await fs.rm(tmpDest, { force: true });
      }
    }
  }

  const saved = summary.inputBytes - summary.outputBytes;
  const ratio = summary.inputBytes > 0 ? (saved / summary.inputBytes) * 100 : 0;

  console.log("\nCompression summary");
  console.log(`scanned:            ${summary.scanned}`);
  console.log(`images compressed:  ${summary.compressedImages}`);
  console.log(`videos compressed:  ${summary.compressedVideos}`);
  console.log(`copied:             ${summary.copied}`);
  console.log(`skipped:            ${summary.skipped}`);
  console.log(`failed:             ${summary.failed}`);
  console.log(`input size:         ${formatBytes(summary.inputBytes)}`);
  console.log(`output size:        ${formatBytes(summary.outputBytes)}`);
  console.log(`saved:              ${formatBytes(saved)} (${ratio.toFixed(1)}%)`);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[fatal] ${error.message}`);
  process.exit(1);
});
