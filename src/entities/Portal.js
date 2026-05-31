import Phaser from 'phaser';
import Enemy from './Enemy.js';
import Boss from './Boss.js';

export default class Portal {
    constructor(scene, x, y, wave, isBoss = false) { 
        this.scene = scene;
        this.x = x; 
        this.y = y; 
        this.timer = 1500; 
        this.wave = wave; 
        this.isBoss = isBoss; 
        this.active = true; 
        this.scene.playSfx('portal'); 
    }
    
    update(dtScale) {
        // dtScale is normalized to ~16.6ms per frame, so convert to ms
        const dtMs = dtScale * 16.666;
        this.timer -= dtMs;
        if (this.timer <= 0) {
            this.active = false;
            if (this.isBoss) { 
                let boss = new Boss(this.scene, this.x, this.y, this.wave); 
                this.scene.enemies.push(boss); 
                this.scene.activeBossRef = boss; 
                
                const bossName = document.getElementById('boss-name');
                if (bossName) {
                    bossName.textContent = boss.displayName;
                    bossName.style.color = boss.color;
                    bossName.style.borderColor = boss.color;
                }
                
                this.scene.playSfx('explosion'); 
                this.scene.playSfx('boss');
                this.scene.shakeTime = 30; 
                this.scene.shakeMagnitude = 15; 
                this.scene.flashAlpha = 0.5; 
            } else {
                let enemy = new Enemy(this.scene, this.x, this.y, this.wave);
                if (this.scene.gameMode === 'roguelike' && this.scene.roguelikeMutator?.key === 'swarm') {
                    enemy.width *= 0.7;
                    enemy.height *= 0.7;
                    enemy.speedMult *= 1.2;
                }
                this.scene.enemies.push(enemy);
            }
        }
    }
    
    render(graphics) {
        const ctx = graphics.context;
        if (!ctx) return;
        
        ctx.save(); 
        ctx.translate(this.x + 15, this.y + 15); 
        ctx.rotate(Date.now() / 100);
        
        ctx.strokeStyle = this.isBoss ? '#ff0000' : '#aa00ff'; 
        ctx.lineWidth = 4; 
        ctx.shadowBlur = 15; 
        ctx.shadowColor = ctx.strokeStyle;
        
        ctx.beginPath(); 
        ctx.arc(0, 0, 20 + Math.sin(Date.now() / 50) * 5, 0, Math.PI * 2); 
        ctx.stroke(); 
        
        ctx.setLineDash([5, 5]); 
        ctx.rotate(-Date.now() / 50); 
        ctx.strokeStyle = '#ffffff';
        
        ctx.beginPath(); 
        ctx.arc(0, 0, 10, 0, Math.PI * 2); 
        ctx.stroke(); 
        
        ctx.restore();
    }
}
