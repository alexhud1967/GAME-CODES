# Space Shooter

A classic arcade-style space shooter built with HTML5 Canvas and JavaScript.

## Features

🚀 **Core Gameplay:**
- Mouse-controlled spaceship movement
- Auto-firing bullets
- Scrolling starfield background
- Enemy ships with zigzag and straight movement patterns
- Enemies wrap from bottom to top for continuous challenge
- Collision detection and particle explosions
- Score and lives system

🎮 **Controls:**
- **Mouse Movement**: Control your spaceship
- **Auto-Fire**: Bullets fire automatically
- **Objective**: Destroy enemies before they reach the bottom!

## Technical Features

- **Smooth Animation**: 60 FPS game loop using requestAnimationFrame
- **Sprite Animation**: Custom-drawn ships and effects
- **Particle System**: Explosion effects on enemy destruction
- **Collision Detection**: Circle-based collision system
- **Responsive Design**: Centered game canvas with UI overlay

## File Structure

```
space-shooter/
├── index.html          # Main game page
├── src/
│   └── game.js         # Complete game logic
├── assets/
│   ├── sprites/        # Future sprite files
│   └── sounds/         # Future sound files
└── build/              # Deployment builds
```

## How to Play

1. Open `index.html` in a web browser
2. Move your mouse to control the green spaceship
3. Bullets fire automatically
4. Destroy red enemy ships for points
5. Avoid collisions - you have 3 lives
6. Enemies that reach the bottom wrap to the top

## Deployment

**For itch.io:**
1. Zip the entire `space-shooter` folder
2. Upload to itch.io as an HTML5 game
3. Set `index.html` as the main file

**For web hosting:**
- Upload all files to your web server
- Access via `index.html`

## Game Mechanics

- **Player Ship**: Green triangle that follows mouse cursor
- **Bullets**: Yellow circles that fire automatically every 150ms
- **Enemies**: Red ships that move down the screen
  - **Straight**: Move directly downward
  - **Zigzag**: Move down while zigzagging left and right
- **Stars**: Scrolling white dots create depth and movement
- **Particles**: Orange explosion effects when enemies are destroyed

## Scoring

- **Enemy Destroyed**: 100 points
- **Lives**: Start with 3, lose one per collision
- **Game Over**: When all lives are lost

## Future Enhancements

- Power-ups and weapon upgrades
- Different enemy types with varying health
- Sound effects and background music
- High score persistence
- Mobile touch controls
- Boss battles

## Tags
`html5` `javascript` `arcade` `shooter` `itch.io`

