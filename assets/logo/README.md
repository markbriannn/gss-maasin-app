# GSS App Logo Files

## SVG Logo Files Created

1. **gss_logo.svg** - Full logo with wrench icon and GSS text
2. **gss_logo_round.svg** - Round logo with service tool icon (good for app icon)
3. **gss_icon_simple.svg** - Simple "G" letter with checkmark (modern, clean)

## How to Convert to PNG for Android Mipmap

### Option 1: Online Converter (Easiest)
1. Go to https://cloudconvert.com/svg-to-png or https://svgtopng.com
2. Upload the SVG file
3. Set the size and download PNG

### Option 2: Use Android Studio
1. Right-click on `res` folder → New → Image Asset
2. Select "Launcher Icons (Adaptive and Legacy)"
3. Choose the SVG file as source
4. Android Studio will generate all mipmap sizes automatically

### Required Mipmap Sizes for Android

| Density | Size | Folder |
|---------|------|--------|
| mdpi | 48x48 | mipmap-mdpi |
| hdpi | 72x72 | mipmap-hdpi |
| xhdpi | 96x96 | mipmap-xhdpi |
| xxhdpi | 144x144 | mipmap-xxhdpi |
| xxxhdpi | 192x192 | mipmap-xxxhdpi |

### For iOS

| Size | Usage |
|------|-------|
| 20x20 | iPad Notifications |
| 29x29 | Settings |
| 40x40 | Spotlight |
| 60x60 | iPhone App Icon |
| 76x76 | iPad App Icon |
| 83.5x83.5 | iPad Pro |
| 1024x1024 | App Store |

## Color Palette Used

- Primary Green: #00B14F
- Light Green: #00C853
- Accent Green: #00E676
- White: #FFFFFF

## Quick Steps to Apply Logo

1. Convert SVG to PNG at 512x512 or 1024x1024
2. In Android Studio: File → New → Image Asset
3. Select your PNG, it will auto-generate all sizes
4. For iOS: Use Xcode Asset Catalog

## Recommended: Use gss_icon_simple.svg
This is the cleanest design and will look best at small sizes (app icon).
