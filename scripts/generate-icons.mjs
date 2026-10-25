import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const staticDir = path.join(rootDir, "static");
const srcAssetsDir = path.join(rootDir, "src", "lib", "assets");

// Base pot SVG markup (viewBox 0 0 80 80)
function getSvg({
  withBackground = false,
  bgColor = "#ffffff",
  rounded = 0,
  scale = 1,
  offsetY = 0,
} = {}) {
  const potContent = `
  <g transform="translate(${40 * (1 - scale)}, ${40 * (1 - scale) + offsetY}) scale(${scale})">
    <!-- steam -->
    <g class="steam" stroke="#f3967c" stroke-linecap="round" fill="none" stroke-width="3">
      <path d="M30 24 q-4 -5 0 -10 q4 -5 0 -10" />
      <path d="M40 24 q-4 -6 0 -12 q4 -6 0 -13" />
      <path d="M50 24 q-4 -5 0 -10 q4 -5 0 -10" />
    </g>

    <!-- ear handles -->
    <path class="rim" d="M16 40 q-8 0 -8 6 q0 6 8 6" fill="none" stroke="#9d391d" stroke-width="5" />
    <path class="rim" d="M64 40 q8 0 8 6 q0 6 -8 6" fill="none" stroke="#9d391d" stroke-width="5" />

    <!-- pot body -->
    <path class="body" d="M15 36 H65 L62 58 Q61 65 53 65 H27 Q19 65 18 58 Z" fill="#e3562f" />

    <!-- glossy highlight -->
    <path class="shine" d="M24 41 Q26 53 30 60" fill="none" stroke="#fdcfc2" stroke-width="3.5" stroke-linecap="round" opacity="0.75" />

    <!-- lid -->
    <ellipse class="lid" cx="40" cy="34" rx="27" ry="7.5" fill="#b44223" />
    <rect class="rim-rect" x="38.5" y="25" width="3" height="6" rx="1.5" fill="#9d391d" />
    <circle class="knob" cx="40" cy="24" r="4.5" fill="#9d391d" />
  </g>`;

  if (withBackground) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="100%" height="100%">
  <rect width="80" height="80" rx="${rounded}" fill="${bgColor}" />
  ${potContent}
</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="100%" height="100%" fill="none">
  <style>
    :root {
      --primary: #e3562f;
      --lid: #b44223;
      --rim: #9d391d;
      --shine: #fdcfc2;
      --steam: #f3967c;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --primary: #ea643d;
        --lid: #bf4d2d;
        --rim: #a84224;
        --shine: #fedcd1;
        --steam: #f7aa93;
      }
    }
    .body { fill: var(--primary); }
    .lid { fill: var(--lid); }
    .knob, .rim-rect { fill: var(--rim); }
    .rim { stroke: var(--rim); }
    .shine { stroke: var(--shine); }
    .steam { stroke: var(--steam); }
  </style>
  ${potContent}
</svg>`;
}

console.log("Starting icon generation...");

// 1. Generate standalone SVG favicons
const transparentSvg = getSvg();
fs.writeFileSync(path.join(srcAssetsDir, "favicon.svg"), transparentSvg);
fs.writeFileSync(path.join(staticDir, "favicon.svg"), transparentSvg);

// 2. Generate maskable SVG (safe zone: scale 0.72 inside 80x80 box with theme background)
// Safe zone for maskable icon is center 80% circle (radius 40% of canvas)
const maskableSvg = getSvg({
  withBackground: true,
  bgColor: "#ffffff",
  rounded: 0,
  scale: 0.72,
  offsetY: 2,
});
fs.writeFileSync(path.join(staticDir, "icon-maskable.svg"), maskableSvg);

// 3. Generate standard PWA SVG icons (icon-192.svg and icon-512.svg) with theme background and rounded squircle or transparent
const pwaSvg = getSvg({
  withBackground: true,
  bgColor: "#ffffff",
  rounded: 16,
  scale: 0.8,
  offsetY: 2,
});
fs.writeFileSync(path.join(staticDir, "icon-192.svg"), pwaSvg);
fs.writeFileSync(path.join(staticDir, "icon-512.svg"), pwaSvg);

// 4. Apple Touch Icon SVG (180x180, solid warm background)
const appleTouchSvg = getSvg({
  withBackground: true,
  bgColor: "#ffffff",
  rounded: 0,
  scale: 0.75,
  offsetY: 2,
});
fs.writeFileSync(path.join(staticDir, "apple-touch-icon.svg"), appleTouchSvg);

// Temp files for rasterizing
const tempTransparentSvg = path.join(staticDir, "temp-transparent.svg");
const tempMaskableSvg = path.join(staticDir, "temp-maskable.svg");
const tempAppleSvg = path.join(staticDir, "temp-apple.svg");

// For rasterizing, avoid CSS vars if magick's rsvg doesn't support them fully
const rasterTransparentSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="100%" height="100%" fill="none">
  <!-- steam -->
  <g stroke="#f3967c" stroke-linecap="round" fill="none" stroke-width="3">
    <path d="M30 24 q-4 -5 0 -10 q4 -5 0 -10" />
    <path d="M40 24 q-4 -6 0 -12 q4 -6 0 -13" />
    <path d="M50 24 q-4 -5 0 -10 q4 -5 0 -10" />
  </g>
  <!-- ear handles -->
  <path d="M16 40 q-8 0 -8 6 q0 6 8 6" fill="none" stroke="#9d391d" stroke-width="5" />
  <path d="M64 40 q8 0 8 6 q0 6 -8 6" fill="none" stroke="#9d391d" stroke-width="5" />
  <!-- pot body -->
  <path d="M15 36 H65 L62 58 Q61 65 53 65 H27 Q19 65 18 58 Z" fill="#e3562f" />
  <!-- glossy highlight -->
  <path d="M24 41 Q26 53 30 60" fill="none" stroke="#fdcfc2" stroke-width="3.5" stroke-linecap="round" opacity="0.75" />
  <!-- lid -->
  <ellipse cx="40" cy="34" rx="27" ry="7.5" fill="#b44223" />
  <rect x="38.5" y="25" width="3" height="6" rx="1.5" fill="#9d391d" />
  <circle cx="40" cy="24" r="4.5" fill="#9d391d" />
</svg>`;
fs.writeFileSync(tempTransparentSvg, rasterTransparentSvg);

// Generate PNGs using ImageMagick
console.log("Generating PNGs with ImageMagick...");

try {
  // favicon PNGs
  execSync(
    `magick -density 300 -background none "${tempTransparentSvg}" -resize 16x16 "${path.join(staticDir, "favicon-16x16.png")}"`,
  );
  execSync(
    `magick -density 300 -background none "${tempTransparentSvg}" -resize 32x32 "${path.join(staticDir, "favicon-32x32.png")}"`,
  );
  execSync(
    `magick -density 300 -background none "${tempTransparentSvg}" -resize 48x48 "${path.join(staticDir, "favicon-48x48.png")}"`,
  );
  execSync(
    `magick -density 300 -background none "${tempTransparentSvg}" -resize 192x192 "${path.join(staticDir, "favicon.png")}"`,
  );

  // favicon.ico (multi-size: 16, 32, 48)
  execSync(
    `magick "${path.join(staticDir, "favicon-16x16.png")}" "${path.join(staticDir, "favicon-32x32.png")}" "${path.join(staticDir, "favicon-48x48.png")}" "${path.join(staticDir, "favicon.ico")}"`,
  );

  // PWA standard icons
  // 1. icon-192.png (any)
  execSync(
    `magick -density 300 -background none "${tempTransparentSvg}" -resize 192x192 "${path.join(staticDir, "icon-192.png")}"`,
  );
  // 2. icon-512.png (any)
  execSync(
    `magick -density 300 -background none "${tempTransparentSvg}" -resize 512x512 "${path.join(staticDir, "icon-512.png")}"`,
  );

  // 3. icon-maskable-192.png & icon-maskable-512.png
  execSync(
    `magick -density 300 "${path.join(staticDir, "icon-maskable.svg")}" -resize 192x192 "${path.join(staticDir, "icon-maskable-192.png")}"`,
  );
  execSync(
    `magick -density 300 "${path.join(staticDir, "icon-maskable.svg")}" -resize 512x512 "${path.join(staticDir, "icon-maskable-512.png")}"`,
  );

  // 4. apple-touch-icon.png (180x180)
  execSync(
    `magick -density 300 "${path.join(staticDir, "apple-touch-icon.svg")}" -resize 180x180 "${path.join(staticDir, "apple-touch-icon.png")}"`,
  );

  console.log("Successfully generated all icons!");
} catch (err) {
  console.error("Error running ImageMagick:", err);
  process.exit(1);
} finally {
  // Clean up temporary files
  if (fs.existsSync(tempTransparentSvg)) fs.unlinkSync(tempTransparentSvg);
}
