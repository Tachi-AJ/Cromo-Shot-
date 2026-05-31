import Phaser from 'phaser';
import { pointInRect } from '../utils/PhysicsHelper.js';

export default class PaintParticle {
    /**
     * @param {number} x - Spawn X
     * @param {number} y - Spawn Y
     * @param {string} color - Paint hex color
     */
    constructor(x, y, color, isDeathExplosion = false) {
        this.x = x;
        this.y = y;
        if (isDeathExplosion) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 15 + 4;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.size = Math.random() * 6 + 3.0;
        } else {
            this.vx = (Math.random() - 0.5) * 15;
            this.vy = (Math.random() - 1) * 12;
            this.size = Math.random() * 5 + 2.5;
        }
        this.color = color;
        this.life = 1.0;
        this.onGround = false;
    }

    /**
     * Updates physics, checks platform collisions, and stains tiles
     */
    update(deltaTime, platforms, worldHeight, getKillPlaneY) {
        if (!this.onGround) {
            // Apply gravity (0.44)
            this.vy += 0.44;
            this.x += this.vx;
            this.y += this.vy;

            // Check collision with platforms
            for (let p of platforms) {
                if (pointInRect(this.x, this.y, p.x, p.y, p.width, p.height)) {
                    this.onGround = true;
                    
                    // Stain the hit tile in the 12x12 platform grid
                    p.stainPoint(this.x, this.y, this.color);
                    
                    this.life = 0; // Destroy particle
                    break;
                }
            }

            // Fall below screen bounds
            if (this.y > getKillPlaneY() || this.y > worldHeight) {
                this.life = 0;
            }
        }
    }

    /**
     * Draws the particle on a Graphics context
     */
    render(graphics) {
        if (this.life <= 0) return;
        const colorHex = Phaser.Display.Color.HexStringToColor(this.color).color;
        graphics.fillStyle(colorHex, 0.9);
        graphics.fillCircle(this.x, this.y, this.size);
    }
}
