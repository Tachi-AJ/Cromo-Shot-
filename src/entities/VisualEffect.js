import Phaser from 'phaser';

export default class VisualEffect {
    constructor(scene, x, y, type, color, meta = null) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = color;
        this.meta = meta;
        this.radius = 10;
        this.alpha = 1;
        this.active = true;
    }

    update(dtScale) {
        let effDelta = dtScale * 1.0;
        if (this.type === 'SHINRA') {
            this.radius += 25 * effDelta;
            this.alpha -= 0.05 * effDelta;
        } else if (this.type === 'FALCON') {
            this.radius += 10 * effDelta;
            this.alpha -= 0.1 * effDelta;
        } else if (this.type === 'CLONE') {
            this.radius += 2 * effDelta;
            this.alpha -= 0.05 * effDelta;
        } else if (this.type === 'LASER_WARN') {
            this.alpha -= 0.025 * effDelta;
        } else if (this.type === 'CHIDORI') {
            this.radius += 5 * effDelta;
            this.alpha -= 0.08 * effDelta;
        }
        
        if (this.alpha <= 0) {
            this.active = false;
        }
    }

    render(graphics) {
        const ctx = graphics.context;
        if (!ctx) return;
        
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.beginPath();

        if (this.type === 'SHINRA') {
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.lineWidth = 10;
            ctx.strokeStyle = this.color;
            ctx.stroke();
            ctx.fillStyle = this.color;
            ctx.globalAlpha = Math.max(0, this.alpha * 0.3);
            ctx.fill();
        } else if (this.type === 'FALCON') {
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ff5500';
            ctx.fill();
        } else if (this.type === 'LASER_WARN') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 6 + Math.sin(Date.now() / 60) * 3;
            ctx.setLineDash([24, 16]);
            if (this.meta?.vertical) {
                ctx.moveTo(this.x, 0);
                ctx.lineTo(this.x, this.scene.worldHeight);
            } else {
                ctx.moveTo(0, this.y);
                ctx.lineTo(this.scene.worldWidth, this.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (this.type === 'CLONE') {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, 30, 30);
        } else if (this.type === 'CHIDORI') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 0;
            ctx.shadowColor = this.color;
            for (let i = 0; i < 7; i++) {
                ctx.beginPath();
                ctx.moveTo(this.x + (Math.random() - 0.5) * 24, this.y + (Math.random() - 0.5) * 24);
                ctx.lineTo(this.x + (Math.random() - 0.5) * 80, this.y + (Math.random() - 0.5) * 80);
                ctx.stroke();
            }
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 14 + Math.sin(Date.now() / 40) * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
        
        ctx.restore();
    }
}
