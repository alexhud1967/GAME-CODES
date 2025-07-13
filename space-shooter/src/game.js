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
        this.enemyBullets = [];
        this.enemies = [];
        this.stars = [];
        this.particles = [];
        this.bulletHellBullets = [];
        
        // Timing
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.fireTimer = 0;
        this.enemyFireTimer = 0;
        this.juggernauthSpawnTimer = 0;
        this.bulletHellTimer = 0;
        this.bulletHellActive = false;
        this.bulletHellDuration = 0;
        this.shockwaveActive = false;
        this.shockwaves = [];
        
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
        
        // Manual fire on click
        this.canvas.addEventListener('click', (e) => {
            if (this.gameStarted && this.gameRunning) {
                this.playSound('shoot');
            }
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
        const rand = Math.random();
        let type;
        
        if (rand < 0.3) type = 'zigzag';
        else if (rand < 0.5) type = 'straight';
        else if (rand < 0.7) type = 'fast';
        else if (rand < 0.85) type = 'heavy';
        else type = 'spiral';
        
        this.enemies.push(new Enemy(x, -30, type));
    }
    
    spawnJuggernaut() {
        const x = Math.random() * (this.width - 80);
        this.enemies.push(new Enemy(x, -60, 'juggernaut'));
    }
    
    activateBulletHell() {
        this.bulletHellActive = true;
        this.bulletHellDuration = 5000; // 5 seconds of bullet hell
        this.bulletHellTimer = 0;
        
        // Clear all existing enemies (nuke effect)
        this.enemies.forEach(enemy => {
            this.createExplosion(enemy.x, enemy.y);
        });
        this.enemies = [];
        this.playSound('explosion');
    }
    
    activateShockwave(x, y) {
        this.shockwaveActive = true;
        this.shockwaves = [];
        
        // Create multiple rotating bullet starbursts
        for (let wave = 0; wave < 3; wave++) {
            const bullets = [];
            const bulletCount = 16; // 16 bullets per starburst
            const startRadius = 20 + wave * 15;
            
            for (let i = 0; i < bulletCount; i++) {
                const angle = (i / bulletCount) * Math.PI * 2;
                bullets.push({
                    x: x,
                    y: y,
                    angle: angle,
                    speed: 2 + wave * 0.5,
                    radius: 4,
                    active: true,
                    distance: startRadius
                });
            }
            
            this.shockwaves.push({
                bullets: bullets,
                rotationSpeed: 0.02 + wave * 0.01, // Different rotation speeds
                maxDistance: 400 + wave * 100,
                active: true
            });
        }
        
        // Clear all existing enemies (nuke effect)
        this.enemies.forEach(enemy => {
            this.createExplosion(enemy.x, enemy.y);
        });
        this.enemies = [];
        this.playSound('explosion');
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
        
        // Update player (for flame animation)
        this.player.update(deltaTime);
        
        // Auto-fire (no sound)
        this.fireTimer += deltaTime;
        if (this.fireTimer > 150) { // Fire every 150ms
            this.bullets.push(new Bullet(this.player.x, this.player.y - 20, -8));
            this.fireTimer = 0;
        }
        
        // Spawn enemies
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer > 1000) { // Spawn every 1 second
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }
        
        // Spawn juggernaut occasionally
        this.juggernauthSpawnTimer += deltaTime;
        if (this.juggernauthSpawnTimer > 15000) { // Spawn every 15 seconds
            this.spawnJuggernaut();
            this.juggernauthSpawnTimer = 0;
        }
        
        // Enemy firing
        this.enemyFireTimer += deltaTime;
        if (this.enemyFireTimer > 800) { // Enemies fire every 800ms
            this.enemies.forEach(enemy => {
                if (enemy.type !== 'juggernaut' && Math.random() < 0.3) {
                    this.enemyBullets.push(new Bullet(enemy.x, enemy.y + 15, 4));
                }
            });
            this.enemyFireTimer = 0;
        }
        
        // Bullet hell system
        if (this.bulletHellActive) {
            this.bulletHellTimer += deltaTime;
            
            // Spawn bullet hell bullets
            if (this.bulletHellTimer % 100 < deltaTime) { // Every 100ms
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const speed = 3;
                    this.bulletHellBullets.push({
                        x: this.width / 2,
                        y: 50,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        radius: 4
                    });
                }
            }
            
            // End bullet hell
            if (this.bulletHellTimer > this.bulletHellDuration) {
                this.bulletHellActive = false;
                this.bulletHellBullets = [];
            }
        }
        
        // Shockwave system
        if (this.shockwaveActive) {
            let activeShockwaves = 0;
            this.shockwaves.forEach(shockwave => {
                if (shockwave.active) {
                    // Rotate the entire starburst
                    shockwave.bullets.forEach(bullet => {
                        if (bullet.active) {
                            bullet.angle += shockwave.rotationSpeed * (deltaTime / 16);
                            bullet.distance += bullet.speed * (deltaTime / 16);
                            
                            // Update bullet position based on angle and distance
                            bullet.x = bullet.x + Math.cos(bullet.angle) * bullet.speed * (deltaTime / 16);
                            bullet.y = bullet.y + Math.sin(bullet.angle) * bullet.speed * (deltaTime / 16);
                            
                            // Deactivate bullets that go too far
                            if (bullet.distance > shockwave.maxDistance) {
                                bullet.active = false;
                            }
                        }
                    });
                    
                    // Check if any bullets are still active
                    const activeBullets = shockwave.bullets.filter(b => b.active);
                    if (activeBullets.length === 0) {
                        shockwave.active = false;
                    } else {
                        activeShockwaves++;
                    }
                }
            });
            
            if (activeShockwaves === 0) {
                this.shockwaveActive = false;
                this.shockwaves = [];
            }
        }
        
        // Update stars
        this.stars.forEach(star => star.update(deltaTime));
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime);
            return bullet.y > -10 && bullet.y < this.height + 10;
        });
        
        // Update enemy bullets
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.update(deltaTime);
            return bullet.y > -10 && bullet.y < this.height + 10;
        });
        
        // Update bullet hell bullets
        this.bulletHellBullets = this.bulletHellBullets.filter(bullet => {
            bullet.x += bullet.vx * (deltaTime / 16);
            bullet.y += bullet.vy * (deltaTime / 16);
            return bullet.x > -10 && bullet.x < this.width + 10 && 
                   bullet.y > -10 && bullet.y < this.height + 10;
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
                    
                    const enemy = this.enemies[j];
                    
                    // Handle juggernaut hits
                    if (enemy.type === 'juggernaut') {
                        const hitResult = enemy.takeDamage();
                        this.playSound('juggernauthit');
                        this.createExplosion(enemy.x, enemy.y);
                        
                        if (hitResult === 'destroyed') {
                            // Juggernaut death - activate shockwave
                            this.createExplosion(enemy.x, enemy.y);
                            this.playSound('explosion');
                            this.activateShockwave(enemy.x, enemy.y);
                            this.enemies.splice(j, 1);
                            this.score += 2000; // Big points for juggernaut
                        }
                    } else {
                        // Regular enemy death
                        this.createExplosion(enemy.x, enemy.y);
                        this.playSound('enemyHit');
                        this.enemies.splice(j, 1);
                        this.score += 100;
                    }
                    
                    this.bullets.splice(i, 1);
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
        
        // Player vs Enemy Bullet collisions
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            if (this.isColliding(this.player, this.enemyBullets[i])) {
                this.createExplosion(this.player.x, this.player.y);
                this.playSound('explosion');
                this.enemyBullets.splice(i, 1);
                this.lives--;
            }
        }
        
        // Player vs Bullet Hell collisions
        for (let i = this.bulletHellBullets.length - 1; i >= 0; i--) {
            if (this.isColliding(this.player, this.bulletHellBullets[i])) {
                this.createExplosion(this.player.x, this.player.y);
                this.playSound('explosion');
                this.bulletHellBullets.splice(i, 1);
                this.lives--;
            }
        }
        
        // Player vs Shockwave bullet collisions
        if (this.shockwaveActive) {
            this.shockwaves.forEach(shockwave => {
                if (shockwave.active) {
                    shockwave.bullets.forEach(bullet => {
                        if (bullet.active && this.isColliding(this.player, bullet)) {
                            this.createExplosion(this.player.x, this.player.y);
                            this.playSound('explosion');
                            bullet.active = false; // Remove the bullet that hit
                            this.lives--;
                        }
                    });
                }
            });
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
        this.enemyBullets.forEach(bullet => {
            this.ctx.fillStyle = '#ff4444';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.enemies.forEach(enemy => enemy.render(this.ctx));
        this.particles.forEach(particle => particle.render(this.ctx));
        
        // Draw bullet hell bullets
        this.bulletHellBullets.forEach(bullet => {
            this.ctx.fillStyle = '#ff00ff';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Draw shockwave bullets
        if (this.shockwaveActive) {
            this.shockwaves.forEach(shockwave => {
                if (shockwave.active) {
                    shockwave.bullets.forEach(bullet => {
                        if (bullet.active) {
                            this.ctx.fillStyle = '#00ffff';
                            this.ctx.globalAlpha = 0.9;
                            this.ctx.beginPath();
                            this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
                            this.ctx.fill();
                            
                            // Add glow effect
                            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
                            this.ctx.beginPath();
                            this.ctx.arc(bullet.x, bullet.y, bullet.radius + 2, 0, Math.PI * 2);
                            this.ctx.fill();
                            
                            this.ctx.globalAlpha = 1.0;
                        }
                    });
                }
            });
        }
        
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
        this.flameTimer = 0;
        this.flameParticles = [];
    }
    
    update(deltaTime) {
        this.flameTimer += deltaTime;
        
        // Create flame particles
        if (this.flameTimer > 50) { // Every 50ms
            for (let i = 0; i < 3; i++) {
                this.flameParticles.push({
                    x: (Math.random() - 0.5) * 8,
                    y: 12 + Math.random() * 5,
                    vx: (Math.random() - 0.5) * 2,
                    vy: 2 + Math.random() * 3,
                    life: 200 + Math.random() * 100,
                    maxLife: 200 + Math.random() * 100,
                    size: 2 + Math.random() * 3
                });
            }
            this.flameTimer = 0;
        }
        
        // Update flame particles
        this.flameParticles = this.flameParticles.filter(particle => {
            particle.x += particle.vx * (deltaTime / 16);
            particle.y += particle.vy * (deltaTime / 16);
            particle.life -= deltaTime;
            return particle.life > 0;
        });
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw animated flame particles
        this.flameParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            const hue = 60 - (alpha * 60); // Yellow to red
            ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw main engine flames (dynamic)
        const flameLength = 15 + Math.sin(Date.now() * 0.01) * 5;
        const flameWidth = 8 + Math.sin(Date.now() * 0.02) * 2;
        
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(-flameWidth/2, 10);
        ctx.lineTo(0, 10 + flameLength);
        ctx.lineTo(flameWidth/2, 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(-flameWidth/3, 10);
        ctx.lineTo(0, 10 + flameLength * 0.7);
        ctx.lineTo(flameWidth/3, 10);
        ctx.closePath();
        ctx.fill();
        
        // Draw ship
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-10, 10);
        ctx.lineTo(0, 5);
        ctx.lineTo(10, 10);
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
        this.zigzagTimer = 0;
        this.zigzagDirection = 1;
        this.spiralAngle = 0;
        this.throb = 0;
        
        // Set properties based on type
        if (type === 'juggernaut') {
            this.radius = 40;
            this.speed = 0.3;
            this.rings = [5, 5, 5, 5, 5]; // 5 rings, each with 5 health
            this.coreHealth = 20;
            this.coreExposed = false;
        } else if (type === 'fast') {
            this.radius = 8;
            this.speed = 4;
            this.health = 1;
        } else if (type === 'heavy') {
            this.radius = 18;
            this.speed = 1;
            this.health = 3;
        } else if (type === 'spiral') {
            this.radius = 10;
            this.speed = 2;
            this.health = 1;
        } else {
            this.radius = 12;
            this.speed = 2;
            this.health = 1;
        }
    }
    
    takeDamage() {
        if (this.type === 'juggernaut') {
            // Check if any rings are still active
            let ringDestroyed = false;
            for (let i = 0; i < this.rings.length; i++) {
                if (this.rings[i] > 0) {
                    this.rings[i]--;
                    if (this.rings[i] === 0) {
                        ringDestroyed = true;
                    }
                    return 'ring_hit';
                }
            }
            
            // All rings destroyed, hit core
            if (!this.coreExposed) {
                this.coreExposed = true;
            }
            
            this.coreHealth--;
            if (this.coreHealth <= 0) {
                return 'destroyed';
            }
            return 'core_hit';
        } else if (this.type === 'heavy') {
            this.health--;
            return this.health <= 0 ? 'destroyed' : 'hit';
        } else {
            return 'destroyed';
        }
    }
    
    update(deltaTime) {
        if (this.type === 'juggernaut') {
            this.y += this.speed * (deltaTime / 16);
            this.throb += deltaTime * 0.01;
            
            // Shake effect when core is exposed
            if (this.coreExposed) {
                this.x += (Math.random() - 0.5) * 2;
                this.y += (Math.random() - 0.5) * 2;
            }
        } else if (this.type === 'zigzag') {
            this.y += this.speed * (deltaTime / 16);
            this.zigzagTimer += deltaTime;
            if (this.zigzagTimer > 500) {
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
        } else if (this.type === 'spiral') {
            this.y += this.speed * (deltaTime / 16);
            this.spiralAngle += deltaTime * 0.005;
            this.x += Math.sin(this.spiralAngle) * 2;
        } else if (this.type === 'fast') {
            this.y += this.speed * (deltaTime / 16);
            // Fast enemies move in slight curves
            this.x += Math.sin(this.y * 0.01) * 0.5;
        } else if (this.type === 'heavy') {
            this.y += this.speed * (deltaTime / 16);
            // Heavy enemies move straight but wobble slightly
            this.x += Math.sin(Date.now() * 0.002) * 0.3;
        } else {
            // Straight movement
            this.y += this.speed * (deltaTime / 16);
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.type === 'juggernaut') {
            // Draw 5 protective rings
            for (let i = 0; i < this.rings.length; i++) {
                if (this.rings[i] > 0) {
                    const ringRadius = 15 + (i * 8);
                    const alpha = this.rings[i] / 5; // Fade as ring takes damage
                    
                    ctx.strokeStyle = `rgba(136, 0, 255, ${alpha})`;
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    // Ring health indicators
                    ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
                    for (let j = 0; j < this.rings[i]; j++) {
                        const angle = (j / 5) * Math.PI * 2;
                        const x = Math.cos(angle) * ringRadius;
                        const y = Math.sin(angle) * ringRadius;
                        ctx.beginPath();
                        ctx.arc(x, y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
            
            // Draw core (grows and throbs when exposed)
            if (this.coreExposed) {
                const coreSize = 12 + Math.sin(this.throb) * 4; // Throbbing effect
                const healthPercent = this.coreHealth / 20;
                
                // Core glow
                ctx.fillStyle = `rgba(255, 0, 0, 0.3)`;
                ctx.beginPath();
                ctx.arc(0, 0, coreSize + 5, 0, Math.PI * 2);
                ctx.fill();
                
                // Main core
                ctx.fillStyle = healthPercent > 0.5 ? '#ffff00' : '#ff0000';
                ctx.beginPath();
                ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Core health bar
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-15, -25, 30, 3);
                ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : '#ff0000';
                ctx.fillRect(-15, -25, 30 * healthPercent, 3);
            } else {
                // Hidden core
                ctx.fillStyle = '#4400aa';
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === 'fast') {
            // Fast enemy - small and bright
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.moveTo(0, 8);
            ctx.lineTo(-6, -6);
            ctx.lineTo(0, -3);
            ctx.lineTo(6, -6);
            ctx.closePath();
            ctx.fill();
            
            // Speed trails
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.moveTo(0, 8);
            ctx.lineTo(-4, 15);
            ctx.lineTo(0, 12);
            ctx.lineTo(4, 15);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'heavy') {
            // Heavy enemy - large and armored
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(-12, -10, 24, 20);
            ctx.strokeStyle = '#ffaa44';
            ctx.lineWidth = 2;
            ctx.strokeRect(-12, -10, 24, 20);
            
            // Armor plating
            ctx.fillStyle = '#ffaa44';
            ctx.fillRect(-8, -6, 16, 3);
            ctx.fillRect(-8, 0, 16, 3);
            ctx.fillRect(-8, 6, 16, 3);
            
            // Health indicator
            const healthPercent = this.health / 3;
            ctx.fillStyle = healthPercent > 0.66 ? '#00ff00' : healthPercent > 0.33 ? '#ffff00' : '#ff0000';
            ctx.fillRect(-10, -15, 20 * healthPercent, 2);
        } else if (this.type === 'spiral') {
            // Spiral enemy - spinning design
            ctx.rotate(this.spiralAngle);
            ctx.fillStyle = '#ff00ff';
            
            // Spiral arms
            for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.rotate((i / 3) * Math.PI * 2);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -12);
                ctx.lineTo(3, -8);
                ctx.lineTo(-3, -8);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            
            // Center
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Regular enemy ship
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
        }
        
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
