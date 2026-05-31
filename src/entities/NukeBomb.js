import Phaser from 'phaser';
import Projectile from './Projectile.js';

export default class NukeBomb {
    constructor(scene, x, targetY, color, ownerId) {
        this.scene = scene;
        this.x = x;
        this.y = -200;
        this.targetY = targetY;
        this.color = color;
        this.ownerId = ownerId;
        this.active = true;
        this.vy = 12;
        this.width = 40;
        this.height = 100;
    }

    update(realDeltaTime) {
        let effDelta = realDeltaTime * 1.0;
        this.y += this.vy * effDelta;
        if (this.y + this.height >= this.targetY || this.y >= this.scene.worldHeight - 40) {
            this.explode();
            this.active = false;
        }
    }

    explode() {
        this.scene.flashAlpha = 1;
        this.scene.shakeTime = 40;
        this.scene.shakeMagnitude = 25;
        this.scene.playSfx('explosion');
        
        let dummy = new Projectile(this.scene, this.x, this.y + this.height, 0, 0, this.color, this.ownerId);
        dummy.splash(this.x, this.y + this.height, 450, 500, 80);
    }

    render(graphics) {
        const ctx = graphics.context;
        if (!ctx) return;
        ctx.fillStyle = '#ff5500';
        ctx.beginPath();
        ctx.moveTo(this.x - 15, this.y);
        ctx.lineTo(this.x + 15, this.y);
        ctx.lineTo(this.x, this.y - 80 - Math.random() * 60);
        ctx.fill();
        
        ctx.fillStyle = '#ccc';
        ctx.fillRect(this.x - 15, this.y, 30, this.height);
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x - 15, this.y + this.height);
        ctx.lineTo(this.x + 15, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height + 30);
        ctx.fill();
        
        if (Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x, this.y + this.height / 2, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
