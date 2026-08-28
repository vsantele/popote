# Favicon & PWA Icons

## Status

Popote icons have been generated based on the main cooking pot brand mark (`BrandMark` component) and adhere to the PWA and modern favicon standards.

### Assets

- `favicon.svg` (and `src/lib/assets/favicon.svg`): Scalable SVG vector favicon supporting light/dark themes.
- `favicon.ico`: Multi-size ICO file containing 16x16, 32x32, and 48x48 icons for browser compatibility.
- `favicon-16x16.png` & `favicon-32x32.png`: Standard PNG favicons.
- `favicon.png`: 192x192 PNG for service worker notifications and general use.
- `apple-touch-icon.png` (180x180): High-resolution icon with solid background for iOS home screen bookmarks.
- `icon-192.png` & `icon-512.png`: Standard PWA icons (`purpose: "any"`).
- `icon-maskable-192.png` & `icon-maskable-512.png`: Adaptive PWA icons with safe-zone margins (`purpose: "maskable"`).
- `icon-192.svg` & `icon-512.svg`: Scalable vector PWA icons.

## Regenerating Icons

Run the generation script:

```bash
node scripts/generate-icons.mjs
```

## Design Notes

- **Brand Icon**: Popote cooking pot (`BrandMark`) with steam, handles, lid, and shine.
- **Theme Color**: #FF6B35 (terracotta / warm orange)
- **Background Color**: #ffffff (or #fdf5e9 cream)
