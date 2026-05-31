import Phaser from 'phaser';
import Enemy from './Enemy.js';
import Projectile from './Projectile.js';
import VisualEffect from './VisualEffect.js';
import Portal from './Portal.js';

const BOSS_VARIANTS = [
    { key: 'pyro', name: 'REY SLIME CARMESI', color: '#ff1744', accent: '#ffb300', width: 72, height: 64, hp: 1.0, speed: 1.05, spells: ['CRUEL_SUN', 'METEOR', 'FALCON_SLAM', 'SUMMON'] },
    { key: 'storm', name: 'MATRIZ TORMENTA', color: '#00e5ff', accent: '#fff36b', width: 62, height: 74, hp: 0.9, speed: 1.35, spells: ['LASER_GRID', 'CHAIN_STORM', 'KIRIN', 'SUMMON'] },
    { key: 'void', name: 'NODO DEL VACIO', color: '#8a2be2', accent: '#111111', width: 78, height: 78, hp: 1.12, speed: 0.9, spells: ['PURPURA_HUECO', 'VOID_RAIN', 'LASER_RING', 'GRAVITY_WELL'] },
    { key: 'golem', name: 'GOLEM DE PINTURA', color: '#ffb300', accent: '#00f3ff', width: 92, height: 88, hp: 1.28, speed: 0.72, spells: ['SPLAT_WAVE', 'EARTHQUAKE', 'MORTAR', 'CHOKE_SLAM'] },
    { key: 'mirror', name: 'ESPEJO PRISMATICO', color: '#ffffff', accent: '#ff66ff', width: 70, height: 70, hp: 1.0, speed: 1.0, spells: ['PRISM_TRAP', 'MIRROR_BURST', 'LASER_GRID', 'SUMMON'] },
    { key: 'chrono', name: 'CRONO SLIME', color: '#b7ff00', accent: '#00f3ff', width: 68, height: 68, hp: 0.95, speed: 1.45, spells: ['TIME_FIELD', 'DASH_BARRAGE', 'TAIYOKEN', 'SUMMON'] },
    { key: 'queen', name: 'REINA ENJAMBRE', color: '#9b5cff', accent: '#ff4dd8', width: 78, height: 66, hp: 1.08, speed: 1.18, spells: ['BAT_NEST', 'VENOM_RAIN', 'SPLAT_WAVE', 'HUNTER_MARK'] },
    { key: 'chef', name: 'CHEF GELATINOSO', color: '#ff7a00', accent: '#fff0a0', width: 84, height: 76, hp: 1.16, speed: 0.92, spells: ['KNIFE_FAN', 'SAUCE_POOL', 'MORTAR', 'SUMMON'] },
    { key: 'laser', name: 'ARQUITECTO LASER', color: '#ff2bd6', accent: '#00f3ff', width: 68, height: 86, hp: 1.05, speed: 1.08, spells: ['LASER_GRID', 'MAKANKOSAPPO', 'PRISM_TRAP', 'SUMMON'] },
    { key: 'gravity', name: 'ORACULO GRAVITATORIO', color: '#3b1dff', accent: '#aaffff', width: 88, height: 88, hp: 1.22, speed: 0.82, spells: ['GRAVITY_WELL', 'PURPURA_HUECO', 'VOID_RAIN', 'SUMMON'] },
    { key: 'sun', name: 'SOL CRUEL', color: '#ffb000', accent: '#ffffff', width: 84, height: 84, hp: 1.1, speed: 0.95, spells: ['CRUEL_SUN', 'LASER_GRID', 'MORTAR', 'FALCON_SLAM'] },
    { key: 'counter', name: 'PALADIN FULL COUNTER', color: '#36ff9a', accent: '#fff36b', width: 74, height: 82, hp: 1.18, speed: 1.0, spells: ['FULL_COUNTER', 'MIRROR_BURST', 'DASH_BARRAGE', 'SUMMON'] },
    { key: 'driller', name: 'PERFORADOR DEMONIO', color: '#8bffea', accent: '#5511ff', width: 72, height: 74, hp: 1.02, speed: 1.25, spells: ['MAKANKOSAPPO', 'CHOKE_SLAM', 'CHAIN_STORM', 'SUMMON'] },
    { key: 'nightmare', name: 'PESADILLA HUECA', color: '#111111', accent: '#b000ff', width: 96, height: 90, hp: 1.35, speed: 0.78, spells: ['PURPURA_HUECO', 'GRAVITY_WELL', 'VOID_RAY', 'TAIYOKEN'] }
];

export default class Boss extends Enemy {
    constructor(scene, x, y, wave) {
        super(scene, x, y, wave); 
        this.isBoss = true; 
        this.variant = BOSS_VARIANTS[(wave - 1) % BOSS_VARIANTS.length];
        this.type = 'BOSS_' + this.variant.key; 
        this.width = this.variant.width; 
        this.height = this.variant.height;
        this.maxHealth = Math.floor((800 + (wave * 300)) * this.variant.hp); 
        this.health = this.maxHealth;
        this.color = this.variant.color; 
        this.accentColor = this.variant.accent;
        this.baseColor = this.color;
        this.displayName = this.variant.name;
        this.spells = this.variant.spells.slice(); 
        this.spellTimer = 3000; 
        this.speedMult = this.variant.speed; 
        this.enraged = false;
    }
    
    update(dtScale) {
        super.update(dtScale);
        if (this.timeStopTimer > 0) return;
        if (this.health <= 0) return;
        
        // Convert dtScale to real milliseconds
        const dtMs = dtScale * 16.666;

        if (!this.enraged && this.health < this.maxHealth / 2) { 
            this.enraged = true; 
            this.speedMult *= 1.5; 
            this.spellTimer = 0; 
            this.color = '#ff0000'; 
            this.scene.triggerCinematic('JEFE ENFURECIDO', '#ff0000'); 
            this.scene.playSfx('boss');
        }

        if (this.timeStopTimer <= 0 && !this.exploded) { 
            this.spellTimer -= dtMs; 
            if (this.spellTimer <= 0) { 
                const wave = this.scene.currentWave || 1;
                this.spellTimer = Math.max(1200, 4000 - (wave * 100)) + Math.random() * (this.enraged ? 500 : 1000); 
                this.castRandomSpell(); 
            } 
        }
    }
    
    castRandomSpell() {
        let spell = this.spells[Math.floor(Math.random() * this.spells.length)]; 
        let target = this.scene.getNearestEnemy(this); 
        let dir = target && target.x < this.x ? -1 : 1; 
        let px = dir === 1 ? this.x + this.width : this.x - 60;

        if (spell === 'HADOUKEN') { 
            let h = new Projectile(this.scene, px, this.y + 15, 20 * dir, 0, '#00ffff', this.id); 
            h.isHadouken = true; 
            h.width = 40; 
            h.height = 30; 
            this.scene.projectiles.push(h); 
            this.scene.playSfx('spell'); 
        } else if (spell === 'GOUKAKYU') {
            let g = new Projectile(this.scene, px, this.y - 30, 14 * dir, -2, '#ff3300', this.id);
            g.isGoukakyu = true;
            g.width = 105;
            g.height = 105;
            g.bounces = this.enraged ? 5 : 3;
            this.scene.projectiles.push(g);
            this.scene.playSfx('spell');
        } else if (spell === 'METEOR') { 
            for (let i = 0; i < 8; i++) { 
                this.scene.projectiles.push(new Projectile(this.scene, Math.random() * this.scene.worldWidth, -100 - (Math.random() * 200), (Math.random() - 0.5) * 6, 10 + Math.random() * 5, this.color, this.id, true)); 
            } 
        } else if (spell === 'GETSUGA') { 
            let w = new Projectile(this.scene, px, this.y - 40, 25 * dir, 0, this.color, this.id); 
            w.width = 60; 
            w.height = 200; 
            w.isGetsuga = true; 
            this.scene.projectiles.push(w); 
            this.scene.playSfx('spell'); 
        } else if (spell === 'RASENGAN') { 
            let r = new Projectile(this.scene, px, this.y - 6, 18 * dir, -1, this.color, this.id); 
            r.width = 50; 
            r.height = 50; 
            r.isRasengan = true; 
            r.pierceTimer = 120;
            this.scene.projectiles.push(r); 
            this.scene.playSfx('spell'); 
        } else if (spell === 'BLACK_HOLE') { 
            let bh = new Projectile(this.scene, this.x + this.width/2 - 30, this.y - 80, 0, 0, '#000000', this.id); 
            bh.isBlackHole = true; 
            bh.width = 60; 
            bh.height = 60; 
            bh.timer = 4000; 
            bh.power = 1; 
            this.scene.projectiles.push(bh); 
            this.scene.playSfx('spell'); 
        } else if (spell === 'CHAIN_STORM') {
            for (let i = 0; i < 3; i++) {
                let cl = new Projectile(this.scene, this.x + this.width/2, this.y + this.height/2, 0, 0, '#ffff00', this.id);
                cl.isChainLightning = true;
                cl.width = 12;
                cl.height = 12;
                cl.timer = 900;
                cl.hits = [];
                this.scene.projectiles.push(cl);
            }
            this.scene.playSfx('spell');
        } else if (spell === 'KIRIN') {
            let pxTarget = target ? target.x + target.width / 2 : this.x + 280 * dir;
            let k = new Projectile(this.scene, pxTarget - 80, -180, 0, 19, '#aaffff', this.id, true);
            k.isKirin = true;
            k.isMeteorStrike = true;
            k.width = 160;
            k.height = 160;
            this.scene.projectiles.push(k);
            this.scene.triggerCinematic('KIRIN', '#aaffff');
        } else if (spell === 'FALCON_SLAM') {
            const tx = target ? target.x + target.width/2 : this.x + 220 * dir;
            const ty = target ? target.y + target.height/2 : this.y + this.height/2;
            this.scene.visualEffects.push(new VisualEffect(this.scene, tx, ty, 'FALCON', '#ff5500'));
            let dummy = new Projectile(this.scene, tx, ty, 0, 0, this.color, this.id);
            dummy.splash(tx, ty, 240, 260, 55);
            this.scene.shakeTime = 22;
            this.scene.shakeMagnitude = 16;
            this.scene.playSfx('explosion');
        } else if (spell === 'VOID_RAIN') {
            for (let i = 0; i < 3; i++) {
                let x = (target ? target.x : this.scene.worldWidth / 2) + (i - 1) * 160;
                let bh = new Projectile(this.scene, x, 120 + i * 35, 0, 0, '#000000', this.id);
                bh.isBlackHole = true;
                bh.width = 48;
                bh.height = 48;
                bh.timer = 2600;
                bh.power = 0.75;
                this.scene.projectiles.push(bh);
            }
            this.scene.playSfx('spell');
        } else if (spell === 'LASER_RING') {
            [-120, 0, 120].forEach(offset => {
                let beam = new Projectile(this.scene, 0, Math.max(80, Math.min(this.scene.worldHeight - 120, this.y + offset)), 0, 0, '#8a2be2', this.id);
                beam.isBeam = true;
                beam.isRailgun = true;
                beam.width = this.scene.worldWidth;
                beam.height = 18;
                beam.timer = 650;
                this.scene.projectiles.push(beam);
            });
            this.scene.triggerCinematic('ANILLO DEL VACIO', '#8a2be2');
        } else if (spell === 'SPLAT_WAVE') {
            for (let i = 0; i < 14; i++) {
                const a = (Math.PI * 2 / 14) * i;
                let shot = new Projectile(this.scene, this.x + this.width/2, this.y + this.height/2, Math.cos(a) * 11, Math.sin(a) * 8, this.color, this.id);
                shot.isHadouken = true;
                shot.width = 26;
                shot.height = 22;
                this.scene.projectiles.push(shot);
            }
            this.scene.playSfx('spell');
        } else if (spell === 'EARTHQUAKE') {
            this.scene.flashAlpha = 0.35;
            this.scene.shakeTime = 36;
            this.scene.shakeMagnitude = 22;
            this.scene.getOpposingTeam(this.id).forEach(p => {
                if (p.onGround) {
                    this.scene.dealDamage(p, 45, this);
                    p.vy = -14;
                }
            });
            this.scene.playSfx('explosion');
        } else if (spell === 'MORTAR') {
            this.scene.players.filter(p => p.health > 0 && !p.exploded).forEach(p => {
                let m = new Projectile(this.scene, p.x + p.width/2 - 45, -140 - Math.random() * 160, (Math.random() - 0.5) * 3, 13 + Math.random() * 4, this.color, this.id, true);
                m.width = 90;
                m.height = 90;
                this.scene.projectiles.push(m);
            });
            this.scene.playSfx('spell');
        } else if (spell === 'PRISM_TRAP') {
            for (let i = -1; i <= 1; i++) {
                let prism = new Projectile(this.scene, this.x + this.width/2 + i * 140, this.y - 90, 0, 3, '#ffffff', this.id);
                prism.isPrism = true;
                prism.width = 44;
                prism.height = 92;
                prism.timer = 5500;
                this.scene.projectiles.push(prism);
            }
            this.scene.playSfx('pickup');
        } else if (spell === 'MIRROR_BURST') {
            this.scene.projectiles.slice(-24).forEach(pr => {
                if (pr.active && pr.ownerId !== this.id && !pr.isBeam && !pr.isBrimstone) {
                    pr.ownerId = this.id;
                    pr.vx *= -2;
                    pr.vy *= -2;
                    pr.width *= 1.2;
                    pr.height *= 1.2;
                    pr.damageBoost = (pr.damageBoost || 1) * 2;
                    pr.color = this.color;
                }
            });
            this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + this.width/2, this.y + this.height/2, 'SHINRA', this.color));
            this.scene.playSfx('spell');
        } else if (spell === 'TIME_FIELD') {
            this.scene.getOpposingTeam(this.id).forEach(p => {
                if (p.timeStopTimer <= 0 && (!p.timeStopImmunityTimer || p.timeStopImmunityTimer <= 0) && Math.hypot(p.x - this.x, p.y - this.y) < 520) p.timeStopTimer = 1200;
            });
            this.scene.triggerCinematic('CAMPO TEMPORAL', this.color);
        } else if (spell === 'DASH_BARRAGE') {
            const living = this.scene.players.filter(p => p.health > 0 && !p.exploded);
            living.forEach(p => {
                this.scene.visualEffects.push(new VisualEffect(this.scene, p.x + p.width/2, p.y + p.height/2, 'FALCON', this.color));
                let dummy = new Projectile(this.scene, p.x, p.y, 0, 0, this.color, this.id);
                dummy.splash(p.x + p.width/2, p.y + p.height/2, 90, 110, 18);
            });
            this.scene.playSfx('hit');
        } else if (spell === 'BAT_NEST') {
            for (let i = 0; i < 10; i++) {
                let b = new Projectile(this.scene, this.x + this.width/2, this.y + this.height/2, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10, this.accentColor, this.id);
                b.isBat = true;
                b.width = 22;
                b.height = 16;
                b.timer = 5200;
                this.scene.projectiles.push(b);
            }
            this.scene.playSfx('spell');
        } else if (spell === 'VENOM_RAIN') {
            for (let i = 0; i < 12; i++) {
                let m = new Projectile(this.scene, Math.random() * this.scene.worldWidth, -80 - Math.random() * 220, (Math.random() - 0.5) * 4, 8 + Math.random() * 4, '#8cff00', this.id, true);
                m.isGoukakyu = true;
                m.width = 32;
                m.height = 32;
                m.bounces = 1;
                this.scene.projectiles.push(m);
            }
            this.scene.playSfx('spell');
        } else if (spell === 'KNIFE_FAN') {
            for (let i = -4; i <= 4; i++) {
                let k = new Projectile(this.scene, px, this.y + this.height/2, 18 * dir, i * 2.5, '#dddddd', this.id);
                k.isKnife = true;
                k.width = 46;
                k.height = 16;
                k.timer = 1200;
                k.originalDir = dir;
                this.scene.projectiles.push(k);
            }
            this.scene.playSfx('shoot');
        } else if (spell === 'SAUCE_POOL') {
            let dummy = new Projectile(this.scene, this.x, this.y, 0, 0, this.color, this.id);
            dummy.splash(this.x + this.width/2, this.y + this.height, 320, 230, 20);
            this.scene.spawnPaintSplats(this.scene, this.x + this.width/2, this.y + this.height, this.accentColor, 15);
            this.scene.getOpposingTeam(this.id).forEach(p => {
                if (Math.hypot(p.x - this.x, p.y - this.y) < 360) p.freezeTimer = Math.max(p.freezeTimer, 1700);
            });
            this.scene.playSfx('splat');
        } else if (spell === 'LASER_GRID') {
            this.scene.triggerCinematic('LASER GRID', this.accentColor);
            const lines = [
                { x: this.scene.worldWidth * 0.25, vertical: true },
                { x: this.scene.worldWidth * 0.50, vertical: true },
                { x: this.scene.worldWidth * 0.75, vertical: true },
                { y: this.scene.worldHeight * 0.36, vertical: false },
                { y: this.scene.worldHeight * 0.62, vertical: false }
            ];
            lines.forEach(l => this.scene.visualEffects.push(new VisualEffect(this.scene, l.vertical ? l.x : this.scene.worldWidth / 2, l.vertical ? this.scene.worldHeight / 2 : l.y, 'LASER_WARN', this.accentColor, l)));
            this.scene.time.delayedCall(850, () => {
                if (this.health <= 0 || this.exploded) return;
                lines.forEach(l => {
                    let beam = new Projectile(this.scene, l.vertical ? l.x - 10 : 0, l.vertical ? 0 : l.y - 10, 0, 0, this.accentColor, this.id);
                    beam.isBossLaserGrid = true;
                    beam.isRailgun = true;
                    beam.width = l.vertical ? 20 : this.scene.worldWidth;
                    beam.height = l.vertical ? this.scene.worldHeight : 20;
                    beam.timer = 520;
                    this.scene.projectiles.push(beam);
                });
                this.scene.shakeTime = Math.max(this.scene.shakeTime, 12);
                this.scene.shakeMagnitude = Math.max(this.scene.shakeMagnitude, 8);
                this.scene.playSfx('spell');
            });
        } else if (spell === 'GRAVITY_WELL') {
            const gx = target ? target.x + target.width/2 : this.scene.worldWidth / 2;
            const gy = target ? target.y + target.height/2 : this.scene.worldHeight / 2;
            let well = new Projectile(this.scene, gx - 55, gy - 55, 0, 0, '#220044', this.id);
            well.isGravityWell = true;
            well.width = 110;
            well.height = 110;
            well.timer = 3600;
            well.power = this.enraged ? 1.4 : 1.0;
            this.scene.projectiles.push(well);
            this.scene.triggerCinematic('GRAVITY WELL', '#aa66ff');
        } else if (spell === 'PURPURA_HUECO') {
            let hp = new Projectile(this.scene, px, this.y - 24, 4.2 * dir, 0, '#8b35ff', this.id);
            hp.isHollowPurple = true;
            hp.width = this.enraged ? 145 : 115;
            hp.height = hp.width;
            hp.timer = 5200;
            this.scene.projectiles.push(hp);
            this.scene.triggerCinematic('PURPURA HUECO', '#9b5cff');
        } else if (spell === 'CRUEL_SUN') {
            let sun = new Projectile(this.scene, this.x + this.width/2, this.y - 120, 8 * dir, -10, '#ffb000', this.id);
            sun.isCruelSun = true;
            sun.width = this.enraged ? 130 : 100;
            sun.height = sun.width;
            sun.timer = 4300;
            this.scene.projectiles.push(sun);
            this.scene.triggerCinematic('CRUEL SUN', '#ffb000');
        } else if (spell === 'FULL_COUNTER') {
            this.reflectTimer = 3000;
            this.scene.visualEffects.push(new VisualEffect(this.scene, this.x + this.width/2, this.y + this.height/2, 'SHINRA', '#36ff9a'));
            this.scene.playSfx('spell');
        } else if (spell === 'TAIYOKEN') {
            this.scene.flashAlpha = 1;
            this.scene.getOpposingTeam(this.id).forEach(p => {
                if (p.timeStopTimer <= 0 && (!p.timeStopImmunityTimer || p.timeStopImmunityTimer <= 0)) p.timeStopTimer = 3500;
            });
            this.scene.triggerCinematic('TAIYOKEN', '#ffffff');
        } else if (spell === 'MAKANKOSAPPO') {
            let ray = new Projectile(this.scene, dir > 0 ? this.x + this.width : 0, this.y + this.height/2 - 14, 0, 0, '#8bffea', this.id);
            ray.isMakankosappo = true;
            ray.isRailgun = true;
            ray.width = dir > 0 ? this.scene.worldWidth - ray.x : this.x;
            ray.height = 28;
            ray.timer = 420;
            this.scene.projectiles.push(ray);
            this.scene.triggerCinematic('MAKANKOSAPPO', '#8bffea');
        } else if (spell === 'VOID_RAY') {
            let ray = new Projectile(this.scene, 0, target ? target.y : this.y, 0, 0, '#050008', this.id);
            ray.isVoidRay = true;
            ray.isRailgun = true;
            ray.width = this.scene.worldWidth;
            ray.height = 56;
            ray.timer = 720;
            this.scene.projectiles.push(ray);
            this.scene.triggerCinematic('VOID RAY', '#b000ff');
        } else if (spell === 'CHOKE_SLAM') {
            this.scene.players.filter(p => p.health > 0 && !p.exploded).forEach(p => {
                p.vx += (p.x < this.x ? -1 : 1) * 18;
                p.vy = -18;
                this.scene.dealDamage(p, 26, this);
            });
            this.scene.shakeTime = Math.max(this.scene.shakeTime, 24);
            this.scene.shakeMagnitude = Math.max(this.scene.shakeMagnitude, 14);
            this.scene.playSfx('explosion');
        } else if (spell === 'HUNTER_MARK') {
            this.scene.players.filter(p => p.health > 0 && !p.exploded).forEach(p => {
                for (let i = -1; i <= 1; i++) {
                    let b = new Projectile(this.scene, this.x + this.width/2, this.y + this.height/2, (p.x - this.x) / 45 + i * 2, (p.y - this.y) / 45, this.accentColor, this.id);
                    b.isBat = true;
                    b.width = 18;
                    b.height = 14;
                    b.timer = 4200;
                    this.scene.projectiles.push(b);
                }
            });
            this.scene.playSfx('spell');
        } else if (spell === 'SUMMON') { 
            this.scene.portals.push(new Portal(this.scene, this.x - 150, this.y - 100, this.scene.currentWave)); 
            this.scene.portals.push(new Portal(this.scene, this.x + 150, this.y - 100, this.scene.currentWave)); 
        }
    }

    render(graphics) {
        if (this.exploded) return;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const pulse = 1 + Math.sin(Date.now() / 180) * 0.04;
        const t = Date.now();

        graphics.save();
        graphics.translateCanvas(cx, this.y + this.height);
        graphics.scaleCanvas(this.wX * pulse, this.wY / pulse);
        graphics.translateCanvas(-cx, -(this.y + this.height));
        
        const colorHex = Phaser.Display.Color.HexStringToColor(this.color).color;
        const accentHex = Phaser.Display.Color.HexStringToColor(this.accentColor).color;
        const ctx = graphics.context;

        // 1. BACKGROUND LAYER (Behind the boss body)
        if (ctx && this.damageFlashTimer <= 0) {
            ctx.save();
            ctx.translate(cx, cy);

            if (this.variant.key === 'chrono') {
                // Rotating clock gears behind Chrono
                ctx.fillStyle = 'rgba(183, 255, 0, 0.22)';
                for (let g = 0; g < 2; g++) {
                    ctx.save();
                    ctx.translate(g === 0 ? -this.width * 0.45 : this.width * 0.45, -this.height * 0.35);
                    ctx.rotate((g === 0 ? 1 : -1) * (t / 600));
                    ctx.beginPath();
                    ctx.arc(0, 0, 18, 0, Math.PI * 2);
                    ctx.fill();
                    // Gear teeth
                    for (let i = 0; i < 8; i++) {
                        ctx.rotate(Math.PI / 4);
                        ctx.fillRect(-3, -22, 6, 6);
                    }
                    ctx.restore();
                }
            } else if (this.variant.key === 'queen') {
                // Fluttering insect wings for Swarm Queen
                ctx.fillStyle = 'rgba(255, 77, 216, 0.35)';
                const wingFlap = Math.sin(t / 45) * 0.35;
                for (let side = -1; side <= 1; side += 2) {
                    ctx.save();
                    ctx.translate(side * this.width * 0.42, -10);
                    ctx.rotate(side * (0.8 + wingFlap));
                    ctx.beginPath();
                    ctx.ellipse(0, -18, 12, 34, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            } else if (this.variant.key === 'sun') {
                // Blazing rotating solar rays behind Sun boss
                ctx.fillStyle = 'rgba(255, 176, 0, 0.32)';
                ctx.rotate(t / 800);
                for (let i = 0; i < 8; i++) {
                    ctx.rotate(Math.PI / 4);
                    ctx.beginPath();
                    ctx.moveTo(-8, -this.height * 0.48);
                    ctx.lineTo(0, -this.height * 0.72);
                    ctx.lineTo(8, -this.height * 0.48);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            ctx.restore();
        }
        
        // Neon outer glow outline
        graphics.lineStyle(6, colorHex, this.enraged ? 0.6 : 0.4);
        graphics.strokeRect(this.x - 3, this.y - 3, this.width + 6, this.height + 6);

        if (this.damageFlashTimer > 0) {
            graphics.fillStyle(0xffffff, 1.0);
        } else {
            graphics.fillStyle(colorHex, 1.0);
        }

        // Draw Boss main shape
        if (this.variant.key === 'void') {
            // Draw void circle/singularity boss shape
            graphics.fillCircle(cx, cy, this.width * 0.55);
            if (this.damageFlashTimer <= 0) {
                graphics.fillStyle(0x020202, 1.0);
                graphics.fillCircle(cx, cy, this.width * 0.27 + Math.sin(t / 140) * 4);
            }
        } else if (this.variant.key === 'storm') {
            // Draw diamond boss shape
            graphics.beginPath();
            graphics.moveTo(cx, this.y);
            graphics.lineTo(this.x + this.width, cy);
            graphics.lineTo(cx, this.y + this.height);
            graphics.lineTo(this.x, cy);
            graphics.closePath();
            graphics.fill();
        } else if (this.variant.key === 'golem') {
            // Golem body shape
            graphics.fillRect(this.x, this.y + 8, this.width, this.height - 8);
            if (this.damageFlashTimer <= 0) {
                graphics.fillStyle(accentHex, 1.0);
            }
            graphics.fillRect(this.x + 10, this.y, this.width - 20, 16);
        } else if (this.variant.key === 'mirror') {
            // Hexagonal crystal mirror
            if (ctx) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(cx, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height * 0.25);
                ctx.lineTo(this.x + this.width, this.y + this.height * 0.75);
                ctx.lineTo(cx, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height * 0.75);
                ctx.lineTo(this.x, this.y + this.height * 0.25);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                graphics.fillRect(this.x, this.y + 6, this.width, this.height - 6);
            }
        } else if (this.variant.key === 'chrono') {
            // Clock circle
            graphics.fillCircle(cx, cy, this.width * 0.48);
        } else if (this.variant.key === 'queen') {
            // Wasp oval body
            if (ctx) {
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(cx, cy, this.width * 0.46, this.height * 0.48, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                graphics.fillRect(this.x, this.y + 6, this.width, this.height - 6);
            }
        } else if (this.variant.key === 'laser') {
            // Cybernetic hexagon
            if (ctx) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(cx, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height * 0.3);
                ctx.lineTo(this.x + this.width, this.y + this.height * 0.85);
                ctx.lineTo(this.x + this.width * 0.6, this.y + this.height);
                ctx.lineTo(this.x + this.width * 0.4, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height * 0.85);
                ctx.lineTo(this.x, this.y + this.height * 0.3);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                graphics.fillRect(this.x, this.y + 6, this.width, this.height - 6);
            }
        } else if (this.variant.key === 'gravity') {
            // Oracle gravity sphere
            graphics.fillCircle(cx, cy, this.width * 0.52);
        } else if (this.variant.key === 'sun') {
            // Sun sphere
            graphics.fillCircle(cx, cy, this.width * 0.46);
        } else if (this.variant.key === 'counter') {
            // Knight shield plate
            if (ctx) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(this.x + this.width * 0.2, this.y);
                ctx.lineTo(this.x + this.width * 0.8, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height * 0.4);
                ctx.lineTo(cx, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height * 0.4);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                graphics.fillRect(this.x, this.y + 6, this.width, this.height - 6);
            }
        } else if (this.variant.key === 'driller') {
            // Mechanical cone drill
            if (ctx) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(cx, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height * 0.5);
                ctx.lineTo(this.x + this.width * 0.8, this.y + this.height);
                ctx.lineTo(this.x + this.width * 0.2, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                graphics.fillRect(this.x, this.y + 6, this.width, this.height - 6);
            }
        } else if (this.variant.key === 'nightmare') {
            // Skull shape
            if (ctx) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(this.x + this.width * 0.25, this.y);
                ctx.lineTo(this.x + this.width * 0.75, this.y);
                ctx.quadraticCurveTo(this.x + this.width, this.y + this.height * 0.35, this.x + this.width * 0.85, this.y + this.height * 0.65);
                ctx.lineTo(this.x + this.width * 0.7, this.y + this.height);
                ctx.lineTo(this.x + this.width * 0.3, this.y + this.height);
                ctx.lineTo(this.x + this.width * 0.15, this.y + this.height * 0.65);
                ctx.quadraticCurveTo(this.x, this.y + this.height * 0.35, this.x + this.width * 0.25, this.y);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                graphics.fillRect(this.x, this.y + 6, this.width, this.height - 6);
            }
        } else if (this.variant.key === 'pyro') {
            // Slime dome shape (Slime King)
            if (ctx) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, this.y + this.height * 0.6, this.width * 0.5, Math.PI, 0);
                ctx.lineTo(this.x + this.width, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                graphics.fillRect(this.x, this.y + 12, this.width, this.height - 12);
            }
        } else if (this.variant.key === 'chef') {
            // Round chef slime
            if (ctx) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, this.y + this.height * 0.6, this.width * 0.48, Math.PI, 0);
                ctx.lineTo(this.x + this.width, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                graphics.fillRect(this.x, this.y + 6, this.width, this.height - 6);
            }
        } else {
            // Default square with round top
            graphics.fillRect(this.x, this.y + 6, this.width, this.height - 6);
            if (ctx) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, this.y + 12, this.width * 0.48, Math.PI, 0);
                ctx.fill();
                ctx.restore();
            }
        }

        // 2. FOREGROUND LAYER (Over the boss body)
        if (ctx && this.damageFlashTimer <= 0) {
            ctx.save();
            ctx.translate(cx, cy);

            if (this.variant.key === 'pyro') {
                // Crown for Pyro/Crimson Slime King
                ctx.fillStyle = '#ffd700'; // Gold
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-20, -this.height * 0.55);
                ctx.lineTo(-24, -this.height * 0.76);
                ctx.lineTo(-10, -this.height * 0.65);
                ctx.lineTo(0, -this.height * 0.88);
                ctx.lineTo(10, -this.height * 0.65);
                ctx.lineTo(24, -this.height * 0.76);
                ctx.lineTo(20, -this.height * 0.55);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Gem on crown
                ctx.fillStyle = '#ff1744';
                ctx.beginPath();
                ctx.arc(0, -this.height * 0.68, 3.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.variant.key === 'chef') {
                // Chef Hat & Mustache
                ctx.fillStyle = '#ffffff'; // Hat
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(-8, -this.height * 0.72, 8, 0, Math.PI * 2);
                ctx.arc(8, -this.height * 0.72, 8, 0, Math.PI * 2);
                ctx.arc(0, -this.height * 0.80, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillRect(-12, -this.height * 0.62, 24, 8);
                ctx.strokeRect(-12, -this.height * 0.62, 24, 8);

                // Mustache
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.ellipse(-8, 6, 8, 3, Math.PI / 12, 0, Math.PI * 2);
                ctx.ellipse(8, 6, 8, 3, -Math.PI / 12, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.variant.key === 'laser') {
                // Cyborg Laser Monocle & Light circuits
                ctx.strokeStyle = '#00f3ff';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(-11, -6, 8, 0, Math.PI * 2);
                ctx.stroke();
                // Laser beam dot
                ctx.fillStyle = '#ff0055';
                ctx.beginPath();
                ctx.arc(-11, -6, 2.5, 0, Math.PI * 2);
                ctx.fill();

                // Circuites on body
                ctx.strokeStyle = '#00f3ff';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(10, -10);
                ctx.lineTo(18, 5);
                ctx.lineTo(6, 16);
                ctx.stroke();
            } else if (this.variant.key === 'counter') {
                // Shield crest on chest & Feathered helmet
                ctx.fillStyle = '#ffd700'; // Gold shield
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-10, 2);
                ctx.lineTo(10, 2);
                ctx.lineTo(8, 14);
                ctx.lineTo(0, 22);
                ctx.lineTo(-8, 14);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Cross inside shield
                ctx.strokeStyle = '#36ff9a';
                ctx.beginPath();
                ctx.moveTo(0, 4); ctx.lineTo(0, 18);
                ctx.moveTo(-6, 10); ctx.lineTo(6, 10);
                ctx.stroke();
            } else if (this.variant.key === 'driller') {
                // Drill on bottom base
                ctx.fillStyle = '#777788';
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1.5;
                ctx.save();
                ctx.translate(0, this.height * 0.45);
                ctx.rotate((t / 100) % (Math.PI * 2));
                ctx.beginPath();
                ctx.moveTo(-15, 0);
                ctx.lineTo(0, 22);
                ctx.lineTo(15, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (this.variant.key === 'nightmare') {
                // Dark demon horns for Nightmare
                ctx.fillStyle = '#111111';
                ctx.strokeStyle = '#b000ff';
                ctx.lineWidth = 1.5;
                // Left Horn
                ctx.beginPath();
                ctx.moveTo(-16, -this.height * 0.45);
                ctx.quadraticCurveTo(-34, -this.height * 0.78, -26, -this.height * 0.85);
                ctx.quadraticCurveTo(-22, -this.height * 0.72, -8, -this.height * 0.48);
                ctx.fill(); ctx.stroke();
                // Right Horn
                ctx.beginPath();
                ctx.moveTo(16, -this.height * 0.45);
                ctx.quadraticCurveTo(34, -this.height * 0.78, 26, -this.height * 0.85);
                ctx.quadraticCurveTo(22, -this.height * 0.72, 8, -this.height * 0.48);
                ctx.fill(); ctx.stroke();
            } else if (this.variant.key === 'chrono') {
                // Chrono clock hands
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.0;
                ctx.save();
                ctx.rotate(t / 2500);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -this.width * 0.22);
                ctx.stroke();
                ctx.restore();
                ctx.save();
                ctx.rotate(t / 600);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -this.width * 0.35);
                ctx.stroke();
                ctx.restore();
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.variant.key === 'queen') {
                // Queen bee abdomen stripes
                ctx.fillStyle = '#111111';
                ctx.fillRect(-this.width * 0.35, -this.height * 0.2, this.width * 0.7, 4);
                ctx.fillRect(-this.width * 0.4, 4, this.width * 0.8, 4);
                ctx.fillRect(-this.width * 0.35, 14, this.width * 0.7, 4);
            } else if (this.variant.key === 'sun') {
                // Solar spots/patterns
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                ctx.beginPath();
                ctx.arc(-8, 8, 6, 0, Math.PI * 2);
                ctx.arc(10, 10, 4, 0, Math.PI * 2);
                ctx.arc(2, -10, 5, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.variant.key === 'void') {
                // Gravity void accretion lines
                ctx.strokeStyle = '#8a2be2';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(0, 0, this.width * 0.38, 0, Math.PI * 2);
                ctx.stroke();
            } else if (this.variant.key === 'storm') {
                // Electric lightning symbols on body
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-10, -10);
                ctx.lineTo(-5, 0);
                ctx.lineTo(-8, 10);
                ctx.moveTo(8, -10);
                ctx.lineTo(12, 0);
                ctx.lineTo(10, 12);
                ctx.stroke();
            } else if (this.variant.key === 'golem') {
                // Cracked golem details
                ctx.strokeStyle = '#32cd32';
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.moveTo(-20, 12);
                ctx.lineTo(-12, 18);
                ctx.lineTo(-5, 10);
                ctx.moveTo(10, 15);
                ctx.lineTo(18, 10);
                ctx.stroke();
            } else if (this.variant.key === 'mirror') {
                // Diamond refraction patterns
                ctx.strokeStyle = 'rgba(255,255,255,0.45)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(0, -this.height * 0.45);
                ctx.lineTo(0, this.height * 0.45);
                ctx.moveTo(-this.width * 0.45, 0);
                ctx.lineTo(this.width * 0.45, 0);
                ctx.stroke();
            } else if (this.variant.key === 'gravity') {
                // Orbiting gravity rings
                ctx.strokeStyle = 'rgba(170,255,255,0.3)';
                ctx.lineWidth = 2;
                ctx.save();
                ctx.rotate(t / 1200);
                ctx.beginPath();
                ctx.ellipse(0, 0, this.width * 0.58, this.height * 0.22, Math.PI / 6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }

        // Accent glow ring around Boss
        graphics.lineStyle(4, accentHex, 0.7);
        graphics.strokeCircle(cx, cy, this.width * 0.66 + Math.sin(t / 100) * 4);

        // Eyes
        graphics.fillStyle(0xffffff, 1.0);
        graphics.fillRect(cx - 16, cy - 8, 9, 9);
        graphics.fillRect(cx + 7, cy - 8, 9, 9);
        graphics.fillStyle(this.enraged ? 0xff0000 : 0x111111, 1.0);
        graphics.fillRect(cx - 13, cy - 6, 4, 5);
        graphics.fillRect(cx + 10, cy - 6, 4, 5);

        // Orbiting particles around boss
        if (this.damageFlashTimer <= 0) {
            graphics.fillStyle(accentHex, 0.7);
            for (let i = 0; i < 5; i++) {
                const a = t / 500 + i * Math.PI * 0.4;
                graphics.fillCircle(cx + Math.cos(a) * this.width * 0.68, cy + Math.sin(a) * this.height * 0.62, 3);
            }
        }
        
        graphics.restore();
    }
}
