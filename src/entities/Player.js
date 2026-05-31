import Phaser from 'phaser';
import Projectile from './Projectile.js';
import PowerUp from './PowerUp.js';
import NukeBomb from './NukeBomb.js';
import VisualEffect from './VisualEffect.js';

export default class Player {
    /**
     * @param {number} id - Player ID (1-6)
     * @param {number} x - Start X coordinate
     * @param {number} y - Start Y coordinate
     * @param {string} color - Player hex color
     * @param {string} inputType - Input mapping type ('KB1', 'KB2', 'GP0', etc.)
     */
    constructor(scene, id, x, y, color, inputType) {
        this.scene = scene;
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.vx = 0;
        this.vy = 0;
        this.baseColor = color;
        this.color = color;
        this.inputType = inputType;
        this.maxHealth = 500;
        this.health = 500;

        this.onGround = false;
        this.canShoot = true;
        this.shootCooldown = 135;
        this.currentCooldown = 0;
        this.facingRight = id % 2 !== 0;
        this.exploded = false;
        this.damageFlashTimer = 0;
        this.hitstopTimer = 0;
        this.prevX = x;
        this.prevY = y;
        this.facingDir = 1;
        this.shieldHits = 0;
        this.shieldBroken = false;
        this.bombFuseTimer = 0;

        this.passives = {};
        this.freezeTimer = 0;
        this.timeStopTimer = 0;
        this.timeStopImmunityTimer = 0;
        this.reflectTimer = 0;
        this.chidoriTimer = 0;
        this.invulnTimer = 0;
        this.thunderGodTimer = 0;
        
        this.spells = [];
        this.selectedSpellIndex = 0;
        this.actionPressed = false;
        this.jumpPressed = false;
        this.cyclePressed = false;
        this.ragdollPressed = false;
        this.isRagdoll = false;
        this.ragdollTimer = 0;
        this.ragdollAngle = 0;
        this.ragdollSpin = 0;

        this.touchingWall = 0;
        this.jumpsLeft = 0;
        this.scaleMultiplier = 1;
        this.wX = 1;
        this.wY = 1;
        this.wVX = 0;
        this.wVY = 0;
        this.wallSlideTimer = 0;
        this.wallCoyoteTimer = 0;
        this.lastWallDir = 0;

        this.companionOffset = Math.random() * 10;

        // Roguelike / Upgrades stats
        this.maxJumps = 1;
        this.lifesteal = 0.0;
        this.damageMultiplier = 1.0;
        this.cooldownReduction = 0.0;
        this.speedBonus = 0.0;
        
        this.weapon = null;
    }

    /**
     * Updates player position, physics, input, and platform interactions
     */
    update(deltaTime, inputs, platforms, worldWidth, worldHeight, getKillPlaneY, playSfx, gameMode) {
        const dt = (deltaTime && !isNaN(deltaTime)) ? deltaTime : 1.0;
        const dtMs = dt * 16.666;
        if (this.timeStopTimer > 0) {
            this.timeStopTimer -= dtMs;
            if (this.timeStopTimer <= 0) {
                this.timeStopImmunityTimer = 2500;
            }
            // Move with platform even during time stop so the player doesn't fall off
            if (this.onGround && this.standingOnPlatform && this.standingOnPlatform.isMoving) {
                this.x += this.standingOnPlatform.deltaX || 0;
                this.y += this.standingOnPlatform.deltaY || 0;
            }
            return;
        }
        if (this.timeStopImmunityTimer > 0) {
            this.timeStopImmunityTimer -= dtMs;
        }
        this.companionOffset += 0.05;
        this.touchingWall = 0;

        if (this.health <= 0) return;

        const preW = this.width * this.scaleMultiplier;
        const preH = this.height * this.scaleMultiplier;
        const preFeetY = this.y + preH;
        const preCenterX = this.x + preW / 2;

        if (this.damageFlashTimer > 0) this.damageFlashTimer -= dtMs;
        if (this.invulnTimer > 0) this.invulnTimer -= dtMs;
        if (this.currentCooldown > 0) this.currentCooldown -= dtMs;

        const debugSpellbook = document.getElementById('debug-mode')?.checked || false;
        if (debugSpellbook && !this.debugSpellbookActive) {
            this.savedSpellsBeforeDebug = this.spells.slice();
            this.spells = this.scene.getDebugSpellbookSpells?.() || Object.keys(this.scene.spellIcons || {});
            this.selectedSpellIndex = Math.min(this.selectedSpellIndex, this.spells.length - 1);
            this.debugSpellbookActive = true;
            this.scene.updateHUD();
        } else if (!debugSpellbook && this.debugSpellbookActive) {
            this.spells = this.savedSpellsBeforeDebug || [];
            this.selectedSpellIndex = Math.min(this.selectedSpellIndex, Math.max(0, this.spells.length - 1));
            this.debugSpellbookActive = false;
            this.scene.updateHUD();
        }

        // Decrement passives & other timers
        for (let key in this.passives) {
            this.passives[key] -= dtMs;
            if (this.passives[key] <= 0) {
                delete this.passives[key];
                this.scene.updateHUD();
            }
        }
        if (this.freezeTimer > 0) this.freezeTimer -= dtMs;
        if (this.reflectTimer > 0) this.reflectTimer -= dtMs;

        // Compute actualW/actualH early so they are available throughout update
        const nextScale = this.passives['MUSHROOM'] ? 1.5 : 1;
        if (nextScale !== this.scaleMultiplier) {
            this.scaleMultiplier = nextScale;
        }
        let actualW = this.width * this.scaleMultiplier;
        let actualH = this.height * this.scaleMultiplier;

        // Adjust position on scale changes
        if (Math.abs(actualH - preH) > 0.01) {
            this.y = preFeetY - actualH;
            this.x = preCenterX - actualW / 2;
        }
        
        if (this.chidoriTimer > 0) {
            this.chidoriTimer -= dtMs;
            this.vx = (this.facingRight ? 1 : -1) * 35;
            this.vy = 0;
            if (Math.random() < 0.65) {
                this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + actualW / 2, this.y + actualH / 2, 'CHIDORI', '#8bffea'));
            }
            this.scene.getOpposingTeam(this.id).forEach(p => {
                if (Math.hypot(p.x - this.x, p.y - this.y) < 50) {
                    this.scene.dealDamage(p, 20, this);
                }
            });
        }

        const wasOnGround = this.onGround;

        // Input parsing
        const finalLeft = inputs.left || false;
        const finalRight = inputs.right || false;
        const finalJump = inputs.jump || false;
        const finalDown = inputs.down || false;
        const finalRagdoll = inputs.ragdoll || false;
        const finalShoot = inputs.shoot || false;
        const finalAction = inputs.action || false;
        const finalCycleNext = inputs.cycleNext || false;
        const finalCyclePrev = inputs.cyclePrev || false;

        this.aimDown = finalDown && !this.onGround;

        // Cycle inventory spells
        if (finalCycleNext || finalCyclePrev) {
            if (!this.cyclePressed) {
                this.cyclePressed = true;
                if (this.spells.length > 0) {
                    if (finalCycleNext) {
                        this.selectedSpellIndex = (this.selectedSpellIndex + 1) % this.spells.length;
                    } else if (finalCyclePrev) {
                        this.selectedSpellIndex = (this.selectedSpellIndex - 1 + this.spells.length) % this.spells.length;
                    }
                    this.scene.updateHUD();
                    playSfx('pickup');
                }
            }
        } else {
            this.cyclePressed = false;
        }

        // Drop current weapon or use active spell
        if (finalDown && finalAction && !this.actionPressed && this.weapon && !this.isRagdoll) {
            const dropped = new PowerUp(this.scene, this.x + actualW / 2 - 16, this.y - 12);
            dropped.type = this.weapon.type;
            this.scene.powerups.push(dropped);
            this.weapon = null;
            this.actionPressed = true;
            this.scene.updateHUD();
            playSfx('pickup');
        } else if (finalAction && !this.actionPressed && this.chidoriTimer <= 0 && !this.isRagdoll) {
            this.actionPressed = true;
            this.useSpell(actualW, actualH, playSfx, gameMode);
        } else if (!finalAction) {
            this.actionPressed = false;
        }

        // Weapon Shoot check
        if (finalShoot && this.canShoot && this.chidoriTimer <= 0 && !this.isRagdoll) {
            this.shoot(actualW, actualH, playSfx, gameMode);
        }

        // Toggle Ragdoll
        if (finalRagdoll) {
            if (!this.ragdollPressed) {
                this.isRagdoll = !this.isRagdoll;
                if (this.isRagdoll) {
                    this.ragdollSpin += (this.facingRight ? 0.18 : -0.18) + this.vx * 0.015;
                    this.wX = 1.05;
                    this.wY = 0.95;
                }
                this.ragdollPressed = true;
            }
        } else {
            this.ragdollPressed = false;
        }

        let speedMult = 1 + this.speedBonus;
        let gravityMult = 1;
        
        if (this.thunderGodTimer > 0) {
            this.thunderGodTimer -= dtMs;
            speedMult *= 2.5;
            this.passives['FLIGHT'] = 100;
            if (Math.random() < 0.08) {
                let cl = new Projectile(this.scene, this.x + actualW/2, this.y + actualH/2, 0, 0, '#ffff00', this.id);
                cl.isChainLightning = true;
                cl.width = 10;
                cl.height = 10;
                cl.timer = 600;
                cl.hits = [];
                this.scene.projectiles.push(cl);
            }
        }

        if (this.passives['FEATHER']) gravityMult = 0.4;
        if (this.passives['HASTE']) speedMult *= 1.8;
        if (this.passives['FLIGHT']) gravityMult = 0;

        // Roguelike Mutator persistency effects
        if (this.scene.gameMode === 'roguelike' && this.scene.roguelikeMutator) {
            const mutKey = this.scene.roguelikeMutator.key;
            if (mutKey === 'low_gravity') {
                gravityMult = Math.min(gravityMult, 0.4);
            } else if (mutKey === 'overclock') {
                speedMult *= 1.25;
                this.cooldownReduction = Math.max(this.cooldownReduction || 0, 0.25);
            }
        }

        // Apply visual status color
        if (this.passives['STAR']) {
            const hue = ((Date.now() / 5) % 360) / 360;
            const colorObj = Phaser.Display.Color.HSLToColor(hue, 1, 0.6);
            const rHex = colorObj.r.toString(16).padStart(2, '0');
            const gHex = colorObj.g.toString(16).padStart(2, '0');
            const bHex = colorObj.b.toString(16).padStart(2, '0');
            this.color = '#' + rHex + gHex + bHex;
            speedMult *= 1.5;
        } else if (this.passives['INVINCIBLE']) {
            this.color = '#ffffff';
        } else {
            this.color = this.baseColor;
        }

        if (this.freezeTimer > 0) {
            speedMult *= 0.2;
            this.color = '#00aaff';
        }

        // Platform standing effects & painting
        const currentPlatform = this.getPlatformBeneath(actualW, actualH, platforms);
        if (currentPlatform) {
            // Paint tile under player center feet
            const footX = this.x + actualW / 2;
            const footY = this.y + actualH + 2;
            const platColor = currentPlatform.getTileColorAt(footX, footY);
            
            if (platColor === this.baseColor) {
                speedMult *= 1.6;
            } else if (platColor !== '#222222') {
                speedMult *= 0.4;
                if (!this.passives['INVINCIBLE'] && !this.passives['STAR'] && !this.passives['GLITCH']) {
                    this.takeDamage(0.15, true, null, playSfx);
                    if (Math.random() < 0.1) this.color = platColor;
                }
            }
        }

        // Movement forces
        if (!this.isRagdoll) {
            if (finalLeft) {
                this.vx -= 1.5 * speedMult;
                this.facingRight = false;
            }
            if (finalRight) {
                this.vx += 1.5 * speedMult;
                this.facingRight = true;
            }
            if (this.passives['FLIGHT']) {
                if (finalJump) this.vy -= 1.5;
                if (finalDown) this.vy += 1.5;
                this.vy *= 0.9;
            }
        }

        let jumpPower = -16.0; // JUMP_FORCE
        if (this.passives['FEATHER']) jumpPower = -16.0 * 1.15;
        if (this.freezeTimer > 0) jumpPower *= 0.5;

        // Jumps logic
        if (finalJump && !this.passives['FLIGHT'] && !this.isRagdoll) {
            if (!this.jumpPressed) {
                if (this.onGround) {
                    let jumpMult = 1;
                    const plat = this.getPlatformBeneath(actualW, actualH, platforms);
                    if (plat && plat.getTileColorAt(this.x + actualW / 2, this.y + actualH + 2) === this.baseColor) {
                        jumpMult = 1.25;
                    }
                    this.vy = jumpPower * jumpMult;
                    this.onGround = false;
                    this.jumpsLeft = (this.maxJumps - 1) + ((this.passives['NINJA'] || this.passives['FEATHER']) ? 1 : 0);
                    this.wX = 0.4;
                    this.wY = 1.6;
                    playSfx('jump');
                } else {
                    const wallJumpDir = this.touchingWall || (this.wallCoyoteTimer > 0 ? this.lastWallDir : 0);
                    if (wallJumpDir !== 0) {
                        this.vy = jumpPower * 0.9;
                        this.vx = wallJumpDir === 1 ? -7.0 * 1.65 : 7.0 * 1.65;
                        this.onGround = false;
                        this.touchingWall = 0;
                        this.wallCoyoteTimer = 0;
                        this.jumpsLeft = (this.maxJumps - 1) + ((this.passives['NINJA'] || this.passives['FEATHER']) ? 1 : 0);
                        this.wX = 0.5;
                        this.wY = 1.4;
                        playSfx('jump');
                    } else if (this.jumpsLeft > 0) {
                        this.vy = jumpPower * 0.9;
                        this.jumpsLeft--;
                        this.wX = 0.5;
                        this.wY = 1.4;
                        playSfx('jump');
                    }
                }
                this.jumpPressed = true;
            }
        } else {
            this.jumpPressed = false;
        }

        // Apply Friction and Gravity
        this.vx *= this.isRagdoll ? 0.985 : 0.80; // FRICTION = 0.80
        this.vy += (0.65 * gravityMult); // GRAVITY = 0.65
        
        if (this.isRagdoll) {
            // Accumulate spin from velocity like the original, making the player actually tumble
            this.ragdollSpin += this.vx * 0.004;
            this.ragdollAngle += this.ragdollSpin + this.vx * 0.003;
            // Gentle damping to prevent truly infinite spinning, but allow full rotation
            this.ragdollSpin *= 0.96;
            // Soft spring: very gently pull angle towards 0 when on ground
            if (this.onGround) {
                this.ragdollAngle *= 0.97;
                this.ragdollSpin *= 0.92;
            }
        } else {
            // Decay rotation when active/upright
            this.ragdollAngle *= 0.85;
            this.ragdollSpin = 0;
        }

        if (this.onGround && this.standingOnPlatform) {
            if (this.standingOnPlatform.isMoving) {
                this.x += this.standingOnPlatform.deltaX || 0;
                this.y += this.standingOnPlatform.deltaY || 0;
            }
            if (this.standingOnPlatform.conveyorForce) {
                this.vx += this.standingOnPlatform.conveyorForce * (dtMs / 16.666);
            }
        }

        const maxV = 7.0 * speedMult; // MAX_SPEED = 7.0
        const cap = this.isRagdoll ? maxV * 1.7 : maxV;
        if (this.vx > cap) this.vx = cap;
        if (this.vx < -cap) this.vx = -cap;

        // Sub-stepping collision updates
        const stepsX = Math.ceil(Math.abs(this.vx) / 8);
        const stepX = this.vx / stepsX;
        for (let s = 0; s < stepsX; s++) {
            this.x += stepX;
            this.handleCollisions(true, actualW, actualH, platforms);
            if (this.vx === 0) break;
        }

        // Wall Slide Coyote timers
        if (this.touchingWall !== 0 && this.vy > 0 && !this.onGround && !this.passives['FLIGHT'] && !this.isRagdoll) {
            this.wallSlideTimer = 120;
            this.wallCoyoteTimer = 120;
            this.lastWallDir = this.touchingWall;
            this.vy = Math.min(this.vy, 2.35);
        } else {
            this.wallSlideTimer = Math.max(0, this.wallSlideTimer - 16); // Assuming ~60fps step
            this.wallCoyoteTimer = Math.max(0, this.wallCoyoteTimer - 16);
        }

        const fallSpeedBeforeCollision = this.vy;
        this.onGround = false;
        this.standingOnPlatform = null;
        const stepsY = Math.ceil(Math.abs(this.vy) / 8);
        const stepY = this.vy / stepsY;
        for (let s = 0; s < stepsY; s++) {
            this.y += stepY;
            this.handleCollisions(false, actualW, actualH, platforms);
            if (this.vy === 0) break;
        }

        if (!wasOnGround && this.onGround) {
            const landingImpact = Math.min(Math.abs(fallSpeedBeforeCollision) / 18, 1);
            this.wX = 1.35 + landingImpact * 0.35;
            this.wY = 0.65 - landingImpact * 0.25;
            this.wallCoyoteTimer = 0;
        }

        // Elastic scaling dampening logic (Jiggle)
        this.wVX += (1 - this.wX) * 0.22;
        this.wX += this.wVX;
        this.wVX *= 0.84;

        this.wVY += (1 - this.wY) * 0.22;
        this.wY += this.wVY;
        this.wVY *= 0.84;

        // Arena boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + actualW > worldWidth) this.x = worldWidth - actualW;

        // Death checking Y bounds
        const killPlaneY = getKillPlaneY();
        if (this.y + actualH > killPlaneY) {
            this.vy *= 0.65;
            if (this.health > 0) this.takeDamage(9999, false, null, playSfx);
        } else if (this.y > worldHeight + 200) {
            if (this.health > 0) this.takeDamage(9999, false, null, playSfx);
        }
    }

    /**
     * Resolves collisions along X or Y axis separated
     */
    handleCollisions(isX, actualW, actualH, platforms) {
        const sideVerticalInset = 2;
        const floorHorizontalInset = 1;

        if (isX) this.touchingWall = 0;

        for (let p of platforms) {
            const overlapsX = this.x < p.x + p.width && this.x + actualW > p.x;
            const overlapsY = this.y < p.y + p.height && this.y + actualH > p.y;
            if (!overlapsX || !overlapsY) continue;

            if (isX) {
                const verticalBodyOverlap =
                    this.y + sideVerticalInset < p.y + p.height &&
                    this.y + actualH - sideVerticalInset > p.y;
                if (!verticalBodyOverlap) continue;

                if (this.vx > 0) {
                    this.x = p.x - actualW;
                    this.touchingWall = 1;
                    this.lastWallDir = 1;
                    this.vx = 0;
                    if (this.isRagdoll) {
                        this.wX = 0.75;
                        this.wY = 1.25;
                        this.ragdollSpin += 0.08;
                    }
                } else if (this.vx < 0) {
                    this.x = p.x + p.width;
                    this.touchingWall = -1;
                    this.lastWallDir = -1;
                    this.vx = 0;
                    if (this.isRagdoll) {
                        this.wX = 0.75;
                        this.wY = 1.25;
                        this.ragdollSpin -= 0.08;
                    }
                }
            } else {
                const horizontalFootOverlap =
                    this.x + floorHorizontalInset < p.x + p.width &&
                    this.x + actualW - floorHorizontalInset > p.x;
                if (!horizontalFootOverlap) continue;

                if (this.vy > 0) {
                    this.y = p.y - actualH;
                    this.onGround = true;
                    this.standingOnPlatform = p;
                    this.vy = 0;
                    if (this.isRagdoll) {
                        this.wX = 1.25;
                        this.wY = 0.75;
                        this.ragdollSpin *= 0.5; // Dampen spin when landing
                    }
                } else if (this.vy < 0) {
                    this.y = p.y + p.height;
                    this.vy = 0;
                    if (this.isRagdoll) {
                        this.wX = 1.25;
                        this.wY = 0.75;
                    }
                }
            }
        }
    }

    /**
     * Returns the platform underneath the player if standing on it
     */
    getPlatformBeneath(actualW, actualH, platforms) {
        const checkY = this.y + actualH + 2;
        for (let p of platforms) {
            const overlapsX = this.x < p.x + p.width && this.x + actualW > p.x;
            if (overlapsX && checkY >= p.y && checkY <= p.y + p.height) {
                return p;
            }
        }
        return null;
    }

    /**
     * Inflicts damage onto player
     */
    takeDamage(amount, isPoison = false, hitSource = null, playSfx = () => {}) {
        if (this.passives['INVINCIBLE'] || this.passives['STAR']) return;
        if (this.invulnTimer > 0 && !isPoison) return;

        if (this.isRagdoll && !isPoison) amount *= 0.6;
        this.health -= amount;
        if (this.health < 0) this.health = 0;

        if (this.health <= 0 && !this.exploded) {
            this.exploded = true;
            this.damageFlashTimer = 0;
            if (this.scene?.spawnPaintSplats) {
                this.scene.spawnPaintSplats(this.x + this.width * this.scaleMultiplier / 2, this.y + this.height * this.scaleMultiplier / 2, this.baseColor, 140, true);
            }
            playSfx('splat');
            playSfx('explosion');
            if (this.scene) {
                this.scene.flashAlpha = 1.0;
                this.scene.shakeTime = 30;
                this.scene.shakeMagnitude = 18;
            }
        } else if (!isPoison && !this.exploded && this.health > 0) {
            this.wX = 1.5;
            this.wY = 0.5;
            this.invulnTimer = 200;
            this.damageFlashTimer = 100;
            playSfx('hit');
        }
    }

    /**
     * Draws player with jiggle, ragdoll rotations, eyes, and overlays using Phaser Graphics
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics context to render to
     * @param {boolean} animeMode - True if waifus companions are active
     */
    render(graphics, animeMode = false) {
        if (this.exploded) return;
        if (this.invulnTimer > 0 && Math.floor(Date.now() / 50) % 2 === 0) return;

        let actualW = this.width * this.scaleMultiplier;
        let actualH = this.height * this.scaleMultiplier;

        // Create temporary Canvas equivalent transforms
        graphics.save();

        const upwardStretch = !this.onGround ? Math.min(Math.max(-this.vy, 0) / 24, 0.22) : 0;
        const fallingStretch = !this.onGround ? Math.min(Math.max(this.vy, 0) / 32, 0.12) : 0;
        const wallSquish = this.wallSlideTimer > 0 ? 0.08 : 0;
        
        const drawScaleX = this.wX * (1 - upwardStretch * 0.55 + fallingStretch * 0.25 - wallSquish);
        const drawScaleY = this.wY * (1 + upwardStretch + fallingStretch * 0.35);

        // Translate and Rotate if Ragdolled or Moving (centered translation)
        const walkLean = !this.isRagdoll ? this.vx * 0.022 : 0;
        if (this.isRagdoll || Math.abs(this.ragdollAngle) > 0.01 || Math.abs(walkLean) > 0.01) {
            const rotAngle = this.isRagdoll ? this.ragdollAngle : walkLean;
            graphics.translateCanvas(this.x + actualW / 2, this.y + actualH / 2);
            graphics.rotateCanvas(rotAngle);
            graphics.translateCanvas(-(this.x + actualW / 2), -(this.y + actualH / 2));
        }

        // Apply Jiggle Scaling (bottom-center translation normally, center translation if ragdolled)
        const scaleAnchorY = this.isRagdoll ? (this.y + actualH / 2) : (this.y + actualH);
        graphics.translateCanvas(this.x + actualW / 2, scaleAnchorY);
        graphics.scaleCanvas(drawScaleX, drawScaleY);
        graphics.translateCanvas(-(this.x + actualW / 2), -scaleAnchorY);

        // Draw Player Body
        const colorHex = Phaser.Display.Color.HexStringToColor(this.color).color;
        
        // Draw shadow using a rectangle outline or simple drawing since canvas shadow blur is not directly supported in WebGL Graphics
        // We simulate the neon outline by drawing a thicker semi-transparent border
        if (this.damageFlashTimer > 0) {
            graphics.fillStyle(0xffffff, 1.0);
            graphics.fillRect(this.x, this.y, actualW, actualH);
        } else {
            // Neon outer glow outline
            graphics.lineStyle(4, colorHex, 0.4);
            graphics.strokeRect(this.x - 2, this.y - 2, actualW + 4, actualH + 4);
            
            // Solid body
            graphics.fillStyle(colorHex, 1.0);
            graphics.fillRect(this.x, this.y, actualW, actualH);
        }

        // Draw Eyes
        graphics.fillStyle(0x000000, 1.0);
        let eyeSize = 6 * this.scaleMultiplier;
        if (this.facingRight) {
            graphics.fillRect(this.x + (20 * this.scaleMultiplier), this.y + (6 * this.scaleMultiplier), eyeSize, eyeSize);
        } else {
            graphics.fillRect(this.x + (4 * this.scaleMultiplier), this.y + (6 * this.scaleMultiplier), eyeSize, eyeSize);
        }

        // Draw Flying Wings if flight passive active
        if (this.passives['FLIGHT']) {
            graphics.fillStyle(0xffffff, 0.8);
            graphics.fillRect(this.x - 10, this.y + 10, 10, 10);
            graphics.fillRect(this.x + actualW, this.y + 10, 10, 10);
        }

        graphics.restore();
    }

    shoot(actualW, actualH, playSfx, gameMode) {
        this.canShoot = false;
        let cooldown = this.shootCooldown;
        const activeWeapon = this.weapon?.type;
        if (activeWeapon === 'MACHINEGUN' || this.passives['MACHINEGUN']) cooldown = 40; 
        if (activeWeapon === 'SHOTGUN') cooldown = 420;
        if (this.passives['HASTE']) cooldown = 80;
        cooldown *= (1 - this.cooldownReduction);
        
        this.currentCooldown = cooldown; 
        this.scene.time.delayedCall(cooldown, () => {
            this.canShoot = true;
        });

        const dir = this.facingRight ? 1 : -1;
        const px = this.facingRight ? this.x + actualW : this.x - 12; 
        const py = this.y + actualH / 2 - 6;
        const PROJECTILE_SPEED = 15;
        let aimVx = PROJECTILE_SPEED * dir;
        let aimVy = 0;
        if (this.aimDown) {
            aimVx *= 0.25;
            aimVy = PROJECTILE_SPEED * 0.95;
        }
        
        const autoAimEnabled = document.getElementById('qol-autoaim')?.checked ?? true;
        if (autoAimEnabled && (gameMode === 'pve' || gameMode === 'roguelike')) {
            const target = this.scene.getNearestEnemy(this, 520);
            if (target) {
                const dx = (target.x + target.width/2) - px;
                const dy = (target.y + target.height/2) - py;
                const dist = Math.max(1, Math.hypot(dx, dy));
                aimVx = (dx / dist) * PROJECTILE_SPEED;
                aimVy = (dy / dist) * PROJECTILE_SPEED;
                this.facingRight = aimVx >= 0;
            }
        }

        playSfx('shoot');
        const recoilLen = Math.max(1, Math.hypot(aimVx, aimVy));
        const recoilX = aimVx / recoilLen;
        const recoilY = aimVy / recoilLen;

        const projectiles = this.scene.projectiles;

        if (activeWeapon === 'SHOTGUN' || this.passives['SHOTGUN']) {
            projectiles.push(new Projectile(this.scene, px, py, aimVx, aimVy, this.baseColor, this.id));
            projectiles.push(new Projectile(this.scene, px, py, aimVx, aimVy - 3, this.baseColor, this.id));
            projectiles.push(new Projectile(this.scene, px, py, aimVx, aimVy + 3, this.baseColor, this.id));
            if(this.passives['GIANT_PAINT']) projectiles.forEach(pr => { if (pr.ownerId === this.id) pr.isGiantPaint = true; }); 
            if (!this.onGround) {
                this.vx -= recoilX * 13;
                this.vy -= recoilY * 13;
                this.wX = 1.65;
                this.wY = 0.55;
            } else {
                this.vx -= recoilX * 3.2;
            }
        } else {
            let p = new Projectile(this.scene, px, py, aimVx, aimVy, this.baseColor, this.id);
            if (this.passives['GIANT_PAINT']) p.isGiantPaint = true; 
            projectiles.push(p);
            
            if (this.passives['SPLIT_SHOT']) {
                let p1 = new Projectile(this.scene, px, py, aimVx, aimVy - 2.5, this.baseColor, this.id);
                let p2 = new Projectile(this.scene, px, py, aimVx, aimVy + 2.5, this.baseColor, this.id);
                if (this.passives['GIANT_PAINT']) {
                    p1.isGiantPaint = true;
                    p2.isGiantPaint = true;
                }
                projectiles.push(p1, p2);
            }

            if (activeWeapon === 'MACHINEGUN' || this.passives['MACHINEGUN']) {
                this.vx -= recoilX * 0.8;
                this.vy -= recoilY * 0.22;
            }
        }

        if (this.weapon) {
            this.weapon.ammo--;
            if (this.weapon.ammo <= 0) this.weapon = null;
            this.scene.updateHUD();
        }
    }

    useSpell(actualW, actualH, playSfx, gameMode) {
        const debugMode = document.getElementById('debug-mode')?.checked || false;
        if (debugMode && this.spells.length === 0) {
            this.spells = this.scene.getDebugSpellbookSpells?.() || Object.keys(this.scene.spellIcons || {});
            this.selectedSpellIndex = 0;
        }
        if (this.spells.length === 0 || this.selectedSpellIndex >= this.spells.length) return;

        const spell = this.spells[this.selectedSpellIndex];

        if (!debugMode) {
            this.spells.splice(this.selectedSpellIndex, 1);
        }

        if (this.selectedSpellIndex >= this.spells.length) {
            this.selectedSpellIndex = Math.max(0, this.spells.length - 1);
        }

        const dir = this.facingRight ? 1 : -1;
        let px = this.facingRight ? this.x + actualW : this.x - 60;
        let p_cy = this.y + actualH / 2;

                if (spell === 'KAMEHAMEHA') { 
                    let beam = new Projectile(this.scene, this.facingRight ? this.x + actualW + 18 : this.x - 438, p_cy - 13, 35 * dir, 0, this.baseColor, this.id); 
                    beam.width = 420; 
                    beam.height = 26; 
                    beam.isBeam = true; 
                    beam.followOwner = true;
                    beam.timer = 2500;
                    beam.synergyTag = 'KAMEHAMEHA';
                    this.scene.projectiles.push(beam); 
                    playSfx('spell'); 
                } 
                else if (spell === 'GENKIDAMA') { 
                    let genk = new Projectile(this.scene, this.facingRight ? this.x + actualW + 20 : this.x - 140, this.y - 100, 4 * dir, 1, this.baseColor, this.id); 
                    genk.width = 120; 
                    genk.height = 120; 
                    genk.isGenkidama = true; 
                    this.scene.projectiles.push(genk); 
                    this.scene.triggerCinematic('GENKIDAMA', '#ffff00'); 
                } 
                else if (spell === 'ZA_WARUDO') { 
                    this.scene.getOpposingTeam(this.id).forEach(p => { 
                        if (!p.timeStopImmunityTimer || p.timeStopImmunityTimer <= 0) p.timeStopTimer = 3500; 
                    }); 
                    document.getElementById('gameCanvas').style.filter = 'invert(1) grayscale(100%)'; 
                    this.scene.time.delayedCall(3500, () => {
                        this.scene.clearCanvasFilter();
                    }); 
                    this.scene.triggerCinematic('ZA WARUDO', '#ffffaa', true); 
                } 
                else if (spell === 'GETSUGA') { 
                    let wave = new Projectile(this.scene, px, this.y - 80, 25 * dir, 0, this.baseColor, this.id); 
                    wave.width = 60; 
                    wave.height = 200; 
                    wave.isGetsuga = true; 
                    this.scene.projectiles.push(wave); 
                    playSfx('spell'); 
                } 
                else if (spell === 'RASENGAN') { 
                    let rWidth = this.passives['GIANT_PAINT'] ? 120 : 50; 
                    let rasenY = Math.min(p_cy - rWidth/2, this.y + actualH - rWidth - 6);
                    let rasen = new Projectile(this.scene, this.facingRight ? this.x + actualW : this.x - rWidth, rasenY, 18 * dir, 0, this.baseColor, this.id); 
                    rasen.width = rWidth; 
                    rasen.height = rWidth; 
                    rasen.isRasengan = true; 
                    rasen.synergyTag = 'RASENGAN';
                    rasen.pierceTimer = 0;
                    this.scene.projectiles.push(rasen); 
                    playSfx('spell'); 
                } 
                else if (spell === 'AMATERASU') { 
                    let flame = new Projectile(this.scene, this.facingRight ? this.x + actualW + 10 : this.x - 40, this.y + 10, 8 * dir, -5, '#111', this.id); 
                    flame.isAmaterasu = true; 
                    flame.amaterasuTimer = 5000; 
                    this.scene.projectiles.push(flame); 
                    playSfx('spell'); 
                } 
                else if (spell === 'SHINRA_TENSEI') { 
                    this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + actualW/2, p_cy, 'SHINRA', this.baseColor)); 
                    this.scene.getOpposingTeam(this.id).forEach(p => { 
                        if (Math.hypot(p.x - this.x, p.y - this.y) < 400) { 
                            this.scene.dealDamage(p, 40, this); 
                            p.vx = (p.x > this.x ? 1 : -1) * 25; 
                            p.vy = -15; 
                        } 
                    }); 
                    let dummy = new Projectile(this.scene, this.x, this.y, 0, 0, this.baseColor, this.id); 
                    dummy.splash(this.x + actualW/2, p_cy, 350, 0, 0); 
                    this.scene.triggerCinematic('SHINRA TENSEI', '#aa00ff'); 
                } 
                else if (spell === 'HADOUKEN') { 
                    let hadouken = new Projectile(this.scene, px, p_cy - 15, 20 * dir, 0, '#00ffff', this.id); 
                    hadouken.isHadouken = true; 
                    hadouken.width = 40; 
                    hadouken.height = 30; 
                    this.scene.projectiles.push(hadouken); 
                    playSfx('spell'); 
                } 
                else if (spell === 'FALCON_PUNCH') { 
                    if (this.passives['NINJA']) { 
                        let t = this.scene.getNearestEnemy(this); 
                        if (t) { 
                            this.x = t.x - (dir*50); 
                            this.y = t.y; 
                            px = this.x + (dir === 1 ? actualW : -60); 
                        } 
                    } 
                    playSfx('hit'); 
                    this.scene.shakeTime = 15; 
                    this.scene.shakeMagnitude = 10; 
                    this.scene.visualEffects.push(new VisualEffect(this.scene, px + (dir*40), this.y, 'FALCON', '#ff5500')); 
                    let dummy = new Projectile(this.scene, this.x, this.y, 0, 0, this.baseColor, this.id); 
                    dummy.splash(px + (dir*40), p_cy, 100, 150, 80); 
                } 
                else if (spell === 'BLACK_HOLE') { 
                    let bh = new Projectile(this.scene, this.x + actualW/2 - 30, this.y - 60, 0, 0, '#000', this.id); 
                    bh.isBlackHole = true; 
                    bh.width = 60; 
                    bh.height = 60; 
                    bh.timer = 2100; 
                    bh.power = 1; 
                    this.scene.projectiles.push(bh); 
                    playSfx('spell'); 
                } 
                else if (spell === 'PRISM') { 
                    let prism = new Projectile(this.scene, px, this.y, 0, 5, '#00ffff', this.id); 
                    prism.isPrism = true; 
                    prism.width = 40; 
                    prism.height = 80; 
                    prism.timer = 10000; 
                    this.scene.projectiles.push(prism); 
                    playSfx('spell'); 
                } 
                else if (spell === 'BRIMSTONE') { 
                    let brim = new Projectile(this.scene, this.facingRight ? this.x + actualW + 18 : this.x - 918, p_cy - 16, 0, 0, '#cc0000', this.id); 
                    brim.isBrimstone = true; 
                    brim.followOwner = true;
                    brim.width = 900; 
                    brim.height = 32; 
                    brim.timer = 2800; 
                    this.scene.projectiles.push(brim); 
                    playSfx('explosion'); 
                } 
                else if (spell === 'MOMS_KNIFE') { 
                    let knife = new Projectile(this.scene, px, p_cy - 10, 25 * dir, 0, '#aaa', this.id); 
                    knife.isKnife = true; 
                    knife.width = 50; 
                    knife.height = 20; 
                    knife.timer = 1200; 
                    knife.originalDir = dir; 
                    this.scene.projectiles.push(knife); 
                    playSfx('shoot'); 
                } 
                else if (spell === 'CHIDORI') { 
                    this.chidoriTimer = 200; 
                    this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + actualW/2, p_cy, 'CHIDORI', '#8bffea'));
                    playSfx('spell'); 
                } 
                else if (spell === 'FULL_COUNTER') { 
                    this.reflectTimer = 3000; 
                    this.invulnTimer = Math.max(this.invulnTimer, 450);
                    this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + actualW/2, p_cy, 'SHINRA', '#36ff9a'));
                    this.scene.triggerCinematic('FULL COUNTER', '#36ff9a', true);
                }
                else if (spell === 'PURPURA_HUECO') {
                    let hp = new Projectile(this.scene, px, p_cy - 70, 4.6 * dir, 0, '#8b35ff', this.id);
                    hp.isHollowPurple = true;
                    hp.width = this.passives['GIANT_PAINT'] ? 170 : 130;
                    hp.height = hp.width;
                    hp.timer = 5400;
                    hp.synergyTag = 'PURPURA_HUECO';
                    this.scene.projectiles.push(hp);
                    this.scene.triggerCinematic('PURPURA HUECO', '#9b5cff', true);
                }
                else if (spell === 'CRUEL_SUN') {
                    let sun = new Projectile(this.scene, this.x + actualW/2, this.y - 115, 8.5 * dir, -11, '#ffb000', this.id);
                    sun.isCruelSun = true;
                    sun.width = this.passives['GIANT_PAINT'] ? 145 : 105;
                    sun.height = sun.width;
                    sun.timer = 4500;
                    sun.synergyTag = 'CRUEL_SUN';
                    this.scene.projectiles.push(sun);
                    this.scene.triggerCinematic('CRUEL SUN', '#ffb000', true);
                }
                else if (spell === 'TAIYOKEN') {
                    this.scene.flashAlpha = 1;
                    this.scene.getOpposingTeam(this.id).forEach(p => {
                        if (!p.timeStopImmunityTimer || p.timeStopImmunityTimer <= 0) {
                            p.timeStopTimer = Math.max(p.timeStopTimer || 0, 3500);
                        }
                    });
                    document.getElementById('gameCanvas').style.filter = 'brightness(2.6) contrast(0.35)';
                    this.scene.time.delayedCall(350, () => {
                        this.scene.clearCanvasFilter();
                    });
                    this.scene.triggerCinematic('TAIYOKEN', '#ffffff', true);
                }
                else if (spell === 'MAKANKOSAPPO') {
                    let ray = new Projectile(this.scene, dir > 0 ? this.x + actualW + 20 : Math.max(0, this.x - 740), p_cy - 11, 0, 0, '#8bffea', this.id);
                    ray.isMakankosappo = true;
                    ray.isRailgun = true;
                    ray.isBeam = true;
                    ray.followOwner = true;
                    ray.width = Math.min(740, dir > 0 ? this.scene.worldWidth - ray.x : this.x);
                    ray.height = 22;
                    ray.timer = 2400;
                    ray.synergyTag = 'MAKANKOSAPPO';
                    this.scene.projectiles.push(ray);
                    this.scene.triggerCinematic('MAKANKOSAPPO', '#8bffea', true);
                } 
                else if (spell === 'TORNADO') { 
                    let torn = new Projectile(this.scene, px, this.y - 50, 8 * dir, 0, '#ccc', this.id); 
                    torn.isTornado = true; 
                    torn.width = 120; 
                    torn.height = 140; 
                    torn.timer = 3200; 
                    torn.synergyTag = 'TORNADO';
                    this.scene.projectiles.push(torn); 
                    playSfx('spell'); 
                } 
                else if (spell === 'CHAIN_LIGHTNING') { 
                    let cl = new Projectile(this.scene, px, this.y, 0, 0, '#ffff00', this.id); 
                    cl.isChainLightning = true; 
                    cl.width = 10; 
                    cl.height = 10; 
                    cl.timer = 1000; 
                    cl.hits = []; 
                    this.scene.projectiles.push(cl); 
                    playSfx('spell'); 
                } 
                else if (spell === 'EARTHQUAKE') { 
                    playSfx('explosion'); 
                    this.scene.flashAlpha = 0.5; 
                    this.scene.shakeTime = 30; 
                    this.scene.shakeMagnitude = 20; 
                    this.scene.getOpposingTeam(this.id).forEach(p => { 
                        if (p.onGround) this.scene.dealDamage(p, this.passives['MUSHROOM'] ? 60 : 30, this); 
                    }); 
                }
                else if (spell === 'ORBITAL_STRIKE') { 
                    let target = this.scene.getNearestEnemy(this); 
                    let targetX = target ? target.x + target.width/2 : this.x + actualW/2; 
                    let orb = new Projectile(this.scene, targetX - 30, 0, 0, 0, '#00ffff', this.id); 
                    orb.isOrbital = true; 
                    orb.followTargetId = target?.id ?? null;
                    orb.strikeDelay = 650;
                    orb.width = 60; 
                    orb.height = this.scene.worldHeight; 
                    orb.timer = 1200; 
                    this.scene.projectiles.push(orb); 
                    this.scene.triggerCinematic('ATAQUE ORBITAL', '#00ffff', true); 
                } 
                else if (spell === 'BATS') { 
                    for(let i = 0; i < 4; i++) { 
                        let bat = new Projectile(this.scene, px, p_cy + (Math.random() - 0.5) * 40, dir * 8, (Math.random() - 0.5) * 5, '#8800ff', this.id); 
                        bat.isBat = true; 
                        bat.width = 20; 
                        bat.height = 15; 
                        bat.timer = 5000; 
                        this.scene.projectiles.push(bat); 
                    } 
                    playSfx('spell'); 
                } 
                else if (spell === 'GLACIER') { 
                    let glac = new Projectile(this.scene, this.x + actualW/2 - 250, p_cy - 250, 0, 0, '#aaddff', this.id); 
                    glac.isGlacier = true; 
                    glac.width = 500; 
                    glac.height = 500; 
                    glac.timer = 600; 
                    this.scene.projectiles.push(glac); 
                    this.scene.triggerCinematic('GLACIAR', '#aaddff', true); 
                } 
                else if (spell === 'GOUKAKYU') { 
                    let g = new Projectile(this.scene, this.facingRight ? this.x + actualW + 8 : this.x - 98, p_cy - 74, 15 * dir, -5.5, '#ff3300', this.id); 
                    g.isGoukakyu = true; 
                    g.width = 90; 
                    g.height = 90; 
                    g.bounces = 3;
                    this.scene.projectiles.push(g); 
                    this.scene.triggerCinematic('GOUKAKYU', '#ff3300'); 
                } 
                else if (spell === 'CERO') { 
                    let c = new Projectile(this.scene, this.facingRight ? this.x + actualW + 18 : this.x - 638, p_cy - 22, 45 * dir, 0, '#800000', this.id); 
                    c.width = 600; 
                    c.height = 44; 
                    c.isCero = true; 
                    c.followOwner = true;
                    c.timer = 2200;
                    this.scene.projectiles.push(c); 
                    this.scene.triggerCinematic('CERO OSCURO', '#800000'); 
                } 
                else if (spell === 'RAYO_INFERNAL') { 
                    let ri = new Projectile(this.scene, this.facingRight ? this.x + actualW + 18 : this.x - 918, p_cy - 20, 0, 0, '#111', this.id); 
                    ri.isInfernal = true; 
                    ri.followOwner = true;
                    ri.width = 900; 
                    ri.height = 40; 
                    ri.timer = 3000; 
                    this.scene.projectiles.push(ri); 
                    this.scene.triggerCinematic('RAYO INFERNAL', '#111'); 
                } 
                else if (spell === 'RAIJU') { 
                    let t = this.scene.getNearestEnemy(this); 
                    if (t) { 
                        this.x = t.x - (dir*50); 
                        this.y = t.y; 
                        px = this.x + (dir === 1 ? actualW : -60); 
                    } else { 
                        this.x += 400 * dir; 
                        px = this.x; 
                    } 
                    this.scene.visualEffects.push(new VisualEffect(this.scene, px + (dir*40), this.y, 'FALCON', '#00f3ff')); 
                    let dummy = new Projectile(this.scene, this.x, this.y, 0, 0, '#00f3ff', this.id); 
                    dummy.splash(px + (dir*40), p_cy, 200, 250, 100); 
                    this.scene.triggerCinematic('RAIJU', '#00f3ff'); 
                } 
                else if (spell === 'FIRE_TORNADO') { 
                    let ft = new Projectile(this.scene, px, this.y - 50, 10 * dir, 0, '#ff5500', this.id); 
                    ft.isTornado = true; 
                    ft.isFireTornado = true; 
                    ft.width = 120; 
                    ft.height = 160; 
                    ft.timer = 3200; 
                    this.scene.projectiles.push(ft); 
                    this.scene.triggerCinematic('TORNADO IGNEO', '#ff5500'); 
                } 
                else if (spell === 'RASENSHURIKEN') { 
                    let rs = new Projectile(this.scene, px, Math.min(p_cy - 30, this.y + actualH - 66), 20 * dir, -1.5, '#fff', this.id); 
                    rs.isRasengan = true; 
                    rs.isRasenshuriken = true; 
                    rs.width = 60; 
                    rs.height = 60; 
                    rs.timer = 1000; 
                    rs.originalDir = dir; 
                    rs.pierceTimer = 120;
                    this.scene.projectiles.push(rs); 
                    this.scene.triggerCinematic('RASENSHURIKEN', '#fff'); 
                } 
                else if (spell === 'BLOOD_SCYTHE') { 
                    let scythe = new Projectile(this.scene, px, this.y - 20, 20 * dir, 0, '#cc0000', this.id); 
                    scythe.isKnife = true; 
                    scythe.isBrimstone = true; 
                    scythe.width = 100; 
                    scythe.height = 40; 
                    scythe.timer = 1100; 
                    scythe.originalDir = dir; 
                    this.scene.projectiles.push(scythe); 
                    this.scene.triggerCinematic('GUADANA DE SANGRE', '#cc0000'); 
                } 
                else if (spell === 'PLANETARY_DEVASTATION') { 
                    let pd = new Projectile(this.scene, this.x + actualW/2 - 60, this.y - 120, 0, 0, '#4b0082', this.id); 
                    pd.isBlackHole = true; 
                    pd.isPlanetaryDevastation = true;
                    pd.width = 120; 
                    pd.height = 120; 
                    pd.timer = 2600; 
                    pd.power = 2.5; 
                    this.scene.projectiles.push(pd); 
                    this.scene.triggerCinematic('DEVASTACION PLANETARIA', '#4b0082'); 
                } 
                else if (spell === 'THOUSAND_KNIVES') { 
                    for(let i = -2; i <= 2; i++) { 
                        let k = new Projectile(this.scene, px, p_cy + (i*15), 25 * dir, i*3, '#aaa', this.id); 
                        k.isKnife = true; 
                        k.width = 50; 
                        k.height = 20; 
                        k.timer = 600; 
                        k.originalDir = dir; 
                        this.scene.projectiles.push(k); 
                    } 
                    this.scene.triggerCinematic('MIL CUCHILLOS', '#aaa'); 
                } 
                else if (spell === 'HURRICANE_FLAME') { 
                    let ht = new Projectile(this.scene, px, this.y - 80, 12 * dir, 0, '#ff5500', this.id); 
                    ht.isTornado = true; 
                    ht.isHurricaneFlame = true; 
                    ht.width = 160; 
                    ht.height = 200; 
                    ht.timer = 3500; 
                    this.scene.projectiles.push(ht); 
                    this.scene.triggerCinematic('HURACAN DE FUEGO', '#ff5500'); 
                } 
                else if (spell === 'SUPERNOVA') { 
                    let sn = new Projectile(this.scene, px, this.y - 150, 0, 0, '#ffff00', this.id); 
                    sn.isBlackHole = true; 
                    sn.isSupernova = true;
                    sn.width = 150; 
                    sn.height = 150; 
                    sn.timer = 1800; 
                    sn.power = 3; 
                    this.scene.projectiles.push(sn); 
                    this.scene.triggerCinematic('SUPERNOVA', '#ffff00'); 
                } 
                else if (spell === 'TIME_SKIP') { 
                    this.scene.getOpposingTeam(this.id).forEach(p => { 
                        this.scene.dealDamage(p, 40, this); 
                        this.scene.visualEffects.push(new VisualEffect(this.scene, p.x, p.y, 'FALCON', this.baseColor)); 
                    }); 
                    let t = this.scene.getNearestEnemy(this); 
                    if (t) { 
                        this.x = t.x - (dir*40); 
                        this.y = t.y; 
                    } 
                    this.scene.triggerCinematic('SALTO TEMPORAL', '#aaffff'); 
                } 
                else if (spell === 'MASTER_SPARK') { 
                    for(let i = -2; i <= 2; i++) { 
                        let beam = new Projectile(this.scene, this.facingRight ? this.x + actualW + 18 : this.x - 418, p_cy - 10 + (i*16), 35 * dir, i*2, this.baseColor, this.id); 
                        beam.width = 400; 
                        beam.height = 22; 
                        beam.isBeam = true; 
                        beam.followOwner = true;
                        beam.timer = 2800;
                        this.scene.projectiles.push(beam); 
                    } 
                    this.scene.triggerCinematic('MASTER SPARK', '#ffffaa'); 
                } 
                else if (spell === 'RAILGUN') { 
                    let r = new Projectile(this.scene, this.facingRight ? this.x + actualW + 18 : this.x - 718, p_cy - 8, 0, 0, '#00f3ff', this.id); 
                    r.isBeam = true; 
                    r.isRailgun = true; 
                    r.followOwner = true;
                    r.width = 700; 
                    r.height = 16; 
                    r.timer = 1800; 
                    this.scene.projectiles.push(r); 
                    this.scene.triggerCinematic('RAILGUN', '#00f3ff'); 
                } 
                else if (spell === 'THUNDERSTORM') { 
                    let ts = new Projectile(this.scene, px, this.y - 50, 8 * dir, 0, '#aaffff', this.id); 
                    ts.isTornado = true; 
                    ts.isThunderstorm = true; 
                    ts.width = 120; 
                    ts.height = 160; 
                    ts.timer = 3500; 
                    this.scene.projectiles.push(ts); 
                    this.scene.triggerCinematic('TORMENTA ELECTRICA', '#aaffff'); 
                } 
                else if (spell === 'METEOR_STRIKE') { 
                    let ms = new Projectile(this.scene, this.x + actualW/2 - 100, -200, 0, 15, '#ff5500', this.id, true); 
                    ms.width = 200; 
                    ms.height = 200; 
                    ms.isMeteorStrike = true; 
                    ms.timer = 5000;
                    this.scene.projectiles.push(ms); 
                    this.scene.triggerCinematic('IMPACTO METEORICO', '#ff5500'); 
                } 
                else if (spell === 'BLOOD_EXPLOSION') { 
                    this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + actualW/2, p_cy, 'SHINRA', '#cc0000')); 
                    this.scene.getOpposingTeam(this.id).forEach(p => { 
                        if (Math.hypot(p.x - this.x, p.y - this.y) < 500) { 
                            this.scene.dealDamage(p, 60, this); 
                            this.health = Math.min(this.maxHealth, this.health + 20); 
                        } 
                    }); 
                    let dummy = new Projectile(this.scene, this.x, this.y, 0, 0, '#cc0000', this.id); 
                    dummy.splash(this.x + actualW/2, p_cy, 450, 0, 0); 
                    this.scene.triggerCinematic('EXPLOSION DE SANGRE', '#cc0000'); 
                } 
                else if (spell === 'PLASMA_BALL') { 
                    let pb = new Projectile(this.scene, px, this.y, 25 * dir, 5, '#aa00ff', this.id); 
                    pb.isPlasma = true; 
                    pb.width = 30; 
                    pb.height = 30; 
                    pb.timer = 3000; 
                    pb.bounces = 12;
                    this.scene.projectiles.push(pb); 
                    this.scene.triggerCinematic('BOLA DE PLASMA', '#aa00ff'); 
                } 
                else if (spell === 'LASER_SINGULARITY') { 
                    let target = this.scene.getNearestEnemy(this); 
                    let targetX = target ? target.x + target.width/2 : this.x + actualW/2; 
                    let ls = new Projectile(this.scene, targetX - 75, 0, 0, 0, '#aa00ff', this.id); 
                    ls.isOrbital = true; 
                    ls.isBlackHole = true; 
                    ls.followTargetId = target?.id ?? null;
                    ls.strikeDelay = 650;
                    ls.power = 2; 
                    ls.width = 150; 
                    ls.height = this.scene.worldHeight; 
                    ls.timer = 1500; 
                    this.scene.projectiles.push(ls); 
                    this.scene.triggerCinematic('SINGULARIDAD LASER', '#aa00ff'); 
                } 
                else if (spell === 'BLIZZARD') { 
                    let blz = new Projectile(this.scene, px, this.y - 80, 8 * dir, 0, '#aaddff', this.id); 
                    blz.isTornado = true; 
                    blz.isBlizzard = true; 
                    blz.width = 150; 
                    blz.height = 200; 
                    blz.timer = 3500; 
                    this.scene.projectiles.push(blz); 
                    this.scene.triggerCinematic('VENTISCA', '#aaddff'); 
                } 
                else if (spell === 'KIRIN') { 
                    let target = this.scene.getNearestEnemy(this); 
                    let pxTarget = target ? (target.x + target.width/2) : px + 300 * dir; 
                    let k = new Projectile(this.scene, pxTarget - 75, -200, 0, 20, '#aaffff', this.id, true); 
                    k.isKirin = true; 
                    k.isMeteorStrike = true; 
                    k.width = 150; 
                    k.height = 150; 
                    k.timer = 5000;
                    this.scene.projectiles.push(k); 
                    this.x = pxTarget - 50; 
                    this.invulnTimer = 1000; 
                    this.scene.triggerCinematic('KIRIN', '#aaffff'); 
                } 
                else if (spell === 'VAMPIRIC_KNIVES') { 
                    for(let i = -2; i <= 2; i++) { 
                        let vk = new Projectile(this.scene, px, p_cy + (i*15), 20 * dir, i * 4, '#cc0000', this.id); 
                        vk.isBat = true; 
                        vk.isKnife = true; 
                        vk.width = 40; 
                        vk.height = 15; 
                        vk.timer = 3000; 
                        this.scene.projectiles.push(vk); 
                    } 
                    this.scene.triggerCinematic('CUCHILLOS VAMPIRICOS', '#cc0000'); 
                } 
                else if (spell === 'ABSOLUTE_ZERO') { 
                    this.scene.getOpposingTeam(this.id).forEach(en => { 
                        en.freezeTimer = 10000; 
                        this.scene.dealDamage(en, 60, this); 
                    }); 
                    this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + actualW/2, p_cy, 'SHINRA', '#aaddff')); 
                    this.scene.triggerCinematic('CERO ABSOLUTO', '#aaddff', true); 
                } 
                else if (spell === 'INFERNAL_BATS') { 
                    for(let i = 0; i < 5; i++) { 
                        let ib = new Projectile(this.scene, px, p_cy, 8 * dir, (Math.random() - 0.5) * 8, '#111', this.id); 
                        ib.isBat = true; 
                        ib.isAmaterasuBat = true; 
                        ib.width = 20; 
                        ib.height = 20; 
                        ib.timer = 4000; 
                        this.scene.projectiles.push(ib); 
                    } 
                    this.scene.triggerCinematic('MURCIELAGOS INFERNALES', '#ff0000'); 
                } 
                else if (spell === 'HAILSTORM') { 
                    for(let i = 0; i < 15; i++) { 
                        let m = new Projectile(this.scene, Math.random() * this.scene.worldWidth, -100 - (Math.random() * 400), (Math.random() - 0.5) * 8, 12 + Math.random() * 5, '#aaddff', this.id, true); 
                        m.isHailstorm = true; 
                        this.scene.projectiles.push(m); 
                    } 
                    this.scene.triggerCinematic('LLUVIA DE GRANIZO', '#aaddff'); 
                } 
                else if (spell === 'VOID_BEAM') { 
                    let beam = new Projectile(this.scene, this.facingRight ? this.x + actualW + 18 : this.x - 638, p_cy - 22, 40 * dir, 0, '#4b0082', this.id); 
                    beam.width = 600; 
                    beam.height = 44; 
                    beam.isBeam = true; 
                    beam.isVoidBeam = true; 
                    beam.followOwner = true;
                    beam.timer = 2500;
                    this.scene.projectiles.push(beam); 
                    this.scene.triggerCinematic('RAYO DEL VACIO', '#4b0082'); 
                } 
                else if (spell === 'BAT_SWARM') { 
                    let torn = new Projectile(this.scene, px, this.y - 80, 6 * dir, 0, '#8800ff', this.id); 
                    torn.isTornado = true; 
                    torn.isBatSwarm = true; 
                    torn.width = 160; 
                    torn.height = 200; 
                    torn.timer = 3500; 
                    this.scene.projectiles.push(torn); 
                    this.scene.triggerCinematic('ENJAMBRE DE MURCIELAGOS', '#8800ff'); 
                } 
                else if (spell === 'SUN_BURST') { 
                    this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + actualW/2, p_cy, 'SHINRA', '#ffaa00')); 
                    this.scene.getOpposingTeam(this.id).forEach(p => { 
                        if (Math.hypot(p.x - this.x, p.y - this.y) < 600) { 
                            this.scene.dealDamage(p, 80, this); 
                            p.vx = (p.x > this.x ? 1 : -1) * 35; 
                            p.vy = -20; 
                            p.damageFlashTimer = 500; 
                        } 
                    }); 
                    let dummy = new Projectile(this.scene, this.x, this.y, 0, 0, '#ffaa00', this.id); 
                    dummy.splash(this.x + actualW/2, p_cy, 600, 0, 0); 
                    this.scene.triggerCinematic('ESTALLIDO SOLAR', '#ffaa00'); 
                } 
                else if (spell === 'CROSS_SLASH') { 
                    let cs = new Projectile(this.scene, px, this.y - 80, 25 * dir, 0, this.baseColor, this.id); 
                    cs.width = 150; 
                    cs.height = 150; 
                    cs.isCrossSlash = true; 
                    cs.timer = 1500; 
                    this.scene.projectiles.push(cs); 
                    this.scene.triggerCinematic('CORTE EN CRUZ', this.baseColor); 
                } 
                else if (spell === 'THUNDER_GOD') { 
                    this.thunderGodTimer = 8000; 
                    this.scene.triggerCinematic('DIOS DEL TRUENO', '#ffff00', true); 
                } 
                else if (spell === 'BLACK_RASENGAN') { 
                    let brY = Math.min(p_cy - 40, this.y + actualH - 86);
                    let br = new Projectile(this.scene, px, brY, 18 * dir, -1.2, '#111', this.id); 
                    br.width = 80; 
                    br.height = 80; 
                    br.isRasengan = true; 
                    br.isBlackRasengan = true; 
                    br.pierceTimer = 120;
                    this.scene.projectiles.push(br); 
                    this.scene.triggerCinematic('RASENGAN OSCURO', '#111'); 
                }
                else if (spell === 'LIGHTNING_SLASH') { 
                    let ls = new Projectile(this.scene, px, this.y - 80, 30 * dir, 0, '#ffff00', this.id); 
                    ls.width = 80; 
                    ls.height = 200; 
                    ls.isGetsuga = true; 
                    ls.isLightningSlash = true; 
                    this.scene.projectiles.push(ls); 
                    this.scene.triggerCinematic('CORTE RELAMPAGO', '#ffff00'); 
                }
                else if (spell === 'BLADE_STORM') { 
                    let bs = new Projectile(this.scene, px, this.y - 80, 8 * dir, 0, '#ccc', this.id); 
                    bs.isTornado = true; 
                    bs.isBladeStorm = true; 
                    bs.width = 160; 
                    bs.height = 200; 
                    bs.timer = 3200; 
                    this.scene.projectiles.push(bs); 
                    this.scene.triggerCinematic('TORMENTA DE ESPADAS', '#ccc'); 
                }
                else if (spell === 'COMET_PUNCH') { 
                    let t = this.scene.getNearestEnemy(this); 
                    if (t) { 
                        this.x = t.x - (dir*50); 
                        this.y = t.y; 
                        px = this.x + (dir === 1 ? actualW : -60); 
                    } 
                    playSfx('hit'); 
                    this.scene.shakeTime = 20; 
                    this.scene.shakeMagnitude = 15; 
                    this.scene.visualEffects.push(new VisualEffect(this.scene, px + (dir*40), this.y, 'FALCON', '#ff00ff')); 
                    let dummy = new Projectile(this.scene, this.x, this.y, 0, 0, this.baseColor, this.id); 
                    dummy.splash(px + (dir*40), p_cy, 200, 250, 100); 
                    for(let i = 0; i < 5; i++) { 
                        this.scene.projectiles.push(new Projectile(this.scene, px + (dir*40) + (Math.random() - 0.5) * 100, -100 - Math.random() * 200, (Math.random() - 0.5) * 4, 15, '#ff00ff', this.id, true)); 
                    } 
                    this.scene.triggerCinematic('GOLPE COMETA', '#ff00ff'); 
                }
                else if (spell === 'METEOR_SWARM') { 
                    for(let i = 0; i < 6; i++) { 
                        let bat = new Projectile(this.scene, px, p_cy + (Math.random() - 0.5) * 40, dir * 8, (Math.random() - 0.5) * 5, '#ff3300', this.id); 
                        bat.isBat = true; 
                        bat.isAmaterasuBat = true; 
                        bat.width = 30; 
                        bat.height = 25; 
                        bat.timer = 6000; 
                        this.scene.projectiles.push(bat); 
                    } 
                    this.scene.triggerCinematic('ENJAMBRE METEORICO', '#ff3300'); 
                }
                else if (spell === 'GRAVITY_MINE') {
                    let mine = new Projectile(this.scene, this.x + actualW/2 - 32, this.y + actualH - 80, 0, 0, '#111', this.id);
                    mine.isBlackHole = true;
                    mine.isGravityMine = true;
                    mine.width = 64;
                    mine.height = 64;
                    mine.timer = 2800;
                    mine.power = 1.15;
                    this.scene.projectiles.push(mine);
                    playSfx('spell');
                }
                else if (spell === 'DASH_STRIKE') {
                    this.vx = 34 * dir;
                    this.vy = -4;
                    this.invulnTimer = 400;
                    this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + actualW/2, p_cy, 'FALCON', this.baseColor));
                    let dummy = new Projectile(this.scene, this.x, this.y, 0, 0, this.baseColor, this.id);
                    dummy.splash(px + dir * 70, p_cy, 120, 160, 35);
                    playSfx('hit');
                }
                else if (spell === 'HEALING_FIELD') {
                    const healTargets = (gameMode === 'pve' || gameMode === 'roguelike') ? this.scene.players : [this];
                    healTargets.forEach(pl => {
                        if (Math.hypot(pl.x - this.x, pl.y - this.y) < 360) {
                            pl.health = Math.min(pl.maxHealth, pl.health + 180);
                            pl.invulnTimer = Math.max(pl.invulnTimer, 500);
                        }
                    });
                    this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + actualW/2, p_cy, 'SHINRA', '#6bff9b'));
                    playSfx('pickup');
                }
                else if (spell === 'PAINT_RAIL') {
                    let rail = new Projectile(this.scene, this.facingRight ? this.x + actualW + 18 : this.x - 818, p_cy - 7, 0, 0, this.baseColor, this.id);
                    rail.isBeam = true;
                    rail.isRailgun = true;
                    rail.isPaintRail = true;
                    rail.followOwner = true;
                    rail.width = 800;
                    rail.height = 14;
                    rail.timer = 1800;
                    rail.isGiantPaint = true;
                    this.scene.projectiles.push(rail);
                    playSfx('plasma');
                }
                else if (spell === 'GRAVITY_WELL') {
                    let well = new Projectile(this.scene, this.x + actualW/2 - 80, this.y - 120, 0, 0, '#050505', this.id);
                    well.isBlackHole = true;
                    well.isGravityWell = true;
                    well.width = 160;
                    well.height = 160;
                    well.timer = 2600;
                    well.power = 3.2;
                    this.scene.projectiles.push(well);
                    this.scene.triggerCinematic('POZO GRAVITATORIO', '#111');
                }
                else if (spell === 'TESLA_RAIL') {
                    let rail = new Projectile(this.scene, this.facingRight ? this.x + actualW + 18 : this.x - 918, p_cy - 10, 0, 0, '#ffff00', this.id);
                    rail.isBeam = true;
                    rail.isRailgun = true;
                    rail.isLightningSlash = true;
                    rail.isTeslaRail = true;
                    rail.followOwner = true;
                    rail.width = 900;
                    rail.height = 20;
                    rail.timer = 2000;
                    this.scene.projectiles.push(rail);
                    for (let i = 0; i < 3; i++) {
                        let cl = new Projectile(this.scene, px + i * dir * 120, p_cy, 0, 0, '#ffff00', this.id);
                        cl.isChainLightning = true;
                        cl.width = 10;
                        cl.height = 10;
                        cl.timer = 700;
                        cl.hits = [];
                        this.scene.projectiles.push(cl);
                    }
                    this.scene.triggerCinematic('TESLA RAIL', '#ffff00');
                }
                else if (spell === 'MIRROR_DOME') {
                    this.scene.players.forEach(pl => {
                        if (gameMode === 'pve' || gameMode === 'roguelike' || pl.id === this.id) {
                            pl.reflectTimer = Math.max(pl.reflectTimer, 6000);
                            pl.invulnTimer = Math.max(pl.invulnTimer, 1200);
                        }
                    });
                    this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + actualW/2, p_cy, 'SHINRA', '#ffffff'));
                    this.scene.triggerCinematic('DOMO ESPEJO', '#ffffff', true);
                }
                else if (spell === 'SANCTUARY') {
                    const sanctuaryTargets = (gameMode === 'pve' || gameMode === 'roguelike') ? this.scene.players : [this];
                    sanctuaryTargets.forEach(pl => {
                        pl.health = Math.min(pl.maxHealth, pl.health + 260);
                        pl.passives.HASTE = Math.max(pl.passives.HASTE || 0, 3500);
                    });
                    this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + actualW/2, p_cy, 'SHINRA', '#6bff9b'));
                    this.scene.triggerCinematic('SANTUARIO', '#6bff9b', true);
                }
                else if (spell === 'LIGHTNING_DASH') {
                    this.thunderGodTimer = 3000;
                    this.vx = 42 * dir;
                    this.invulnTimer = 900;
                    for (let i = 0; i < 3; i++) {
                        let cl = new Projectile(this.scene, this.x + actualW/2, p_cy, 0, 0, '#ffff00', this.id);
                        cl.isChainLightning = true;
                        cl.width = 10;
                        cl.height = 10;
                        cl.timer = 600;
                        cl.hits = [];
                        this.scene.projectiles.push(cl);
                    }
                    this.scene.triggerCinematic('DASH RELAMPAGO', '#ffff00');
                }
                
        this.scene.updateHUD();
    }
}
