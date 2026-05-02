# PWA Icons

## Current Status

SVG placeholder icons are currently in place:

- `icon-192.svg` - 192x192 SVG icon
- `icon-512.svg` - 512x512 SVG icon

## TODO: Generate PNG Icons

For better compatibility with iOS and older browsers, convert SVGs to PNGs:

```bash
# Using ImageMagick or similar tool
magick icon-192.svg icon-192.png
magick icon-512.svg icon-512.png
```

Or use online tools:

- https://cloudconvert.com/svg-to-png
- https://svgtopng.com/

## Design Notes

- **Theme Color**: #FF6B35 (warm orange)
- **Icon**: 🍽️ (plate with cutlery emoji)
- **Background**: Solid theme color with rounded corners
- **Purpose**: Represents collaborative meal planning

## Manifest Configuration

Update `manifest.json` to reference PNGs instead of SVGs once generated:

```json
{
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```
