// Space Shooter Game
class SpaceShooter {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.score = 0;
        this.lives = 3;
        this.gameRunning = true;
        
        // Audio system
        this.sounds = {
            background: new Audio('assets/sounds/background.wav'),
            enemyHit: new Audio('assets/sounds/enemy-hit.wav'),
            explosion: new Audio('assets/sounds/explosion.wav'),
            juggernauthit: new Audio('assets/sounds/juggernaut-hit.wav'),
            powerup: new Audio('assets/sounds/powerup.wav'),
            shoot: new Audio('assets/sounds/shoot.wav')
        };
        
        // Configure audio
        this.sounds.background.loop = true;
        this.sounds.background.volume = 0.3;
        this.sounds.enemyHit.volume = 0.6;
        this.sounds.explosion.volume = 0.7;
        this.sounds.juggernauthit.volume = 0.8;
        this.sounds.powerup.volume = 0.5;
        this.sounds.shoot.volume = 0.4;
        
        // Game started flag
        this.gameStarted = false;
        
        // Mouse position
        this.mouseX = this.width / 2;
        this.mouseY = this.height - 100;
        
        // Game objects
        this.player = new Player(this.width / 2, this.height - 50);
        this.bullets = [];
        this.enemies = [];
        this.stars = [];
        this.particles = [];
        
        // Timing
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.fireTimer = 0;
        
        // Initialize
        this.initStarfield();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    playSound(soundName) {
        try {
            const sound = this.sounds[soundName];
            if (sound) {
                // Reset sound to beginning for rapid-fire sounds
                sound.currentTime = 0;
                sound.play().catch(e => {
                    // Handle autoplay restrictions gracefully
                    console.log(`Audio autoplay blocked for ${soundName}`);
                });
            }
        } catch (error) {
            console.log(`Error playing sound ${soundName}:`, error);
        }
    }
    
    initStarfield() {
        for (let i = 0; i < 100; i++) {
            this.stars.push(new Star(
                Math.random() * this.width,
                Math.random() * this.height,
                Math.random() * 2 + 0.5
            ));
        }
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        // Start button event listener - wait for DOM to be ready
        setTimeout(() => {
            const startButton = document.getElementById('startButton');
            if (startButton) {
                startButton.addEventListener('click', () => {
                    this.startGame();
                });
            }
        }, 100);
    }
    
    startGame() {
        console.log('Starting game...');
        this.gameStarted = true;
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.style.display = 'none';
        }
        this.playSound('background');
        console.log('Game started, gameStarted:', this.gameStarted);
    }
    
    spawnEnemy() {
        const x = Math.random() * (this.width - 40);
        const type = Math.random() < 0.7 ? 'zigzag' : 'straight';
        this.enemies.push(new Enemy(x, -30, type));
    }
    
    update(deltaTime) {
        if (!this.gameRunning || !this.gameStarted) {
            // Only log once every 60 frames to avoid spam
            if (Math.random() < 0.016) {
                console.log('Game not updating - gameRunning:', this.gameRunning, 'gameStarted:', this.gameStarted);
            }
            return;
        }
        
        // Update player position to follow mouse
        this.player.x = this.mouseX;
        this.player.y = this.mouseY;
        
        // Keep player in bounds
        this.player.x = Math.max(20, Math.min(this.width - 20, this.player.x));
        this.player.y = Math.max(20, Math.min(this.height - 20, this.player.y));
        
        // Auto-fire
        this.fireTimer += deltaTime;
        if (this.fireTimer > 150) { // Fire every 150ms
            this.bullets.push(new Bullet(this.player.x, this.player.y - 20, -8));
            this.playSound('shoot');
            this.fireTimer = 0;
        }
        
        // Spawn enemies
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer > 1000) { // Spawn every 1 second
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }
        
        // Update stars
        this.stars.forEach(star => star.update(deltaTime));
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime);
            return bullet.y > -10 && bullet.y < this.height + 10;
        });
        
        // Update enemies
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(deltaTime);
            // If enemy reaches bottom, wrap to top
            if (enemy.y > this.height + 30) {
                enemy.y = -30;
                enemy.x = Math.random() * (this.width - 40);
                return true;
            }
            return true;
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
        
        // Collision detection
        this.checkCollisions();
        
        // Update UI
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        
        if (this.lives <= 0) {
            this.gameRunning = false;
        }
    }
    
    checkCollisions() {
        // Bullet vs Enemy collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.bullets[i] && this.enemies[j] && 
                    this.isColliding(this.bullets[i], this.enemies[j])) {
                    
                    // Create explosion particles
                    this.createExplosion(this.enemies[j].x, this.enemies[j].y);
                    
                    // Play hit sound
                    this.playSound('enemyHit');
                    
                    // Remove bullet and enemy
                    this.bullets.splice(i, 1);
                    this.enemies.splice(j, 1);
                    
                    // Increase score
                    this.score += 100;
                    break;
                }
            }
        }
        
        // Player vs Enemy collisions
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.isColliding(this.player, this.enemies[i])) {
                this.createExplosion(this.player.x, this.player.y);
                this.playSound('explosion');
                this.enemies.splice(i, 1);
                this.lives--;
            }
        }
    }
    
    isColliding(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (obj1.radius + obj2.radius);
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(x, y));
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw stars
        this.stars.forEach(star => star.render(this.ctx));
        
        // Draw game objects
        this.player.render(this.ctx);
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.enemies.forEach(enemy => enemy.render(this.ctx));
        this.particles.forEach(particle => particle.render(this.ctx));
        
        // Game over screen
        if (!this.gameRunning) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '48px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2);
            
            this.ctx.font = '24px Courier New';
            this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2 + 50);
            this.ctx.fillText('Refresh to play again', this.width / 2, this.height / 2 + 100);
        }
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw ship
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-10, 10);
        ctx.lineTo(0, 5);
        ctx.lineTo(10, 10);
        ctx.closePath();
        ctx.fill();
        
        // Engine glow
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(-5, 10);
        ctx.lineTo(0, 20);
        ctx.lineTo(5, 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

// Bullet class
class Bullet {
    constructor(x, y, speed) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.radius = 3;
    }
    
    update(deltaTime) {
        this.y += this.speed * (deltaTime / 16);
    }
    
    render(ctx) {
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Enemy class
class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 12;
        this.speed = 2;
        this.zigzagTimer = 0;
        this.zigzagDirection = 1;
    }
    
    update(deltaTime) {
        this.y += this.speed * (deltaTime / 16);
        
        if (this.type === 'zigzag') {
            this.zigzagTimer += deltaTime;
            if (this.zigzagTimer > 500) { // Change direction every 500ms
                this.zigzagDirection *= -1;
                this.zigzagTimer = 0;
            }
            this.x += this.zigzagDirection * 1.5 * (deltaTime / 16);
            
            // Keep in bounds
            if (this.x < 20) {
                this.x = 20;
                this.zigzagDirection = 1;
            }
            if (this.x > 780) {
                this.x = 780;
                this.zigzagDirection = -1;
            }
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw enemy ship
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.lineTo(-8, -8);
        ctx.lineTo(0, -4);
        ctx.lineTo(8, -8);
        ctx.closePath();
        ctx.fill();
        
        // Enemy details
        ctx.fillStyle = '#ff6666';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// Star class for background
class Star {
    constructor(x, y, speed) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.brightness = Math.random();
    }
    
    update(deltaTime) {
        this.y += this.speed * (deltaTime / 16);
        if (this.y > 600) {
            this.y = 0;
            this.x = Math.random() * 800;
        }
    }
    
    render(ctx) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Particle class for explosions
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.decay = 0.02;
    }
    
    update(deltaTime) {
        this.x += this.vx * (deltaTime / 16);
        this.y += this.vy * (deltaTime / 16);
        this.life -= this.decay * (deltaTime / 16);
    }
    
    render(ctx) {
        ctx.fillStyle = `rgba(255, ${Math.floor(this.life * 255)}, 0, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new SpaceShooter();
});
