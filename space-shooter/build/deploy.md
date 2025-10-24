# Deployment Guide

## Quick Deploy to itch.io

1. **Zip the game files:**
   ```bash
   # From the space-shooter directory
   zip -r space-shooter-v1.0.zip space-shooter.html src/ assets/
   ```

2. **Upload to itch.io:**
   - Go to itch.io and create a new project
   - Set "Kind of project" to "HTML"
   - Upload the zip file
   - Set "This file will be played in the browser" for space-shooter.html
   - Set viewport dimensions to 800x600 (or larger)
   - Publish!

## Web Hosting Deploy

Simply upload these files to any web server:
- `space-shooter.html`
- `src/game.js`
- `assets/` folder (when you add sprites/sounds)

## Local Testing

Open `space-shooter.html` directly in your browser - no server required!

## Build Optimizations (Future)

For production builds, consider:
- Minifying JavaScript
- Optimizing images
- Combining files
- Adding service worker for offline play

## Platform-Specific Notes

**itch.io:**
- Works perfectly as-is
- Consider adding fullscreen option
- Mobile-friendly with touch controls (future enhancement)

**Steam (via Greenworks):**
- Would need Electron wrapper
- Add Steam achievements integration
- Package as native executable

**Mobile (Cordova/PhoneGap):**
- Add touch controls
- Adjust canvas size for mobile screens
- Test performance on lower-end devices
