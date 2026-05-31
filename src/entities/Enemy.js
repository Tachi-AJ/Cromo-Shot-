import Phaser from 'phaser';
import Projectile from './Projectile.js';
import PowerUp from './PowerUp.js';
import VisualEffect from './VisualEffect.js';

export default class Enemy {
    constructor(scene, x, y, wave = 1) {
        this.scene = scene;
        this.id = 'enemy_' + Math.random(); 
        this.x = x; 
        this.y = y; 
        this.width = 30; 
        this.height = 30;
        this.vx = 0; 
        this.vy = 0; 
        this.onGround = false; 
        this.canShoot = true; 
        this.shootCooldown = 400 + Math.random() * 900;
        this.timeStopTimer = 0;
        this.timeStopImmunityTimer = 0;
        this.freezeTimer = 0;
        this.wX = 1; 
        this.wY = 1; 
        this.wVX = 0; 
        this.wVY = 0;
        this.isBoss = false; 
        this.exploded = false; 
        this.damageFlashTimer = 0;
        this.reflectTimer = 0;
        this.hitstopTimer = 0;
        this.bombFuseTimer = 0;
        this.shieldBroken = false;
        this.facingDir = 1;

        let rand = Math.random();
        if (rand < 0.18) { 
            this.type = 'FAST'; 
            this.color = '#00ffff'; 
            this.baseColor = this.color; 
            this.health = 30 + (wave * 10); 
            this.speedMult = 1.6; 
            this.width = 20; 
            this.height = 20; 
        } else if (rand < 0.34) { 
            this.type = 'TANK'; 
            this.color = '#ffaa00'; 
            this.baseColor = this.color; 
            this.health = 100 + (wave * 30); 
            this.speedMult = 0.5; 
            this.width = 45; 
            this.height = 45; 
            this.shieldHits = 5;
        } else if (rand < 0.52 && wave >= 3) { 
            this.type = 'SHOOTER'; 
            this.color = '#ff00ff'; 
            this.baseColor = this.color; 
            this.health = 40 + (wave * 10); 
            this.speedMult = 0.8; 
            this.width = 25; 
            this.height = 25; 
        } else if (rand < 0.68 && wave >= 4) {
            this.type = 'BOMBER';
            this.color = '#ff3300';
            this.baseColor = this.color;
            this.health = 35 + (wave * 12);
            this.speedMult = 1.25;
            this.width = 28;
            this.height = 28;
        } else if (rand < 0.82 && wave >= 5) {
            this.type = 'JUMPER';
            this.color = '#7cff6b';
            this.baseColor = this.color;
            this.health = 55 + (wave * 14);
            this.speedMult = 1.15;
            this.width = 24;
            this.height = 34;
        } else { 
            this.type = 'BASIC'; 
            this.color = '#777777'; 
            this.baseColor = this.color; 
            this.health = 50 + (wave * 15); 
            this.speedMult = 1; 
        }
        this.maxHealth = this.health;
    }
    
    update(dtScale) {
        if (this.health <= 0) return; 
        
        const dt = (dtScale && !isNaN(dtScale)) ? dtScale : 1.0;
        
        if (this.freezeTimer > 0) {
            this.freezeTimer -= dt * 16.666;
        }
        
        if (this.timeStopTimer > 0) { 
            this.timeStopTimer -= dt * 16.666; 
            if (this.timeStopTimer <= 0) {
                this.timeStopImmunityTimer = 2500;
            }
            return; 
        }
        if (this.timeStopImmunityTimer > 0) {
            this.timeStopImmunityTimer -= dt * 16.666;
        }
        if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt * 16.666;
        if (this.reflectTimer > 0) this.reflectTimer -= dt * 16.666;
        if (this.shootCooldown > 0) this.shootCooldown -= dt * 16.666;
        
        const wasOnGround = this.onGround;

        if (this.hitstopTimer > 0) {
            this.hitstopTimer -= dt * 16.666;
            return;
        }

        // Get nearest player as target
        let target = this.scene.getNearestEnemy(this);
        if (target) {
            let dir = target.x > this.x ? 1 : -1;
            this.facingDir = dir;
            let distToTarget = Math.hypot((target.x + target.width/2) - (this.x + this.width/2), (target.y + target.height/2) - (this.y + this.height/2));
            let accMult = 1.0;
            if (this.scene.gameMode === 'roguelike' && this.scene.roguelikeMutator) {
                if (this.scene.roguelikeMutator.key === 'overclock') {
                    accMult = 1.25;
                }
            }
            let acc = (this.isBoss ? 0.3 : 0.5) * this.speedMult * accMult;
            if (this.freezeTimer > 0) acc *= 0.2;
            let isArmingBomb = false;

            if (this.type === 'BOMBER' && distToTarget < 80) {
                this.vx *= 0.82;
                this.bombFuseTimer += dt * 16.666;
                this.damageFlashTimer = Math.floor(this.bombFuseTimer / 90) % 2 === 0 ? 80 : 0;
                isArmingBomb = true;
                if (this.bombFuseTimer >= 1000) {
                    let dummy = new Projectile(this.scene, this.x, this.y, 0, 0, this.color, this.id);
                    dummy.splash(this.x + this.width/2, this.y + this.height/2, 170, 180, 35 + (this.scene.currentWave || 1) * 2);
                    this.scene.flashAlpha = Math.max(this.scene.flashAlpha || 0, 0.25);
                    this.scene.shakeTime = Math.max(this.scene.shakeTime || 0, 10);
                    this.scene.shakeMagnitude = Math.max(this.scene.shakeMagnitude || 0, 8);
                    this.health = 0;
                    this.exploded = true;
                    this.scene.enemiesDefeated = (this.scene.enemiesDefeated || 0) + 1;
                    this.scene.spawnPaintSplats(this.x + this.width/2, this.y + this.height/2, this.color, 30);
                    this.scene.playSfx('explosion');
                    return;
                }
            } else if (this.type === 'BOMBER') {
                this.bombFuseTimer = Math.max(0, this.bombFuseTimer - dt * 16.666 * 0.5);
            }
            
            if (this.type === 'SHOOTER' && distToTarget < 350) dir = -dir;
            
            const zigzag = this.type === 'FAST' ? Math.sin(Date.now() / 130 + this.x * 0.045) * 0.75 : 0;
            if (!isArmingBomb) this.vx += (dir + zigzag) * acc; 
            let maxS = (this.isBoss ? 2 : 3) * this.speedMult;
            if (this.freezeTimer > 0) maxS *= 0.2;
            
            if (Math.abs(this.vx) > maxS) this.vx = maxS * Math.sign(this.vx);
            
            if (this.onGround && (this.vx === 0 || target.y < this.y - 50 || (this.type === 'FAST' && Math.random() < 0.05) || (this.type === 'JUMPER' && Math.random() < 0.12) || (this.type === 'SHOOTER' && Math.random() < 0.02))) {
                if (Math.random() < 0.1 || this.type === 'FAST' || this.type === 'JUMPER') { 
                    // JUMP_FORCE is -16
                    const jumpF = -16 * (this.type === 'FAST' ? 1 : (this.type === 'JUMPER' ? 1.18 : 0.8)); 
                    this.vy = this.freezeTimer > 0 ? jumpF * 0.5 : jumpF; 
                    this.wX = 0.6; 
                    this.wY = 1.5; 
                }
            }

            if (this.shootCooldown <= 0) {
                let shootChance = this.isBoss ? 0.05 : (this.type === 'SHOOTER' ? 0.04 : 0.02);
                if (Math.random() < shootChance && Math.abs(target.y - this.y) < 200) {
                    this.shootCooldown = this.isBoss ? 760 : (this.type === 'SHOOTER' ? 960 : 1450);
                    
                    let projSpeed = this.type === 'SHOOTER' ? 18 * Math.sign(target.x - this.x) : 10 * Math.sign(target.x - this.x);
                    // Prevent division by zero if speeds match or are stationary
                    if (projSpeed === 0) projSpeed = this.facingDir * 10;
                    this.scene.projectiles.push(new Projectile(this.scene, this.x + this.width/2, this.y + 10, projSpeed, 0, this.color, this.id)); 
                    this.scene.playSfx('shoot');
                } else {
                    this.shootCooldown = 80;
                }
            }
        }

        // Apply friction and gravity
        this.vx *= 0.80; // FRICTION = 0.80
        
        let gravityVal = 0.65;
        if (this.scene.gameMode === 'roguelike' && this.scene.roguelikeMutator) {
            if (this.scene.roguelikeMutator.key === 'low_gravity') {
                gravityVal *= 0.4;
            }
        }
        this.vy += gravityVal; // GRAVITY = 0.65

        if (this.onGround && this.standingOnPlatform) {
            if (this.standingOnPlatform.isMoving) {
                this.x += this.standingOnPlatform.deltaX || 0;
                this.y += this.standingOnPlatform.deltaY || 0;
            }
            if (this.standingOnPlatform.conveyorForce) {
                this.vx += this.standingOnPlatform.conveyorForce * dt;
            }

            // Floor paint interactions: slow and damage enemies stepping on player paint
            const footX = this.x + this.width / 2;
            const footY = this.y + this.height + 2;
            const platColor = this.standingOnPlatform.getTileColorAt(footX, footY);
            if (platColor !== '#222222') {
                const isPlayerPaint = this.scene.players.some(p => p.baseColor === platColor);
                if (isPlayerPaint) {
                    this.vx *= this.isBoss ? 0.85 : 0.65; // Slow: 35% (15% for bosses)
                    this.takeDamage(0.25 * dt); // Tick damage: 0.25 per tick
                }
            }
        }

        // Sub-stepping horizontal collisions
        const stepsX = Math.ceil(Math.abs(this.vx * dt) / 8);
        const stepX = (this.vx * dt) / (stepsX || 1);
        for (let s = 0; s < stepsX; s++) {
            this.x += stepX;
            this.handleCollisions(true);
            if (this.vx === 0) break;
        }

        this.onGround = false;
        this.standingOnPlatform = null;
        // Sub-stepping vertical collisions
        const stepsY = Math.ceil(Math.abs(this.vy * dt) / 8);
        const stepY = (this.vy * dt) / (stepsY || 1);
        for (let s = 0; s < stepsY; s++) {
            this.y += stepY;
            this.handleCollisions(false);
            if (this.vy === 0) break;
        }
        
        if (!wasOnGround && this.onGround) { 
            this.wX = 1.4; 
            this.wY = 0.6; 
        }
        
        this.wVX += (1 - this.wX) * 0.3; 
        this.wX += this.wVX; 
        this.wVX *= 0.8;
        this.wVY += (1 - this.wY) * 0.3; 
        this.wY += this.wVY; 
        this.wVY *= 0.8;
        
        if (this.y + this.height > this.scene.getKillPlaneY()) {
            this.takeDamage(9999);
        } else if (this.y > this.scene.worldHeight + 200) {
            this.health = 0;
            if (!this.exploded) {
                this.exploded = true;
                this.scene.enemiesDefeated = (this.scene.enemiesDefeated || 0) + 1;
            }
        }
    }
    
    handleCollisions(isX) {
        const sideVerticalInset = 2;
        const floorHorizontalInset = 1;

        for (let p of this.scene.platforms) {
            const overlapsX = this.x < p.x + p.width && this.x + this.width > p.x;
            const overlapsY = this.y < p.y + p.height && this.y + this.height > p.y;
            if (!overlapsX || !overlapsY) continue;

            if (isX) {
                const verticalBodyOverlap =
                    this.y + sideVerticalInset < p.y + p.height &&
                    this.y + this.height - sideVerticalInset > p.y;
                if (!verticalBodyOverlap) continue;

                if (this.vx > 0) {
                    this.x = p.x - this.width;
                    this.vx = 0;
                } else if (this.vx < 0) {
                    this.x = p.x + p.width;
                    this.vx = 0;
                }
            } else {
                const horizontalFootOverlap =
                    this.x + floorHorizontalInset < p.x + p.width &&
                    this.x + this.width - floorHorizontalInset > p.x;
                if (!horizontalFootOverlap) continue;

                if (this.vy > 0) {
                    this.y = p.y - this.height;
                    this.onGround = true;
                    this.standingOnPlatform = p;
                    this.vy = 0;
                } else if (this.vy < 0) {
                    this.y = p.y + p.height;
                    this.vy = 0;
                }
            }
        }
    }
    
    takeDamage(amount, hitSource = null) {
        if (this.type === 'TANK' && !this.shieldBroken && hitSource) {
            const sourceX = hitSource.x + (hitSource.width || 0) / 2;
            const frontHit = (sourceX - (this.x + this.width / 2)) * this.facingDir > 0;
            // Check if projectile is normal
            const normalProjectile = hitSource instanceof Projectile && !hitSource.isBeam && !hitSource.isBrimstone && !hitSource.isRailgun && !hitSource.isGenkidama && !hitSource.isBlackHole;
            if (frontHit && normalProjectile) {
                this.shieldHits--;
                this.wX = 0.75;
                this.wY = 1.25;
                this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + this.width/2, this.y + this.height/2, 'SHINRA', '#ffee88'));
                this.scene.playSfx('hit');
                if (this.shieldHits <= 0) {
                    this.shieldBroken = true;
                    this.color = '#cc7700';
                    this.scene.spawnPaintSplats(this.x + this.width/2, this.y + this.height/2, '#ffee88', 18);
                }
                return;
            }
        }
        
        this.health -= amount; 
        if (this.health < 0) this.health = 0;
        this.wX = 1.3; 
        this.wY = 0.7; 
        this.damageFlashTimer = 100;
        
        this.scene.spawnPaintSplats(this.x + this.width/2, this.y + this.height/2, this.color, 3);
        
        if (this.health <= 0 && !this.exploded) { 
            this.exploded = true; 
            this.scene.playSfx('splat'); 
            this.scene.enemiesDefeated = (this.scene.enemiesDefeated || 0) + 1; 
            this.scene.spawnPaintSplats(this.x + this.width/2, this.y + this.height/2, this.color, 25); 
            
            if (Math.random() < 0.15) { 
                let p = new PowerUp(this.scene, this.x, this.y); 
                p.type = ['HEAL', 'HASTE', 'STAR', 'INVINCIBLE', 'MUSHROOM'][Math.floor(Math.random()*5)]; 
                this.scene.powerups.push(p); 
            }
        }
    }
    
    render(graphics) {
        if (this.exploded) return;
        
        graphics.save(); 
        graphics.translateCanvas(this.x + this.width/2, this.y + this.height); 
        graphics.scaleCanvas(this.wX, this.wY); 
        graphics.translateCanvas(-(this.x + this.width/2), -(this.y + this.height));
        
        let renderColor = this.color;
        if (this.freezeTimer > 0) renderColor = '#00aaff';
        const colorHex = Phaser.Display.Color.HexStringToColor(renderColor).color;
        
        if (this.damageFlashTimer > 0) { 
            graphics.fillStyle(0xffffff, 1.0); 
            graphics.fillRect(this.x, this.y, this.width, this.height); 
        } else { 
            // Neon Glow effect
            graphics.lineStyle(4, colorHex, 0.45);
            graphics.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
            
            graphics.fillStyle(colorHex, 1.0); 
            graphics.fillRect(this.x, this.y, this.width, this.height); 
        }
        
        // Draw red glowing eye
        graphics.fillStyle(0xff0000, 1.0); 
        const eyeW = this.width * 0.2;
        const eyeH = this.height * 0.2;
        if (this.facingDir > 0) {
            graphics.fillRect(this.x + this.width * 0.7, this.y + this.height * 0.2, eyeW, eyeH);
        } else {
            graphics.fillRect(this.x + this.width * 0.1, this.y + this.height * 0.2, eyeW, eyeH);
        }

        // Bomber indicator
        if (this.type === 'BOMBER') {
            graphics.lineStyle(2, 0xffffff, 0.55 + Math.sin(Date.now() / 90) * 0.35);
            graphics.strokeCircle(this.x + this.width/2, this.y + this.height/2, this.width * 0.7);
        } else if (this.type === 'JUMPER') {
            graphics.fillStyle(0xffffff, 0.55);
            graphics.fillRect(this.x + 4, this.y + this.height - 8, this.width - 8, 4);
        } else if (this.type === 'TANK' && !this.shieldBroken) {
            const sx = this.facingDir > 0 ? this.x + this.width + 4 : this.x - 10;
            // Shield rect
            graphics.fillStyle(0xffee88, 0.36);
            graphics.fillRect(sx, this.y + 3, 7, this.height - 6);
            graphics.lineStyle(2, 0xffee88, 1.0);
            graphics.strokeRect(sx, this.y + 3, 7, this.height - 6);
            // Shield hit indicators
            graphics.fillStyle(0xffee88, 1.0);
            for (let i = 0; i < this.shieldHits; i++) {
                graphics.fillRect(this.x + i * 7, this.y - 12, 5, 4);
            }
        }
        
        // Standard health bar
        if (!this.isBoss && this.health < this.maxHealth) { 
            graphics.fillStyle(0x222222, 1.0); 
            graphics.fillRect(this.x, this.y - 12, this.width, 4); 
            graphics.fillStyle(0xff0000, 1.0); 
            graphics.fillRect(this.x, this.y - 12, this.width * (this.health / this.maxHealth), 4); 
        }
        
        graphics.restore();
    }
}
