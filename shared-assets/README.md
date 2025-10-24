# Shared Assets

This directory contains common assets that can be reused across multiple game projects.

## Directory Structure

- **sprites/** - Common sprite files, icons, and graphics
- **sounds/** - Shared audio files, sound effects, and music
- **fonts/** - Font files for consistent typography across games
- **scripts/** - Utility scripts and common code libraries

## Usage

When creating a new game, you can reference these shared assets to maintain consistency and avoid duplication. For example:

```html
<!-- In an HTML5 game -->
<link rel="stylesheet" href="../shared-assets/fonts/game-font.css">
<script src="../shared-assets/scripts/utils.js"></script>
```

```java
// In a Java game
// Reference shared assets from this directory
```

## Contributing

When adding new shared assets:
1. Ensure the asset is truly reusable across multiple games
2. Use descriptive filenames
3. Add appropriate documentation
4. Consider file size and optimization

