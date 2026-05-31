import NukeBomb from './NukeBomb.js';
import Phaser from 'phaser';
import Projectile from './Projectile.js';

export default class PowerUp {
    constructor(scene, x, y) {
        this.scene = scene; 
        this.x = x; 
        this.y = y; 
        this.width = 32; 
        this.height = 32; 
        this.active = true; 
        this.hoverOffset = 0; 
        this.particles = []; 
        const types = [ 
            'SHOTGUN', 'HEAL', 'INVINCIBLE', 'FREEZE', 'METEOR', 'VAMPIRE', 'MACHINEGUN', 'NUKE', 
            'KAMEHAMEHA', 'GENKIDAMA', 'ZA_WARUDO', 'GETSUGA', 'RASENGAN', 'HADOUKEN', 'FALCON_PUNCH', 
            'NINJA', 'GIANT_PAINT', 'AMATERASU', 'SHINRA_TENSEI', 'MUSHROOM', 'STAR', 
            'BLACK_HOLE', 'PRISM', 'GLITCH', 'BRIMSTONE', 'MOMS_KNIFE', 'SPOON_BENDER', 
            'CHIDORI', 'FULL_COUNTER', 'TORNADO', 'FEATHER', 'HASTE', 'MARTYRDOM', 'CHAIN_LIGHTNING', 
            'EARTHQUAKE', 'FLIGHT', 'ORBITAL_STRIKE', 'BATS', 'GLACIER',
            'GRAVITY_MINE', 'DASH_STRIKE', 'HEALING_FIELD', 'PAINT_RAIL',
            'PURPURA_HUECO', 'CRUEL_SUN', 'TAIYOKEN', 'MAKANKOSAPPO'
        ]; 
        this.type = types[Math.floor(Math.random() * types.length)]; 

        // Set distinct visual color based on the type category for easy identification
        if (this.type === 'HEAL' || this.type === 'HEALING_FIELD') {
            this.color = '#00ff66'; // Green for healing
        } else if (['SHOTGUN', 'MACHINEGUN'].includes(this.type)) {
            this.color = '#ffa500'; // Orange for weapons
        } else if (['INVINCIBLE', 'STAR', 'HASTE', 'FLIGHT', 'VAMPIRE', 'NINJA', 'FEATHER', 'GLITCH', 'MUSHROOM'].includes(this.type)) {
            this.color = '#00f3ff'; // Cyan/blue for passive buffs
        } else if (this.type === 'FREEZE' || this.type === 'GLACIER') {
            this.color = '#aaffff'; // Light Ice blue for freeze
        } else if (['NUKE', 'BLACK_HOLE', 'BRIMSTONE', 'AMATERASU', 'SHINRA_TENSEI', 'GRAVITY_MINE'].includes(this.type)) {
            this.color = '#ff3300'; // Red/dark red for heavy / explosive / gravity spells
        } else {
            this.color = '#da00ff'; // Purple/magenta for active/attack spells
        }
    }
    
    update(time) { 
        this.hoverOffset = Math.sin(time / 200) * 8; 
        if (Math.random() < 0.3) {
            this.particles.push({ 
                x: this.x + Math.random() * this.width, 
                y: this.y + Math.random() * this.height, 
                vx: (Math.random() - 0.5) * 2, 
                vy: (Math.random() - 0.5) * 2 - 1, 
                life: 1 
            }); 
        }
        this.particles.forEach(p => { 
            p.x += p.vx * 1.0; 
            p.y += p.vy * 1.0; 
            p.life -= 0.03 * 1.0; 
        }); 
        this.particles = this.particles.filter(p => p.life > 0); 
        
        for (let p of this.scene.players) { 
            let actualW = p.scaleMultiplier ? p.width * p.scaleMultiplier : p.width; 
            let actualH = p.scaleMultiplier ? p.height * p.scaleMultiplier : p.height; 
            if (this.active && this.x < p.x + actualW && this.x + this.width > p.x && this.y + this.hoverOffset < p.y + actualH && this.y + this.hoverOffset + this.height > p.y && !p.exploded) { 
                this.applyEffect(p); 
                this.scene.playSfx('pickup'); 
                this.active = false; 
            } 
        } 
    }
    
    applyEffect(player) {
        let msg = ""; 
        let isPassive = false;
        if (this.type === 'HEAL') { 
            player.health = Math.min(player.maxHealth, player.health + 100); 
            msg = "CURACION EXTREMA"; 
        } else if (this.type === 'FREEZE') { 
            this.scene.getOpposingTeam(player.id).forEach(pl => { pl.freezeTimer = 5000; }); 
            msg = "MAGIA DE HIELO"; 
        } else if (this.type === 'METEOR') { 
            for(let i = 0; i < 20; i++) { 
                this.scene.projectiles.push(new Projectile(this.scene, Math.random() * this.scene.worldWidth, -100 - (Math.random() * 300), (Math.random() - 0.5) * 6, 10 + Math.random() * 5, player.baseColor, player.id, true)); 
            } 
            msg = "LLUVIA DE METEOROS"; 
        } else if (this.type === 'NUKE') { 
            let targetX = this.scene.cameras.main.scrollX + (this.scene.canvasWidth / 2) / this.scene.cameras.main.zoom; 
            targetX = Math.max(100, Math.min(targetX, this.scene.worldWidth - 100)); 
            this.scene.nukes.push(new NukeBomb(this.scene, targetX, this.scene.cameras.main.scrollY + (this.scene.canvasHeight / 2) / this.scene.cameras.main.zoom, player.baseColor, player.id)); 
            msg = "MISIL NUCLEAR"; 
        } else if (['SHOTGUN', 'MACHINEGUN'].includes(this.type)) {
            player.weapon = {
                type: this.type,
                ammo: this.type === 'SHOTGUN' ? 12 : 90
            };
            msg = `${this.type} EQUIPADA`;
        } else if (['INVINCIBLE', 'VAMPIRE', 'NINJA', 'GIANT_PAINT', 'MUSHROOM', 'STAR', 'GLITCH', 'SPOON_BENDER', 'FEATHER', 'HASTE', 'MARTYRDOM', 'FLIGHT'].includes(this.type)) { 
            let dur = ['MUSHROOM', 'STAR', 'SPOON_BENDER', 'FEATHER', 'FLIGHT'].includes(this.type) ? 12000 : 8000; 
            player.passives[this.type] = dur; 
            isPassive = true; 
            msg = this.type; 
        } else {
            let fusionMap = { 
                'HADOUKEN+RASENGAN': 'GOUKAKYU', 'KAMEHAMEHA+GETSUGA': 'CERO', 'BRIMSTONE+AMATERASU': 'RAYO_INFERNAL', 
                'CHIDORI+FALCON_PUNCH': 'RAIJU', 'TORNADO+AMATERASU': 'FIRE_TORNADO', 'MOMS_KNIFE+RASENGAN': 'RASENSHURIKEN', 
                'MOMS_KNIFE+BRIMSTONE': 'BLOOD_SCYTHE', 'SHINRA_TENSEI+BLACK_HOLE': 'PLANETARY_DEVASTATION', 
                'ZA_WARUDO+MOMS_KNIFE': 'THOUSAND_KNIVES', 'HADOUKEN+TORNADO': 'HURRICANE_FLAME', 'GENKIDAMA+SHINRA_TENSEI': 'SUPERNOVA', 
                'ZA_WARUDO+CHIDORI': 'TIME_SKIP', 'PRISM+KAMEHAMEHA': 'MASTER_SPARK', 'CHAIN_LIGHTNING+KAMEHAMEHA': 'RAILGUN', 
                'TORNADO+CHAIN_LIGHTNING': 'THUNDERSTORM', 'EARTHQUAKE+METEOR': 'METEOR_STRIKE', 'BRIMSTONE+SHINRA_TENSEI': 'BLOOD_EXPLOSION', 
                'HADOUKEN+CHIDORI': 'PLASMA_BALL', 'ORBITAL_STRIKE+BLACK_HOLE': 'LASER_SINGULARITY', 'GLACIER+TORNADO': 'BLIZZARD', 
                'RASENGAN+CHIDORI': 'KIRIN', 'BATS+MOMS_KNIFE': 'VAMPIRIC_KNIVES', 'SHINRA_TENSEI+GLACIER': 'ABSOLUTE_ZERO', 
                'BATS+AMATERASU': 'INFERNAL_BATS', 'GLACIER+METEOR': 'HAILSTORM', 'BLACK_HOLE+KAMEHAMEHA': 'VOID_BEAM', 
                'BATS+TORNADO': 'BAT_SWARM', 'HADOUKEN+SHINRA_TENSEI': 'SUN_BURST', 'GETSUGA+MOMS_KNIFE': 'CROSS_SLASH', 
                'CHAIN_LIGHTNING+CHIDORI': 'THUNDER_GOD', 'RASENGAN+AMATERASU': 'BLACK_RASENGAN', 'GETSUGA+CHIDORI': 'LIGHTNING_SLASH', 
                'MOMS_KNIFE+TORNADO': 'BLADE_STORM', 'FALCON_PUNCH+METEOR': 'COMET_PUNCH', 'BATS+METEOR': 'METEOR_SWARM',
                'GRAVITY_MINE+ORBITAL_STRIKE': 'GRAVITY_WELL', 'PAINT_RAIL+CHAIN_LIGHTNING': 'TESLA_RAIL',
                'FULL_COUNTER+PRISM': 'MIRROR_DOME', 'HEALING_FIELD+STAR': 'SANCTUARY', 'DASH_STRIKE+CHIDORI': 'LIGHTNING_DASH'
            };
            let fused = false;
            for (let i = 0; i < player.spells.length; i++) { 
                let pair1 = player.spells[i] + '+' + this.type; 
                let pair2 = this.type + '+' + player.spells[i]; 
                if (fusionMap[pair1]) { 
                    player.spells[i] = fusionMap[pair1]; 
                    msg = `FUSION: ${fusionMap[pair1].replace('_', ' ')}`; 
                    fused = true; 
                    break; 
                } 
                if (fusionMap[pair2]) { 
                    player.spells[i] = fusionMap[pair2]; 
                    msg = `FUSION: ${fusionMap[pair2].replace('_', ' ')}`; 
                    fused = true; 
                    break; 
                } 
            }
            if (!fused) { 
                if (player.spells.length < 5) { 
                    player.spells.push(this.type); 
                    player.selectedSpellIndex = player.spells.length - 1; 
                } else { 
                    player.spells[player.selectedSpellIndex] = this.type; 
                } 
                msg = this.type.replace('_', ' ') + " OBTENIDO"; 
            }
        } 
        this.scene.updateHUD(); 
        const msgKind = ['SHOTGUN', 'MACHINEGUN'].includes(this.type) ? '[ARMA]' : (isPassive ? '[PASIVA]' : (this.type==='HEAL'||this.type==='FREEZE'||this.type==='METEOR'||this.type==='NUKE'?'[INSTANT]':'[ACTIVA]'));
        this.scene.showPowerupMsg(`${msgKind} ${msg}`, player.baseColor);
    }
    
    render(graphics) {
        const ctx = graphics.context;
        if (!ctx) return; 
        this.particles.forEach(p => { 
            ctx.globalAlpha = p.life; 
            ctx.fillStyle = '#fff'; 
            ctx.beginPath(); 
            ctx.arc(p.x, p.y + this.hoverOffset, 2, 0, Math.PI * 2); 
            ctx.fill(); 
        }); 
        ctx.globalAlpha = 1; 
        ctx.fillStyle = this.color || '#ffee00'; 
        ctx.shadowBlur = 25 + Math.sin(Date.now() / 150) * 15; 
        ctx.shadowColor = this.color || '#ffee00'; 
        ctx.save(); 
        ctx.translate(this.x + this.width/2, this.y + this.height/2 + this.hoverOffset); 
        ctx.rotate(Math.sin(Date.now() / 500) * 0.2); 
        ctx.beginPath(); 
        ctx.moveTo(0, -this.height/2); 
        ctx.lineTo(this.width/2, 0); 
        ctx.lineTo(0, this.height/2); 
        ctx.lineTo(-this.width/2, 0); 
        ctx.closePath(); 
        ctx.fill(); 
        ctx.strokeStyle = '#ffffff'; 
        ctx.lineWidth = 2; 
        ctx.stroke(); 
        ctx.shadowBlur = 0; 
        ctx.fillStyle = '#000000'; 
        const puIcon = (this.scene.spellIcons && this.scene.spellIcons[this.type]) || 'SP';
        ctx.font = puIcon.length > 3 ? 'bold 9px Courier New' : 'bold 12px Courier New'; 
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle'; 
        ctx.fillText(puIcon, 0, 0); 
        ctx.restore(); 
    }
}
