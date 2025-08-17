# App Icons Required for PWA

To complete the PWA setup, you need to create the following icon files in the `assets/` folder:

## Required Icons

1. **`assets/icon-192.png`** - 192x192 pixels
2. **`assets/icon-512.png`** - 512x512 pixels

## Icon Creation Options

### Option 1: Use an Online Icon Generator
- Visit [PWA Builder](https://www.pwabuilder.com/imageGenerator)
- Upload a high-resolution logo or create a simple icon
- Download the generated icons

### Option 2: Create Simple Icons
- Use any image editing software (Photoshop, GIMP, Canva, etc.)
- Create a simple, recognizable icon
- Export as PNG with the required dimensions

### Option 3: Use Your Existing Logo
- If you have a Chikas logo, resize it to the required dimensions
- Ensure it looks good at small sizes

## Icon Design Tips

- **Keep it simple** - Icons should be recognizable at small sizes
- **Use your brand colors** - Match your app's theme (#22d3ee)
- **High contrast** - Should be visible on both light and dark backgrounds
- **Square format** - Icons will be automatically rounded on iOS

## File Structure

Your `assets/` folder should look like this:
```
assets/
├── bg.jpg (existing)
├── icon-192.png (new)
└── icon-512.png (new)
```

## Testing

Once you add the icons:
1. Open your app in Safari on iPad
2. Tap the Share button (square with arrow)
3. Tap "Add to Home Screen"
4. Your app should now appear as an icon on the home screen!

## Optional: Screenshots

For better App Store-like experience, you can also add:
- `assets/screenshot-wide.png` (1280x720)
- `assets/screenshot-narrow.png` (750x1334)

These are optional but enhance the PWA experience.

