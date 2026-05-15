# Extension Icons

Add three PNG files here before loading the extension:

- `icon16.png`  — 16×16 px
- `icon48.png`  — 48×48 px
- `icon128.png` — 128×128 px

Without them Chrome uses its generic puzzle-piece icon. The extension still works.

## Quick way to generate them

Open your terminal and run (requires ImageMagick):

```bash
convert -size 128x128 xc:#635BFF -fill white -font Helvetica-Bold \
  -pointsize 80 -gravity center -annotate 0 "P" icon128.png

convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```

Or export a 128×128 PNG from Figma/Canva and resize it.
