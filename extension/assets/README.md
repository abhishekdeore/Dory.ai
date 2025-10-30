# Extension Icons

This folder should contain the following icon files for the browser extension:

- `icon16.png` - 16x16 pixels (toolbar icon, small)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store, installation)

## Creating Icons

You can create icons using:
1. Design tools like Figma, Sketch, or Canva
2. Online icon generators
3. AI image generators

### Recommended Icon Design

- Simple, recognizable symbol (e.g., brain, graph nodes, or "D" letter)
- Primary color: #6366f1 (indigo/purple)
- Background: White or transparent
- Clear and visible at small sizes

### Quick Solution

For testing, you can use placeholder icons from:
- https://placeholder.com/
- https://via.placeholder.com/

Example URLs for temporary use:
```
https://via.placeholder.com/16x16/6366f1/ffffff?text=D
https://via.placeholder.com/48x48/6366f1/ffffff?text=D
https://via.placeholder.com/128x128/6366f1/ffffff?text=D
```

Or create simple colored squares using this command (requires ImageMagick):

```bash
# macOS/Linux
convert -size 16x16 xc:#6366f1 icon16.png
convert -size 48x48 xc:#6366f1 icon48.png
convert -size 128x128 xc:#6366f1 icon128.png
```

### Using SVG

You can also create an SVG icon and convert it to PNG:

```html
<!-- dory-icon.svg -->
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="#6366f1" rx="20"/>
  <text x="64" y="90" font-size="80" fill="white" text-anchor="middle" font-family="Arial">D</text>
</svg>
```

Then convert using an online tool or ImageMagick:
```bash
convert -density 300 dory-icon.svg -resize 128x128 icon128.png
convert -density 300 dory-icon.svg -resize 48x48 icon48.png
convert -density 300 dory-icon.svg -resize 16x16 icon16.png
```
