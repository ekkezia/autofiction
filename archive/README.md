# Autofiction Archive

Dense archive/documentation site built with Next.js + Tailwind.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Asset Compression

A bulk compression script is available at `scripts/compress-assets.mjs` for files under `public/assets`.

### Commands

```bash
# scan only (no writes)
npm run compress:assets:dry

# compress to a new output folder (default: public/assets-compressed)
npm run compress:assets
```

### Common usage

```bash
# stronger image compression
npm run compress:assets -- --images-only --quality 68 --max-width 1920 --max-height 1920

# video-only compression
npm run compress:assets -- --videos-only --crf 30 --preset veryfast

# overwrite originals (destructive)
npm run compress:assets -- --in-place
```

### Flags reference

- `--root <path>`: source folder to scan (default: `public/assets`)
- `--out <path>`: output folder when not using in-place mode (default: `public/assets-compressed`)
- `--in-place`: overwrite source files directly (destructive)
- `--dry-run`: scan and report only, no files written
- `--images-only`: process only image formats
- `--videos-only`: process only video formats
- `--quality <1-100>`: image quality setting (default: `72`)
- `--max-width <px>`: max output image width (default: `2200`)
- `--max-height <px>`: max output image height (default: `2200`)
- `--crf <0-51>`: video quality for H.264 (default: `28`; higher = smaller + lower quality)
- `--preset <name>`: ffmpeg encode speed preset (default: `veryfast`)
- `--audio-bitrate <kbps>`: video audio bitrate (default: `128`)
- `--limit <n>`: process only first `n` files (useful for testing)
- `--help`: print full CLI help

### Notes

- Images are compressed with `sharp`.
- Videos are compressed with `ffmpeg` (`.mov/.mp4/.m4v`).
- `.gif`, `.glb`, `.gltf`, `.svg`, `.webm` are copied as-is when writing to an output folder.
- Use `--dry-run` first before any in-place operation.
