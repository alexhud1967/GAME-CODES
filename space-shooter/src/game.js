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
        this.level = 1;
        this.levelScore = 0; // Score needed for next level
        this.nextLevelThreshold = 5000; // Points needed for level 2
        
        // Player upgrades
        this.playerCannons = 1; // Number of cannons (1-3)
        this.playerShield = 0; // Shield strength (0-3)
        
        // Boss system
        this.bosses = [];
        this.currentBoss = null;
        this.bossActive = false;
        
        // Audio system
        this.sounds = {
            background: new Audio('assets/sounds/background.mp3'),
            bossbattle: new Audio('assets/sounds/bossbattle.m4a'),
            enemyHit: new Audio('assets/sounds/enemy-hit.wav'),
            explosion: new Audio('assets/sounds/explosion.wav'),
            juggernauthit: new Audio('assets/sounds/juggernaut-hit.wav'),
            powerup: new Audio('assets/sounds/powerup.wav'),
            shoot: new Audio('assets/sounds/shoot.wav')
        };
        
        // Audio control
        this.masterVolume = 0.7;
        this.musicVolume = 0.7;
        this.sfxVolume = 0.8;
        this.fadeIntervals = new Map(); // Track active fades
        
        // Configure audio
        this.sounds.background.loop = true;
        this.sounds.background.volume = 0.2; // Softer background music
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
        this.powerups = [];
        this.swarmEnemies = []; // For final boss swarm attacks
        
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
        this.powerupSpawnTimer = 0;
        
        // Initialize
        this.initStarfield();
        this.setupEventListeners();
        this.setupVolumeControls();
        this.gameLoop();
    }
    
    playSound(soundName) {
        try {
            const sound = this.sounds[soundName];
            if (sound) {
                // Reset sound to beginning for rapid-fire sounds
                sound.currentTime = 0;
                sound.volume = this.sfxVolume * this.masterVolume;
                sound.play().catch(e => {
                    // Handle autoplay restrictions gracefully
                    console.log(`Audio autoplay blocked for ${soundName}`);
                });
            }
        } catch (error) {
            console.log(`Error playing sound ${soundName}:`, error);
        }
    }
    
    // Audio fade methods
    fadeOut(audio, duration = 2000, callback = null) {
        const fadeKey = audio.src;
        
        // Clear any existing fade for this audio
        if (this.fadeIntervals.has(fadeKey)) {
            clearInterval(this.fadeIntervals.get(fadeKey));
        }
        
        const startVolume = audio.volume;
        const fadeStep = startVolume / (duration / 50); // 50ms intervals
        
        const fadeInterval = setInterval(() => {
            audio.volume = Math.max(0, audio.volume - fadeStep);
            
            if (audio.volume <= 0) {
                audio.pause();
                clearInterval(fadeInterval);
                this.fadeIntervals.delete(fadeKey);
                if (callback) callback();
            }
        }, 50);
        
        this.fadeIntervals.set(fadeKey, fadeInterval);
    }
    
    fadeIn(audio, targetVolume = null, duration = 2000, callback = null) {
        const fadeKey = audio.src;
        
        // Clear any existing fade for this audio
        if (this.fadeIntervals.has(fadeKey)) {
            clearInterval(this.fadeIntervals.get(fadeKey));
        }
        
        if (targetVolume === null) {
            // Boss music is louder than regular music
            targetVolume = audio === this.sounds.bossbattle ? 
                this.musicVolume * this.masterVolume * 1.3 : 
                this.musicVolume * this.masterVolume;
        }
        
        audio.volume = 0;
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Fade in play failed:', e));
        
        const fadeStep = targetVolume / (duration / 50); // 50ms intervals
        
        const fadeInterval = setInterval(() => {
            audio.volume = Math.min(targetVolume, audio.volume + fadeStep);
            
            if (audio.volume >= targetVolume) {
                clearInterval(fadeInterval);
                this.fadeIntervals.delete(fadeKey);
                if (callback) callback();
            }
        }, 50);
        
        this.fadeIntervals.set(fadeKey, fadeInterval);
    }
    
    crossfade(fromAudio, toAudio, duration = 2000) {
        console.log('Starting crossfade...');
        try {
            if (fromAudio && fromAudio.readyState >= 2) {
                this.fadeOut(fromAudio, duration);
            }
            if (toAudio && toAudio.readyState >= 2) {
                this.fadeIn(toAudio, null, duration);
            } else {
                console.log('Boss music not ready, playing immediately');
                if (toAudio) {
                    // Boss music is louder than regular music
                    const bossVolume = toAudio === this.sounds.bossbattle ? 
                        this.musicVolume * this.masterVolume * 1.3 : 
                        this.musicVolume * this.masterVolume;
                    toAudio.volume = bossVolume;
                    toAudio.play().catch(e => console.log('Boss music play failed:', e));
                }
            }
        } catch (e) {
            console.error('Crossfade error:', e);
        }
    }
    
    setupVolumeControls() {
        const masterSlider = document.getElementById('masterVolume');
        const musicSlider = document.getElementById('musicVolume');
        const sfxSlider = document.getElementById('sfxVolume');
        
        if (masterSlider) {
            masterSlider.addEventListener('input', (e) => {
                this.masterVolume = e.target.value / 100;
                this.updateAllVolumes();
            });
        }
        
        if (musicSlider) {
            musicSlider.addEventListener('input', (e) => {
                this.musicVolume = e.target.value / 100;
                this.updateAllVolumes();
            });
        }
        
        if (sfxSlider) {
            sfxSlider.addEventListener('input', (e) => {
                this.sfxVolume = e.target.value / 100;
                this.updateAllVolumes();
            });
        }
    }
    
    updateAllVolumes() {
        // Update music volumes
        this.sounds.background.volume = this.musicVolume * this.masterVolume;
        this.sounds.bossbattle.volume = this.musicVolume * this.masterVolume * 1.3; // Boss music louder
        
        // SFX volumes are updated when played via playSound method
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
                console.log("Start button found, adding event listener");
                startButton.addEventListener('click', () => {
                    this.startGame();
                    console.log("Start button clicked!");
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
        
        if (rand < 0.4) type = 'zigzag';
        else if (rand < 0.6) type = 'straight';
        else if (rand < 0.8) type = 'fast';
        else type = 'spiral';
        
        this.enemies.push(new Enemy(x, -30, type));
    }
    
    spawnJuggernaut() {
        const x = Math.random() * (this.width - 80);
        this.enemies.push(new Enemy(x, -60, 'juggernaut', this.level));
    }
    
    spawnPowerup() {
        const x = Math.random() * (this.width - 40);
        const types = ['life', 'cannon', 'shield'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.powerups.push(new Powerup(x, -30, type));
    }
    
    checkLevelUp() {
        if (this.score >= this.nextLevelThreshold) {
            this.level++;
            this.nextLevelThreshold += 5000 * this.level; // Exponential scaling
            
            // Level up effects
            this.createExplosion(this.width / 2, this.height / 2);
            this.playSound('powerup');
            
            // Show level up message briefly
            setTimeout(() => {
                // Level up message could be displayed here
            }, 100);
        }
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
        
        // Auto-fire (no sound) - Multi-cannon support
        this.fireTimer += deltaTime;
        if (this.fireTimer > 150) { // Fire every 150ms
            if (this.playerCannons === 1) {
            if (this.bullets.length > 50) return; // Limit bullets for performance
                this.bullets.push(new Bullet(this.player.x, this.player.y - 20, -8));
            } else if (this.playerCannons === 2) {
            if (this.bullets.length > 50) return; // Limit bullets for performance
                this.bullets.push(new Bullet(this.player.x - 10, this.player.y - 20, -8));
            if (this.bullets.length > 50) return; // Limit bullets for performance
                this.bullets.push(new Bullet(this.player.x + 10, this.player.y - 20, -8));
            } else if (this.playerCannons === 3) {
            if (this.bullets.length > 50) return; // Limit bullets for performance
                this.bullets.push(new Bullet(this.player.x, this.player.y - 20, -8));
            if (this.bullets.length > 50) return; // Limit bullets for performance
                this.bullets.push(new Bullet(this.player.x - 15, this.player.y - 15, -8));
            if (this.bullets.length > 50) return; // Limit bullets for performance
                this.bullets.push(new Bullet(this.player.x + 15, this.player.y - 15, -8));
            }
            this.fireTimer = 0;
        }
        
        // Boss logic
        if (this.bossActive && this.currentBoss) {
            try {
                this.currentBoss.update(deltaTime, this.player);
                
                // Boss firing
                if (this.currentBoss.fireTimer > this.currentBoss.fireRate) {
                const firePositions = this.currentBoss.getFirePositions();
                firePositions.forEach(pos => {
                    const dx = this.player.x - pos.x;
                    const dy = this.player.y - pos.y;
                    const distanceSquared = dx * dx + dy * dy;
                    
                    // Safety check to prevent division by zero
                    if (Math.sqrt(distanceSquared) > 0) {
                        const speed = 4 + (this.currentBoss.level * 0.5); // Faster boss bullets
                        if (this.enemyBullets.length > 100) continue; // Limit enemy bullets
                        this.enemyBullets.push(new EnemyBullet(
                            pos.x, pos.y,
                            (dx / Math.sqrt(distanceSquared)) * speed,
                            (dy / Math.sqrt(distanceSquared)) * speed
                        ));
                    }
                });
                this.currentBoss.fireTimer = 0;

                // Final Boss specific abilities
                if (this.currentBoss.type === 'final-boss') {
                    // Autoturret firing
                    const turretPositions = this.currentBoss.getTurretFirePositions();
                    turretPositions.forEach(pos => {
                        const speed = 3.5;
                        if (this.enemyBullets.length > 100) continue; // Limit enemy bullets
                        this.enemyBullets.push(new EnemyBullet(
                            pos.x, pos.y,
                            Math.cos(pos.rotation) * speed,
                            Math.sin(pos.rotation) * speed
                        ));
                    });
                    
                    // Swarm spawning
                    if (this.currentBoss.shouldSpawnSwarm() && this.swarmEnemies.length < 20) {
                        for (let i = 0; i < this.currentBoss.swarmSize; i++) {
                            const angle = (i / this.currentBoss.swarmSize) * Math.PI * 2;
                            const spawnX = this.currentBoss.x + Math.cos(angle) * (this.currentBoss.radius + 50);
                            const spawnY = this.currentBoss.y + Math.sin(angle) * (this.currentBoss.radius + 50);
                            
                            this.swarmEnemies.push(new SwarmEnemy(spawnX, spawnY, this.player.x, this.player.y));
                        }
                    }
                }
            }
            } catch (e) {
                console.error('Boss update error:', e);
            }
        } else {
            // Regular enemy spawning (only when no boss)
            this.enemySpawnTimer += deltaTime;
            const spawnRate = Math.max(500, 1000 - (this.level * 100)); // Faster spawning per level
            if (this.enemySpawnTimer > spawnRate) {
                this.spawnEnemy();
                this.enemySpawnTimer = 0;
            }
            
            // Spawn juggernaut occasionally (more frequent at higher levels)
            this.juggernauthSpawnTimer += deltaTime;
            const juggernauthRate = Math.max(8000, 15000 - (this.level * 1000)); // More frequent per level
            if (this.juggernauthSpawnTimer > juggernauthRate) {
                this.spawnJuggernaut();
                this.juggernauthSpawnTimer = 0;
            }
        }
        
        // Powerup spawning
        this.powerupSpawnTimer += deltaTime;
        if (this.powerupSpawnTimer > 15000) { // Spawn every 15 seconds
            this.spawnPowerup();
            this.powerupSpawnTimer = 0;
        }
        
        // Enemy firing
        this.enemyFireTimer += deltaTime;
        if (this.enemyFireTimer > 800) { // Enemies fire every 800ms
            this.enemies.forEach(enemy => {
                if (enemy.type !== 'juggernaut' && Math.random() < 0.3) {
                        if (this.enemyBullets.length > 100) continue; // Limit enemy bullets
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
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
            return particle.life > 0;
        });
        
        // Update powerups
        this.powerups = this.powerups.filter(powerup => {
            powerup.update(deltaTime);
            return powerup.y < this.height + 50;
        });
        
        // Check for level progression
        this.checkLevelUp();
        
        // Collision detection
        this.checkCollisions();
        
        // Update UI
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
        
        // Update level and upgrade displays (create if they don't exist)
        let levelDisplay = document.getElementById('level');
        if (!levelDisplay) {
            levelDisplay = document.createElement('div');
            levelDisplay.id = 'level';
            levelDisplay.style.position = 'absolute';
            levelDisplay.style.top = '80px';
            levelDisplay.style.left = '10px';
            levelDisplay.style.color = 'white';
            levelDisplay.style.fontFamily = 'monospace';
            levelDisplay.style.fontSize = '18px';
            document.body.appendChild(levelDisplay);
        }
        levelDisplay.textContent = `Level: ${this.level}`;
        
        let cannonDisplay = document.getElementById('cannons');
        if (!cannonDisplay) {
            cannonDisplay = document.createElement('div');
            cannonDisplay.id = 'cannons';
            cannonDisplay.style.position = 'absolute';
            cannonDisplay.style.top = '105px';
            cannonDisplay.style.left = '10px';
            cannonDisplay.style.color = 'white';
            cannonDisplay.style.fontFamily = 'monospace';
            cannonDisplay.style.fontSize = '18px';
            document.body.appendChild(cannonDisplay);
        }
        cannonDisplay.textContent = `Cannons: ${this.playerCannons}`;
        
        let shieldDisplay = document.getElementById('shields');
        if (!shieldDisplay) {
            shieldDisplay = document.createElement('div');
            shieldDisplay.id = 'shields';
            shieldDisplay.style.position = 'absolute';
            shieldDisplay.style.top = '130px';
            shieldDisplay.style.left = '10px';
            shieldDisplay.style.color = 'white';
            shieldDisplay.style.fontFamily = 'monospace';
            shieldDisplay.style.fontSize = '18px';
            document.body.appendChild(shieldDisplay);
        }
        shieldDisplay.textContent = `Shield: ${this.playerShield}`;
        
        if (this.lives <= 0) {
            this.gameRunning = false;
        }
    }
    
    checkCollisions() {
        // Bullet vs Boss collisions
        if (this.bossActive && this.currentBoss) {
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                if (this.bullets[i] && this.isColliding(this.bullets[i], this.currentBoss)) {
                    this.currentBoss.health -= 5;
                    this.createExplosion(this.bullets[i].x, this.bullets[i].y);
                    this.playSound('enemyHit');
                    this.bullets.splice(i, 1);
                    
                    // Check if boss is defeated
                    if (this.currentBoss.health <= 0) {
                        this.createExplosion(this.currentBoss.x, this.currentBoss.y);
                        this.playSound('explosion');
                        // Check if this is phase 1 boss - transform to final boss
                        if (this.currentBoss.phase === 1) {
                            // Phase 1 defeated - spawn Final Boss (Phase 2)
                            this.score += 500 + (this.level * 250);
                            const bossX = this.currentBoss.x;
                            const bossY = this.currentBoss.y;
                            this.currentBoss = new FinalBoss(bossX, bossY, this.level);
                        } else {
                            // Final boss defeated
                            this.score += 2000 + (this.level * 1000);
                            this.currentBoss = null;
                            this.bossActive = false;
                            this.swarmEnemies = [];
                            
                            // Epic music transition back to background
                            this.sounds.background.loop = true;
                            this.crossfade(this.sounds.bossbattle, this.sounds.background, 1000);
                        }
                        
                        // Spawn multiple powerups as reward
                        for (let k = 0; k < 3; k++) {
                            setTimeout(() => {
                                this.spawnPowerup();
                            }, k * 200);
                        }
                    }
                    break;
                }
            }
        }
        
        // Bullet vs Enemy collisions
        if (this.bullets.length === 0 || this.enemies.length === 0) return; // Early exit if no objects
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

        // Bullet vs Swarm Enemy collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.swarmEnemies.length - 1; j >= 0; j--) {
                if (this.bullets[i] && this.swarmEnemies[j] && 
                    this.isColliding(this.bullets[i], this.swarmEnemies[j])) {
                    
                    this.createExplosion(this.swarmEnemies[j].x, this.swarmEnemies[j].y);
                    this.playSound('enemyHit');
                    this.score += 50; // Small score for swarm enemies
                    this.swarmEnemies.splice(j, 1);
                    this.bullets.splice(i, 1);
                    break;
                }
            }
        }
        
        // Player vs Enemy collisions
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.isColliding(this.player, this.enemies[i])) {
                this.createExplosion(this.player.x, this.player.y);
                this.enemies.splice(i, 1);
                if (this.playerShield > 0) {
                    this.playerShield--;
                    this.playSound('powerup'); // Shield hit sound
                } else {
                    this.playSound('explosion');
                    this.lives--;
                }
            }
        }

        // Player vs Swarm Enemy collisions
        for (let i = this.swarmEnemies.length - 1; i >= 0; i--) {
            if (this.isColliding(this.player, this.swarmEnemies[i])) {
                this.createExplosion(this.player.x, this.player.y);
                this.swarmEnemies.splice(i, 1);
                if (this.playerShield > 0) {
                    this.playerShield--;
                    this.playSound('powerup'); // Shield hit sound
                } else {
                    this.playSound('explosion');
                    this.lives--;
                }
            }
        }
        
        // Player vs Enemy Bullet collisions
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            if (this.isColliding(this.player, this.enemyBullets[i])) {
                this.createExplosion(this.player.x, this.player.y);
                this.enemyBullets.splice(i, 1);
                if (this.playerShield > 0) {
                    this.playerShield--;
                    this.playSound('powerup'); // Shield hit sound
                } else {
                    this.playSound('explosion');
                    this.lives--;
                }
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
                            if (this.playerShield > 0) {
                                this.playerShield--;
                                bullet.active = false;
                                this.playSound('powerup'); // Shield hit sound
                            } else {
                                this.createExplosion(this.player.x, this.player.y);
                                this.playSound('explosion');
                                bullet.active = false;
                                this.lives--;
                            }
                        }
                    });
                }
            });
        }
        
        // Player vs Powerup collisions (contact)
        this.powerups = this.powerups.filter(powerup => {
            if (this.isColliding(this.player, powerup)) {
                this.collectPowerup(powerup);
                return false;
            }
            return true;
        });
        
        // Bullet vs Powerup collisions (shooting)
        this.bullets.forEach(bullet => {
            this.powerups = this.powerups.filter(powerup => {
                if (this.isColliding(bullet, powerup)) {
                    this.collectPowerup(powerup);
                    return false;
                }
                return true;
            });
        });
    }
    
    isColliding(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distanceSquared = dx * dx + dy * dy;
        const radiusSum = obj1.radius + obj2.radius; return distanceSquared < (radiusSum * radiusSum);
    }
    
    collectPowerup(powerup) {
        this.createExplosion(powerup.x, powerup.y);
        this.playSound('powerup');
        
        switch(powerup.type) {
            case 'life':
                this.lives++;
                break;
            case 'cannon':
                if (this.playerCannons < 3) {
                    this.playerCannons++;
                }
                break;
            case 'shield':
                this.playerShield = Math.min(3, this.playerShield + 1);
                break;
        }
    }
    
    spawnPowerup() {
        const types = ['life', 'cannon', 'shield'];
        const type = types[Math.floor(Math.random() * types.length)];
        const x = Math.random() * (this.width - 60) + 30;
        this.powerups.push(new Powerup(x, -30, type));
    }
    
    spawnBoss() {
        if (!this.bossActive) {
            this.currentBoss = new Boss(400, 100, this.level);
            this.bossActive = true;
            // Clear regular enemies when boss spawns
            this.enemies = [];
            
            // Epic music transition - crossfade to boss music
            this.sounds.bossbattle.loop = true;
            this.crossfade(this.sounds.background, this.sounds.bossbattle, 1000);
        }
    }
    
    checkLevelUp() {
        if (this.score >= this.nextLevelThreshold) {
            this.level++;
            this.nextLevelThreshold += 5000 + (this.level * 2000); // Increasing requirements
            
            // Check if this is a boss level (every 3 levels)
            const isBossLevel = this.level % 3 === 0;
            
            // Level up effects
            this.createExplosion(this.width / 2, this.height / 2);
            this.playSound('powerup');
            
            // Show level up message briefly
            setTimeout(() => {
                let levelUpMsg = document.getElementById('levelUpMsg');
                if (!levelUpMsg) {
                    levelUpMsg = document.createElement('div');
                    levelUpMsg.id = 'levelUpMsg';
                    levelUpMsg.style.position = 'absolute';
                    levelUpMsg.style.top = '50%';
                    levelUpMsg.style.left = '50%';
                    levelUpMsg.style.transform = 'translate(-50%, -50%)';
                    levelUpMsg.style.color = 'yellow';
                    levelUpMsg.style.fontFamily = 'monospace';
                    levelUpMsg.style.fontSize = '24px';
                    levelUpMsg.style.fontWeight = 'bold';
                    levelUpMsg.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
                    levelUpMsg.style.zIndex = '1000';
                    document.body.appendChild(levelUpMsg);
                }
                
                if (isBossLevel) {
                    levelUpMsg.textContent = `BOSS LEVEL ${this.level}!`;
                    levelUpMsg.style.color = 'red';
                    levelUpMsg.style.fontSize = '32px';
                    // Trigger boss spawn
                    setTimeout(() => {
                        this.spawnBoss();
                    }, 2500);
                } else {
                    levelUpMsg.textContent = `LEVEL ${this.level}!`;
                    levelUpMsg.style.color = 'yellow';
                    levelUpMsg.style.fontSize = '24px';
                }
                levelUpMsg.style.display = 'block';
                
                setTimeout(() => {
                    levelUpMsg.style.display = 'none';
                }, 2000);
            }, 100);
        }
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
        
        // Draw shield around player
        if (this.playerShield > 0) {
            this.ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + this.playerShield * 0.2})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.radius + 15, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Additional shield rings for multiple shields
            if (this.playerShield > 1) {
                this.ctx.strokeStyle = `rgba(0, 255, 255, ${0.2 + this.playerShield * 0.1})`;
                this.ctx.beginPath();
                this.ctx.arc(this.player.x, this.player.y, this.player.radius + 20, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            if (this.playerShield > 2) {
                this.ctx.strokeStyle = `rgba(0, 255, 255, ${0.1 + this.playerShield * 0.1})`;
                this.ctx.beginPath();
                this.ctx.arc(this.player.x, this.player.y, this.player.radius + 25, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.enemyBullets.forEach(bullet => {
            this.ctx.fillStyle = '#ff4444';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.enemies.forEach(enemy => enemy.render(this.ctx));

        // Draw swarm enemies
        this.swarmEnemies.forEach(swarm => swarm.render(this.ctx));
        
        // Draw boss
        if (this.bossActive && this.currentBoss) {
            this.currentBoss.render(this.ctx);
        }
        
        this.particles.forEach(particle => particle.render(this.ctx));
        
        // Draw powerups
        this.powerups.forEach(powerup => {
            powerup.render(this.ctx);
        });
        
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
        // Limit frame rate to prevent excessive updates
        if (currentTime - this.lastTime < 16) {
            requestAnimationFrame((time) => this.gameLoop(time));
            return;
        }
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        try { this.update(deltaTime); } catch(e) { console.error("Update error:", e); }
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

// Boss class - Simplified Large Juggernaut
class Boss {
    constructor(x, y, level) {
        this.x = x;
        this.y = y;
        this.level = level;
        this.radius = 80 + (level * 5); // Grows with level
        this.speed = 1.5 + (level * 0.2); // Faster movement, scales with level
        this.direction = 1;
        this.health = 120 + (level * 60); // More health, harder to kill
        this.maxHealth = this.health;
        this.fireTimer = 0;
        this.fireRate = 150 - (level * 10); // Much faster firing, gets faster each level
        this.rotation = 0;
        this.cannonRotation = 0;
        this.cannons = Math.min(6, 2 + Math.floor(level / 3)); // More cannons per level
        this.type = 'mega-juggernaut';
        this.phase = 1; // Phase 1 boss
    }
    
    update(deltaTime, player) {
        // Safety check for deltaTime
        if (!deltaTime || deltaTime <= 0 || isNaN(deltaTime)) {
            deltaTime = 16; // Default to 60fps
        }
        
        // Simple horizontal movement like juggernaut
        this.x += this.speed * this.direction * (deltaTime / 16);
        if (this.x <= this.radius || this.x >= 800 - this.radius) {
            this.direction *= -1;
        }
        
        // Rotate cannons continuously - faster and more aggressive
        this.cannonRotation += (0.05 + this.level * 0.01) * (deltaTime / 16);
        
        // Keep boss on screen
        this.x = Math.max(this.radius, Math.min(800 - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(200, this.y));
        
        this.fireTimer += deltaTime;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Health bar
        const barWidth = 120;
        const barHeight = 10;
        const healthPercent = this.health / this.maxHealth;
        
        ctx.fillStyle = 'red';
        ctx.fillRect(-barWidth/2, -this.radius - 25, barWidth, barHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(-barWidth/2, -this.radius - 25, barWidth * healthPercent, barHeight);
        
        // Main body (large juggernaut style)
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core
        ctx.fillStyle = '#ff6666';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Rotating cannons around the perimeter
        for (let i = 0; i < this.cannons; i++) {
            const angle = (i * (Math.PI * 2) / this.cannons) + this.cannonRotation;
            const cannonX = Math.cos(angle) * this.radius * 0.9;
            const cannonY = Math.sin(angle) * this.radius * 0.9;
            
            ctx.save();
            ctx.translate(cannonX, cannonY);
            ctx.rotate(angle);
            
            // Cannon barrel
            ctx.fillStyle = '#333';
            ctx.fillRect(-3, -15, 6, 30);
            
            // Cannon base
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
        
        // Boss level indicator
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`BOSS LV${this.level}`, 0, 5);
        
        ctx.restore();
    }
    
    getFirePositions() {
        const positions = [];
        // Fire from all rotating cannons
        for (let i = 0; i < this.cannons; i++) {
            const angle = (i * (Math.PI * 2) / this.cannons) + this.cannonRotation;
            positions.push({
                x: this.x + Math.cos(angle) * this.radius * 0.9,
                y: this.y + Math.sin(angle) * this.radius * 0.9
            });
        }
        return positions;
    }
}

// Final Boss class - Phase 2 with autoturrets and swarm spawning
class FinalBoss {
    constructor(x, y, level) {
        this.x = x;
        this.y = y;
        this.level = level;
        this.radius = 100 + (level * 8); // Bigger than regular boss
        this.speed = 1.2 + (level * 0.15); // Slightly slower but more dangerous
        this.direction = 1;
        this.health = 200 + (level * 80); // Much more health
        this.maxHealth = this.health;
        this.fireTimer = 0;
        this.fireRate = 100 - (level * 8); // Very fast firing
        this.rotation = 0;
        this.cannonRotation = 0;
        this.cannons = Math.min(8, 4 + Math.floor(level / 2)); // More cannons
        this.type = 'final-boss';
        this.phase = 2; // Phase 2 boss
        
        // Autoturret system
        this.autoturrets = [];
        this.turretCount = Math.min(4, 2 + Math.floor(level / 3));
        this.turretFireTimer = 0;
        this.turretFireRate = 80; // Fast turret firing
        
        // Swarm spawning
        this.swarmTimer = 0;
        this.swarmRate = 3000 - (level * 200); // Spawn swarms every 3 seconds (faster per level)
        this.swarmSize = 3 + Math.floor(level / 2); // More swarm enemies per level
        
        this.initAutoturrets();
    }
    
    initAutoturrets() {
        this.autoturrets = [];
        for (let i = 0; i < this.turretCount; i++) {
            const angle = (i / this.turretCount) * Math.PI * 2;
            this.autoturrets.push({
                angle: angle,
                rotation: 0,
                fireTimer: Math.random() * this.turretFireRate // Stagger firing
            });
        }
    }
    
    update(deltaTime, player) {
        // Safety check for deltaTime
        if (!deltaTime || deltaTime <= 0 || isNaN(deltaTime)) {
            deltaTime = 16; // Default to 60fps
        }
        
        // Movement (similar to regular boss but more erratic)
        this.x += this.speed * this.direction * (deltaTime / 16);
        
        // Bounce off walls
        if (this.x <= this.radius || this.x >= 800 - this.radius) {
            this.direction *= -1;
        }
        
        // Rotate cannons and turrets continuously
        this.cannonRotation += (0.08 + this.level * 0.015) * (deltaTime / 16);
        
        // Update autoturrets
        this.autoturrets.forEach(turret => {
            // Aim turrets at player
            const turretX = this.x + Math.cos(turret.angle) * this.radius * 0.7;
            const turretY = this.y + Math.sin(turret.angle) * this.radius * 0.7;
            const dx = player.x - turretX;
            const dy = player.y - turretY;
            turret.rotation = Math.atan2(dy, dx);
            
            turret.fireTimer += deltaTime;
        });
        
        // Keep boss on screen
        this.x = Math.max(this.radius, Math.min(800 - this.radius, this.x));
        
        // Update timers
        this.fireTimer += deltaTime;
        this.turretFireTimer += deltaTime;
        this.swarmTimer += deltaTime;
    }
    
    getFirePositions() {
        const positions = [];
        
        // Main cannons (like regular boss)
        for (let i = 0; i < this.cannons; i++) {
            const angle = (i / this.cannons) * Math.PI * 2 + this.cannonRotation;
            positions.push({
                x: this.x + Math.cos(angle) * this.radius * 0.9,
                y: this.y + Math.sin(angle) * this.radius * 0.9
            });
        }
        
        return positions;
    }
    
    getTurretFirePositions() {
        const positions = [];
        
        this.autoturrets.forEach(turret => {
            if (turret.fireTimer >= this.turretFireRate) {
                const turretX = this.x + Math.cos(turret.angle) * this.radius * 0.7;
                const turretY = this.y + Math.sin(turret.angle) * this.radius * 0.7;
                
                positions.push({
                    x: turretX,
                    y: turretY,
                    rotation: turret.rotation
                });
                
                turret.fireTimer = 0;
            }
        });
        
        return positions;
    }
    
    shouldSpawnSwarm() {
        if (this.swarmTimer > 10000) { this.swarmTimer = 0; } // Reset if timer gets too high
        this.swarmTimer += 16; // Assuming 60fps
        if (this.swarmTimer >= this.swarmRate) {
            this.swarmTimer = 0;
            return true;
        }
        return false;
    }

    render(ctx) {
        // Main boss body (larger and more menacing)
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Autoturrets
        ctx.fillStyle = '#800000';
        this.autoturrets.forEach(turret => {
            const turretX = this.x + Math.cos(turret.angle) * this.radius * 0.7;
            const turretY = this.y + Math.sin(turret.angle) * this.radius * 0.7;
            
            ctx.save();
            ctx.translate(turretX, turretY);
            ctx.rotate(turret.rotation);
            
            // Turret body
            ctx.fillRect(-8, -6, 16, 12);
            
            // Turret barrel
            ctx.fillStyle = '#400000';
            ctx.fillRect(8, -3, 15, 6);
            
            ctx.restore();
        });
        
        // Main cannons
        ctx.fillStyle = '#660000';
        for (let i = 0; i < this.cannons; i++) {
            const angle = (i / this.cannons) * Math.PI * 2 + this.cannonRotation;
            const cannonX = this.x + Math.cos(angle) * this.radius * 0.9;
            const cannonY = this.y + Math.sin(angle) * this.radius * 0.9;
            
            ctx.save();
            ctx.translate(cannonX, cannonY);
            ctx.rotate(angle);
            ctx.fillRect(-5, -3, 20, 6);
            ctx.restore();
        }
        
        // Health bar
        const barWidth = this.radius * 2;
        const barHeight = 8;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.radius - 20;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#ff0000' : '#ff6600';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Phase indicator
        ctx.fillStyle = '#ffff00';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FINAL FORM', this.x, barY - 10);
    }
}

// SwarmEnemy class - small, fast homing enemies
class SwarmEnemy {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.speed = 2.5;
        this.health = 1;
        this.type = 'swarm';
        
        // Calculate initial direction toward target
        const dx = targetX - x;
        const dy = targetY - y;
        const distanceSquared = dx * dx + dy * dy;
        
        if (Math.sqrt(distanceSquared) > 0) {
            this.vx = (dx / Math.sqrt(distanceSquared)) * this.speed;
            this.vy = (dy / Math.sqrt(distanceSquared)) * this.speed;
        } else {
            this.vx = 0;
            this.vy = this.speed;
        }
        
        this.rotation = Math.atan2(this.vy, this.vx);
    }
    
    update(deltaTime, player) {
        // Continuously adjust direction toward player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distanceSquared = dx * dx + dy * dy;
        
        if (Math.sqrt(distanceSquared) > 0) {
            // Smooth direction change
            const targetVx = (dx / Math.sqrt(distanceSquared)) * this.speed;
            const targetVy = (dy / Math.sqrt(distanceSquared)) * this.speed;
            
            // Lerp toward target velocity for smooth movement
            this.vx += (targetVx - this.vx) * 0.1;
            this.vy += (targetVy - this.vy) * 0.1;
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Update rotation for visual
        this.rotation = Math.atan2(this.vy, this.vx);
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Draw triangular swarm enemy with glow effect
        ctx.fillStyle = '#ff6600';
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius/2, -this.radius/2);
        ctx.lineTo(-this.radius/2, this.radius/2);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const game = new SpaceShooter();
});
