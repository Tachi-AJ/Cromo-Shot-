import Phaser from 'phaser';
import VisualEffect from './VisualEffect.js';

export default class Projectile {
    constructor(scene, x, y, vx, vy, color, ownerId, isMeteor = false) {
        this.scene = scene;
        this.x = x; 
        this.y = y; 
        this.width = 14; 
        this.height = 14; 
        this.vx = vx; 
        this.vy = vy; 
        this.color = color; 
        this.ownerId = ownerId;
        this.active = true; 
        this.isMeteor = isMeteor; 
        this.trail = []; 
        this.prevX = x;
        this.prevY = y;
        this.bounces = 0;
        this.pierceTimer = 0;
        this.hasChained = false;
        
        this.isBeam = false; 
        this.isGenkidama = false; 
        this.isGetsuga = false; 
        this.isRasengan = false; 
        this.isAmaterasu = false; 
        this.isGiantPaint = false;
        this.isHadouken = false; 
        this.isBlackHole = false; 
        this.isPrism = false; 
        this.prismSplit = false; 
        this.isBrimstone = false; 
        this.isKnife = false;
        this.isGoukakyu = false; 
        this.isCero = false; 
        this.isInfernal = false; 
        this.isTornado = false; 
        this.isBomb = false; 
        this.isChainLightning = false;
        this.isPlasma = false; 
        this.isMeteorStrike = false; 
        this.isVolcanoFireball = false;
        this.isOrbital = false; 
        this.isBat = false; 
        this.isGlacier = false; 
        this.isHailstorm = false; 
        this.isCrossSlash = false; 
        this.isVoidBeam = false;
        this.isBatSwarm = false; 
        this.isBlackRasengan = false; 
        this.isLightningSlash = false; 
        this.isBladeStorm = false; 
        this.isPaintRail = false;
        this.isTeslaRail = false;
        this.isHollowPurple = false;
        this.isCruelSun = false;
        this.isFullCounter = false;
        this.isMakankosappo = false;
        this.isGravityWell = false;
        this.isBossLaserGrid = false;
        this.isVoidRay = false;
        this.isSuperGenkidama = false;
        this.synergyTag = null;
        this.damageBoost = 1;
        this.hits = []; 
        this.hitCooldowns = new Map();
        this.age = 0;
        this.maxLifetime = 12000;
        
        this.timer = this.timer || 2000; 

        // Bounce Relic support
        const owner = scene.players ? scene.players.find(p => p.id == ownerId) : null;
        if (owner && owner.passives && owner.passives.BOUNCE_RELIC) {
            this.bounces = (this.bounces || 0) + 3;
        }
    }
    
    clone(vxOffset, vyOffset) {
        let copy = new Projectile(this.scene, this.x, this.y, this.vx + vxOffset, this.vy + vyOffset, this.color, this.ownerId);
        Object.assign(copy, this);
        copy.vx = this.vx + vxOffset;
        copy.vy = this.vy + vyOffset;
        copy.prismSplit = true;
        return copy;
    }

    update(realDeltaTime) {
        let effDelta = realDeltaTime * 1.0; 
        let effDeltaMs = effDelta * 16.666;
        if (this.ownerId === 'wind') {
            this.x += this.vx * effDelta;
            this.y += this.vy * effDelta;
            this.timer -= effDeltaMs;
            if (this.timer <= 0) this.active = false;
            return;
        }
        let owner = this.scene.players.concat((this.scene.enemies || [])).find(p => p.id == this.ownerId);
        if (owner?.timeStopTimer > 0) return;
        this.age += effDeltaMs;
        if (this.age > this.maxLifetime) {
            this.active = false;
            return;
        }
        if (this.timer !== undefined && this.initialTimer === undefined) {
            this.initialTimer = Math.max(1, this.timer);
        }
        this.prevX = this.x;
        this.prevY = this.y;
        if (this.pierceTimer > 0) this.pierceTimer -= effDeltaMs;
        
        if (this.isCrossSlash) {
            this.timer -= effDeltaMs;
            if (this.timer <= 0) { 
                this.active = false; 
                return; 
            }
        }

        if (this.isHollowPurple) {
            this.timer -= effDeltaMs;
            if (this.timer <= 0) this.active = false;
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const radius = 430;
            this.scene.getOpposingTeam(this.ownerId).forEach(t => {
                if (t.health <= 0 || t.exploded) return;
                const tx = t.x + t.width / 2;
                const ty = t.y + t.height / 2;
                const dx = cx - tx;
                const dy = cy - ty;
                const d = Math.max(1, Math.hypot(dx, dy));
                if (d < radius) {
                    t.vx += (dx / d) * 1.15;
                    t.vy += (dy / d) * 1.15;
                    if (d < this.width * 0.72) this.scene.dealDamage(t, 5, this);
                }
            });
        }

        if (this.isGravityWell) {
            this.timer -= effDeltaMs;
            if (this.timer <= 0) this.active = false;
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const radius = 360 * (this.power || 1);
            this.scene.getOpposingTeam(this.ownerId).forEach(t => {
                if (t.health <= 0 || t.exploded) return;
                const tx = t.x + t.width / 2;
                const ty = t.y + t.height / 2;
                const dx = cx - tx;
                const dy = cy - ty;
                const d = Math.max(1, Math.hypot(dx, dy));
                if (d < radius) {
                    t.vy += 2.5 * effDelta; // Intense downward force
                    t.vx *= 0.5;            // Pin them horizontally
                    if (Math.random() < 0.1) this.scene.dealDamage(t, 1.5, this, true);
                }
            });
            this.scene.projectiles.forEach(pr => {
                if (pr !== this && pr.active && !pr.isBlackHole) {
                    let dx = cx - (pr.x + pr.width/2);
                    let dy = cy - (pr.y + pr.height/2);
                    let dist = Math.hypot(dx, dy);
                    if (dist < 300) {
                        pr.vy += 1.5 * effDelta;
                    }
                }
            });
        }

        if (this.isCruelSun) {
            this.timer -= effDeltaMs;
            if (this.timer <= 0) this.active = false;
            this.vy += 0.65 * 0.22 * 1.0;
            this.scene.getOpposingTeam(this.ownerId).forEach(t => {
                if (t.health <= 0 || t.exploded) return;
                const d = Math.hypot((t.x + t.width/2) - (this.x + this.width/2), (t.y + t.height/2) - (this.y + this.height/2));
                if (d < 230) {
                    this.scene.dealDamage(t, 1.4, this);
                    t.freezeTimer = Math.max(t.freezeTimer || 0, 120);
                }
            });
        }

        if (this.isBeam || this.isBrimstone || this.isInfernal || this.isCero || this.isRailgun) {
            if (this.timer !== undefined) {
                this.timer -= effDeltaMs;
                if (this.timer <= 0) {
                    this.active = false;
                    return;
                }
            }
            if (owner && owner.health <= 0 && !owner.isBoss) {
                this.active = false;
                return;
            }
            if (this.isVoidBeam) {
                this.scene.getOpposingTeam(this.ownerId).forEach(p => {
                    if (p.health > 0) {
                        let py = p.y + p.height / 2; 
                        let by = this.y + this.height / 2;
                        p.vy += (by - py) * 0.02; 
                        p.vy *= 0.82;
                        
                        if (owner) {
                            let casterX = owner.x + owner.width / 2;
                            let targetX = p.x + p.width / 2;
                            let distToCaster = Math.abs(targetX - casterX);
                            if (distToCaster > 40) {
                                let pullDirection = targetX > casterX ? -2.2 : 2.2;
                                p.vx += pullDirection;
                            }
                        } else {
                            p.vx -= (this.vx > 0 ? 2 : -2); 
                        }
                    }
                });
            }
        }

        if (this.isKnife && !this.isBat && !this.isBrimstone) {
            this.timer -= effDeltaMs; 
            if (this.timer <= 0) { 
                this.active = false; 
            }
            if (this.timer < (this.initialTimer || 800) * 0.72) { 
                if (owner && !owner.exploded) {
                    let dx = (owner.x + owner.width / 2) - (this.x + this.width / 2);
                    let dy = (owner.y + owner.height / 2) - (this.y + this.height / 2);
                    let dist = Math.max(1, Math.hypot(dx, dy));
                    this.vx += (dx / dist) * 2; 
                    this.vy += (dy / dist) * 2;
                    if (dist < 28) this.active = false;
                }
            }
        }

        if (this.isGoukakyu) {
            this.vy += 0.65 * 0.45 * 1.0;
            this.vx *= 0.998;
        }

        if (this.isGetsuga && !this.isCrossSlash && !this.isLightningSlash) {
            this.height += 0.8 * 1.0;
            this.width += 0.3 * 1.0;
        }

        if (this.isTornado) {
            this.timer -= effDeltaMs; 
            if (this.timer <= 0) { 
                this.active = false; 
                return; 
            }
            
            let pullRadius = this.isBlizzard ? 350 : (this.isHurricaneFlame ? 250 : 200);
            let pullStrength = this.isBlackHole ? 0.8 : 0.08;
            
            this.scene.getOpposingTeam(this.ownerId).forEach(p => {
                if (p.id !== this.ownerId && p.health > 0) {
                    let d = Math.hypot((p.x + p.width/2) - (this.x + this.width/2), (p.y + p.height/2) - (this.y + this.height/2));
                    if (d < pullRadius) { 
                        p.vx += ((this.x + this.width/2) - (p.x + p.width/2)) * pullStrength / (d/10); 
                        p.vy -= 0.6; 
                        if (d < this.width/2) {
                            this.scene.dealDamage(p, this.isHurricaneFlame ? 2.5 : 1.25, this, true);
                            if (this.isBlizzard) p.freezeTimer = Math.max(p.freezeTimer, 2000);
                        }
                    }
                }
            });
            
            if (this.isFireTornado && !this.isHurricaneFlame && Math.random() < 0.05) {
                let f = new Projectile(this.scene, this.x + this.width/2, this.y + this.height/2, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, '#ff3300', this.ownerId);
                f.isHadouken = true; 
                f.width = 15; 
                f.height = 15; 
                this.scene.projectiles.push(f);
            }
            if (this.isHurricaneFlame) {
                const target = this.scene.getNearestEnemy(this, 520);
                if (target) {
                    const dx = (target.x + target.width / 2) - (this.x + this.width / 2);
                    const dy = (target.y + target.height / 2) - (this.y + this.height / 2);
                    const d = Math.max(1, Math.hypot(dx, dy));
                    this.vx += (dx / d) * 0.16 * 1.0;
                    this.vy += (dy / d) * 0.09 * 1.0;
                }
                this.vx += (Math.random() - 0.5) * 1.4 * 1.0; 
                this.vy += (Math.random() - 0.5) * 1.4 * 1.0;
                this.vx = Math.max(-4, Math.min(4, this.vx));
                this.vy = Math.max(-3, Math.min(3, this.vy));
                if (Math.random() < 0.05) {
                    let f = new Projectile(this.scene, this.x + this.width/2, this.y + this.height, 0, 5, '#111', this.ownerId);
                    f.isAmaterasu = true; 
                    f.amaterasuTimer = 3000; 
                    this.scene.projectiles.push(f);
                }
            }
            if (this.isThunderstorm && Math.random() < 0.04) {
                let target = this.scene.getNearestEnemy(this, 300);
                if (target) {
                    let bolt = new Projectile(this.scene, target.x + target.width/2, 0, 0, 0, '#ffff00', this.ownerId);
                    bolt.isOrbital = true; 
                    bolt.width = 15; 
                    bolt.height = this.scene.worldHeight; 
                    bolt.timer = 200; 
                    this.scene.projectiles.push(bolt); 
                    this.scene.playSfx('hit');
                }
            }
            if (this.isBatSwarm && Math.random() < 0.1) {
                let b = new Projectile(this.scene, this.x + this.width/2, this.y + this.height/2, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, '#8800ff', this.ownerId);
                b.isBat = true; 
                b.width = 20; 
                b.height = 15; 
                b.timer = 3000; 
                this.scene.projectiles.push(b);
            }
            if (this.isBladeStorm && Math.random() < 0.1) {
                let k = new Projectile(this.scene, this.x + this.width/2, this.y + this.height/2, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, '#aaa', this.ownerId);
                k.isKnife = true; 
                k.width = 40; 
                k.height = 15; 
                k.timer = 1000; 
                k.originalDir = Math.sign(k.vx); 
                this.scene.projectiles.push(k);
            }
            return; 
        }

        if (this.isChainLightning) {
            this.timer -= effDeltaMs;
            if (this.timer <= 0) { 
                this.active = false; 
                return; 
            }
            if (!this.hasChained) {
                this.hasChained = true;
                let currentPos = { x: this.x, y: this.y };
                let hitIds = new Set();
                const targets = this.scene.getOpposingTeam(this.ownerId);
                for(let i = 0; i < 5; i++) {
                    let nearest = null;
                    let minDist = 600;
                    targets.forEach(target => {
                        if (target.health > 0 && !target.exploded && !hitIds.has(target.id) && target.id !== this.ownerId) {
                            let d = Math.hypot((target.x + target.width/2) - currentPos.x, (target.y + target.height/2) - currentPos.y);
                            if (d < minDist) {
                                minDist = d;
                                nearest = target;
                            }
                        }
                    });
                    if (nearest) {
                        hitIds.add(nearest.id);
                        this.hits.push(nearest);
                        this.scene.dealDamage(nearest, 26 + i * 4, this);
                        currentPos = { x: nearest.x + nearest.width/2, y: nearest.y + nearest.height/2 };
                    } else {
                        break;
                    }
                }
                this.scene.playSfx('spell');
            }
            return;
        }
        
        if (this.isFactoryDrip) {
            this.y += this.vy * effDelta;
            
            let hit = false;
            for (let p of this.scene.platforms) {
                if (this.x > p.x && this.x < p.x + p.width && this.y > p.y && this.y < p.y + p.height) {
                    p.stain(this.x, this.y, 40, this.color);
                    this.scene.spawnPaintSplats(this.x, this.y, this.color, 6);
                    hit = true;
                    break;
                }
            }
            if (this.y > this.scene.getKillPlaneY()) {
                hit = true;
            }
            if (hit) {
                this.active = false;
            }
            return;
        }

        if (this.isVolcanoFireball) {
            this.x += this.vx * effDelta;
            this.y += this.vy * effDelta;
            
            let hit = false;
            this.scene.players.forEach(p => {
                if (p.health > 0 && !p.exploded) {
                    const dist = Math.hypot((p.x + p.width/2) - (this.x + this.width/2), (p.y + p.height/2) - (this.y + this.height/2));
                    if (dist < (p.width/2 + this.width/2)) {
                        hit = true;
                    }
                }
            });
            if (this.scene.enemies) {
                this.scene.enemies.forEach(e => {
                    if (e.health > 0 && !e.exploded) {
                        const dist = Math.hypot((e.x + e.width/2) - (this.x + this.width/2), (e.y + e.height/2) - (this.y + this.height/2));
                        if (dist < (e.width/2 + this.width/2)) {
                            hit = true;
                        }
                    }
                });
            }
            for (let p of this.scene.platforms) {
                if (this.x > p.x && this.x < p.x + p.width && this.y > p.y && this.y < p.y + p.height) {
                    hit = true;
                    break;
                }
            }
            // Rising fireballs should not instantly detonate when spawned below kill plane
            if (this.vy > 0 && this.y > this.scene.getKillPlaneY()) {
                hit = true;
            } else if (this.vy < 0 && this.y < -100) {
                this.active = false;
                return;
            }
            
            if (hit) {
                this.explodeVolcanoFireball();
                this.active = false;
            }
            return;
        }

        if (this.isMeteorStrike || this.isKirin) {
            this.y += this.vy * 1.0;
            if (this.y > this.scene.worldHeight - 100) { 
                this.explodeMeteorStrike(); 
                this.active = false; 
            } 
            return;
        }

        if (this.isOrbital) {
            this.timer -= effDeltaMs; 
            if (this.timer <= 0) {
                this.active = false;
                return;
            }
            if (this.followTargetId) {
                const target = this.scene.players.concat(this.scene.enemies || []).find(e => e.id === this.followTargetId && e.health > 0 && !e.exploded);
                if (target) {
                    const tx = target.x + (target.width || 0) / 2 - this.width / 2;
                    this.x += (tx - this.x) * 0.035 * effDelta;
                }
            }
            const activeBeam = this.timer < ((this.initialTimer || 1500) - (this.strikeDelay || 200)) && this.timer > 0;
            
            if (this.isBlackHole) {
                this.scene.getOpposingTeam(this.ownerId).forEach(p => {
                    if (p.health > 0) {
                        let dx = (this.x + this.width/2) - (p.x + p.width/2); 
                        let dy = (this.y + this.height/2) - (p.y + p.height/2);
                        let dist = Math.hypot(dx, dy) || 1; 
                        p.vx += (dx / dist) * 2.0; 
                        p.vy += (dy / dist) * 2.0;
                    }
                });
            }
            if (activeBeam) {
                this.scene.getOpposingTeam(this.ownerId).forEach(p => {
                    if (p.id !== this.ownerId && p.health > 0 && !p.exploded) {
                        const actualW = p.scaleMultiplier ? p.width * p.scaleMultiplier : p.width;
                        const actualH = p.scaleMultiplier ? p.height * p.scaleMultiplier : p.height;
                        const cx = p.x + actualW / 2;
                        const inColumn = cx >= this.x - 18 && cx <= this.x + this.width + 18;
                        if (inColumn) {
                            p.takeDamage(this.isBlackHole ? 5 : 3);
                            p.vx += ((this.x + this.width / 2) - cx) * 0.025;
                            p.vy += this.isBlackHole ? -0.4 : 0.8;
                            if (Math.random() < 0.25) this.scene.spawnPaintSplats(cx, p.y + actualH / 2, this.color, 2);
                        }
                    }
                });
                this.scene.shakeTime = 5; 
                this.scene.shakeMagnitude = 2; 
            }
            return;
        }

        if (this.isGlacier) {
            this.timer -= effDeltaMs; 
            this.width += 20 * 1.0; 
            this.height += 20 * 1.0; 
            this.x -= 10 * 1.0; 
            this.y -= 10 * 1.0;
            if (this.timer <= 0) {
                this.active = false;
                return;
            }
        }

        if (this.isBat) {
            this.timer -= effDeltaMs; 
            if (this.timer <= 0) {
                this.active = false;
                return;
            }
            
            let target = this.scene.getNearestEnemy(this, 1000);
            if (target) {
                let dx = (target.x + target.width/2) - (this.x + this.width/2); 
                let dy = (target.y + target.height/2) - (this.y + this.height/2);
                let dist = Math.hypot(dx, dy);
                this.vx += (dx / dist) * 1.5; 
                this.vy += (dy / dist) * 1.5;
                let maxS = this.isKnife ? 20 : 12; 
                let curS = Math.hypot(this.vx, this.vy);
                if (curS > maxS) { 
                    this.vx = (this.vx / curS) * maxS; 
                    this.vy = (this.vy / curS) * maxS; 
                }
            }
            if (this.isAmaterasuBat && Math.random() < 0.05) {
                let flame = new Projectile(this.scene, this.x, this.y, 0, 2, '#111', this.ownerId); 
                flame.isAmaterasu = true; 
                flame.amaterasuTimer = 2000; 
                this.scene.projectiles.push(flame);
            }
        }

        if (!this.isBeam && !this.isBrimstone && !this.isCero && !this.isInfernal && !this.isOrbital && !this.isGlacier && !this.isCrossSlash) {
            const reflectors = this.scene.players.concat((this.scene.enemies || [])).filter(e => e.reflectTimer > 0 && e.id !== this.ownerId && !e.exploded && e.health > 0);
            for (let p of reflectors) {
                    let pW = p.scaleMultiplier ? p.width * p.scaleMultiplier : p.width;
                    let pH = p.scaleMultiplier ? p.height * p.scaleMultiplier : p.height;
                    
                    if (this.x < p.x + pW * 1.5 && this.x + this.width > p.x - pW * 0.5 && this.y < p.y + pH * 1.5 && this.y + this.height > p.y - pH * 0.5) {
                        this.vx *= -2; 
                        this.vy *= -2; 
                        this.ownerId = p.id; 
                        this.color = p.baseColor || p.color;
                        this.width *= 2;
                        this.height *= 2;
                        this.damageBoost = Math.max(this.damageBoost || 1, 2);
                        if (this.isBlackHole) { this.timer = 0; } 
                        this.scene.playSfx('pickup'); 
                        return;
                    }
            }
        }

        if (this.isBomb) {
            this.timer -= effDeltaMs; 
            this.vy += 0.65;
            if (this.timer <= 0) { 
                this.splash(this.x, this.y, this.isGiantPaint ? 250 : 100, this.isGiantPaint ? 300 : 120, 40); 
                this.active = false; 
                this.scene.playSfx('explosion'); 
                return; 
            }
        }

        if (owner && owner.passives && owner.passives['SPOON_BENDER'] && !this.isBeam && !this.isBrimstone && !this.isAmaterasu && !this.isBlackHole && !this.isPrism && !this.isCero && !this.isInfernal && !this.isBat && !this.isOrbital && !this.isGlacier && !this.isCrossSlash) {
            let target = this.scene.getNearestEnemy(this, 600);
            if (target) {
                let dx = (target.x + target.width/2) - (this.x + this.width/2); 
                let dy = (target.y + target.height/2) - (this.y + this.height/2);
                let dist = Math.hypot(dx, dy); 
                this.vx += (dx / dist) * 0.8; 
                this.vy += (dy / dist) * 0.8;
                
                let currentSpeed = Math.hypot(this.vx, this.vy); 
                let maxS = this.isGenkidama ? 5 : 20;
                
                if (currentSpeed > maxS) { 
                    this.vx = (this.vx / currentSpeed) * maxS; 
                    this.vy = (this.vy / currentSpeed) * maxS; 
                }
            }
        }

        if (this.isBrimstone || this.isInfernal || this.isBeam || this.isRailgun) {
            if (owner && owner.passives && owner.passives['SPOON_BENDER']) { 
                let target = this.scene.getNearestEnemy(this, 1000); 
                if (target) this.y += (target.y + target.height/2 - (this.y + this.height/2)) * 0.1; 
            }
            if (owner && !owner.isBoss && !owner.exploded && this.followOwner !== false) { 
                const dir = owner.facingRight ? 1 : -1;
                this.x = (owner.facingRight ? owner.x + owner.width : owner.x - this.width) + (this.followOffsetX ? this.followOffsetX * dir : 0); 
                this.y = (owner.y + owner.height/2 - this.height/2) + (this.followOffsetY || 0); 
            }
            if (this.followOwner === false) {
                this.x += this.vx * effDelta;
                this.y += this.vy * effDelta;
            }
            if (this.isInfernal && Math.random() < 0.2) {
                this.splash(this.x + Math.random() * this.width, this.y, 40, 40, 0); 
            }
        }

        if (this.isCero) {
            this.width += 20 * 1.0; 
            this.height += 2 * 1.0; 
            this.x += this.vx * 1.0;
            if (this.width > 2000) this.active = false; 
            this.scene.shakeTime = 5; 
            this.scene.shakeMagnitude = 4;
        }

        if (this.isRasenshuriken) {
            this.timer -= effDeltaMs; 
            if (this.timer <= 0) {
                this.active = false;
                return;
            }
            
            if (this.timer > 300 && this.timer < 700) { 
                this.vx *= 0.8; 
                this.width += 2 * 1.0; 
                this.height += 2 * 1.0; 
            } 
            if (this.timer < 300) { 
                if (owner && !owner.exploded) {
                    let dx = (owner.x + owner.width/2) - (this.x + this.width/2); 
                    let dy = (owner.y + owner.height/2) - (this.y + this.height/2);
                    let dist = Math.hypot(dx, dy);
                    this.vx = (dx / dist) * 25; 
                    this.vy = (dy / dist) * 25;
                    if (dist < 30) this.active = false; 
                }
            }
        }

        if (this.isBlackHole && !this.isOrbital) {
            if (this.isSupernova) {
                // Grow supernova
                let growAmt = 1.8 * effDelta;
                this.width += growAmt;
                this.height += growAmt;
                this.x -= growAmt / 2;
                this.y -= growAmt / 2;
                // Spawn coronal flares
                if (Math.random() < 0.12) {
                    let angle = Math.random() * Math.PI * 2;
                    let spd = Math.random() * 6 + 4;
                    let flare = new Projectile(this.scene, this.x + this.width/2, this.y + this.height/2, Math.cos(angle) * spd, Math.sin(angle) * spd, '#ffcc00', this.ownerId);
                    flare.width = 12;
                    flare.height = 12;
                    flare.timer = 600;
                    this.scene.projectiles.push(flare);
                }
            } else if (this.isPlanetaryDevastation) {
                // Debris pulling effect particles
                if (Math.random() < 0.25) {
                    let rx = this.x + this.width/2 + (Math.random() - 0.5) * 400;
                    let ry = this.scene.worldHeight - 20 - Math.random() * 40;
                    this.scene.visualEffects.push(new VisualEffect(this.scene, rx, ry, 'CHIDORI', '#8b5cff'));
                }
            }

            this.timer -= effDeltaMs;
            if (this.timer <= 0) {
                let splashRadius = 150 * this.power;
                let splashDmg = 40 * this.power;
                if (this.isSupernova) {
                    splashRadius = 400;
                    splashDmg = 100;
                    this.scene.flashAlpha = 1.0;
                    this.scene.shakeTime = 35;
                    this.scene.shakeMagnitude = 28;
                } else if (this.isPlanetaryDevastation) {
                    splashRadius = 300;
                    splashDmg = 80;
                    this.scene.flashAlpha = 0.8;
                    this.scene.shakeTime = 30;
                    this.scene.shakeMagnitude = 22;
                } else {
                    this.scene.flashAlpha = 0.7;
                    this.scene.shakeTime = 25;
                    this.scene.shakeMagnitude = 15 * this.power;
                }
                this.splash(this.x + this.width/2, this.y + this.height/2, splashRadius, splashRadius * 1.2, splashDmg);
                this.active = false; 
                this.scene.playSfx('explosion'); 
                return;
            }
            this.scene.getOpposingTeam(this.ownerId).forEach(p => {
                if (p.health > 0 && p.id !== this.ownerId) {
                    let dx = (this.x + this.width/2) - (p.x + p.width/2); 
                    let dy = (this.y + this.height/2) - (p.y + p.height/2);
                    let dist = Math.hypot(dx, dy) || 1; 
                    if (dist < 400 * this.power) { 
                        if (this.isGravityWell) {
                            p.vy += 2.5 * effDelta;
                            p.vx *= 0.5;
                        } else {
                            p.vx += (dx / dist) * 0.8 * this.power; 
                            p.vy += (dy / dist) * 0.8 * this.power; 
                        }
                    }
                }
            });
            this.scene.projectiles.forEach(pr => {
                if (pr !== this && pr.active && !pr.isBlackHole) {
                    let dx = (this.x + this.width/2) - (pr.x + pr.width/2); 
                    let dy = (this.y + this.height/2) - (pr.y + pr.height/2);
                    let dist = Math.hypot(dx, dy);
                    if (dist < 300 * this.power) {
                        if (pr.isMeteor) { 
                            pr.active = false; 
                            this.power += 0.5; 
                            this.width += 10; 
                            this.height += 10; 
                            this.x -= 5; 
                            this.y -= 5; 
                        } else if (pr.isChainLightning) { 
                            this.isZapping = true; 
                        } else if (!pr.isBeam && !pr.isBrimstone && !pr.isGetsuga && !pr.isPrism && !pr.isCero && !pr.isInfernal) { 
                            pr.vx += (dx / dist) * 0.5; 
                            pr.vy += (dy / dist) * 0.5; 
                        }
                    }
                }
            });
            if (this.isZapping && Math.random() < 0.1) { 
                this.scene.getOpposingTeam(this.ownerId).forEach(p => { 
                    if (Math.hypot(p.x - this.x, p.y - this.y) < 300) p.takeDamage(5); 
                }); 
            }
            return;
        }

        if (this.isPrism) {
            this.timer -= effDeltaMs; 
            if (this.timer <= 0) {
                this.active = false;
                return;
            }
            this.vy += 0.65; 
            this.y += this.vy * 1.0;
            
            for (let p of this.scene.platforms) { 
                if (this.x < p.x + p.width && this.x + this.width > p.x && this.y < p.y + p.height && this.y + this.height > p.y) { 
                    if (this.vy > 0) { 
                        this.y = p.y - this.height; 
                        this.vy = 0; 
                    } 
                } 
            }
            
            this.scene.projectiles.forEach(pr => {
                if (pr !== this && pr.active && !pr.isPrism && !pr.isBlackHole && !pr.prismSplit && !pr.isAmaterasu) {
                    if (pr.x < this.x + this.width && pr.x + pr.width > this.x && pr.y < this.y + this.height && pr.y + pr.height > this.y) {
                        pr.prismSplit = true; 
                        this.scene.playSfx('pickup');
                        if (pr.isBeam || pr.isGetsuga || pr.isGenkidama || pr.isRasengan || pr.isHadouken || pr.isBrimstone || pr.isGoukakyu || pr.isCero || pr.isInfernal) {
                            let p1 = pr.clone(pr.vx * 0.3, -5); 
                            let p2 = pr.clone(pr.vx * 0.3, 5); 
                            this.scene.projectiles.push(p1, p2); 
                        } else if (pr.isChainLightning) { 
                            let cl1 = pr.clone(0, 0); 
                            let cl2 = pr.clone(0, 0); 
                            this.scene.projectiles.push(cl1, cl2);
                        } else {
                            let p1 = pr.clone(0, pr.vx * 0.5 - pr.vy); 
                            let p2 = pr.clone(0, -pr.vx * 0.5 - pr.vy); 
                            this.scene.projectiles.push(p1, p2);
                        }
                    }
                }
            }); 
            return; 
        }

        if (this.isAmaterasu) {
            this.amaterasuTimer -= effDeltaMs;
            if (this.amaterasuTimer <= 0) {
                this.active = false;
                return;
            }
            if (this.vy === 0 && this.vx === 0) {
                this.splash(this.x + this.width/2, this.y + this.height/2, 80, 80, 1.5); 
                this.color = '#111'; 
                return; 
            }
        }

        if (this.isBlackRasengan && Math.random() < 0.1) {
            let flame = new Projectile(this.scene, this.x + this.width/2, this.y + this.height, 0, 5, '#111', this.ownerId);
            flame.isAmaterasu = true; 
            flame.amaterasuTimer = 2000; 
            this.scene.projectiles.push(flame);
        }
        
        if (this.isLightningSlash && Math.random() < 0.1) {
            let cl = new Projectile(this.scene, this.x + this.width/2, this.y + this.height/2, 0, 0, '#ffff00', this.ownerId);
            cl.isChainLightning = true; 
            cl.width = 10; 
            cl.height = 10; 
            cl.timer = 400; 
            cl.hits = []; 
            this.scene.projectiles.push(cl);
        }

        if (this.isMeteor || this.isHadouken || (this.isKnife && !this.isBat) || this.isGoukakyu || this.isPlasma || this.isBat || this.isGenkidama || this.isGetsuga) {
            this.trail.push({x: this.x, y: this.y}); 
        if (this.trail.length > (this.isHadouken || this.isKnife || this.isBat || this.isGetsuga ? 5 : 12)) {
                this.trail.shift();
            }
        }

        if (!this.isBrimstone && !this.isCero && !this.isInfernal && !this.isBomb && !this.isOrbital && !this.isGlacier && !this.isRailgun && !this.isBeam && !this.isCrossSlash) { 
            const steps = Math.ceil(Math.max(Math.abs(this.vx * 1.0), Math.abs(this.vy * 1.0)) / 6);
            const stepVx = (this.vx * 1.0) / steps;
            const stepVy = (this.vy * 1.0) / steps;
            for (let s = 0; s < steps; s++) {
                this.prevX = this.x;
                this.prevY = this.y;
                this.x += stepVx;
                this.y += stepVy;
                this.checkCollisions(owner);
                if (!this.active) break;
            }
        } else {
            this.checkCollisions(owner);
        }
        
        if (this.x < -1500 || this.x > this.scene.worldWidth + 1500 || this.y > this.scene.worldHeight + 500) {
            this.active = false;
        }

        if (!this.isAmaterasu) {
            this.scene.projectiles.forEach(pr => {
                if (pr.isAmaterasu && Math.hypot(pr.x - this.x, pr.y - this.y) < 50) {
                    if (this.isHadouken) { 
                        this.isFireHadouken = true; 
                        this.color = '#ff5500'; 
                        this.vx *= 1.05; 
                    }
                    if (this.isGetsuga) { 
                        this.color = '#111'; 
                        this.isBlackGetsuga = true; 
                    }
                    if (this.isKnife) { 
                        this.isFireKnife = true; 
                        this.color = '#111'; 
                    }
                    if (this.isTornado) {
                        this.isFireTornado = true;
                        this.isHurricaneFlame = true;
                        this.color = '#111';
                    }
                    if (this.isRasengan) {
                        this.isBlackRasengan = true;
                        this.color = '#111';
                    }
                    if (this.isPlasma) {
                        this.color = '#111';
                        this.timer += 700;
                    }
                }
            });
        }
        
        if (this.isHadouken) {
            this.scene.projectiles.forEach(pr => {
                if (pr.isGenkidama && pr.ownerId === this.ownerId && pr.active) {
                    let d = Math.hypot(this.x - pr.x, this.y - pr.y);
                    if (d < pr.width) {
                        pr.splash(pr.x + pr.width/2, pr.y + pr.height/2, 500, 500, 120);
                        pr.active = false; 
                        this.active = false; 
                        this.scene.flashAlpha = 1; 
                        this.scene.shakeTime = 30; 
                        this.scene.shakeMagnitude = 30; 
                        this.scene.playSfx('explosion');
                    }
                }
            });
        }

        if (this.timer !== undefined && this.timer > 0) {
            if (![
                'isCrossSlash', 'isHollowPurple', 'isGravityWell', 'isCruelSun', 'isBeam', 'isBrimstone',
                'isInfernal', 'isCero', 'isRailgun', 'isKnife', 'isTornado', 'isChainLightning',
                'isBomb', 'isRasenshuriken', 'isBlackHole', 'isPrism', 'isGlacier', 'isBat', 'isOrbital'
            ].some(prop => this[prop])) {
                this.timer -= effDeltaMs;
                if (this.timer <= 0) this.active = false;
            }
        }

        if (this.isAmaterasu && (this.vx !== 0 || this.vy !== 0)) {
            this.vy += 0.65 * 0.5 * 1.0;
        }
    }
    
    checkCollisions(owner) {
        const targets = this.scene.getOpposingTeam(this.ownerId);
        for (let p of targets) {
            if (p.id !== this.ownerId && this.active && p.health > 0) {
                let actualW = p.scaleMultiplier ? p.width * p.scaleMultiplier : p.width; 
                let actualH = p.scaleMultiplier ? p.height * p.scaleMultiplier : p.height;


                if (this.x < p.x + actualW && this.x + this.width > p.x && this.y < p.y + actualH && this.y + this.height > p.y) {
                    if (this.isBeam || this.isBrimstone || this.isRailgun || this.isCero || this.isInfernal) { 
                        const tickMs = 55;
                        const lastHit = this.hitCooldowns.get(p.id) || -9999;
                        if (this.age - lastHit >= tickMs) {
                            let beamDamage = 3.5;
                            if (this.isVoidRay) beamDamage = 7.5;
                            else if (this.isMakankosappo) beamDamage = 10.0;
                            else if (this.isBrimstone) beamDamage = 5.0;
                            else if (this.isTeslaRail) beamDamage = 5.5;
                            else if (this.isCero) beamDamage = 5.2;
                            else if (this.isInfernal) beamDamage = 5.8;
                            else if (this.isBossLaserGrid) beamDamage = 3.0;

                            this.scene.dealDamage(p, beamDamage, this, true);
                            this.hitCooldowns.set(p.id, this.age);
                        }
                        if (this.isTeslaRail) p.vy -= 0.25;
                        if (this.isMakankosappo || this.isVoidRay || this.isBossLaserGrid) p.damageFlashTimer = 220;
                    } else if (this.isOrbital) { 
                        if (this.timer < ((this.initialTimer || 1500) - (this.strikeDelay || 200))) {
                            let orbitalDmg = this.isBlackHole ? 10.0 : 4.2;
                            this.scene.dealDamage(p, orbitalDmg, this, true);
                        } 
                    } else if (this.isGlacier) { 
                        this.scene.dealDamage(p, 2, this); 
                        p.freezeTimer = 4000; 
                    } else if (this.isCrossSlash) { 
                        if (!this.hits.includes(p.id)) { 
                            this.scene.dealDamage(p, 80, this); 
                            this.splash(this.x + this.width/2, this.y + this.height/2, 100, 100, 20); 
                            this.hits.push(p.id); 
                        } 
                    } else if (this.isBat) { 
                        this.scene.dealDamage(p, this.isAmaterasuBat ? 15 : (this.isKnife ? 25 : 8), this); 
                        if (owner) { 
                            owner.health = Math.min(owner.maxHealth, owner.health + (this.isAmaterasuBat ? 3 : 5)); 
                            this.scene.updateHUD(); 
                        } 
                        this.splash(this.x, this.y, 40, 40, 0); 
                        this.active = false; 
                    } else if (this.isGenkidama) { 
                        this.scene.dealDamage(p, 50, this); 
                        this.splash(this.x + this.width/2, this.y + this.height/2, 250, 300, 50); 
                        this.spawnFirePools(8, 200, this.color, 4000);
                        this.active = false; 
                        this.scene.flashAlpha = 0.8; 
                        this.scene.shakeTime = 30; 
                        this.scene.shakeMagnitude = 20; 
                        this.scene.playSfx('explosion'); 
                    } else if (this.isGoukakyu) { 
                        this.scene.dealDamage(p, 60, this); 
                        this.splash(this.x + this.width/2, this.y + this.height/2, 200, 200, 20); 
                        this.spawnFirePools(6, 120, this.color, 3500);
                        this.active = false; 
                    } else if (this.isGetsuga) { 
                        this.scene.dealDamage(p, this.isBlackGetsuga ? 40 : 20, this); 
                        this.splash(this.x + this.width/2, p.y + actualH/2, 120, 150, this.isBlackGetsuga ? 20 : 10); 
                    } else if (this.isRasengan || this.isRasenshuriken) { 
                        this.scene.dealDamage(p, this.width > 50 ? 80 : 40, this); 
                        if (!this.isRasenshuriken) { 
                            this.splash(this.x + this.width/2, this.y + this.height/2, this.width > 50 ? 250 : 180, this.width > 50 ? 280 : 200, 25); 
                            this.active = false; 
                            this.scene.flashAlpha = 0.4; 
                            this.scene.shakeTime = 15; 
                            this.scene.shakeMagnitude = 10; 
                            this.scene.playSfx('explosion'); 
                        } 
                    } else if (this.isKnife) { 
                        this.scene.dealDamage(p, this.isFireKnife ? 25 : 15, this); 
                    } else if (this.isAmaterasu) { 
                        this.scene.dealDamage(p, 20, this); 
                        this.vx = 0; 
                        this.vy = 0; 
                    } else if (this.isPlasma) { 
                        this.scene.dealDamage(p, 20, this); 
                        this.vx *= -1; 
                        this.vy *= -1; 
                        this.timer -= 500; 
                    } else { 
                        this.scene.dealDamage(p, this.isFireHadouken ? 30 : 15, this); 
                        if (owner && owner.passives && owner.passives['VAMPIRE']) { 
                            owner.health = Math.min(owner.maxHealth, owner.health + 8); 
                            this.scene.updateHUD(); 
                        } 
                        if (this.isGiantPaint) {
                            this.splash(this.x, this.y, 140, 150, 15); 
                        } else {
                            this.splash(this.x, this.y); 
                        }
                        this.active = false; 
                    }
                }
            }
        }

        if (this.active && !this.isBrimstone && !this.isCero && !this.isInfernal && !this.isBomb && !this.isOrbital && !this.isGlacier && !this.isCrossSlash && !this.isHollowPurple && !this.isGravityWell && !this.isMakankosappo && !this.isVoidRay && !this.isBossLaserGrid && !this.isBlackHole && !this.isCruelSun) {
            for (let p of this.scene.platforms) {
                if (this.x < p.x + p.width && this.x + this.width > p.x && this.y < p.y + p.height && this.y + this.height > p.y) {
                    if (this.isBeam || this.isRailgun) { 
                        p.stainPoint(this.x, this.y, this.color); 

                    } else if (this.isGenkidama) { 
                        this.splash(this.x + this.width/2, this.y + this.height/2, 250, 300, 50); 
                        this.spawnFirePools(8, 200, this.color, 4000);
                        this.active = false; 
                        this.scene.flashAlpha = 0.5; 
                        this.scene.shakeTime = 20; 
                        this.scene.shakeMagnitude = 15; 
                        this.scene.playSfx('explosion'); 
                    } else if (this.isGoukakyu) { 
                        this.splash(this.x + this.width/2, this.y + this.height/2, 120, 160, 12); 
                        if (this.bounces > 0) {
                            this.bounces--;
                            const hitFromTop = this.prevY + this.height <= p.y + 4;
                            if (hitFromTop) {
                                this.y = p.y - this.height - 2;
                                this.vy = -Math.abs(this.vy) * 0.72;
                            } else {
                                this.vx *= -0.78;
                            }
                            this.width *= 0.94;
                            this.height *= 0.94;
                            this.scene.playSfx('splat');
                        } else {
                            this.splash(this.x + this.width/2, this.y + this.height/2, 220, 220, 30); 
                            this.spawnFirePools(6, 150, this.color, 3500);
                            this.active = false; 
                        }
                    } else if (this.isCruelSun) {
                        this.splash(this.x + this.width/2, this.y + this.height/2, 330, 360, 70);
                        this.active = false;
                        this.scene.flashAlpha = 0.7;
                        this.scene.shakeTime = Math.max(this.scene.shakeTime, 26);
                        this.scene.shakeMagnitude = Math.max(this.scene.shakeMagnitude, 18);
                        this.scene.playSfx('explosion');
                    } else if (this.isGetsuga) { 
                        this.splash(this.x + this.width/2, this.y + this.height/2, 60, 60, 0); 
                    } else if (this.isRasengan && !this.isRasenshuriken) { 
                        this.splash(this.x + this.width/2, this.y + this.height/2, this.width > 50 ? 250 : 180, this.width > 50 ? 280 : 200, 25); 
                        this.active = false; 
                        this.scene.flashAlpha = 0.4; 
                        this.scene.shakeTime = 15; 
                        this.scene.shakeMagnitude = 10; 
                        this.scene.playSfx('explosion'); 
                    } else if (this.isPlasma) { 
                        const cameFromSide = this.prevX + this.width <= p.x || this.prevX >= p.x + p.width;
                        if (cameFromSide) {
                            this.vx *= -1;
                            this.x = this.prevX;
                        } else {
                            this.vy *= -1;
                            this.y = this.prevY;
                        }
                        this.bounces--;
                        this.timer -= 140;
                        this.scene.playSfx('plasma');
                        if (this.bounces <= 0) this.active = false;
                    } else if (this.isKnife || this.isRasenshuriken || this.isBat) { 
                        // Do nothing, pass through
                    } else if (this.isAmaterasu) { 
                        this.vx = 0; 
                        this.vy = 0; 
                    } else { 
                        if (this.isGiantPaint) {
                            this.splash(this.x + this.width/2, this.y + this.height/2, 140, 150, 15); 
                        } else {
                            this.splash(this.x + this.width/2, this.y + this.height/2); 
                        }
                        this.active = false; 
                    }
                    if (!this.isBeam && !this.isRailgun && !this.isGetsuga && !this.isAmaterasu && !this.isKnife && !this.isRasenshuriken && !this.isPlasma && !this.isBat) {
                        break; 
                    }
                }
            }
        }
    }

    explodeMeteorStrike() {
        this.scene.flashAlpha = 1; 
        this.scene.shakeTime = 50; 
        this.scene.shakeMagnitude = 30; 
        this.scene.playSfx('explosion');
        this.splash(this.x + this.width/2, this.y + this.height/2, 600, 800, 150);
        
        this.scene.getOpposingTeam(this.ownerId).forEach(p => { 
            const dist = Math.hypot((p.x + p.width/2) - (this.x + this.width/2), (p.y + p.height/2) - (this.y + this.height/2));
            if (dist < 400) {
                this.scene.dealDamage(p, this.isKirin ? 100 : 50, this); 
            }
        });
        
        if (this.isKirin) { 
            for(let i = -2; i <= 2; i++) { 
                let cl = new Projectile(this.scene, this.x + this.width/2, this.y + this.height/2, 0, 0, '#ffff00', this.ownerId); 
                cl.isChainLightning = true; 
                cl.width = 10; 
                cl.height = 10; 
                cl.timer = 1500; 
                cl.hits = []; 
                this.scene.projectiles.push(cl); 
            } 
        }
    }

    explodeVolcanoFireball() {
        this.scene.flashAlpha = Math.max(this.scene.flashAlpha, 0.45); 
        this.scene.shakeTime = Math.max(this.scene.shakeTime, 25); 
        this.scene.shakeMagnitude = Math.max(this.scene.shakeMagnitude, 14); 
        this.scene.playSfx('explosion');
        
        for (let p of this.scene.platforms) { 
            p.stain(this.x + this.width/2, this.y + this.height/2, 90, this.color || '#ff4500');
        }
        this.scene.spawnPaintSplats(this.x + this.width/2, this.y + this.height/2, this.color || '#ff4500', 8);

        const blastRadius = 100;
        const damageAmount = 40;
        
        const entities = this.scene.players.concat(this.scene.enemies || []);
        entities.forEach(ent => {
            if (ent.health <= 0 || ent.exploded) return;
            const dist = Math.hypot((ent.x + ent.width/2) - (this.x + this.width/2), (ent.y + ent.height/2) - (this.y + this.height/2));
            if (dist < blastRadius) {
                this.scene.dealDamage(ent, damageAmount, this);
                const angle = Math.atan2((ent.y + ent.height/2) - (this.y + this.height/2), (ent.x + ent.width/2) - (this.x + this.width/2));
                const force = (1 - dist / blastRadius) * 14;
                ent.vx += Math.cos(angle) * force;
                ent.vy += Math.sin(angle) * force - 2.5;
            }
        });
    }

    splash(impactX, impactY, splashRadius = 60, damageRadius = 70, damageAmount = 5) {
        for (let p of this.scene.platforms) { 
            p.stain(impactX, impactY, splashRadius, this.color);
        }
        
        this.scene.spawnPaintSplats(impactX, impactY, this.color, splashRadius / 10);
        const targets = this.scene.getOpposingTeam(this.ownerId);
        
        for (let p of targets) {
            if (p.id !== this.ownerId && p.health > 0) {
                let actualW = p.scaleMultiplier ? p.width * p.scaleMultiplier : p.width; 
                let actualH = p.scaleMultiplier ? p.height * p.scaleMultiplier : p.height;
                const dist = Math.hypot((p.x + actualW/2) - impactX, (p.y + actualH/2) - impactY);
                
                if (dist <= damageRadius) { 
                    this.scene.dealDamage(p, damageAmount, this); 
                    if (this.isHailstorm) {
                        p.freezeTimer = Math.max(p.freezeTimer || 0, 3000); 
                    }
                    let owner = this.scene.players.find(pl => pl.id == this.ownerId); 
                    if (owner && owner.passives && owner.passives['VAMPIRE']) { 
                        owner.health = Math.min(owner.maxHealth, owner.health + 3); 
                        this.scene.updateHUD(); 
                    } 
                }
            }
        }
    }

    spawnFirePools(count, spread, color, duration) {
        for (let i = 0; i < count; i++) {
            const rx = this.x + (Math.random() - 0.5) * spread;
            const ry = this.y - 10;
            const vx = (Math.random() - 0.5) * 4;
            const vy = 2 + Math.random() * 3;
            
            let flame = new Projectile(this.scene, rx, ry, vx, vy, color, this.ownerId);
            flame.isAmaterasu = true;
            flame.amaterasuTimer = duration || 3000;
            flame.color = color;
            flame.width = 14;
            flame.height = 14;
            this.scene.projectiles.push(flame);
        }
    }

    render(graphics) {
        const ctx = graphics.context;
        if (!ctx) return;
        if (this.isChainLightning) {
            if (this.hits && this.hits.length > 0) { 
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.shadowBlur = 0; 
                ctx.shadowColor = '#ffffaa'; 
                
                // Draw cyan glow layer
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)'; 
                ctx.lineWidth = 7; 
                ctx.beginPath(); 
                ctx.moveTo(this.x, this.y); 
                let curX = this.x;
                let curY = this.y;
                this.hits.forEach(h => {
                    let tx = h.x + h.width/2;
                    let ty = h.y + h.height/2;
                    let steps = 4;
                    for (let s = 1; s <= steps; s++) {
                        let stepX = curX + (tx - curX) * (s / steps) + (Math.random() - 0.5) * 16;
                        let stepY = curY + (ty - curY) * (s / steps) + (Math.random() - 0.5) * 16;
                        ctx.lineTo(stepX, stepY);
                    }
                    curX = tx;
                    curY = ty;
                });
                ctx.stroke();

                // Draw white core layer
                ctx.strokeStyle = '#ffffff'; 
                ctx.lineWidth = 2.5; 
                ctx.beginPath(); 
                ctx.moveTo(this.x, this.y); 
                curX = this.x;
                curY = this.y;
                this.hits.forEach(h => {
                    let tx = h.x + h.width/2;
                    let ty = h.y + h.height/2;
                    let steps = 4;
                    for (let s = 1; s <= steps; s++) {
                        let stepX = curX + (tx - curX) * (s / steps) + (Math.random() - 0.5) * 8;
                        let stepY = curY + (ty - curY) * (s / steps) + (Math.random() - 0.5) * 8;
                        ctx.lineTo(stepX, stepY);
                    }
                    curX = tx;
                    curY = ty;
                });
                ctx.stroke();
                ctx.restore();
                ctx.shadowBlur = 0; 
            } 
            return;
        }
        
        if (this.isMeteorStrike || this.isKirin || this.isVolcanoFireball) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            if (this.isKirin) {
                // Warning column
                ctx.fillStyle = 'rgba(0,240,255,0.08)'; 
                ctx.fillRect(this.x + this.width/2 - 4, 0, 8, this.scene.worldHeight);
                
                // Cyan discharge column
                ctx.shadowBlur = 0;
                ctx.shadowColor = '#00f3ff';
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
                ctx.lineWidth = 14;
                ctx.beginPath();
                ctx.moveTo(this.x + this.width/2, 0);
                
                let curY = 0;
                let curX = this.x + this.width/2;
                while(curY < this.y + this.height/2) {
                    curY += 25 + Math.random() * 20;
                    curX += (Math.random() - 0.5) * 30;
                    ctx.lineTo(curX, curY);
                    if (Math.random() < 0.28) {
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(curX, curY);
                        ctx.lineTo(curX + (Math.random() - 0.5) * 60, curY + 25 + Math.random() * 15);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(curX, curY);
                    }
                }
                ctx.stroke();
                
                // White core lightning
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(this.x + this.width/2, 0);
                curY = 0;
                curX = this.x + this.width/2;
                while(curY < this.y + this.height/2) {
                    curY += 25 + Math.random() * 20;
                    curX += (Math.random() - 0.5) * 15;
                    ctx.lineTo(curX, curY);
                }
                ctx.stroke();
                
                // Impact lightning head
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = '#00f3ff';
                ctx.lineWidth = 4;
                ctx.stroke();
            } else {
                // Falling fireball meteor
                ctx.fillStyle = 'rgba(255,80,0,0.06)'; 
                ctx.fillRect(this.x + this.width/2 - 3, 0, 6, this.scene.worldHeight);
                
                // Flame tail
                let gradient = ctx.createLinearGradient(this.x + this.width/2, this.y - 50, this.x + this.width/2, this.y + this.height/2);
                gradient.addColorStop(0, 'rgba(255, 40, 0, 0)');
                gradient.addColorStop(0.5, 'rgba(255, 120, 0, 0.75)');
                gradient.addColorStop(1, '#ffdd00');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(this.x + this.width/2 - this.width/2, this.y + this.height/2);
                ctx.lineTo(this.x + this.width/2, this.y - 80);
                ctx.lineTo(this.x + this.width/2 + this.width/2, this.y + this.height/2);
                ctx.closePath();
                ctx.fill();
                
                // Meteor body
                ctx.fillStyle = '#ff4500';
                ctx.shadowBlur = 0;
                ctx.shadowColor = '#ff4500';
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI*2);
                ctx.fill();
                
                ctx.fillStyle = '#ffff66';
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/3, 0, Math.PI*2);
                ctx.fill();
            }
            ctx.restore();
            ctx.shadowBlur = 0; 
            return;
        }

        if (this.isOrbital) {
            if (this.timer >= ((this.initialTimer || 1500) - (this.strikeDelay || 200))) { 
                ctx.fillStyle = 'rgba(255,255,255,0.4)'; 
                ctx.fillRect(this.x + this.width/2 - 1, 0, 2, this.scene.worldHeight); 
                return; 
            }
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = this.color; 
            ctx.shadowBlur = 0; 
            ctx.shadowColor = this.color; 
            ctx.globalAlpha = 0.38 + Math.sin(Date.now() / 40) * 0.16; 
            ctx.fillRect(this.x, 0, this.width, this.scene.worldHeight); 
            
            ctx.globalAlpha = 0.95; 
            ctx.fillStyle = '#ffffff'; 
            ctx.fillRect(this.x + this.width/4, 0, this.width/2, this.scene.worldHeight); 
            ctx.globalAlpha = 1.0; 
            
            // Energy horizontal ripples
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            for (let i = 0; i < 4; i++) {
                let hY = (Date.now() / 3 % 200) + i * 150;
                if (hY < this.scene.worldHeight) {
                    ctx.beginPath();
                    ctx.moveTo(this.x - 12, hY);
                    ctx.lineTo(this.x + this.width + 12, hY);
                    ctx.stroke();
                }
            }
            ctx.restore();
            ctx.shadowBlur = 0; 
            return;
        }

        if (this.isGlacier) {
            ctx.fillStyle = 'rgba(170, 221, 255, 0.4)'; 
            ctx.shadowBlur = 0; 
            ctx.shadowColor = '#00ffff'; 
            ctx.beginPath(); 
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI*2); 
            ctx.fill(); 
            ctx.strokeStyle = '#fff'; 
            ctx.lineWidth = 3; 
            ctx.stroke(); 
            ctx.shadowBlur = 0; 
            return;
        }

        if (this.isBlackHole && !this.isOrbital) {
            ctx.save();
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const r = this.width / 2;

            if (this.isSupernova) {
                ctx.shadowBlur = 25;
                ctx.shadowColor = '#ffbb00';
                
                let gradient = ctx.createRadialGradient(cx, cy, r*0.3, cx, cy, r);
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.2, '#fff4aa');
                gradient.addColorStop(0.6, '#ff8800');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffaa00';
                const spikes = 12;
                ctx.beginPath();
                for (let i = 0; i < spikes; i++) {
                    let angle = (i * Math.PI * 2) / spikes + Date.now() / 600;
                    let spikeLength = r * (0.8 + Math.sin(Date.now() / 100 + i) * 0.25);
                    let x1 = cx + Math.cos(angle) * spikeLength;
                    let y1 = cy + Math.sin(angle) * spikeLength;
                    ctx.lineTo(x1, y1);
                }
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.isGravityWell) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00ff66';
                
                ctx.strokeStyle = '#00ff66';
                ctx.lineWidth = 2.5;
                for (let i = 0; i < 4; i++) {
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(-Date.now() / 150 + i * Math.PI / 2);
                    ctx.beginPath();
                    let radius = r * (1 - (Date.now() / 800 + i * 0.25) % 1);
                    if (radius > 2) {
                        ctx.arc(0, 0, radius, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    ctx.restore();
                }

                let grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r*0.3);
                grad.addColorStop(0, '#00ff66');
                grad.addColorStop(0.5, '#001a08');
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r*0.3, 0, Math.PI*2);
                ctx.fill();
            } else if (this.isPlanetaryDevastation) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#4b0082';

                let grad = ctx.createRadialGradient(cx, cy, r*0.2, cx, cy, r*0.8);
                grad.addColorStop(0, '#000000');
                grad.addColorStop(0.5, '#2e0854');
                grad.addColorStop(1, 'rgba(75, 0, 130, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r*0.8, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#6e5040';
                for (let i = 0; i < 6; i++) {
                    let angle = Date.now() / 250 + i * (Math.PI * 2 / 6);
                    let dist = r * (0.55 + Math.sin(Date.now() / 400 + i) * 0.15);
                    let rx = cx + Math.cos(angle) * dist;
                    let ry = cy + Math.sin(angle) * dist;
                    ctx.beginPath();
                    ctx.arc(rx, ry, 5 + (i % 3), 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.strokeStyle = '#8a2be2';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, cy, r*0.3, 0, Math.PI*2);
                ctx.stroke();
            } else {
                ctx.fillStyle = '#000000';
                ctx.shadowBlur = 18;
                ctx.shadowColor = this.isZapping ? '#ffff00' : '#da1dff';
                ctx.beginPath();
                ctx.arc(cx, cy, r * (0.85 + Math.sin(Date.now() / 60) * 0.05), 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = 'rgba(155, 92, 255, 0.45)';
                ctx.lineWidth = 3.5;
                for (let e = 1; e < 5; e++) {
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(Date.now() / 220 * e);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, r + e * 14 - Date.now() / 15 % 14, (r + e * 14) * 0.45, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
            }
            ctx.restore();
            return;
        }

        if (this.isPrism) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)'; 
            ctx.shadowBlur = 0; 
            ctx.shadowColor = '#0ff'; 
            ctx.beginPath(); 
            ctx.moveTo(this.x + this.width/2, this.y); 
            ctx.lineTo(this.x + this.width, this.y + this.height); 
            ctx.lineTo(this.x, this.y + this.height); 
            ctx.closePath(); 
            ctx.fill(); 
            ctx.strokeStyle = '#fff'; 
            ctx.stroke(); 
            ctx.shadowBlur = 0; 
            return;
        }

        if (this.isBomb) {
            ctx.fillStyle = '#333'; 
            ctx.beginPath(); 
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI*2); 
            ctx.fill(); 
            ctx.fillStyle = (Math.floor(Date.now() / 100) % 2 === 0) ? '#f00' : '#ff0'; 
            ctx.beginPath(); 
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 4, 0, Math.PI*2); 
            ctx.fill(); 
            return;
        }
        
        if (this.isCrossSlash) {
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.fillStyle = this.color; 
            ctx.shadowBlur = 0; 
            ctx.shadowColor = this.color;
            ctx.save(); 
            ctx.translate(this.x + this.width/2, this.y + this.height/2); 
            ctx.rotate(Date.now() / 50); 
            ctx.fillRect(-this.width/2, -10, this.width, 20); 
            ctx.fillRect(-10, -this.height/2, 20, this.height);
            ctx.restore(); 
            ctx.globalCompositeOperation = 'source-over'; 
            return;
        }

        if (this.ownerId === 'wind') {
            ctx.strokeStyle = 'rgba(230, 245, 255, 0.14)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + (this.vx > 0 ? 120 : -120), this.y);
            ctx.stroke();
            return;
        }

        if (this.isBeam || this.isBrimstone || this.isCero || this.isInfernal || this.isRailgun) {
            ctx.globalCompositeOperation = 'lighter'; 
            let coreColor = '#fff'; 
            let outerColor = this.color;
            
            if (this.isBrimstone) { 
                coreColor = '#ffaaaa'; 
                outerColor = '#ff0000'; 
            } else if (this.isCero) { 
                coreColor = '#ff5555'; 
                outerColor = '#800000'; 
            } else if (this.isInfernal || this.isVoidBeam) { 
                coreColor = '#8b5cff'; 
                outerColor = '#3b0066'; 
            } else if (this.isTeslaRail) {
                coreColor = '#ffffff';
                outerColor = '#00f3ff';
            } else if (this.isMakankosappo) {
                coreColor = '#ffffff';
                outerColor = '#8bffea';
            } else if (this.isVoidRay) {
                coreColor = '#ff66ff';
                outerColor = '#4b0082';
            } else if (this.isBossLaserGrid) {
                coreColor = '#ffffff';
                outerColor = this.color;
            } else if (this.isPaintRail) {
                coreColor = '#ffffff';
                outerColor = this.color;
            }
            
            const t = Date.now();
            const centerY = this.y + this.height / 2;
            const fade = this.initialTimer ? Math.max(0.18, Math.min(1, this.timer / this.initialTimer)) : 1;
            const amp = Math.max(7, this.height * 0.32);
            const nose = Math.min(52, Math.max(18, this.height * 0.9));

            const drawBeamShape = (halfHeight, alpha, fill, wobble = 1) => {
                ctx.globalAlpha = alpha * fade;
                ctx.fillStyle = fill;
                ctx.beginPath();
                ctx.moveTo(this.x - nose * 0.45, centerY);
                for (let i = 0; i <= this.width; i += 34) {
                    const wave = Math.sin(t / 58 + i * 0.052) * amp * wobble;
                    ctx.lineTo(this.x + i, centerY - halfHeight + wave * 0.35);
                }
                ctx.lineTo(this.x + this.width + nose, centerY);
                for (let i = this.width; i >= 0; i -= 34) {
                    const wave = Math.sin(t / 51 + i * 0.047 + Math.PI) * amp * wobble;
                    ctx.lineTo(this.x + i, centerY + halfHeight + wave * 0.35);
                }
                ctx.closePath();
                ctx.fill();
            };

            ctx.shadowBlur = 0;
            ctx.shadowColor = outerColor;
            drawBeamShape(this.height * 0.88 + 14, 0.36 + Math.sin(t / 35) * 0.08, outerColor, 1.15);

            ctx.shadowBlur = 0;
            drawBeamShape(this.height * 0.58 + 6, 0.74, outerColor, 0.72);

            ctx.shadowBlur = 0;
            ctx.shadowColor = coreColor;
            drawBeamShape(Math.max(6, this.height * 0.22), 0.95, coreColor, 0.28);

            ctx.strokeStyle = coreColor;
            ctx.lineWidth = Math.max(2, this.height * 0.07);
            ctx.globalAlpha = 0.9 * fade;
            ctx.beginPath();
            ctx.moveTo(this.x, centerY);
            for (let i = 0; i <= this.width; i += 26) {
                ctx.lineTo(this.x + i, centerY + Math.sin(t / 44 + i / 32) * (this.height * 0.52));
            }
            ctx.stroke();

            ctx.strokeStyle = outerColor;
            ctx.lineWidth = Math.max(1.5, this.height * 0.05);
            ctx.globalAlpha = 0.58 * fade;
            for (let i = 30; i < this.width; i += 120) {
                ctx.beginPath();
                ctx.moveTo(this.x + i, centerY - this.height * 0.78);
                ctx.quadraticCurveTo(this.x + i + 34, centerY, this.x + i + 68, centerY + this.height * 0.78);
                ctx.stroke();
            }

            // Draw special overlays
            if (this.isMakankosappo) {
                ctx.strokeStyle = '#ffd700'; // Yellow spiral wrap
                ctx.lineWidth = 4;
                ctx.shadowBlur = 0;
                ctx.shadowColor = '#ffd700';
                for (let i = 0; i < this.width; i += 25) {
                    ctx.beginPath();
                    const wave = Math.sin(Date.now() / 35 + i * 0.16) * this.height * 0.85;
                    ctx.arc(this.x + i, this.y + this.height / 2 + wave, Math.max(5, this.height * 0.3), 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else if (this.isVoidRay) {
                ctx.strokeStyle = '#b000ff';
                ctx.lineWidth = 8;
                ctx.globalAlpha = 0.8;
                ctx.strokeRect(this.x, this.y - 12, this.width, this.height + 24);
                ctx.globalAlpha = 1;
            } else if (this.isTeslaRail) {
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 3.5;
                for(let i = 0; i < this.width; i += 70) {
                    ctx.beginPath();
                    ctx.moveTo(this.x + i, this.y - this.height * 0.7);
                    ctx.lineTo(this.x + i + 20, this.y + this.height * 1.6);
                    ctx.lineTo(this.x + i + 45, this.y + this.height * 0.3);
                    ctx.stroke();
                }
            } else if (this.isBrimstone) {
                // Black swirling loops around Brimstone blood laser
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 5;
                ctx.shadowBlur = 0;
                for (let i = 0; i < this.width; i += 50) {
                    ctx.beginPath();
                    const wave = Math.sin(Date.now() / 25 + i * 0.1) * this.height * 0.7;
                    ctx.ellipse(this.x + i, this.y + this.height / 2 + wave, 12, 24, Math.PI / 4, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
            
            ctx.shadowBlur = 0; 
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over'; 
            return;
        }
        
        if (this.isGetsuga) {
            ctx.globalCompositeOperation = 'lighter'; 
            let dir = this.vx > 0 ? 1 : -1; 
            let c = this.isBlackGetsuga ? '#ff0033' : this.color; 
            if (this.isLightningSlash) c = '#ffff00';
            
            ctx.shadowBlur = 0; 
            ctx.shadowColor = c; 
            const tipX = this.x + this.width / 2 + this.width * 0.95 * dir;
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            
            // Draw getsuga trails
            this.trail.forEach((t, i) => { 
                ctx.globalAlpha = (i / this.trail.length) * 0.45; 
                ctx.fillStyle = c; 
                ctx.beginPath(); 
                const tcx = t.x + this.width / 2;
                const tcy = t.y + this.height / 2;
                ctx.moveTo(tcx, tcy - this.height * 0.52);
                ctx.quadraticCurveTo(tcx + this.width * 0.62 * dir, tcy - this.height * 0.18, tcx + this.width * 0.95 * dir, tcy);
                ctx.quadraticCurveTo(tcx + this.width * 0.52 * dir, tcy + this.height * 0.38, tcx, tcy + this.height * 0.58);
                ctx.quadraticCurveTo(tcx + this.width * 0.12 * dir, tcy, tcx, tcy - this.height * 0.52);
                ctx.fill(); 
            }); 
            ctx.globalAlpha = 1.0;

            // Main crescent wave body
            ctx.fillStyle = c; 
            ctx.beginPath(); 
            ctx.moveTo(cx, cy - this.height * 0.58);
            ctx.quadraticCurveTo(cx + this.width * 0.62 * dir, cy - this.height * 0.24, tipX, cy);
            ctx.quadraticCurveTo(cx + this.width * 0.48 * dir, cy + this.height * 0.44, cx, cy + this.height * 0.62);
            ctx.quadraticCurveTo(cx + this.width * 0.10 * dir, cy, cx, cy - this.height * 0.58);
            ctx.fill(); 

            // White center crescent
            ctx.fillStyle = this.isBlackGetsuga ? '#000000' : '#ffffff'; 
            ctx.beginPath(); 
            ctx.moveTo(cx + this.width * 0.06 * dir, cy - this.height * 0.28);
            ctx.quadraticCurveTo(cx + this.width * 0.40 * dir, cy - this.height * 0.10, cx + this.width * 0.65 * dir, cy);
            ctx.quadraticCurveTo(cx + this.width * 0.34 * dir, cy + this.height * 0.21, cx + this.width * 0.05 * dir, cy + this.height * 0.32);
            ctx.quadraticCurveTo(cx + this.width * 0.12 * dir, cy, cx + this.width * 0.06 * dir, cy - this.height * 0.28);
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.65;
            ctx.beginPath();
            ctx.moveTo(cx - this.width * 0.08 * dir, cy - this.height * 0.46);
            ctx.quadraticCurveTo(cx + this.width * 0.36 * dir, cy - this.height * 0.18, tipX, cy);
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Crackling red lightning bolts on Getsuga Negro
            if (this.isBlackGetsuga) { 
                ctx.strokeStyle = '#ff0033'; 
                ctx.lineWidth = 3; 
                for(let i = 0; i < 4; i++) { 
                    ctx.beginPath(); 
                    ctx.moveTo(this.x + this.width/2, this.y + this.height/2 + (Math.random() - 0.5) * this.height); 
                    ctx.lineTo(this.x + this.width/2 - dir * 55, this.y + this.height/2 + (Math.random() - 0.5) * this.height * 1.6); 
                    ctx.stroke(); 
                } 
            }
            ctx.shadowBlur = 0; 
            ctx.globalCompositeOperation = 'source-over'; 
            return;
        }

        if (this.isRasengan || this.isRasenshuriken) {
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.save(); 
            ctx.translate(this.x + this.width/2, this.y + this.height/2); 
            ctx.rotate(Date.now() / (this.isRasenshuriken ? 10 : 20)); 
            
            ctx.fillStyle = this.isRasenshuriken ? '#fff' : (this.isBlackRasengan ? '#111' : '#aaddff'); 
            ctx.shadowBlur = 0; 
            ctx.shadowColor = this.isBlackRasengan ? '#ff0000' : this.color; 
            
            // Sphere body
            ctx.beginPath(); 
            ctx.arc(0, 0, this.width/2, 0, Math.PI * 2); 
            ctx.fill();
            
            // Accretion orbit ring loops
            ctx.strokeStyle = this.isBlackRasengan ? '#f00' : '#fff'; 
            ctx.lineWidth = 3; 
            for(let i = 0; i < 3; i++) { 
                ctx.save(); 
                ctx.rotate((Math.PI/3) * i + Date.now() / 50); 
                ctx.beginPath(); 
                ctx.ellipse(0, 0, this.width/2 + 5, this.width/4, 0, 0, Math.PI*2); 
                ctx.stroke(); 
                ctx.restore(); 
            }
            if (this.isRasenshuriken) { 
                ctx.beginPath(); 
                ctx.arc(0, 0, this.width/2 + 15, 0, Math.PI*2); 
                ctx.setLineDash([15, 10]); 
                ctx.stroke(); 
            } 
            ctx.restore(); 
            ctx.globalCompositeOperation = 'source-over'; 
            return;
        }

        if (this.isTornado) {
            ctx.save(); 
            ctx.translate(this.x + this.width/2, this.y + this.height);
            ctx.fillStyle = this.isFireTornado ? 'rgba(255,50,0,0.6)' : 
                            (this.isThunderstorm ? 'rgba(255,255,0,0.6)' : 
                            (this.isBlizzard ? 'rgba(150,220,255,0.6)' : 
                            (this.isHurricaneFlame ? 'rgba(50,0,0,0.8)' : 
                            (this.isBatSwarm ? 'rgba(50,0,80,0.8)' : 
                            (this.isBladeStorm ? 'rgba(100,100,100,0.8)' : 'rgba(200,200,200,0.6)')))));
            ctx.shadowBlur = 0; 
            ctx.shadowColor = ctx.fillStyle;
            
            for(let i = 0; i < 8; i++) { 
                let ringH = (i / 8) * this.height; 
                let ringW = (i / 8) * this.width + 10; 
                let offset = Math.sin(Date.now() / 100 + i) * (this.width / 4); 
                ctx.beginPath(); 
                ctx.ellipse(offset, -ringH, ringW/2, 8 + i, 0, 0, Math.PI*2); 
                ctx.fill(); 
            }
            ctx.restore(); 
            return;
        }

        if (this.isBat) {
            this.trail.forEach((t, i) => { 
                ctx.globalAlpha = i / this.trail.length; 
                ctx.fillStyle = this.isAmaterasuBat ? '#000' : (this.isKnife ? '#cc0000' : this.color); 
                ctx.beginPath(); 
                ctx.arc(t.x + this.width/2, t.y + this.height/2, (this.width/2) * (i / this.trail.length), 0, Math.PI * 2); 
                ctx.fill(); 
            }); 
            ctx.globalAlpha = 1;
            
            ctx.fillStyle = this.isAmaterasuBat ? '#000' : (this.isKnife ? '#cc0000' : '#8800ff'); 
            ctx.shadowBlur = 0; 
            ctx.shadowColor = this.isAmaterasuBat ? '#f00' : ctx.fillStyle;
            
            ctx.beginPath(); 
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI*2); 
            ctx.fill();
            ctx.beginPath(); 
            ctx.moveTo(this.x, this.y); 
            ctx.lineTo(this.x + this.width/2, this.y + this.height/2); 
            ctx.lineTo(this.x, this.y + this.height); 
            ctx.fill();
            ctx.beginPath(); 
            ctx.moveTo(this.x + this.width, this.y); 
            ctx.lineTo(this.x + this.width/2, this.y + this.height/2); 
            ctx.lineTo(this.x + this.width, this.y + this.height); 
            ctx.fill();
            
            ctx.shadowBlur = 0; 
            return;
        }

        if (this.isMeteor || this.isHadouken || this.isKnife || this.isGoukakyu || this.isPlasma || this.isGenkidama) {
            ctx.globalCompositeOperation = 'lighter';
            
            this.trail.forEach((t, i) => { 
                ctx.globalAlpha = i / this.trail.length; 
                ctx.fillStyle = this.isFireHadouken || this.isGoukakyu ? '#f00' : 
                                (this.isHadouken ? '#fff' : 
                                (this.isKnife ? (this.isFireKnife ? '#111' : '#888') : 
                                (this.isPlasma ? '#aa00ff' : 
                                (this.isGenkidama ? '#ffffaa' : '#ff5500')))); 
                ctx.beginPath(); 
                ctx.arc(t.x + this.width/2, t.y + this.height/2, (this.width/2) * (i / this.trail.length), 0, Math.PI * 2); 
                ctx.fill(); 
            }); 
            
            ctx.globalAlpha = 1; 
            ctx.globalCompositeOperation = 'source-over';
            
            if (this.isGenkidama) { 
                ctx.fillStyle = '#fff'; 
                for(let i = 0; i < 5; i++) { 
                    ctx.beginPath(); 
                    ctx.arc(this.x + this.width/2 + (Math.random() - 0.5) * 150, this.y + this.height/2 + (Math.random() - 0.5) * 150, 2, 0, Math.PI*2); 
                    ctx.fill(); 
                } 
            }
            if (this.isKnife) { 
                ctx.save();
                ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
                let angle = Math.atan2(this.vy, this.vx);
                ctx.rotate(angle);

                const w = this.width;
                const h = this.height;

                ctx.shadowBlur = 4;
                ctx.shadowColor = this.color;

                // 1. Handle (Wood)
                ctx.fillStyle = '#8B5A2B';
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(-w/2, -h/4, w*0.3, h/2, 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(-w/2, -h/4, w*0.3, h/2);
                }

                // Handle wraps
                ctx.strokeStyle = '#5c3a17';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-w/2 + w*0.1, -h/4);
                ctx.lineTo(-w/2 + w*0.1, h/4);
                ctx.moveTo(-w/2 + w*0.2, -h/4);
                ctx.lineTo(-w/2 + w*0.2, h/4);
                ctx.stroke();

                // 2. Guard (Golden Brass)
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(-w/2 + w*0.3, -h*0.5, w*0.08, h);
                
                // Pommel
                ctx.beginPath();
                ctx.arc(-w/2, 0, h/3, 0, Math.PI*2);
                ctx.fill();

                // 3. Blade (Shiny Silver steel)
                ctx.fillStyle = '#E6E6E6';
                ctx.beginPath();
                ctx.moveTo(-w/2 + w*0.38, -h*0.3);
                ctx.lineTo(w/2 - w*0.15, -h*0.3);
                ctx.lineTo(w/2, 0);
                ctx.lineTo(w/2 - w*0.15, h*0.3);
                ctx.lineTo(-w/2 + w*0.38, h*0.3);
                ctx.closePath();
                ctx.fill();

                // Blade edge highlight
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.moveTo(-w/2 + w*0.38, -h*0.3);
                ctx.lineTo(w/2 - w*0.15, -h*0.3);
                ctx.lineTo(w/2, 0);
                ctx.lineTo(-w/2 + w*0.38, 0);
                ctx.closePath();
                ctx.fill();

                // Blood groove / Fuller
                ctx.strokeStyle = '#999999';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-w/2 + w*0.42, 0);
                ctx.lineTo(w/2 - w*0.2, 0);
                ctx.stroke();

                ctx.restore();
                return;
            }
        }

        if (this.isPlasma) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.rotate(Date.now() / 80);
            ctx.shadowBlur = 0;
            ctx.shadowColor = '#aa00ff';
            ctx.strokeStyle = '#ff66ff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.rect(-this.width/2, -this.height/2, this.width, this.height);
            ctx.stroke();
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.arc(0, 0, this.width * 0.32, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        if (this.isGoukakyu) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.rotate(Date.now() / 120);
            ctx.shadowBlur = 0;
            ctx.shadowColor = '#ff3300';
            for (let i = 0; i < 6; i++) {
                ctx.rotate(Math.PI / 3);
                ctx.fillStyle = i % 2 ? 'rgba(255,180,0,0.7)' : 'rgba(255,40,0,0.75)';
                ctx.beginPath();
                ctx.ellipse(0, 0, this.width * 0.52, this.height * (0.22 + i * 0.015), 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#fff4aa';
            ctx.beginPath();
            ctx.arc(0, 0, this.width * 0.24, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        if (this.isHadouken) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.shadowBlur = 0;
            ctx.shadowColor = this.isFireHadouken ? '#ff5500' : '#00f3ff';
            ctx.fillStyle = this.isFireHadouken ? '#ff5500' : '#00f3ff';
            ctx.beginPath();
            ctx.ellipse(0, 0, this.width * 0.62, this.height * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(0, 0, this.width * 0.30, this.height * 0.26, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        if (this.isAmaterasu) {
            const flameColor = this.color || '#000';
            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = flameColor === '#111' || flameColor === '#000' ? '#ff3300' : flameColor;
            
            const pulse = Math.sin(Date.now() / 80 + this.x) * 3;
            const r = this.width + pulse;
            
            ctx.fillStyle = flameColor === '#111' || flameColor === '#000' ? '#111111' : flameColor;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, r, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, r * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
            return;
        }

        if (this.isHollowPurple || this.isGravityWell) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.shadowBlur = 0;
            ctx.shadowColor = this.isHollowPurple ? '#9b5cff' : '#4b1dff';
            
            // Outer glow radial gradient
            let rad = this.width/2 + Math.sin(Date.now()/50) * 6;
            let grad = ctx.createRadialGradient(0, 0, rad * 0.2, 0, 0, rad);
            if (this.isHollowPurple) {
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.3, '#d8b4fe');
                grad.addColorStop(0.7, '#8a2be2');
                grad.addColorStop(1, 'rgba(138, 43, 226, 0)');
            } else {
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.3, '#a5b4fc');
                grad.addColorStop(0.7, '#4b1dff');
                grad.addColorStop(1, 'rgba(75, 29, 255, 0)');
            }
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, rad, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner rotating orbit wireframes
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            for (let i = 1; i <= 3; i++) {
                ctx.save();
                ctx.rotate(Date.now() / 150 * i);
                ctx.beginPath();
                ctx.ellipse(0, 0, rad * 0.7, rad * 0.25 * i, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            
            // Gravity singularity core
            ctx.fillStyle = '#000000';
            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            ctx.arc(0, 0, this.width * 0.28, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
            return;
        }

        if (this.isCruelSun) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.rotate(Date.now()/180);
            ctx.shadowBlur = 0;
            ctx.shadowColor = '#ff5500';
            
            let rad = this.width/2;
            let fireGrad = ctx.createRadialGradient(0, 0, rad * 0.3, 0, 0, rad);
            fireGrad.addColorStop(0, '#ffffff');
            fireGrad.addColorStop(0.25, '#fff6a6');
            fireGrad.addColorStop(0.55, '#ffaa00');
            fireGrad.addColorStop(0.85, '#ff3300');
            fireGrad.addColorStop(1, 'rgba(255, 51, 0, 0)');
            
            ctx.fillStyle = fireGrad;
            ctx.beginPath();
            ctx.arc(0, 0, rad, 0, Math.PI * 2);
            ctx.fill();
            
            // Blazing solar corona rays
            ctx.fillStyle = '#ffaa00';
            for (let i = 0; i < 12; i++) {
                ctx.rotate(Math.PI / 6);
                ctx.beginPath();
                ctx.moveTo(rad * 0.4, -6);
                ctx.lineTo(rad * 0.95 + Math.sin(Date.now()/50 + i)*5, 0);
                ctx.lineTo(rad * 0.4, 6);
                ctx.closePath();
                ctx.fill();
            }
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, rad * 0.35, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
            return;
        }

        if (this.isGenkidama || this.isSuperGenkidama) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.rotate(Date.now() / 250);
            
            ctx.shadowBlur = 0;
            
            const radius = this.width / 2;
            let grad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, '#b5f6ff');
            grad.addColorStop(0.7, '#00aeff');
            grad.addColorStop(1, 'rgba(0, 174, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Dibujar anillos eléctricos concéntricos u órbitas giratorias
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.0;
            ctx.globalAlpha = 0.5;
            for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.rotate(Date.now() / 120 + i * Math.PI / 3);
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 0.85, radius * 0.35, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            
            // Destellos de energía convergentes
            ctx.strokeStyle = '#99f3ff';
            ctx.lineWidth = 1.2;
            for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI / 4) + (Date.now() / 400);
                const startDist = radius * (1.1 + Math.sin(Date.now() / 80 + i) * 0.12);
                const endDist = radius * 0.35;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * startDist, Math.sin(a) * startDist);
                ctx.lineTo(Math.cos(a) * endDist, Math.sin(a) * endDist);
                ctx.stroke();
            }
            
            ctx.restore();
            ctx.globalCompositeOperation = 'source-over';
            return;
        }

        ctx.save();
        const speed = Math.max(0.001, Math.hypot(this.vx, this.vy));
        const angle = Math.atan2(this.vy, this.vx);
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(angle);
        ctx.fillStyle = this.color; 
        ctx.shadowBlur = 0; 
        ctx.shadowColor = this.color; 
        ctx.beginPath(); 
        ctx.ellipse(0, 0, this.width * 0.82 + speed * 0.08, this.height * 0.42, 0, 0, Math.PI * 2); 
        ctx.fill();
        ctx.globalAlpha = 0.65;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(-this.width * (0.35 + i * 0.22), (Math.random() - 0.5) * this.height, Math.max(2, this.width * (0.18 - i * 0.035)), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
