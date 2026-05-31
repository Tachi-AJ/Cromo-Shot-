import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Platform from '../entities/Platform.js';
import PaintParticle from '../entities/PaintParticle.js';
import Projectile from '../entities/Projectile.js';
import PowerUp from '../entities/PowerUp.js';
import NukeBomb from '../entities/NukeBomb.js';
import VisualEffect from '../entities/VisualEffect.js';
import Enemy from '../entities/Enemy.js';
import Portal from '../entities/Portal.js';

const spellIcons = {
    'KAMEHAMEHA':'KA','GENKIDAMA':'GEN','ZA_WARUDO':'STOP','GETSUGA':'GET','RASENGAN':'RAS','AMATERASU':'AMA','SHINRA_TENSEI':'SHIN',
    'HADOUKEN':'HAD','FALCON_PUNCH':'FAL', 'MUSHROOM': 'BIG', 'STAR': 'STAR', 'SHOTGUN':'SG','INVINCIBLE':'INV','VAMPIRE':'VAMP',
    'MACHINEGUN':'MG','NINJA':'NIN','GIANT_PAINT':'PAINT', 'BLACK_HOLE':'BH', 'PRISM':'PRI', 'GLITCH':'GLI', 'BRIMSTONE':'BRI',
    'MOMS_KNIFE':'KNF', 'SPOON_BENDER':'SPOON', 'CHIDORI':'CHI', 'FULL_COUNTER':'FCNT', 'TORNADO':'TOR', 'FEATHER':'FEA', 'HASTE':'SPD', 'MARTYRDOM':'BOMB',
    'GOUKAKYU':'FIRE', 'CERO':'CERO', 'RAYO_INFERNAL':'HELL', 'RAIJU':'RAI', 'FIRE_TORNADO':'FTOR', 'RASENSHURIKEN':'RSHU',
    'BLOOD_SCYTHE':'SCY', 'PLANETARY_DEVASTATION':'PLAN', 'THOUSAND_KNIVES':'1000K', 'HURRICANE_FLAME':'HURR',
    'SUPERNOVA':'NOVA', 'TIME_SKIP':'SKIP', 'MASTER_SPARK':'MSPK', 'CHAIN_LIGHTNING':'CL', 'EARTHQUAKE':'QUAKE', 'FLIGHT':'FLY',
    'RAILGUN':'RAIL', 'THUNDERSTORM':'TSTM', 'METEOR_STRIKE':'MSTR', 'BLOOD_EXPLOSION':'BEXP', 'PLASMA_BALL':'PLAS',
    'ORBITAL_STRIKE': 'ORB', 'BATS': 'BAT', 'GLACIER': 'ICE', 'LASER_SINGULARITY': 'LSNG', 'BLIZZARD': 'BLIZ', 
    'KIRIN': 'KIR', 'VAMPIRIC_KNIVES': 'VKNF', 'ABSOLUTE_ZERO': 'ZERO', 'INFERNAL_BATS': 'IBAT',
    'HAILSTORM': 'HAIL', 'VOID_BEAM': 'VOID', 'BAT_SWARM': 'SWARM', 'SUN_BURST': 'SUN', 'CROSS_SLASH': 'XSL', 'THUNDER_GOD': 'TGOD',
    'BLACK_RASENGAN': 'BRAS', 'LIGHTNING_SLASH': 'LSL', 'BLADE_STORM': 'BST', 'COMET_PUNCH': 'COM', 'METEOR_SWARM': 'MSWM',
    'GRAVITY_MINE': 'GRAV', 'DASH_STRIKE': 'DASH', 'HEALING_FIELD': 'HEAL', 'PAINT_RAIL': 'PRAIL',
    'PURPURA_HUECO': 'PURP', 'CRUEL_SUN': 'SUN+', 'TAIYOKEN': 'FLASH', 'MAKANKOSAPPO': 'DRILL',
    'VOID_RAY': 'VOID+', 'SUPER_GENKIDAMA': 'SGEN',
    'GRAVITY_WELL': 'GWELL', 'TESLA_RAIL': 'TES', 'MIRROR_DOME': 'DOME', 'SANCTUARY': 'SAN', 'LIGHTNING_DASH': 'LDASH'
};

class CanvasRenderLayer extends Phaser.GameObjects.Graphics {
    constructor(scene, depth) {
        super(scene);
        scene.add.existing(this);
        this.setDepth(depth);
    }

    renderCanvas(renderer, src, camera) {
        if (!src.visible || src.alpha <= 0) return;
        const ctx = renderer.gameContext;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Draw from a clean screen-space context. Phaser has already touched the
        // canvas renderer state here, so applying this transform without reset
        // makes canvas effects drift when the camera moves.
        const cx = camera.width / 2;
        const cy = camera.height / 2;
        ctx.translate(cx, cy);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-cx - camera.scrollX, -cy - camera.scrollY);

        // Wrap canvas context in a mock graphics object
        const mockGraphics = { context: ctx };

        // Draw portals
        if (src.scene.portals) {
            src.scene.portals.forEach(p => { if (p.active !== false) p.render(mockGraphics); });
        }

        // Draw powerups
        if (src.scene.powerups) {
            src.scene.powerups.forEach(pu => { if (pu.active !== false) pu.render(mockGraphics); });
        }

        // Draw projectiles
        if (src.scene.projectiles) {
            src.scene.projectiles.forEach(p => { if (p.active !== false) p.render(mockGraphics); });
        }

        // Draw nukes
        if (src.scene.nukes) {
            src.scene.nukes.forEach(n => { if (n.active !== false) n.render(mockGraphics); });
        }

        // Draw visual effects
        if (src.scene.visualEffects) {
            src.scene.visualEffects.forEach(v => { if (v.active !== false) v.render(mockGraphics); });
        }

        // Draw Waifus!
        if (src.scene.animeModeActive || document.getElementById('anime-mode')?.checked) {
            src.scene.players.forEach(p => {
                if (p && p.health > 0 && !p.exploded) {
                    const actualW = p.width * p.scaleMultiplier;
                    const wx = p.x + (p.facingRight ? -48 : actualW + 48);
                    const wy = p.y - 34 + Math.sin(p.companionOffset || 0) * 10;
                    src.scene.drawWaifuCompanion(ctx, wx, wy, p.baseColor, p.facingRight);
                }
            });
        }

        // Draw foreground bamboo poles
        if (src.scene.mapType === 'dojo' && src.scene.bambooPoles) {
            src.scene.bambooPoles.forEach(pole => pole.draw(ctx));
        }

        ctx.restore();

        // Draw Map Preview Overlay if active! (Screen space drawing!)
        if (src.scene.gameState === 'PREVIEW') {
            src.scene.drawMapPreviewFrame(ctx);
        }
    }

    renderWebGL(renderer, src, camera) {}
}

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.spellIcons = spellIcons;
    }

    init(data) {
        // Retrieve selected map and game mode from starting arguments
        this.selectedMap = data.mapType || 'classic';
        this.mapType = this.selectedMap;
        if (this.selectedMap === 'random') {
            const maps = ['classic', 'grand_arena', 'floating_islands', 'towers', 'pit', 'hell', 'volcano', 'dojo', 'factory', 'garden', 'pirate_bay', 'choke_point', 'sky_temple'];
            this.mapType = maps[Math.floor(Math.random() * maps.length)];
        }
        this.gameMode = data.gameMode || 'pve';
        this.winsLimit = data.winsLimit || 3;
        this.playerConfigs = data.playerConfigs || [
            { id: 1, active: true, color: '#00f3ff', inputType: 'KB1' }
        ];
        this.playerScores = data.playerScores || {};
        this.floatingTexts = [];

        // Core physics layout constants
        this.worldWidth = 1600;
        this.worldHeight = 900;

        // Custom camera scrolling/zoom parameters
        this.customCamera = { x: 0, y: 0, scale: 1 };
        this.shakeTime = 0;
        this.shakeMagnitude = 0;
        this.flashAlpha = 0;

        this.players = [];
        this.platforms = [];
        this.paintParticles = [];
        this.projectiles = [];
        this.powerups = [];
        this.nukes = [];
        this.visualEffects = [];
        this.powerupTimer = 0;
        this.spellIcons = spellIcons;
        this.cinematic = { active: false, timer: 0, text: '', color: '#fff' };
        
        // Stars background cache
        this.stars = [];
        this.nebulas = [];

        // PvE / Horda states
        this.enemies = [];
        this.portals = [];
        this.bossActive = false;
        this.activeBossRef = null;
        this.currentWave = 1;
        this.enemiesToSpawn = 6;
        this.enemiesDefeated = 0;
        this.enemyTimer = 0;
        
        this.gameState = 'PREVIEW';
        this.deadPlayerFocus = null;
        this.isRoundTransitioning = false;
        this.draftQueue = [];
        this.draftOptions = [];
        this.selectedCardIndex = 0;
        this.draftKeyPressed = false;
        this.ambientParticles = [];
        this.roguelikeMutator = null;
        this.roguelikeSpawnRateMultiplier = 1;
        this.roguelikePowerupMultiplier = 1;
    }

    create() {
        // Setup default screen dimension references
        this.canvasWidth = this.scale.width || this.sys.game.config.width;
        this.canvasHeight = this.scale.height || this.sys.game.config.height;
        this.scale.on('resize', (gameSize) => {
            this.canvasWidth = gameSize.width;
            this.canvasHeight = gameSize.height;
            this.resizeCinematicOverlay();
        });

        window.selectUpgradeCard = (idx) => {
            if (this.gameState !== 'DRAFT') return;
            const currentPlayer = this.draftQueue[0];
            if (!currentPlayer) return;
            const opt = this.draftOptions[idx];
            if (opt) {
                opt.effect(currentPlayer);
                this.playSfx('pickup');
                this.draftQueue.shift();
                this.processNextDraft();
            }
        };

        // Dojo map wind properties
        this.windTimer = 8000 + Math.random() * 5000;
        this.windDuration = 0;
        this.windDirection = 0;
        this.windForce = 0;

        // Setup custom keyboards mappings
        this.keysP1 = this.input.keyboard.addKeys({
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            c: Phaser.Input.Keyboard.KeyCodes.C,
            f: Phaser.Input.Keyboard.KeyCodes.F,
            g: Phaser.Input.Keyboard.KeyCodes.G,
            q: Phaser.Input.Keyboard.KeyCodes.Q,
            e: Phaser.Input.Keyboard.KeyCodes.E
        });

        this.keysP2 = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            v: Phaser.Input.Keyboard.KeyCodes.V,
            num0: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ZERO,
            num1: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE,
            num2: Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO,
            num3: Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE
        });

        // Initialize maps
        this.initMap(this.mapType);

        // Spawn players in safe positions
        const activeConfigs = this.playerConfigs.filter(cfg => cfg.active);
        const spawns = this.getSafeSpawnPositions(activeConfigs.length);
        activeConfigs.forEach((cfg, idx) => {
            const spawn = spawns[idx];
            const p = new Player(this, cfg.id, spawn.x, spawn.y, cfg.color, cfg.inputType);
            this.players.push(p);
        });

        // Create cosmic stars stars array
        for (let i = 0; i < 70; i++) {
            this.stars.push({
                seedX: Math.sin(i * 4312.44) * 0.5 + 0.5,
                seedY: Math.cos(i * 9821.55) * 0.5 + 0.5,
                seedSize: Math.sin(i * 1234.56) * 0.5 + 0.5
            });
        }

        // Initialize Phaser render objects
        this.bgGraphics = this.add.graphics();
        this.platformGraphics = this.add.graphics();
        this.particleGraphics = this.add.graphics();
        this.playerGraphics = this.add.graphics();
        this.projectileGraphics = this.add.graphics();
        this.canvasRenderLayer = new CanvasRenderLayer(this, 100);

        // Cinematic Letterbox Overlay
        this.cinematicOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(1000).setVisible(false);
        this.cinematicTopBar = this.add.graphics();
        this.cinematicTopBar.fillStyle(0x000000, 0.85);
        this.cinematicTopBar.fillRect(0, 0, this.canvasWidth, 100);
        this.cinematicBottomBar = this.add.graphics();
        this.cinematicBottomBar.fillStyle(0x000000, 0.85);
        this.cinematicBottomBar.fillRect(0, this.canvasHeight - 100, this.canvasWidth, 100);

        this.cinematicText = this.add.text(640, 360, '', {
            fontFamily: 'Courier New',
            fontSize: '55px',
            fontStyle: 'italic bold',
            color: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);
        this.cinematicText.setPosition(this.canvasWidth / 2, this.canvasHeight / 2);

        this.cinematicOverlay.add([this.cinematicTopBar, this.cinematicBottomBar, this.cinematicText]);

        // Audio synthesizer wrapper triggers sfx
        this.sfxContext = this.registry.get('sfxContext') || null;

        // Check if waifu companions are checked in lobby settings
        this.animeModeActive = document.getElementById('anime-mode')?.checked || false;

        // Hook game pause screen triggers
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.onclick = () => this.togglePause();
        }

        // Hide all HUDs first, then show active ones
        for (let i = 1; i <= 6; i++) {
            const hudEl = document.getElementById(`hud-p${i}`);
            if (hudEl) hudEl.style.display = 'none';
        }
        this.players.forEach(p => {
            const hudEl = document.getElementById(`hud-p${p.id}`);
            if (hudEl) hudEl.style.display = 'flex';
        });

        // Hide screens/overlays
        const bossHud = document.getElementById('boss-hud');
        if (bossHud) bossHud.style.display = 'none';
        const roundOverlay = document.getElementById('round-overlay');
        if (roundOverlay) roundOverlay.style.display = 'none';
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) gameOverScreen.style.display = 'none';
        const hud = document.getElementById('hud');
        if (hud) hud.style.display = 'block';

        // Setup wave details in PvE mode
        if (this.gameMode === 'pve' || this.gameMode === 'roguelike') {
            this.currentWave = 1;
            this.enemiesToSpawn = 6 + (this.currentWave * 4);
            this.enemiesDefeated = 0;
            this.bossActive = false;
            this.activeBossRef = null;
            this.enemyTimer = 0;
            if (this.gameMode === 'roguelike') {
                this.rollRoguelikeMutator();
            }

            const waveText = document.getElementById('wave-text');
            if (waveText) {
                waveText.style.display = 'block';
                waveText.textContent = this.getWaveStatusText();
            }
        } else {
            const waveText = document.getElementById('wave-text');
            if (waveText) waveText.style.display = 'none';
        }
 
        // Trigger starting entry visual
        this.flashAlpha = 0.55;

        // Start map preview before actual gameplay
        this.beginRoundPreview();
    }

    /**
     * Map platform programmatically based on select option
     */
    initMap(type) {
        this.platforms = [];
        this.bambooPoles = [];
        const blockW = 12;

        // Map dimensions
        if (type === 'grand_arena') { this.worldWidth = 2400; this.worldHeight = 1200; }
        else if (type === 'floating_islands') { this.worldWidth = 2000; this.worldHeight = 1500; }
        else if (type === 'factory') { this.worldWidth = 2100; this.worldHeight = 1100; }
        else if (type === 'pirate_bay') { this.worldWidth = 1900; this.worldHeight = 1050; }
        else if (type === 'choke_point') { this.worldWidth = 1800; this.worldHeight = 980; }
        else if (type === 'sky_temple') { this.worldWidth = 1900; this.worldHeight = 1120; }
        else if (type === 'volcano') { this.worldWidth = 2400; this.worldHeight = 1400; }
        else { this.worldWidth = 1600; this.worldHeight = 900; }

        // Bottom floor platform generation
        const noFloor = ['pit', 'volcano', 'hell', 'floating_islands', 'pirate_bay', 'sky_temple'].includes(type);
        if (!noFloor) {
            for (let i = 0; i < this.worldWidth / blockW; i++) {
                this.platforms.push(new Platform(i * blockW, this.worldHeight - 40, blockW, 40));
            }
        } else if (type === 'pit') {
            // Perfectly symmetric pit floor: left ends at 516, right starts at 1080 (divisible by 12)
            for (let i = 0; i < 516 / blockW; i++) this.platforms.push(new Platform(i * blockW, this.worldHeight - 40, blockW, 40));
            for (let i = 1080 / blockW; i < this.worldWidth / blockW; i++) this.platforms.push(new Platform(i * blockW, this.worldHeight - 40, blockW, 40));
        } else if (type === 'volcano') {
            for (let i = 0; i < (this.worldWidth / 2 - 100) / blockW; i++) this.platforms.push(new Platform(i * blockW, this.worldHeight - 40, blockW, 40));
            for (let i = (this.worldWidth / 2 + 100) / blockW; i < this.worldWidth / blockW; i++) this.platforms.push(new Platform(i * blockW, this.worldHeight - 40, blockW, 40));
        } else if (type === 'hell') {
            // Structured lava abyss floor (divisible by 12)
            for (let i = 0; i < 504 / blockW; i++) this.platforms.push(new Platform(i * blockW, this.worldHeight - 40, blockW, 40));
            for (let i = 1096 / blockW; i < this.worldWidth / blockW; i++) this.platforms.push(new Platform(i * blockW, this.worldHeight - 40, blockW, 40));
        }

        // Layouts setup
        if (type === 'classic') {
            this.createPlatformSegment(200, 700, 20); this.createPlatformSegment(700, 750, 15); this.createPlatformSegment(1200, 700, 20);
            this.createPlatformSegment(450, 550, 15); this.createPlatformSegment(1000, 550, 15);
            this.createPlatformSegment(250, 350, 10); this.createPlatformSegment(1250, 350, 10);
            this.createWallSegment(780, 750, 25); this.createWallSegment(400, 550, 15); this.createWallSegment(1200, 550, 15);
            this.createPlatformSegment(50, 400, 10); this.createPlatformSegment(1450, 400, 10);
        } else if (type === 'grand_arena') {
            this.createPlatformSegment(300, 1000, 30); this.createPlatformSegment(1000, 1000, 30); this.createPlatformSegment(1700, 1000, 30);
            this.createPlatformSegment(600, 800, 20); this.createPlatformSegment(1400, 800, 20);
            this.createPlatformSegment(300, 600, 20); this.createPlatformSegment(1700, 600, 20);
            this.createWallSegment(1200, 1000, 30); this.createWallSegment(600, 600, 20); this.createWallSegment(1800, 600, 20);
            this.createPlatformSegment(1000, 400, 30);
        } else if (type === 'floating_islands') {
            for (let i = 0; i < 40; i++) {
                this.createPlatformSegment(
                    Math.random() * (this.worldWidth - 200) + 100,
                    Math.random() * (this.worldHeight - 200) + 100,
                    Math.floor(Math.random() * 8) + 5
                );
            }
        } else if (type === 'towers') {
            this.createWallSegment(300, 800, 50); this.createWallSegment(700, 800, 60); this.createWallSegment(1100, 800, 50);
            this.createPlatformSegment(150, 600, 10); this.createPlatformSegment(400, 500, 10); this.createPlatformSegment(800, 400, 10);
            this.createPlatformSegment(1200, 600, 10); this.createPlatformSegment(550, 200, 10); this.createPlatformSegment(950, 200, 10);
        } else if (type === 'pit') {
            // Pit map walls perfectly symmetric
            this.createWallSegment(500, 860, 40);
            this.createWallSegment(1075, 860, 40);
            this.createPlatformSegment(600, 600, 8);
            this.createPlatformSegment(904, 600, 8);
            this.createPlatformSegment(740, 400, 10);
            this.createPlatformSegment(200, 300, 15);
            this.createPlatformSegment(1220, 300, 15);
        } else if (type === 'hell') {
            // Structured rock bridges and columns in Hell map
            this.createPlatformSegment(420, this.worldHeight - 260, 20); // Left bridge segment
            this.createPlatformSegment(940, this.worldHeight - 260, 20); // Right bridge segment
            this.createWallSegment(420, this.worldHeight - 40, 18); // Support column
            this.createWallSegment(1155, this.worldHeight - 40, 18);
            this.createPlatformSegment(180, this.worldHeight - 480, 15); // Floating left
            this.createPlatformSegment(this.worldWidth - 360, this.worldHeight - 480, 15); // Floating right
            this.createPlatformSegment(680, this.worldHeight - 480, 20); // Center floating
            this.createPlatformSegment(480, this.worldHeight - 680, 12); // High left
            this.createPlatformSegment(this.worldWidth - 624, this.worldHeight - 680, 12); // High right
            this.createPlatformSegment(740, this.worldHeight - 820, 10); // Highest center
        } else if (type === 'volcano') {
            // Volcano layout: worldWidth = 2400, worldHeight = 1400
            this.createPlatformSegment(200, 1100, 25);
            this.createPlatformSegment(400, 950, 20);
            this.createPlatformSegment(600, 800, 15);
            
            this.createPlatformSegment(2000, 1100, 25);
            this.createPlatformSegment(1800, 950, 20);
            this.createPlatformSegment(1650, 800, 15);

            this.createPlatformSegment(900, 1150, 15);
            this.createPlatformSegment(1300, 1150, 15);
            this.createPlatformSegment(1100, 1000, 18);
            
            this.createPlatformSegment(150, 600, 18);
            this.createPlatformSegment(2070, 600, 18);
            
            this.createPlatformSegment(450, 480, 25);
            this.createPlatformSegment(1450, 480, 25);
            
            this.createPlatformSegment(800, 680, 20);
            this.createPlatformSegment(1400, 680, 20);
            this.createPlatformSegment(1100, 530, 18);

            this.createPlatformSegment(750, 320, 22);
            this.createPlatformSegment(1350, 320, 22);
            this.createPlatformSegment(1050, 180, 26);

            this.createWallSegment(500, 750, 20);
            this.createWallSegment(1900, 750, 20);
            this.createWallSegment(1200, 400, 15);
        } else if (type === 'dojo') {
            this.createPlatformSegment(260, 700, 18); this.createPlatformSegment(1080, 700, 18);
            this.createPlatformSegment(560, 575, 16); this.createPlatformSegment(850, 575, 16);
            this.createPlatformSegment(330, 420, 14); this.createPlatformSegment(1030, 420, 14);
            this.createWallSegment(180, 820, 20); this.createWallSegment(1420, 820, 20);
            this.createPlatformSegment(690, 290, 18);

            // Initialize bamboo poles
            this.bambooPoles = [];
            const platformPoles = [
                { x: 320, y: 700 },
                { x: 420, y: 700 },
                { x: 1140, y: 700 },
                { x: 1240, y: 700 },
                { x: 620, y: 575 },
                { x: 720, y: 575 },
                { x: 910, y: 575 },
                { x: 1010, y: 575 },
                { x: 780, y: 290 },
                // Floor positions
                { x: 100, y: 860 },
                { x: 220, y: 860 },
                { x: 500, y: 860 },
                { x: 1100, y: 860 },
                { x: 1350, y: 860 },
                { x: 1500, y: 860 }
            ];
            platformPoles.forEach(p => {
                const height = 110 + Math.random() * 60;
                const thickness = 6 + Math.random() * 4;
                this.bambooPoles.push(new BambooPole(p.x, p.y, height, thickness));
            });
        } else if (type === 'factory') {
            this.createPlatformSegment(220, 900, 30); this.createPlatformSegment(820, 900, 36); this.createPlatformSegment(1500, 900, 30);
            
            const belt1 = this.createPlatformSegment(420, 720, 20);
            belt1.conveyorForce = 0.35;

            this.createPlatformSegment(980, 700, 18);

            const belt2 = this.createPlatformSegment(1450, 680, 22);
            belt2.conveyorForce = -0.35;

            this.createPlatformSegment(180, 520, 16);

            const belt3 = this.createPlatformSegment(720, 500, 22);
            belt3.conveyorForce = 0.35;

            this.createPlatformSegment(1320, 480, 28);
            this.createWallSegment(620, 900, 34); this.createWallSegment(1260, 900, 34); this.createWallSegment(1780, 900, 28);
            this.createPlatformSegment(960, 280, 18);
        } else if (type === 'garden') {
            this.createPlatformSegment(120, 720, 22); this.createPlatformSegment(1180, 720, 22);
            this.createPlatformSegment(360, 610, 12); this.createPlatformSegment(680, 520, 16); this.createPlatformSegment(1010, 610, 12);
            this.createPlatformSegment(200, 420, 14); this.createPlatformSegment(1230, 420, 14);
            this.createWallSegment(520, 840, 18); this.createWallSegment(1050, 840, 18);
            this.createPlatformSegment(700, 300, 16);
        } else if (type === 'pirate_bay') {
            for (let i = 0; i < (this.worldWidth * 0.28) / blockW; i++) {
                this.platforms.push(new Platform(i * blockW, this.worldHeight - 55, blockW, 55));
            }
            for (let i = (this.worldWidth * 0.72) / blockW; i < this.worldWidth / blockW; i++) {
                this.platforms.push(new Platform(i * blockW, this.worldHeight - 55, blockW, 55));
            }
            this.createPlatformSegment(540, 820, 22); this.createPlatformSegment(1040, 820, 22);
            this.createPlatformSegment(340, 650, 14); this.createPlatformSegment(1360, 650, 14);
            this.createPlatformSegment(720, 520, 26); this.createPlatformSegment(760, 330, 20);
            this.createWallSegment(650, 820, 16); this.createWallSegment(1230, 820, 16);
        } else if (type === 'choke_point') {
            // Split tower walls to create a 108px high pass-through window/gap on each side, and open a walk-through base gap
            this.createWallSegment(780, this.worldHeight - 120, 14);
            this.createWallSegment(780, this.worldHeight - 388, 16);
            this.createWallSegment(995, this.worldHeight - 120, 14);
            this.createWallSegment(995, this.worldHeight - 388, 16);
            this.createPlatformSegment(806, this.worldHeight - 300, 16);
            this.createPlatformSegment(806, this.worldHeight - 520, 16);
            this.createPlatformSegment(130, this.worldHeight - 190, 30);
            this.createPlatformSegment(this.worldWidth - 500, this.worldHeight - 190, 30);
            this.createPlatformSegment(250, 540, 18);
            this.createPlatformSegment(this.worldWidth - 470, 540, 18);
            this.createPlatformSegment(760, 310, 26);
        } else if (type === 'sky_temple') {
            // Central main temple platform (suspended)
            this.createPlatformSegment(this.worldWidth / 2 - 250, this.worldHeight - 280, 42); 
            
            // Side helper platforms
            this.createPlatformSegment(this.worldWidth / 2 - 580, this.worldHeight - 420, 20); 
            this.createPlatformSegment(this.worldWidth / 2 + 340, this.worldHeight - 420, 20); 
            
            // High temple arch/top platform
            this.createPlatformSegment(this.worldWidth / 2 - 180, this.worldHeight - 620, 30); 
            
            // Columns/walls supporting the temple
            this.createWallSegment(this.worldWidth / 2 - 230, this.worldHeight - 280, 15); 
            this.createWallSegment(this.worldWidth / 2 + 205, this.worldHeight - 280, 15); 
            
            // Additional high side platforms
            this.createPlatformSegment(120, this.worldHeight - 680, 22); 
            this.createPlatformSegment(this.worldWidth - 380, this.worldHeight - 680, 22); 
            
            // Bottom rescue ledges near the abyss
            this.createPlatformSegment(this.worldWidth / 2 - 800, this.worldHeight - 160, 12); 
            this.createPlatformSegment(this.worldWidth / 2 + 660, this.worldHeight - 160, 12);
        } else {
            this.createPlatformSegment(400, 600, 30);
            this.createPlatformSegment(1000, 600, 30);
            this.createWallSegment(800, 600, 15);
        }
    }

    createPlatformSegment(x, y, blocks) {
        const plat = new Platform(x, y, blocks * 12, 25);
        this.platforms.push(plat);
        return plat;
    }

    createWallSegment(x, y, blocks) {
        const plat = new Platform(x, y - (blocks * 12) + 12, 25, blocks * 12);
        this.platforms.push(plat);
        return plat;
    }

    getKillPlaneY() {
        let baseKillY = this.worldHeight - 5;
        if (this.mapType === 'volcano') {
            baseKillY -= (this.volcanoLavaRise || 0);
        }
        return baseKillY;
    }

    /**
     * Synthesizer SFX retro triggers
     */
    playSfx(type) {
        if (this.sys.game.sound.mute) return;
        
        // Simple synthetic sound play fallback using standard Phaser Audio Context if audio elements are not loaded
        try {
            const ctx = this.sys.game.sound.context;
            if (!ctx || ctx.state === 'suspended') return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'jump') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'hit') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.linearRampToValueAtTime(40, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'splat') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'explosion') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(90, now);
                osc.frequency.linearRampToValueAtTime(10, now + 0.4);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
            } else if (type === 'preview') {
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(380, now);
                osc1.frequency.exponentialRampToValueAtTime(760, now + 0.22);
                gain1.gain.setValueAtTime(0.055, now);
                gain1.gain.linearRampToValueAtTime(0.001, now + 0.22);
                osc1.start(now);
                osc1.stop(now + 0.22);

                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(760, now + 0.08);
                osc2.frequency.exponentialRampToValueAtTime(1150, now + 0.08 + 0.22);
                gain2.gain.setValueAtTime(0.035, now + 0.08);
                gain2.gain.linearRampToValueAtTime(0.001, now + 0.08 + 0.22);
                osc2.start(now + 0.08);
                osc2.stop(now + 0.08 + 0.22);
            }
        } catch(e) {
            console.error("SFX Synth Error", e);
        }
    }

    /**
     * Pauses or Resumes match execution
     */
    togglePause() {
        const pauseScreen = document.getElementById('pause-screen');
        if (this.scene.isPaused()) {
            this.scene.resume();
            if (pauseScreen) pauseScreen.style.display = 'none';
        } else {
            this.scene.pause();
            if (pauseScreen) pauseScreen.style.display = 'flex';
        }
    }

    /**
     * Main update loops
     */
    update(time, delta) {
        if (this.gameState === 'DRAFT') {
            const currentPlayer = this.draftQueue[0];
            if (!currentPlayer) return;

            let inputs = { left: false, right: false, jump: false, shoot: false, action: false };
            if (currentPlayer.inputType === 'KB1') {
                inputs.left = this.keysP1.a.isDown;
                inputs.right = this.keysP1.d.isDown;
                inputs.jump = this.keysP1.w.isDown;
                inputs.shoot = this.keysP1.f.isDown;
                inputs.action = this.keysP1.g.isDown;
            } else if (currentPlayer.inputType === 'KB2') {
                inputs.left = this.keysP2.left.isDown;
                inputs.right = this.keysP2.right.isDown;
                inputs.jump = this.keysP2.up.isDown;
                inputs.shoot = this.keysP2.num0.isDown;
                inputs.action = this.keysP2.num1.isDown;
            } else if (currentPlayer.inputType.startsWith('GP')) {
                let gpIdx = parseInt(currentPlayer.inputType.replace('GP', ''));
                let pad = this.input.gamepad ? this.input.gamepad.getPad(gpIdx) : null;
                if (pad) {
                    let leftStickX = pad.leftStick ? pad.leftStick.x : 0;
                    inputs.left = pad.left || leftStickX < -0.4;
                    inputs.right = pad.right || leftStickX > 0.4;
                    inputs.jump = pad.A || (pad.buttons[0] && pad.buttons[0].pressed);
                    inputs.shoot = pad.X || (pad.buttons[2] && pad.buttons[2].pressed);
                    inputs.action = pad.B || pad.Y || (pad.buttons[1] && pad.buttons[1].pressed);
                }
            } else if (currentPlayer.inputType === 'TOUCH') {
                const ts = window.touchState || {};
                inputs.left = ts.left;
                inputs.right = ts.right;
                inputs.jump = ts.jump;
                inputs.shoot = ts.shoot;
                inputs.action = ts.action;
            }

            if (inputs.left) {
                if (!this.draftKeyPressed) {
                    this.selectedCardIndex = (this.selectedCardIndex - 1 + 3) % 3;
                    this.updateDraftUI();
                    this.draftKeyPressed = true;
                }
            } else if (inputs.right) {
                if (!this.draftKeyPressed) {
                    this.selectedCardIndex = (this.selectedCardIndex + 1) % 3;
                    this.updateDraftUI();
                    this.draftKeyPressed = true;
                }
            } else if (inputs.jump || inputs.shoot || inputs.action) {
                if (!this.draftKeyPressed) {
                    const opt = this.draftOptions[this.selectedCardIndex];
                    if (opt) {
                        opt.effect(currentPlayer);
                        this.playSfx('pickup');
                        this.draftQueue.shift();
                        this.draftKeyPressed = true;
                        this.time.delayedCall(300, () => this.processNextDraft());
                    }
                }
            } else {
                this.draftKeyPressed = false;
            }
            return;
        }

        if (this.gameState !== 'PLAYING' && this.gameState !== 'DEATH_ANIM') return;
        if (this.scene.isPaused()) return;

        // Slow motion (0.25x speed) during death animation
        let effectiveDelta = delta;
        if (this.gameState === 'DEATH_ANIM') {
            effectiveDelta = delta * 0.25;
        }

        // Delta normalized relative to 60fps (~16.6ms)
        const dtScale = effectiveDelta / 16.666;

        // Update moving platforms (slowed/frozen during Za Warudo time stop)
        const timeStopActive = this.players.some(p => p.timeStopTimer > 0);
        this.platforms.forEach(p => p.update(timeStopActive ? effectiveDelta * 0.05 : effectiveDelta));

        // Update Dojo wind gusts and bamboo physics
        if (this.mapType === 'dojo') {
            this.updateDojoWind(effectiveDelta);
            if (this.bambooPoles) {
                this.bambooPoles.forEach(pole => {
                    pole.update(
                        this.windDuration > 0 ? this.windDirection : 0,
                        this.windDuration > 0 ? this.windForce : 0,
                        this.players,
                        this.enemies || [],
                        dtScale
                    );
                });
            }
        }

        // Update Map Eruptions/Hazards
        if (this.mapType === 'volcano') {
            this.updateVolcanoEruption(effectiveDelta);
        } else if (this.mapType === 'hell') {
            this.updateHellHazards(effectiveDelta);
        } else if (this.mapType === 'factory') {
            this.updateFactoryDrips(effectiveDelta);
        }

        // Spawn waifu heart/sparkle particles
        if (this.gameState === 'PLAYING' && (this.animeModeActive || document.getElementById('anime-mode')?.checked)) {
            this.players.forEach(p => {
                if (p.health > 0 && !p.exploded && Math.random() < 0.04) {
                    const actualW = p.width * p.scaleMultiplier;
                    const wx = p.x + (p.facingRight ? -48 : actualW + 48);
                    const wy = p.y - 34 + Math.sin(p.companionOffset || 0) * 10;
                    
                    const isHeart = Math.random() < 0.5;
                    this.ambientParticles.push({
                        x: wx + (Math.random() - 0.5) * 15,
                        y: wy + (Math.random() - 0.5) * 15,
                        vx: (Math.random() - 0.5) * 0.6,
                        vy: -0.5 - Math.random() * 0.8,
                        color: isHeart ? '#ff3366' : '#ffff55',
                        size: 3 + Math.random() * 3,
                        alpha: 1.0,
                        life: 1.0,
                        decay: 0.012 + Math.random() * 0.008,
                        isHeart: isHeart,
                        isSparkle: !isHeart
                    });
                }
            });
        }

        // Process inputs for all active players
        this.players.forEach(p => {
            let inputs = {
                left: false, right: false, jump: false, down: false,
                shoot: false, action: false, cyclePrev: false, cycleNext: false,
                ragdoll: false
            };

            if (p.inputType === 'KB1') {
                inputs.left = this.keysP1.a.isDown;
                inputs.right = this.keysP1.d.isDown;
                inputs.jump = this.keysP1.w.isDown;
                inputs.down = this.keysP1.s.isDown;
                inputs.shoot = this.keysP1.f.isDown;
                inputs.action = this.keysP1.g.isDown;
                inputs.cyclePrev = this.keysP1.q.isDown;
                inputs.cycleNext = this.keysP1.e.isDown;
                inputs.ragdoll = Phaser.Input.Keyboard.JustDown(this.keysP1.c);
            } else if (p.inputType === 'KB2') {
                inputs.left = this.keysP2.left.isDown;
                inputs.right = this.keysP2.right.isDown;
                inputs.jump = this.keysP2.up.isDown;
                inputs.down = this.keysP2.down.isDown;
                inputs.shoot = this.keysP2.num0.isDown;
                inputs.action = this.keysP2.num1.isDown;
                inputs.cyclePrev = this.keysP2.num2.isDown;
                inputs.cycleNext = this.keysP2.num3.isDown;
                inputs.ragdoll = Phaser.Input.Keyboard.JustDown(this.keysP2.v);
            } else if (p.inputType.startsWith('GP')) {
                let gpIdx = parseInt(p.inputType.replace('GP', ''));
                let pad = this.input.gamepad ? this.input.gamepad.getPad(gpIdx) : null;
                if (pad) {
                    let leftStickX = pad.leftStick ? pad.leftStick.x : 0;
                    let leftStickY = pad.leftStick ? pad.leftStick.y : 0;
                    
                    inputs.left = pad.left || leftStickX < -0.4 || (pad.axes[0] && pad.axes[0].value < -0.4);
                    inputs.right = pad.right || leftStickX > 0.4 || (pad.axes[0] && pad.axes[0].value > 0.4);
                    inputs.down = pad.down || leftStickY > 0.5 || (pad.axes[1] && pad.axes[1].value > 0.5);
                    
                    inputs.jump = pad.A || (pad.buttons[0] && pad.buttons[0].pressed);
                    inputs.shoot = pad.X || (pad.buttons[2] && pad.buttons[2].pressed) || (pad.R2 > 0.2) || (pad.buttons[7] && pad.buttons[7].pressed);
                    inputs.action = pad.B || pad.Y || (pad.buttons[1] && pad.buttons[1].pressed) || (pad.buttons[3] && pad.buttons[3].pressed);
                    inputs.cycleNext = pad.R1 || (pad.buttons[5] && pad.buttons[5].pressed);
                    inputs.cyclePrev = pad.L1 || (pad.buttons[4] && pad.buttons[4].pressed);
                    
                    let ragdollPressedThisFrame = (pad.L2 > 0.25) || (pad.buttons[6] && pad.buttons[6].pressed) || (pad.buttons[10] && pad.buttons[10].pressed);
                    inputs.ragdoll = ragdollPressedThisFrame && !p.ragdollPressedLastFrame;
                    p.ragdollPressedLastFrame = ragdollPressedThisFrame;
                }
            } else if (p.inputType === 'TOUCH') {
                const ts = window.touchState || {};
                inputs.left = ts.left || false;
                inputs.right = ts.right || false;
                inputs.jump = ts.jump || false;
                inputs.down = ts.down || false;
                inputs.shoot = ts.shoot || false;
                inputs.action = ts.action || false;
                inputs.cyclePrev = ts.cyclePrev || false;
                inputs.cycleNext = ts.cycle || ts.cycleNext || false;
                inputs.ragdoll = ts.ragdoll || false;
            }

            p.update(
                dtScale,
                inputs,
                this.platforms,
                this.worldWidth,
                this.worldHeight,
                () => this.getKillPlaneY(),
                (type) => this.playSfx(type),
                this.gameMode
            );

            // Spawn footsteps particles randomly when walking on floor
            if (p.onGround && Math.abs(p.vx) > 0.4 && Math.random() < 0.12) {
                this.spawnPaintSplats(p.x + p.width / 2, p.y + p.height, p.baseColor, 1);
            }
            // Spawn fire trail if passive active
            if (p.onGround && Math.abs(p.vx) > 0.5 && p.passives['FIRE_TRAIL'] && Math.random() < 0.22) {
                let flame = new Projectile(this, p.x + p.width / 2 - 8, p.y + p.height - 15, 0, 0, '#111', p.id);
                flame.isAmaterasu = true;
                flame.amaterasuTimer = 1400;
                this.projectiles.push(flame);
            }
            // Spawn wall slide particles
            if (p.touchingWall !== 0 && p.vy > 0 && Math.random() < 0.28) {
                const wallX = p.touchingWall === 1 ? p.x + p.width : p.x;
                this.spawnPaintSplats(wallX, p.y + p.height * 0.65, p.baseColor, 1);
            }
        });

        // 2. PLAYER-TO-PLAYER COLLISIONS
        for (let i = 0; i < this.players.length; i++) {
            const p1 = this.players[i];
            if (p1.health <= 0 || p1.exploded) continue;

            const p1W = p1.width * p1.scaleMultiplier;
            const p1H = p1.height * p1.scaleMultiplier;

            for (let j = i + 1; j < this.players.length; j++) {
                const p2 = this.players[j];
                if (p2.health <= 0 || p2.exploded) continue;

                const p2W = p2.width * p2.scaleMultiplier;
                const p2H = p2.height * p2.scaleMultiplier;

                const overlapsX = p1.x < p2.x + p2W && p1.x + p1W > p2.x;
                const overlapsY = p1.y < p2.y + p2H && p1.y + p1H > p2.y;

                if (overlapsX && overlapsY) {
                    if (p1.isRagdoll && !p2.isRagdoll) {
                        const kickDirX = p2.vx !== 0 ? Math.sign(p2.vx) : (p2.facingRight ? 1 : -1);
                        const kickDirY = p2.vy < 0 ? -1 : 0;
                        p1.vx = kickDirX * 15;
                        p1.vy = -7.5 + kickDirY * 5.5;
                        p1.ragdollSpin += kickDirX * 0.12;
                        p1.onGround = false;
                        this.playSfx('hit');
                        this.spawnPaintSplats(p1.x + p1W/2, p1.y + p1H/2, p1.baseColor, 5);
                    } else if (!p1.isRagdoll && p2.isRagdoll) {
                        const kickDirX = p1.vx !== 0 ? Math.sign(p1.vx) : (p1.facingRight ? 1 : -1);
                        const kickDirY = p1.vy < 0 ? -1 : 0;
                        p2.vx = kickDirX * 15;
                        p2.vy = -7.5 + kickDirY * 5.5;
                        p2.ragdollSpin += kickDirX * 0.12;
                        p2.onGround = false;
                        this.playSfx('hit');
                        this.spawnPaintSplats(p2.x + p2W/2, p2.y + p2H/2, p2.baseColor, 5);
                    } else if (p1.isRagdoll && p2.isRagdoll) {
                        const dx = (p1.x + p1W/2) - (p2.x + p2W/2);
                        const dy = (p1.y + p1H/2) - (p2.y + p2H/2);
                        const angle = Math.atan2(dy, dx) || 0;
                        const force = 11;
                        p1.vx = Math.cos(angle) * force;
                        p1.vy = Math.sin(angle) * force - 3;
                        p1.onGround = false;
                        p2.vx = -Math.cos(angle) * force;
                        p2.vy = -Math.sin(angle) * force - 3;
                        p2.onGround = false;
                        this.playSfx('hit');
                        this.spawnPaintSplats(p1.x + p1W/2, p1.y + p1H/2, p1.baseColor, 3);
                        this.spawnPaintSplats(p2.x + p2W/2, p2.y + p2H/2, p2.baseColor, 3);
                    }
                }
            }
        }

        // 2b. PLAYER-TO-ENEMY COLLISIONS
        if (this.gameMode === 'pve' || this.gameMode === 'roguelike') {
            for (let p of this.players) {
                if (p.health <= 0 || p.exploded) continue;
                const pW = p.width * p.scaleMultiplier;
                const pH = p.height * p.scaleMultiplier;

                for (let e of this.enemies) {
                    if (e.health <= 0 || e.exploded) continue;
                    
                    const overlapsX = p.x < e.x + e.width && p.x + pW > e.x;
                    const overlapsY = p.y < e.y + e.height && p.y + pH > e.y;

                    if (overlapsX && overlapsY) {
                        if (p.isRagdoll) {
                            const speed = Math.hypot(p.vx, p.vy);
                            if (speed > 6) {
                                const damageAmount = Math.floor(speed * 4);
                                this.dealDamage(e, damageAmount, p);
                                
                                const angle = Math.atan2((p.y + pH/2) - (e.y + e.height/2), (p.x + pW/2) - (e.x + e.width/2));
                                p.vx = Math.cos(angle) * speed * 0.8;
                                p.vy = Math.sin(angle) * speed * 0.8 - 2.5;
                                p.onGround = false;
                                p.ragdollSpin += Math.sign(p.vx) * 0.15;
                                
                                this.playSfx('hit');
                                this.spawnPaintSplats(e.x + e.width/2, e.y + e.height/2, e.color, 8);
                                this.spawnPaintSplats(p.x + pW/2, p.y + pH/2, p.baseColor, 8);
                            } else {
                                const kickDirX = e.vx !== 0 ? Math.sign(e.vx) : (e.x + e.width/2 < p.x + pW/2 ? 1 : -1);
                                p.vx = kickDirX * 12;
                                p.vy = -6;
                                p.ragdollSpin += kickDirX * 0.1;
                                p.onGround = false;
                                
                                p.takeDamage(15, false, e, (type) => this.playSfx(type));
                                this.playSfx('hit');
                                this.spawnPaintSplats(p.x + pW/2, p.y + pH/2, p.baseColor, 4);
                            }
                        } else {
                            if (p.invulnTimer <= 0) {
                                let contactDmg = 25;
                                if (e.type === 'TANK') contactDmg = 45;
                                else if (e.type === 'FAST') contactDmg = 18;
                                else if (e.type === 'BOMBER') {
                                    contactDmg = 22;
                                    if (e.bombFuseTimer === 0) e.bombFuseTimer = 1;
                                } else if (e.isBoss) contactDmg = 50;

                                p.takeDamage(contactDmg, false, e, (type) => this.playSfx(type));
                                
                                const dirX = p.x + pW/2 > e.x + e.width/2 ? 1 : -1;
                                p.vx = dirX * 10;
                                p.vy = -5.5;
                                p.onGround = false;
                                
                                this.playSfx('hit');
                                this.spawnPaintSplats(p.x + pW/2, p.y + pH/2, p.baseColor, 5);
                            }
                        }
                    }
                }
            }
        }

        // Update portals
        if (this.gameMode === 'pve' || this.gameMode === 'roguelike') {
            this.portals = this.portals.filter(p => p.active);
            this.portals.forEach(p => p.update(dtScale));

            // Update enemies
            this.enemies = this.enemies.filter(e => e.health > 0);
            this.enemies.forEach(e => e.update(dtScale));
        }

        // Spawn and update ambient particles based on active map
        if (this.gameState === 'PLAYING' || this.gameState === 'DEATH_ANIM') {
            const dt = delta / 16.666;
            if (Math.random() < 0.18) {
                if (this.mapType === 'hell' || this.mapType === 'volcano') {
                    this.ambientParticles.push({
                        x: Math.random() * this.worldWidth,
                        y: this.worldHeight + 20,
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: -2 - Math.random() * 2,
                        color: this.mapType === 'hell' ? '#ff3300' : '#ffa500',
                        size: 2 + Math.random() * 3,
                        alpha: 1.0,
                        life: 1.0,
                        decay: 0.005 + Math.random() * 0.005
                    });
                } else if (this.mapType === 'dojo') {
                    this.ambientParticles.push({
                        x: Math.random() * this.worldWidth,
                        y: -20,
                        vx: -1.0 - Math.random() * 1.5,
                        vy: 1.5 + Math.random() * 1.5,
                        color: '#ffb7c5',
                        size: 3 + Math.random() * 4,
                        alpha: 0.8,
                        life: 1.0,
                        decay: 0.003
                    });
                } else if (this.mapType === 'garden' || this.mapType === 'floating_islands') {
                    this.ambientParticles.push({
                        x: Math.random() * this.worldWidth,
                        y: -20,
                        vx: -1.5 - Math.random() * 2.0,
                        vy: 1.0 + Math.random() * 1.5,
                        color: this.mapType === 'garden' ? '#32cd32' : '#98fb98',
                        size: 4 + Math.random() * 3,
                        alpha: 0.8,
                        life: 1.0,
                        decay: 0.003
                    });
                } else if (this.mapType === 'pirate_bay') {
                    this.ambientParticles.push({
                        x: Math.random() * this.worldWidth,
                        y: this.worldHeight - 40,
                        vx: (Math.random() - 0.5) * 1.0,
                        vy: -1.0 - Math.random() * 1.5,
                        color: '#ffffff',
                        size: 1.5 + Math.random() * 2.5,
                        alpha: 0.5,
                        life: 1.0,
                        decay: 0.006,
                        isBubble: true
                    });
                } else if (this.mapType === 'pit') {
                    this.ambientParticles.push({
                        x: Math.random() * this.worldWidth,
                        y: this.worldHeight - 30,
                        vx: (Math.random() - 0.5) * 2.0,
                        vy: -2.5 - Math.random() * 3.0,
                        color: '#39ff14',
                        size: 2.0 + Math.random() * 2.0,
                        alpha: 0.9,
                        life: 1.0,
                        decay: 0.008
                    });
                }
            }

            this.ambientParticles.forEach(p => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                if (this.mapType === 'dojo' || this.mapType === 'garden' || this.mapType === 'floating_islands') {
                    p.vx += Math.sin(Date.now() / 200 + p.x) * 0.05;
                }
                p.life -= p.decay * dt;
                p.alpha = Math.max(0, p.life);
            });
            this.ambientParticles = this.ambientParticles.filter(p => p.life > 0);
            if (this.ambientParticles.length > 100) {
                this.ambientParticles.splice(0, this.ambientParticles.length - 100);
            }
        }

        // Update paint particles
        this.paintParticles = this.paintParticles.filter(part => part.life > 0);
        this.paintParticles.forEach(part => {
            part.update(dtScale, this.platforms, this.worldHeight, () => this.getKillPlaneY());
        });

        // Update projectiles
        this.projectiles = this.projectiles.filter(p => p.active);
        const perfMode = window.cromoPerfSettings?.mode || 'normal';
        const projectileCap = perfMode === 'potato' ? 90 : (perfMode === 'mobile' ? 110 : 150);
        if (this.projectiles.length > projectileCap) {
            this.projectiles.splice(0, this.projectiles.length - projectileCap);
        }
        this.checkProjectileSynergies();
        this.projectiles.forEach(p => p.update(dtScale));
        this.projectiles = this.projectiles.filter(p => p.active);

        // Update powerups
        this.powerups = this.powerups.filter(pu => pu.active);
        this.powerups.forEach(pu => pu.update(time));

        // Update nukes
        this.nukes = this.nukes.filter(n => n.active);
        this.nukes.forEach(n => n.update(dtScale));

        // Update visual effects
        this.visualEffects = this.visualEffects.filter(v => v.active);
        this.visualEffects.forEach(v => v.update(dtScale));

        // Spawning powerups periodic timer
        this.powerupTimer += delta;
        const pSpawnTime = (this.gameMode === 'pvp' ? 8000 : (this.gameMode === 'roguelike' ? 4300 : 3500)) / (this.roguelikePowerupMultiplier || 1);
        const pMax = this.gameMode === 'pvp' ? 4 : (this.gameMode === 'roguelike' ? 7 : 10);
        if (this.powerupTimer > pSpawnTime) {
            this.powerupTimer = 0;
            const isScarcity = this.gameMode === 'roguelike' && this.roguelikeMutator?.key === 'scarcity';
            if (this.powerups.length < pMax && !isScarcity) {
                this.spawnPowerup();
            }
        }

        // PvE Wave management
        if (this.gameMode === 'pve' || this.gameMode === 'roguelike') {
            const waveText = document.getElementById('wave-text');
            const bossHud = document.getElementById('boss-hud');
            const bossName = document.getElementById('boss-name');
            const bossHpFill = document.getElementById('boss-hp-fill');

            if (!this.bossActive && this.enemiesToSpawn <= 0 && this.enemies.length === 0 && this.portals.length === 0) {
                this.bossActive = true; 
                const bossSpawn = this.getRandomPlatformPoint(80);
                this.portals.push(new Portal(this, bossSpawn.x, bossSpawn.y, this.currentWave, true));
                if (waveText) {
                    waveText.textContent = `RONDA ${this.currentWave} - PREPARANDO JEFE`;
                }
            } else if (!this.bossActive && this.enemiesToSpawn > 0) {
                this.enemyTimer += delta;
                let spawnRate = Math.max(700, (3600 - (this.currentWave * 120)) * (this.roguelikeSpawnRateMultiplier || 1)); 
                const maxEnemies = (this.gameMode === 'roguelike' && this.roguelikeMutator?.key === 'swarm') ? 28 : 15;
                if (this.enemyTimer > spawnRate && this.enemies.length < maxEnemies && this.portals.length < 4) {
                    this.enemyTimer = 0; 
                    const enemySpawn = this.getRandomPlatformPoint(44);
                    this.portals.push(new Portal(this, enemySpawn.x, enemySpawn.y, this.currentWave));
                    this.enemiesToSpawn--;
                }
                if (waveText) {
                    waveText.textContent = this.getWaveStatusText();
                }
            } else if (this.bossActive) {
                if (this.activeBossRef && this.activeBossRef.health > 0) {
                    if (bossHud) bossHud.style.display = 'block';
                    if (bossName) {
                        bossName.textContent = this.activeBossRef.displayName || 'JEFE DE LA HORDA';
                        bossName.style.color = this.activeBossRef.color;
                        bossName.style.borderColor = this.activeBossRef.color;
                    }
                    if (bossHpFill) {
                        bossHpFill.style.width = `${(this.activeBossRef.health / this.activeBossRef.maxHealth) * 100}%`;
                        bossHpFill.style.background = `linear-gradient(90deg, ${this.activeBossRef.color}, ${this.activeBossRef.accentColor || '#ffaa00'})`;
                    }
                } else if (this.enemies.length === 0 && this.portals.length === 0) { 
                    this.bossActive = false; 
                    this.activeBossRef = null; 
                    if (bossHud) bossHud.style.display = 'none';
                    this.reviveAndRewardPlayers();

                    if (this.gameMode === 'roguelike') {
                        this.startUpgradeDraftSequence();
                    } else {
                        this.currentWave++; 
                        this.enemiesToSpawn = 6 + (this.currentWave * 4); 
                        for (let reward = 0; reward < Math.min(3, 1 + Math.floor(this.currentWave / 3)); reward++) {
                            this.spawnPowerup();
                        }
                        this.triggerCinematic(`OLEADA ${this.currentWave}`, '#00f3ff');
                    }
                }
            }
        }

        // Cinematic update
        if (this.cinematic.active) {
            this.cinematic.timer -= delta;
            let ox = (Math.random() - 0.5) * 5;
            let oy = (Math.random() - 0.5) * 5;
            this.cinematicText.setPosition(this.canvasWidth / 2 + ox, this.canvasHeight / 2 + oy);
            
            if (this.cinematic.timer <= 0) {
                this.cinematic.active = false;
                this.cinematicOverlay.setVisible(false);
            }
        }

        // Update floating texts
        this.floatingTexts = this.floatingTexts.filter(ft => ft.update(dtScale));

        // Sync HUD interface
        this.updateHUD();

        // Camera calculations (following center of players)
        this.updateCameraScroll(dtScale);

        // Graphics renderings
        this.renderBackdrop();
        this.renderPlatforms();
        this.renderParticles();
        this.renderPlayers();

        // Screen flashes check
        if (this.flashAlpha > 0) {
            this.flashAlpha -= 0.02 * dtScale;
        }

        // Check player death / game over conditions
        if (this.gameState === 'PLAYING') {
            let alivePlayers = this.players.filter(p => p.health > 0 && !p.exploded);
            if (this.gameMode === 'pvp') {
                if (alivePlayers.length <= 1) {
                    this.gameState = 'DEATH_ANIM';
                    const deadPlayers = this.players.filter(p => p.health <= 0 || p.exploded);
                    this.deadPlayerFocus = deadPlayers.length > 0 ? deadPlayers[0] : this.players[0];
                    this.time.delayedCall(4500, () => this.finishPvPRound());
                }
            } else {
                if (alivePlayers.length === 0) {
                    this.gameState = 'DEATH_ANIM';
                    const deadPlayers = this.players.filter(p => p.exploded);
                    this.deadPlayerFocus = deadPlayers.length > 0 ? deadPlayers[0] : this.players[0];
                    this.time.delayedCall(5000, () => this.endGame());
                }
            }
        }
    }

    /**
     * Bounces paint droplets outward
     */
    spawnPaintSplats(x, y, color, count, isDeathExplosion = false) {
        for (let i = 0; i < count; i++) {
            this.paintParticles.push(new PaintParticle(x, y, color, isDeathExplosion));
        }
    }

    /**
     * Compute multi-player follow center and apply zoom scaling
     */
    updateCameraScroll(dt) {
        let centerX, centerY, targetScale;

        if (this.gameState === 'DEATH_ANIM' && this.deadPlayerFocus) {
            centerX = this.deadPlayerFocus.x + (this.deadPlayerFocus.scaleMultiplier ? this.deadPlayerFocus.width * this.deadPlayerFocus.scaleMultiplier : this.deadPlayerFocus.width) / 2;
            centerY = this.deadPlayerFocus.y + (this.deadPlayerFocus.scaleMultiplier ? this.deadPlayerFocus.height * this.deadPlayerFocus.scaleMultiplier : this.deadPlayerFocus.height) / 2;
            centerY = Math.min(this.getKillPlaneY() - 220, centerY);
            targetScale = 2.0;
        } else {
            let activeP = this.players.filter(p => p.health > 0 && !p.exploded);
            if (activeP.length === 0) activeP = this.players;

            let minX = Math.min(...activeP.map(p => p.x));
            let maxX = Math.max(...activeP.map(p => p.x + p.width));
            let minY = Math.min(...activeP.map(p => p.y));
            let maxY = Math.max(...activeP.map(p => p.y + p.height));

            // Include boss and nearby enemies in the bounding box so the camera shows them
            if (this.activeBossRef && this.activeBossRef.health > 0) {
                minX = Math.min(minX, this.activeBossRef.x);
                maxX = Math.max(maxX, this.activeBossRef.x + (this.activeBossRef.width || 80));
                minY = Math.min(minY, this.activeBossRef.y);
                maxY = Math.max(maxY, this.activeBossRef.y + (this.activeBossRef.height || 80));
            }

            // Include close enemies (within reasonable range) for better framing
            if (this.enemies && this.enemies.length > 0) {
                const avgPX = (minX + maxX) / 2;
                const avgPY = (minY + maxY) / 2;
                this.enemies.forEach(e => {
                    if (e.health > 0) {
                        const dist = Math.abs(e.x - avgPX) + Math.abs(e.y - avgPY);
                        if (dist < 800) { // Only include nearby enemies
                            minX = Math.min(minX, e.x);
                            maxX = Math.max(maxX, e.x + (e.width || 40));
                            minY = Math.min(minY, e.y);
                            maxY = Math.max(maxY, e.y + (e.height || 40));
                        }
                    }
                });
            }

            centerX = (minX + maxX) / 2;
            centerY = (minY + maxY) / 2;

            // Wider padding so players don't feel crunched at edges
            const padH = 700;
            const padV = 500;
            let distW = Math.max(maxX - minX + padH, this.canvasWidth);
            let distH = Math.max(maxY - minY + padV, this.canvasHeight);

            targetScale = Math.min(this.canvasWidth / distW, this.canvasHeight / distH);
            // Allow zooming out more (0.3) so larger maps are visible
            targetScale = Math.max(0.3, Math.min(1.15, targetScale));
        }

        // Faster smoothing for responsive camera feel
        const smoothFactor = 0.15;
        this.customCamera.scale += (targetScale - this.customCamera.scale) * smoothFactor * dt;
        if (this.gameState === 'DEATH_ANIM') {
            this.customCamera.scale = Math.min(2.0, this.customCamera.scale + (2.0 - this.customCamera.scale) * 0.06 * dt);
        }
        
        let targetX = centerX - (this.canvasWidth / 2) / this.customCamera.scale;
        let targetY = centerY - (this.canvasHeight / 2) / this.customCamera.scale;

        // Dynamic vertical bounds based on players' actual coordinates to support high altitudes
        let minBoundY = 0;
        let maxBoundY = this.worldHeight;
        
        let activeP = this.players.filter(p => p.health > 0 && !p.exploded);
        if (activeP.length > 0) {
            const minPlayerY = Math.min(...activeP.map(p => p.y));
            const maxPlayerY = Math.max(...activeP.map(p => p.y + (p.scaleMultiplier ? p.height * p.scaleMultiplier : p.height)));
            minBoundY = Math.min(-300, minPlayerY - 100);
            maxBoundY = Math.max(this.worldHeight, maxPlayerY + 100);
        }

        // Clamp to world bounds
        const viewW = this.canvasWidth / this.customCamera.scale;
        const viewH = this.canvasHeight / this.customCamera.scale;
        targetX = viewW >= this.worldWidth ? (this.worldWidth - viewW) / 2 : Math.max(0, Math.min(targetX, this.worldWidth - viewW));
        targetY = viewH >= (maxBoundY - minBoundY) ? (minBoundY + maxBoundY - viewH) / 2 : Math.max(minBoundY, Math.min(targetY, maxBoundY - viewH));

        this.customCamera.x += (targetX - this.customCamera.x) * smoothFactor * dt;
        this.customCamera.y += (targetY - this.customCamera.y) * smoothFactor * dt;

        // Apply to Phaser Camera
        let finalCamX = this.customCamera.x;
        let finalCamY = this.customCamera.y;
        
        if (this.shakeTime > 0) {
            finalCamX += (Math.random() - 0.5) * this.shakeMagnitude;
            finalCamY += (Math.random() - 0.5) * this.shakeMagnitude;
            this.shakeTime -= dt;
        }

        this.cameras.main.setScroll(finalCamX, finalCamY);
        this.cameras.main.setZoom(this.customCamera.scale);
    }

    /**
     * Render stars parallax, arena neon edge bounds, and retro grids
     */
    renderBackdrop() {
        const graphics = this.bgGraphics;
        graphics.clear();

        // Map visual identities setup
        let bgColor = 0x090816;
        let gridColor = 0x00f3ff;
        let gridAlpha = 0.04;
        let boundaryColor = 0x00f3ff;
        let hazardColor = 0x2dff96;
        let hazardTopColor = 0x50ffbe;
        let isSkyMap = false;

        if (this.mapType === 'grand_arena') {
            bgColor = 0x0c061a;
            gridColor = 0xff5500;
            gridAlpha = 0.06;
            boundaryColor = 0xff5500;
            hazardColor = 0xa000ff;
            hazardTopColor = 0xda70d6;
        } else if (this.mapType === 'floating_islands') {
            bgColor = 0x87ceeb;
            gridColor = 0xffffff;
            gridAlpha = 0.06;
            boundaryColor = 0xffffff;
            hazardColor = 0x4a90e2;
            hazardTopColor = 0x88bbff;
            isSkyMap = true;
        } else if (this.mapType === 'towers') {
            bgColor = 0x02000a;
            gridColor = 0x00f3ff;
            gridAlpha = 0.05;
            boundaryColor = 0x00f3ff;
            hazardColor = 0xff0055;
            hazardTopColor = 0xff66bb;
        } else if (this.mapType === 'pit') {
            bgColor = 0x121410;
            gridColor = 0x39ff14;
            gridAlpha = 0.04;
            boundaryColor = 0x39ff14;
            hazardColor = 0x39ff14;
            hazardTopColor = 0x7cff6b;
        } else if (this.mapType === 'hell') {
            bgColor = 0x1b0404;
            gridColor = 0xff0000;
            gridAlpha = 0.05;
            boundaryColor = 0xff0000;
            hazardColor = 0xff2200;
            hazardTopColor = 0xff8800;
        } else if (this.mapType === 'volcano') {
            bgColor = 0x1e0a02;
            gridColor = 0xffa500;
            gridAlpha = 0.05;
            boundaryColor = 0xffa500;
            hazardColor = 0xffa500;
            hazardTopColor = 0xffcc00;
        } else if (this.mapType === 'dojo') {
            bgColor = 0x0a1a0d;
            gridColor = 0x00ff66;
            gridAlpha = 0.04;
            boundaryColor = 0x00ff66;
            hazardColor = 0x2e8b57;
            hazardTopColor = 0x3cb371;
        } else if (this.mapType === 'factory') {
            bgColor = 0x0a0c10;
            gridColor = 0xffee00;
            gridAlpha = 0.04;
            boundaryColor = 0xffee00;
            hazardColor = 0xda70d6;
            hazardTopColor = 0xff66ff;
        } else if (this.mapType === 'garden') {
            bgColor = 0x071f0d;
            gridColor = 0x00ff00;
            gridAlpha = 0.05;
            boundaryColor = 0x00ff00;
            hazardColor = 0x00ffcc;
            hazardTopColor = 0x66ffea;
        } else if (this.mapType === 'pirate_bay') {
            bgColor = 0x2c1630;
            gridColor = 0xff7f50;
            gridAlpha = 0.04;
            boundaryColor = 0xff7f50;
            hazardColor = 0x0044ff;
            hazardTopColor = 0x66aaff;
        } else if (this.mapType === 'choke_point') {
            bgColor = 0x0a0b1c;
            gridColor = 0x00ffff;
            gridAlpha = 0.05;
            boundaryColor = 0x00ffff;
            hazardColor = 0x00ffff;
            hazardTopColor = 0xaaffff;
        } else if (this.mapType === 'sky_temple') {
            bgColor = 0x0c152b;
            gridColor = 0xffaa00;
            gridAlpha = 0.05;
            boundaryColor = 0xffaa00;
            hazardColor = 0x0a152b;
            hazardTopColor = 0xff8800;
            isSkyMap = true;
        }

        // Apply Roguelike Mutator Atmosphere Tints
        if (this.gameMode === 'roguelike' && this.roguelikeMutator) {
            if (this.roguelikeMutator.key === 'overclock') {
                bgColor = 0x241d04;
                gridColor = 0xffff00;
            } else if (this.roguelikeMutator.key === 'low_gravity') {
                bgColor = 0x061e2a;
                gridColor = 0xaaffff;
            } else if (this.roguelikeMutator.key === 'scarcity') {
                bgColor = 0x0f0f10;
                gridColor = 0x5a5a5a;
            } else if (this.roguelikeMutator.key === 'swarm') {
                bgColor = 0x220522;
                gridColor = 0xff00cc;
            }
        }

        // 1. BACKFILL
        graphics.fillStyle(bgColor, 1.0);
        graphics.fillRect(this.customCamera.x, this.customCamera.y, this.canvasWidth / this.customCamera.scale, this.canvasHeight / this.customCamera.scale);

        // 2. PARALLAX BACKDROP DECORATIONS
        if (isSkyMap) {
            // Draw fluffy clouds drifting in the background for Sky maps
            graphics.fillStyle(0xffffff, 0.12);
            for (let i = 0; i < 8; i++) {
                const cloudX = ((i * 350) - this.customCamera.x * 0.3) % (this.worldWidth + 600) - 100;
                const cloudY = (150 + Math.sin(i * 45) * 80) - this.customCamera.y * 0.3;
                graphics.fillCircle(cloudX, cloudY, 80);
                graphics.fillCircle(cloudX - 40, cloudY + 20, 60);
                graphics.fillCircle(cloudX + 40, cloudY + 20, 60);
            }
        } else if (this.mapType === 'towers') {
            // Skyscraper silhouettes in background
            graphics.fillStyle(0x050410, 0.4);
            for (let i = 0; i < 15; i++) {
                const tW = 120 + Math.sin(i * 123) * 40;
                const tH = 300 + Math.cos(i * 456) * 150;
                const tX = ((i * 200) - this.customCamera.x * 0.2) % (this.worldWidth + 400) - 100;
                const tY = this.worldHeight - tH;
                graphics.fillRect(tX, tY, tW, tH);
                
                // Illuminated cyberpunk windows
                graphics.fillStyle(0x00f3ff, 0.20);
                for (let wy = tY + 40; wy < this.worldHeight - 20; wy += 45) {
                    for (let wx = tX + 20; wx < tX + tW - 20; wx += 30) {
                        if (Math.sin(wx * wy + i) > 0.1) {
                            graphics.fillRect(wx, wy, 6, 8);
                        }
                    }
                }
                graphics.fillStyle(0x050410, 0.4);
            }
        } else if (this.mapType === 'dojo') {
            // Draw background mountains behind pagoda
            const dY = this.worldHeight - 40 - this.customCamera.y * 0.10;
            graphics.fillStyle(0x06140b, 0.45); // Far away dark green silhouette
            graphics.beginPath();
            graphics.moveTo(-200 - this.customCamera.x * 0.05, dY);
            graphics.lineTo(200 - this.customCamera.x * 0.05, dY - 180);
            graphics.lineTo(600 - this.customCamera.x * 0.05, dY - 80);
            graphics.lineTo(1000 - this.customCamera.x * 0.05, dY - 250);
            graphics.lineTo(1500 - this.customCamera.x * 0.05, dY - 120);
            graphics.lineTo(2000 - this.customCamera.x * 0.05, dY - 300);
            graphics.lineTo(this.worldWidth + 200 - this.customCamera.x * 0.05, dY);
            graphics.closePath();
            graphics.fillPath();

            // Draw Dojo pagoda building silhouette
            const dX = (this.worldWidth / 2 - this.customCamera.x * 0.12);
            const pagodaY = this.worldHeight - 40 - this.customCamera.y * 0.12;
            graphics.fillStyle(0x0e2413, 0.6); // Medium parallax layer

            // Tier 1 Base
            graphics.fillRect(dX - 150, pagodaY - 20, 300, 20);
            // Tier 1 walls
            graphics.fillRect(dX - 100, pagodaY - 100, 200, 80);
            // Tier 1 roof (curved)
            graphics.beginPath();
            graphics.moveTo(dX - 130, pagodaY - 100);
            graphics.lineTo(dX + 130, pagodaY - 100);
            graphics.lineTo(dX + 110, pagodaY - 115);
            graphics.lineTo(dX - 110, pagodaY - 115);
            graphics.closePath();
            graphics.fillPath();

            // Tier 2 walls
            graphics.fillRect(dX - 70, pagodaY - 175, 140, 60);
            // Tier 2 roof
            graphics.beginPath();
            graphics.moveTo(dX - 95, pagodaY - 175);
            graphics.lineTo(dX + 95, pagodaY - 175);
            graphics.lineTo(dX + 80, pagodaY - 190);
            graphics.lineTo(dX - 80, pagodaY - 190);
            graphics.closePath();
            graphics.fillPath();

            // Tier 3 walls
            graphics.fillRect(dX - 40, pagodaY - 240, 80, 50);
            // Tier 3 roof
            graphics.beginPath();
            graphics.moveTo(dX - 60, pagodaY - 240);
            graphics.lineTo(dX + 60, pagodaY - 240);
            graphics.lineTo(dX + 45, pagodaY - 255);
            graphics.lineTo(dX - 45, pagodaY - 255);
            graphics.closePath();
            graphics.fillPath();

            // Spire
            graphics.lineStyle(4, 0x0e2413, 0.6);
            graphics.lineBetween(dX, pagodaY - 255, dX, pagodaY - 290);
            graphics.fillCircle(dX, pagodaY - 290, 6);
            graphics.fillCircle(dX, pagodaY - 280, 4);

            // Carve doors/windows with background color (0x0a1a0d)
            graphics.fillStyle(0x0a1a0d, 0.95);
            graphics.fillRect(dX - 30, pagodaY - 80, 60, 60);
            graphics.fillRect(dX - 80, pagodaY - 70, 20, 50);
            graphics.fillRect(dX + 60, pagodaY - 70, 20, 50);
            graphics.fillRect(dX - 15, pagodaY - 155, 30, 35);
            graphics.fillRect(dX - 50, pagodaY - 150, 15, 30);
            graphics.fillRect(dX + 35, pagodaY - 150, 15, 30);
            graphics.fillRect(dX - 10, pagodaY - 225, 20, 25);

            // Bamboo stalks in background
            graphics.lineStyle(12, 0x142b18, 0.25);
            for (let i = 0; i < 20; i++) {
                const bX = ((i * 140) - this.customCamera.x * 0.2) % (this.worldWidth + 200) - 50;
                graphics.lineBetween(bX, 0, bX + Math.sin(i) * 30, this.worldHeight);
            }
        } else if (this.mapType === 'volcano') {
            const dY = this.worldHeight - 40 - this.customCamera.y * 0.10;
            // Far mountains
            graphics.fillStyle(0x0e0501, 0.6);
            graphics.beginPath();
            graphics.moveTo(-200 - this.customCamera.x * 0.08, dY);
            graphics.lineTo(300 - this.customCamera.x * 0.08, dY - 250);
            graphics.lineTo(800 - this.customCamera.x * 0.08, dY - 100);
            graphics.lineTo(1200 - this.customCamera.x * 0.08, dY - 350); // Volcano peak!
            graphics.lineTo(1600 - this.customCamera.x * 0.08, dY - 120);
            graphics.lineTo(2100 - this.customCamera.x * 0.08, dY - 300);
            graphics.lineTo(this.worldWidth + 200 - this.customCamera.x * 0.08, dY);
            graphics.closePath();
            graphics.fillPath();

            // Closer mountains
            graphics.fillStyle(0x150803, 0.85);
            graphics.beginPath();
            graphics.moveTo(-200 - this.customCamera.x * 0.15, dY);
            graphics.lineTo(200 - this.customCamera.x * 0.15, dY - 120);
            graphics.lineTo(600 - this.customCamera.x * 0.15, dY - 180);
            graphics.lineTo(1000 - this.customCamera.x * 0.15, dY - 60);
            graphics.lineTo(1400 - this.customCamera.x * 0.15, dY - 150);
            graphics.lineTo(1800 - this.customCamera.x * 0.15, dY - 90);
            graphics.lineTo(this.worldWidth + 200 - this.customCamera.x * 0.15, dY);
            graphics.closePath();
            graphics.fillPath();

            // Red glow when erupting/rumbling
            if (this.volcanoState === 'ERUPTING' || this.volcanoState === 'RUMBLE') {
                const intensity = this.volcanoState === 'ERUPTING' ? 0.32 + Math.sin(Date.now() / 90) * 0.10 : 0.15;
                graphics.fillStyle(0xff3300, intensity);
                graphics.fillRect(this.customCamera.x, this.customCamera.y, this.canvasWidth / this.customCamera.scale, this.canvasHeight / this.customCamera.scale);
            }
        } else if (this.mapType === 'hell') {
            const dY = this.worldHeight - 40 - this.customCamera.y * 0.10;
            // Far mountains
            graphics.fillStyle(0x0e0101, 0.6);
            graphics.beginPath();
            graphics.moveTo(-200 - this.customCamera.x * 0.08, dY);
            graphics.lineTo(250 - this.customCamera.x * 0.08, dY - 220);
            graphics.lineTo(650 - this.customCamera.x * 0.08, dY - 90);
            graphics.lineTo(1050 - this.customCamera.x * 0.08, dY - 310);
            graphics.lineTo(1450 - this.customCamera.x * 0.08, dY - 110);
            graphics.lineTo(this.worldWidth + 200 - this.customCamera.x * 0.08, dY);
            graphics.closePath();
            graphics.fillPath();

            // Closer mountains
            graphics.fillStyle(0x160303, 0.85);
            graphics.beginPath();
            graphics.moveTo(-200 - this.customCamera.x * 0.15, dY);
            graphics.lineTo(150 - this.customCamera.x * 0.15, dY - 100);
            graphics.lineTo(500 - this.customCamera.x * 0.15, dY - 160);
            graphics.lineTo(850 - this.customCamera.x * 0.15, dY - 50);
            graphics.lineTo(1250 - this.customCamera.x * 0.15, dY - 130);
            graphics.lineTo(this.worldWidth + 200 - this.customCamera.x * 0.15, dY);
            graphics.closePath();
            graphics.fillPath();

            // Magma glow at bottom
            const intensity = 0.28 + Math.sin(Date.now() / 150) * 0.08;
            graphics.fillStyle(0xff2200, intensity);
            graphics.fillRect(this.customCamera.x, this.worldHeight - 120, this.canvasWidth / this.customCamera.scale, 120);
        } else if (this.mapType === 'factory') {
            const dY = this.worldHeight - 40 - this.customCamera.y * 0.12;
            const dX = (this.worldWidth / 2 - this.customCamera.x * 0.12);
            
            // Draw background pipelines
            graphics.fillStyle(0x161e2e, 0.5);
            graphics.fillRect(this.customCamera.x, dY - 450, this.canvasWidth / this.customCamera.scale, 28);
            graphics.fillStyle(0x0e141f, 0.7);
            graphics.fillRect(this.customCamera.x, dY - 444, this.canvasWidth / this.customCamera.scale, 6);
            
            graphics.fillStyle(0x192133, 0.45);
            graphics.fillRect(dX - 380, 0, 40, this.worldHeight);
            graphics.fillRect(dX + 380, 0, 40, this.worldHeight);
            
            graphics.fillStyle(0x242e47, 0.6);
            graphics.fillRect(dX - 386, dY - 250, 52, 16);
            graphics.fillRect(dX + 374, dY - 250, 52, 16);
            graphics.fillRect(dX - 386, dY - 550, 52, 16);
            graphics.fillRect(dX + 374, dY - 550, 52, 16);

            // Draw spinning gears
            const ctx = graphics.context;
            if (ctx) {
                ctx.save();
                ctx.translate(dX, dY - 320);
                ctx.rotate(Date.now() / 3200);
                
                ctx.fillStyle = '#1c2230';
                ctx.strokeStyle = '#2d374d';
                ctx.lineWidth = 4;
                
                const teeth = 10;
                const outerR = 110;
                const innerR = 85;
                ctx.beginPath();
                for (let i = 0; i < teeth; i++) {
                    const angle = (i * Math.PI * 2) / teeth;
                    const nextAngle = ((i + 0.5) * Math.PI * 2) / teeth;
                    ctx.lineTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
                    ctx.lineTo(Math.cos(angle + 0.08) * outerR, Math.sin(angle + 0.08) * outerR);
                    ctx.lineTo(Math.cos(nextAngle - 0.08) * outerR, Math.sin(nextAngle - 0.08) * outerR);
                    ctx.lineTo(Math.cos(nextAngle) * innerR, Math.sin(nextAngle) * innerR);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Cutout
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(0, 0, 45, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
                
                ctx.fillStyle = '#2d374d';
                ctx.beginPath();
                ctx.arc(0, 0, 20, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#111622';
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Small gear
                ctx.save();
                ctx.translate(dX - 145, dY - 235);
                ctx.rotate(-Date.now() / 1600 - 0.4);
                ctx.fillStyle = '#141a26';
                ctx.strokeStyle = '#212a3d';
                ctx.lineWidth = 3;
                
                const smallTeeth = 8;
                const sOuterR = 55;
                const sInnerR = 40;
                ctx.beginPath();
                for (let i = 0; i < smallTeeth; i++) {
                    const angle = (i * Math.PI * 2) / smallTeeth;
                    const nextAngle = ((i + 0.5) * Math.PI * 2) / smallTeeth;
                    ctx.lineTo(Math.cos(angle) * sInnerR, Math.sin(angle) * sInnerR);
                    ctx.lineTo(Math.cos(angle + 0.08) * sOuterR, Math.sin(angle + 0.08) * sOuterR);
                    ctx.lineTo(Math.cos(nextAngle - 0.08) * sOuterR, Math.sin(nextAngle - 0.08) * sOuterR);
                    ctx.lineTo(Math.cos(nextAngle) * sInnerR, Math.sin(nextAngle) * sInnerR);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(0, 0, 20, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
                
                ctx.fillStyle = '#212a3d';
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Draw visual gotero pipe nozzles hanging from the ceiling (with growing paint droplets!)
            const nozzles = this.factoryNozzles || [
                { x: 220, progress: 0, color: '#ff007f' },
                { x: 420, progress: 0, color: '#00f3ff' },
                { x: 720, progress: 0, color: '#da00ff' },
                { x: 960, progress: 0, color: '#ffee00' },
                { x: 1180, progress: 0, color: '#00ff66' },
                { x: 1450, progress: 0, color: '#ff3366' },
                { x: 1680, progress: 0, color: '#00ffcc' },
                { x: 1900, progress: 0, color: '#ffaa00' }
            ];
            nozzles.forEach(nozzle => {
                const nx = nozzle.x;
                // Pipe body
                graphics.fillStyle(0x2d374d, 0.85);
                graphics.fillRect(nx - 8, 0, 16, 20);
                // Pipe cap/ring
                graphics.fillStyle(0x1c2230, 0.95);
                graphics.fillRect(nx - 12, 16, 24, 6);
                
                // Growing paint drop at the tip!
                if (nozzle.progress > 0) {
                    const radius = 2 + nozzle.progress * 5; // grows from 2px to 7px
                    const dropY = 22 + nozzle.progress * 4;  // stretches downward
                    const colorHex = Phaser.Display.Color.HexStringToColor(nozzle.color || '#da70d6').color;
                    graphics.fillStyle(colorHex, 0.9);
                    graphics.fillCircle(nx, dropY, radius);
                } else {
                    // Default idle glowing tip
                    graphics.fillStyle(0xda70d6, 0.9);
                    graphics.fillCircle(nx, 22, 3);
                }
            });
        } else if (this.mapType === 'choke_point' && Math.random() < 0.015) {
            // Electrical discharges
            graphics.lineStyle(3.5, 0x00ffff, 0.85);
            graphics.beginPath();
            let startX = Math.random() * this.worldWidth;
            graphics.moveTo(startX, 0);
            for (let currY = 40; currY < this.worldHeight; currY += 40) {
                startX += (Math.random() - 0.5) * 80;
                graphics.lineTo(startX, currY);
            }
            graphics.strokePath();
            this.flashAlpha = Math.max(this.flashAlpha, 0.15);
        } else if (this.mapType === 'sky_temple') {
            // Draw a glowing sun/moon in the background
            const sunX = this.worldWidth / 2 - this.customCamera.x * 0.1;
            const sunY = 220 - this.customCamera.y * 0.1;
            
            // Outer glow
            graphics.fillStyle(0xffaa00, 0.08);
            graphics.fillCircle(sunX, sunY, 180);
            graphics.fillStyle(0xffaa00, 0.18);
            graphics.fillCircle(sunX, sunY, 110);
            graphics.fillStyle(0xffffff, 0.95);
            graphics.fillCircle(sunX, sunY, 60);

            // Draw floating parallax pillars
            graphics.fillStyle(0x0f1c3f, 0.45);
            for (let i = 0; i < 5; i++) {
                const px = (i * 450 - this.customCamera.x * 0.18) % (this.worldWidth + 300) - 100;
                const py = this.worldHeight - 480 - this.customCamera.y * 0.18;
                graphics.fillRect(px, py, 45, 380);
                // Pillar cap
                graphics.fillRect(px - 6, py, 57, 14);
                graphics.fillRect(px - 10, py + 14, 65, 8);
            }
        } else {
            // Default Cosmic Stars Parallax
            const starFarX = this.customCamera.x * 0.45;
            const starFarY = this.customCamera.y * 0.45;
            graphics.fillStyle(0xffffff, 0.45);
            this.stars.forEach((star) => {
                const sx = (star.seedX * (this.worldWidth + 1200)) - starFarX - 600;
                const sy = (star.seedY * (this.worldHeight + 1200)) - starFarY - 600;
                const size = star.seedSize * 2.2 + 0.6;
                graphics.fillCircle(sx, sy, size);
            });

            // Nebulas
            graphics.fillStyle(gridColor, 0.03);
            for (let i = 0; i < 3; i++) {
                const nX = (Math.sin(i * 123) * 0.5 + 0.5) * this.worldWidth - this.customCamera.x * 0.25;
                const nY = (Math.cos(i * 456) * 0.5 + 0.5) * this.worldHeight - this.customCamera.y * 0.25;
                graphics.fillCircle(nX, nY, 320);
            }
            graphics.fillStyle(boundaryColor, 0.02);
            for (let i = 0; i < 2; i++) {
                const nX = (Math.cos(i * 876) * 0.5 + 0.5) * this.worldWidth - this.customCamera.x * 0.25;
                const nY = (Math.sin(i * 321) * 0.5 + 0.5) * this.worldHeight - this.customCamera.y * 0.25;
                graphics.fillCircle(nX, nY, 280);
            }
        }

        // Draw ambient particles
        this.ambientParticles.forEach(p => {
            graphics.fillStyle(Phaser.Display.Color.HexStringToColor(p.color).color, p.alpha);
            if (p.isBubble) {
                graphics.lineStyle(1.5, 0xffffff, p.alpha * 0.8);
                graphics.strokeCircle(p.x, p.y, p.size);
            } else if (p.isHeart) {
                const size = p.size;
                graphics.beginPath();
                graphics.moveTo(p.x, p.y - size / 4);
                graphics.bezierCurveTo(
                    p.x - size / 2, p.y - size, 
                    p.x - size, p.y - size / 3, 
                    p.x, p.y + size
                );
                graphics.bezierCurveTo(
                    p.x + size, p.y - size / 3, 
                    p.x + size / 2, p.y - size, 
                    p.x, p.y - size / 4
                );
                graphics.closePath();
                graphics.fillPath();
            } else if (p.isSparkle) {
                const size = p.size;
                graphics.beginPath();
                graphics.moveTo(p.x, p.y - size);
                graphics.lineTo(p.x + size/3, p.y - size/3);
                graphics.lineTo(p.x + size, p.y);
                graphics.lineTo(p.x + size/3, p.y + size/3);
                graphics.lineTo(p.x, p.y + size);
                graphics.lineTo(p.x - size/3, p.y + size/3);
                graphics.lineTo(p.x - size, p.y);
                graphics.lineTo(p.x - size/3, p.y - size/3);
                graphics.closePath();
                graphics.fillPath();
            } else {
                graphics.fillCircle(p.x, p.y, p.size);
            }
        });

        // 3. ARENA EDGE BOUNDARY
        graphics.lineStyle(6, boundaryColor, 0.25);
        graphics.strokeRect(0, 0, this.worldWidth, this.worldHeight);

        // 4. RETRO GRID NEON LINES
        graphics.lineStyle(1, gridColor, gridAlpha);
        const gridStep = 60;
        for (let x = 0; x < this.worldWidth; x += gridStep) {
            graphics.lineBetween(x, 0, x, this.worldHeight);
        }
        for (let y = 0; y < this.worldHeight; y += gridStep) {
            graphics.lineBetween(0, y, this.worldWidth, y);
        }

        // 5. BOTTOM HAZARD RENDERING (Acid, lava, void, or ocean)
        const killY = this.getKillPlaneY();
        const pulse = 0.45 + Math.sin(Date.now() / 180) * 0.18;
        
        graphics.fillStyle(hazardColor, 0.15 + pulse * 0.08);
        graphics.fillRect(0, killY, this.worldWidth, 900);

        graphics.lineStyle(3.5, hazardTopColor, 0.65 + pulse * 0.2);
        graphics.beginPath();
        for (let x = 0; x <= this.worldWidth; x += 36) {
            const y = killY + 5 + Math.sin(Date.now() / 140 + x * 0.06) * 4;
            if (x === 0) {
                graphics.moveTo(x, y);
            } else {
                graphics.lineTo(x, y);
            }
        }
        graphics.strokePath();
    }

    /**
     * Render Platforms (Optimized: redraws only if a tile changed color)
     */
    renderPlatforms() {
        // Redraw platforms on the graphic texture
        let anyPlatformDirty = this.platforms.some(p => p.dirty);
        if (anyPlatformDirty) {
            this.platformGraphics.clear();
            this.platforms.forEach(p => p.render(this.platformGraphics));
        }
    }

    /**
     * Draw airborne paint particles
     */
    renderParticles() {
        this.particleGraphics.clear();
        this.paintParticles.forEach(part => part.render(this.particleGraphics));
    }

    /**
     * Draw player blocks
     */
    renderPlayers() {
        this.playerGraphics.clear();
        this.players.forEach(p => p.render(this.playerGraphics, false));
        if (this.gameMode === 'pve' || this.gameMode === 'roguelike') {
            this.enemies.forEach(e => e.render(this.playerGraphics));
        }

        // Draw screen entry flash effect overlays
        if (this.flashAlpha > 0) {
            this.playerGraphics.fillStyle(0xffffff, this.flashAlpha);
            // Draw relative to camera viewport coordinates
            this.playerGraphics.fillRect(this.customCamera.x, this.customCamera.y, this.canvasWidth / this.customCamera.scale, this.canvasHeight / this.customCamera.scale);
        }
    }

    updateHUD() {
        this.players.forEach(p => {
            const hudCorner = document.getElementById(`hud-p${p.id}`);
            if (hudCorner) {
                hudCorner.style.display = 'flex';
                hudCorner.style.setProperty('--player-color', p.baseColor);
                
                // HP Fill
                const hpFill = document.getElementById(`hp-p${p.id}`);
                if (hpFill) {
                    hpFill.style.width = (p.health / p.maxHealth) * 100 + '%';
                    hpFill.style.backgroundColor = p.baseColor;
                    hpFill.style.boxShadow = `0 0 15px ${p.baseColor}`;
                }
                
                // HP Text
                const hpText = document.getElementById(`hp-text-p${p.id}`);
                if (hpText) {
                    hpText.textContent = Math.floor(p.health) + ' / ' + p.maxHealth;
                }
                
                // Score (👑)
                const scoreEl = document.getElementById(`score-p${p.id}`);
                if (scoreEl) {
                    const score = this.playerScores[p.id] || 0;
                    scoreEl.innerHTML = '👑'.repeat(score);
                }

                // Inventory slots (Spells)
                const spellsEl = document.getElementById(`spells-p${p.id}`);
                if (spellsEl) {
                    spellsEl.innerHTML = this.renderInventorySlots(p);
                }

                // Passives & Weapons
                const passiveEl = document.getElementById(`passive-p${p.id}`);
                if (passiveEl) {
                    const weaponIcon = p.weapon ? `<div class="passive-icon" title="${p.weapon.type}" style="display:block;border-color:${p.baseColor};">${spellIcons[p.weapon.type] || p.weapon.type}:${p.weapon.ammo}</div>` : '';
                    passiveEl.innerHTML = weaponIcon + Object.keys(p.passives).map(k => `<div class="passive-icon" style="display:block;">${spellIcons[k] || ''}</div>`).join('');
                }
            }
        });
    }

    renderInventorySlots(player) {
        if (!player.spells || player.spells.length === 0) return '';
        const debugMode = document.getElementById('debug-mode')?.checked || false;
        if (debugMode) {
            const s = player.spells[player.selectedSpellIndex] || player.spells[0];
            const icon = spellIcons[s] || 'SP';
            return `<div class="selected-spell" title="${s}">${icon}</div><div class="unselected-spell">${player.selectedSpellIndex + 1}/${player.spells.length}</div>`;
        }
        return player.spells.map((s, i) => {
            let isSelected = i === player.selectedSpellIndex;
            let icon = spellIcons[s] || 'SP';
            return `<div class="${isSelected ? 'selected-spell' : 'unselected-spell'}">${icon}</div>`;
        }).join('');
    }

    getDebugSpellbookSpells() {
        return [
            'KAMEHAMEHA', 'GENKIDAMA', 'ZA_WARUDO', 'GETSUGA', 'RASENGAN', 'AMATERASU', 'SHINRA_TENSEI',
            'HADOUKEN', 'FALCON_PUNCH', 'BLACK_HOLE', 'PRISM', 'BRIMSTONE', 'MOMS_KNIFE', 'CHIDORI',
            'FULL_COUNTER', 'PURPURA_HUECO', 'CRUEL_SUN', 'TAIYOKEN', 'MAKANKOSAPPO', 'TORNADO',
            'CHAIN_LIGHTNING', 'EARTHQUAKE', 'ORBITAL_STRIKE', 'BATS', 'GLACIER', 'GOUKAKYU', 'CERO',
            'RAYO_INFERNAL', 'RAIJU', 'FIRE_TORNADO', 'RASENSHURIKEN', 'BLOOD_SCYTHE',
            'PLANETARY_DEVASTATION', 'THOUSAND_KNIVES', 'HURRICANE_FLAME', 'SUPERNOVA', 'TIME_SKIP',
            'MASTER_SPARK', 'RAILGUN', 'THUNDERSTORM', 'METEOR_STRIKE', 'BLOOD_EXPLOSION', 'PLASMA_BALL',
            'LASER_SINGULARITY', 'BLIZZARD', 'KIRIN', 'VAMPIRIC_KNIVES', 'ABSOLUTE_ZERO', 'INFERNAL_BATS',
            'HAILSTORM', 'VOID_BEAM', 'BAT_SWARM', 'SUN_BURST', 'CROSS_SLASH', 'THUNDER_GOD',
            'BLACK_RASENGAN', 'LIGHTNING_SLASH', 'BLADE_STORM', 'COMET_PUNCH', 'METEOR_SWARM',
            'GRAVITY_MINE', 'DASH_STRIKE', 'HEALING_FIELD', 'PAINT_RAIL', 'GRAVITY_WELL', 'TESLA_RAIL',
            'MIRROR_DOME', 'SANCTUARY', 'LIGHTNING_DASH'
        ].filter(spell => this.spellIcons[spell]);
    }

    showPowerupMsg(msg, color) {
        // Show a brief floating text at the center-top of the camera view
        const cam = this.cameras.main;
        const cx = cam.scrollX + cam.width / 2;
        const cy = cam.scrollY + 80;
        this.spawnFloatingText(cx, cy, msg, color || '#ffee00', true, null);
    }

    spawnFloatingText(x, y, text, color, isGiant = false, targetId = null) {
        if (targetId !== null) {
            const activeTextsForTarget = this.floatingTexts.filter(ft => ft.targetId === targetId);
            if (activeTextsForTarget.length >= 3) {
                // Destroy the oldest one to keep it capped at 3
                const oldest = activeTextsForTarget[0];
                oldest.textObj.destroy();
                this.floatingTexts = this.floatingTexts.filter(ft => ft !== oldest);
            }
        }
        const ft = new FloatingText(this, x, y, text, color, isGiant, targetId);
        this.floatingTexts.push(ft);
        return ft;
    }

    resizeCinematicOverlay() {
        if (!this.cinematicTopBar || !this.cinematicBottomBar || !this.cinematicText) return;
        this.cinematicTopBar.clear();
        this.cinematicTopBar.fillStyle(0x000000, 0.85);
        this.cinematicTopBar.fillRect(0, 0, this.canvasWidth, 100);
        this.cinematicBottomBar.clear();
        this.cinematicBottomBar.fillStyle(0x000000, 0.85);
        this.cinematicBottomBar.fillRect(0, this.canvasHeight - 100, this.canvasWidth, 100);
        this.cinematicText.setPosition(this.canvasWidth / 2, this.canvasHeight / 2);
    }

    renderProjectiles() {
        this.projectileGraphics.clear();
    }

    reviveAndRewardPlayers() {
        const spawns = this.getSafeSpawnPositions(this.players.length);
        this.players.forEach((p, idx) => {
            if (p.health <= 0 || p.exploded) {
                p.health = p.maxHealth * 0.75;
                p.exploded = false;
                p.damageFlashTimer = 0;
                p.x = spawns[idx]?.x ?? this.worldWidth / 2;
                p.y = spawns[idx]?.y ?? 50;
                p.vx = 0;
                p.vy = 0;
                p.invulnTimer = 2000;
                this.spawnPaintSplats(p.x, p.y + p.height / 2, p.baseColor, 30);
                this.playSfx('pickup');
            } else {
                p.health = Math.min(p.maxHealth, p.health + 200);
            }
            p.timeStopTimer = 0;
            p.freezeTimer = 0;
            p.chidoriTimer = 0;
        });
        this.updateHUD();
    }

    getOpposingTeam(entityId) {
        const isEnemy = String(entityId).includes('enemy');
        if (this.gameMode === 'pvp') {
            return this.players.filter(p => p.id !== entityId);
        }
        return isEnemy ? this.players : (this.enemies || []);
    }

    getNearestEnemy(entity, maxDist = 800, ignoreId = null) {
        let nearest = null; 
        let minDist = maxDist; 
        const targets = this.getOpposingTeam(entity.id || entity.ownerId);
        
        targets.forEach(t => {
            if (t.id !== (entity.id || entity.ownerId) && t.id !== ignoreId && t.health > 0 && !t.exploded) {
                let d = Math.hypot((t.x + t.width/2) - (entity.x + (entity.width||0)/2), (t.y + t.height/2) - (entity.y + (entity.height||0)/2));
                if (d < minDist) { 
                    minDist = d; 
                    nearest = t; 
                }
            }
        });
        return nearest;
    }

    dealDamage(target, amount, source = null, isPoison = false) {
        if (!target || target.health <= 0) return;
        
        let attacker = null;
        if (source) {
            if (source.maxHealth !== undefined) {
                attacker = source;
            } else if (source.ownerId !== undefined) {
                attacker = this.players.concat(this.enemies || []).find(e => e.id == source.ownerId);
            }
        }

        if (attacker && attacker.damageMultiplier) {
            amount *= attacker.damageMultiplier;
        }
        if (source && source.damageBoost) {
            amount *= source.damageBoost;
        }

        // Raycasting check: Solid walls block splash/area damage
        // We check line of sight between the damage source and target center if the damage is area splash
        if (source && (source.isMeteorStrike || source.isGenkidama || source.isBlackHole || source.isHollowPurple || source.isCruelSun || source.isKirin || source.isOrbital || source.type === 'HEAL')) {
            const targetX = target.x + target.width / 2;
            const targetY = target.y + target.height / 2;
            const sourceX = source.x + (source.width || 0) / 2;
            const sourceY = source.y + (source.height || 0) / 2;
            
            // Check Raycast line intersection with solid platforms
            let pathBlocked = false;
            for (let plat of this.platforms) {
                // If the platform overlaps the ray, block damage
                if (this.lineIntersectsRect(sourceX, sourceY, targetX, targetY, plat)) {
                    pathBlocked = true;
                    break;
                }
            }
            if (pathBlocked) return; // damage blocked by wall
        }

        const oldHealth = target.health;
        if (typeof target.takeDamage === 'function') {
            if (String(target.id).includes('enemy')) {
                target.takeDamage(amount, source);
            } else {
                target.takeDamage(amount, isPoison, source, (type) => this.playSfx(type));
            }
        }
        const damageDealt = oldHealth - target.health;

        if (damageDealt > 0) {
            // Spawn floating text for damage
            const isGiant = damageDealt >= 120;
            const color = String(target.id).includes('enemy') ? '#ffaa00' : '#ff3333';
            this.spawnFloatingText(target.x + target.width / 2, target.y - 10, `-${Math.floor(damageDealt)}`, color, isGiant, target.id);

            // Apply lifesteal
            if (attacker && attacker.lifesteal && !isPoison) {
                attacker.health = Math.min(attacker.maxHealth, attacker.health + damageDealt * attacker.lifesteal);
                this.updateHUD();
            }

            // Explode on Kill support
            if (oldHealth > 0 && target.health <= 0 && String(target.id).includes('enemy')) {
                if (attacker && attacker.passives && attacker.passives.EXPLODE_ON_KILL) {
                    let dummy = new Projectile(this, target.x, target.y, 0, 0, attacker.baseColor, attacker.id);
                    dummy.splash(target.x + target.width/2, target.y + target.height/2, 120, 140, 24);
                    this.spawnPaintSplats(target.x + target.width/2, target.y + target.height/2, attacker.baseColor, 15);
                    this.playSfx('explosion');
                }
            }
        }
    }

    lineIntersectsRect(x1, y1, x2, y2, rect) {
        // Line-rect intersection check
        const minX = rect.x;
        const maxX = rect.x + rect.width;
        const minY = rect.y;
        const maxY = rect.y + rect.height;

        // Check if line segments intersect any of the rect's 4 borders
        if (this.lineIntersectsLine(x1, y1, x2, y2, minX, minY, minX, maxY)) return true;
        if (this.lineIntersectsLine(x1, y1, x2, y2, minX, maxY, maxX, maxY)) return true;
        if (this.lineIntersectsLine(x1, y1, x2, y2, maxX, maxY, maxX, minY)) return true;
        if (this.lineIntersectsLine(x1, y1, x2, y2, maxX, minY, minX, minY)) return true;

        // Or if the ray starts/ends inside the rect
        if (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) return true;
        if (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY) return true;

        return false;
    }

    lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        const uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
        const uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
        if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
            return true;
        }
        return false;
    }

    triggerCinematic(name, color, noSlowdown = false) {
        this.cinematic.active = true; 
        this.cinematic.timer = 1200; 
        this.cinematic.text = name; 
        this.cinematic.color = color;
        
        this.flashAlpha = 0.6; 
        this.shakeTime = 24; 
        this.shakeMagnitude = 12; 
        
        this.cinematicText.setText(name);
        this.cinematicText.setColor(color);
        this.cinematicText.setShadow(0, 0, color, 30, true, true);
        this.cinematicOverlay.setVisible(true);

        this.playSfx('cinematic');
    }

    checkProjectileSynergies() {
        const limit = Math.min(this.projectiles.length, 80);
        for (let i = 0; i < limit; i++) {
            const a = this.projectiles[i];
            const roleA = this.getProjectileRole(a);
            if (!roleA) continue;
            for (let j = i + 1; j < limit; j++) {
                const b = this.projectiles[j];
                const roleB = this.getProjectileRole(b);
                if (!roleB || !this.projectilesOverlap(a, b)) continue;
                const x = (Math.max(a.x, b.x) + Math.min(a.x + a.width, b.x + b.width)) / 2;
                const y = (Math.max(a.y, b.y) + Math.min(a.y + a.height, b.y + b.height)) / 2;
                if (this.spawnProjectileFusion(roleA, roleB, x, y, a.ownerId)) {
                    a.active = false;
                    b.active = false;
                    this.playSfx('explosion');
                }
            }
        }
    }

    getProjectileRole(pr) {
        if (!pr || !pr.active) return null;
        if (pr.synergyTag) return pr.synergyTag;
        if (pr.isHurricaneFlame) return 'HURRICANE_FLAME';
        if (pr.isVoidRay) return 'VOID_RAY';
        if (pr.isMakankosappo) return 'MAKANKOSAPPO';
        if (pr.isHollowPurple) return 'PURPURA_HUECO';
        if (pr.isCruelSun) return 'CRUEL_SUN';
        if (pr.isTornado) return 'TORNADO';
        if (pr.isRasengan || pr.isRasenshuriken) return 'RASENGAN';
        if (pr.isBeam && !pr.isRailgun && !pr.isBrimstone && !pr.isCero && !pr.isInfernal) return 'KAMEHAMEHA';
        return null;
    }

    projectilesOverlap(a, b) {
        if (!a || !b || !a.active || !b.active) return false;
        return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }

    spawnProjectileFusion(roleA, roleB, x, y, ownerId) {
        const pair = [roleA, roleB].sort().join('+');
        if (pair === ['CRUEL_SUN', 'TORNADO'].sort().join('+')) {
            let storm = new Projectile(this, x - 95, y - 130, 0, 0, '#ff5500', ownerId);
            storm.isTornado = true;
            storm.isFireTornado = true;
            storm.isHurricaneFlame = true;
            storm.synergyTag = 'HURRICANE_FLAME';
            storm.width = 190;
            storm.height = 260;
            storm.timer = 6200;
            storm.power = 1.55;
            this.projectiles.push(storm);
            this.triggerCinematic('HURRICANE FLAME', '#ff5500', true);
            return true;
        }
        if (pair === ['MAKANKOSAPPO', 'PURPURA_HUECO'].sort().join('+')) {
            let ray = new Projectile(this, 0, y - 34, 0, 0, '#060010', ownerId);
            ray.isVoidRay = true;
            ray.isRailgun = true;
            ray.isBeam = true;
            ray.synergyTag = 'VOID_RAY';
            ray.width = this.worldWidth;
            ray.height = 68;
            ray.timer = 900;
            this.projectiles.push(ray);
            this.flashAlpha = Math.max(this.flashAlpha, 0.45);
            this.shakeTime = Math.max(this.shakeTime, 22);
            this.shakeMagnitude = Math.max(this.shakeMagnitude, 16);
            this.triggerCinematic('VOID RAY', '#b000ff', true);
            return true;
        }
        if (pair === ['KAMEHAMEHA', 'RASENGAN'].sort().join('+')) {
            let blast = new Projectile(this, x - 60, y - 60, 0, 0, '#ffffaa', ownerId);
            blast.splash(x, y, 620, 620, 140);
            this.visualEffects.push(new VisualEffect(this, x, y, 'SHINRA', '#ffffaa'));
            this.flashAlpha = 0.8;
            this.shakeTime = Math.max(this.shakeTime, 34);
            this.shakeMagnitude = Math.max(this.shakeMagnitude, 24);
            this.triggerCinematic('SUPER GENKIDAMA', '#ffffaa', true);
            return true;
        }
        return false;
    }

    getRandomPlatformPoint(extraY = 44) {
        const solid = this.platforms.filter(p => {
            if (!(p.height <= 45 && p.width >= 12 && p.y < this.getKillPlaneY() - 8)) return false;
            const blockedAbove = this.platforms.some(o => {
                if (o === p) return false;
                const overlapsX = p.x < o.x + o.width && p.x + p.width > o.x;
                const gap = p.y - (o.y + o.height);
                return overlapsX && gap >= 0 && gap < 60;
            });
            return !blockedAbove;
        });
        if (!solid.length) return { x: this.worldWidth / 2, y: 80 };
        const p = solid[Math.floor(Math.random() * solid.length)];
        return {
            x: Math.max(30, Math.min(p.x + Math.random() * Math.max(p.width, 20), this.worldWidth - 60)),
            y: Math.max(30, p.y - extraY)
        };
    }

    spawnPowerup() {
        const spot = this.getRandomPlatformPoint(58);
        this.powerups.push(new PowerUp(this, spot.x, spot.y));
    }

    /**
     * Reset any lingering CSS filters on the game canvas
     */
    clearCanvasFilter() {
        const gc = document.getElementById('gameCanvas');
        if (gc) gc.style.filter = 'none';
    }

    finishPvPRound() {
        if (this.isRoundTransitioning || this.gameMode !== 'pvp') return;
        this.isRoundTransitioning = true;
        this.clearCanvasFilter();

        const alivePlayers = this.players.filter(p => p.health > 0 && !p.exploded);
        const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;

        if (winner) {
            this.playerScores[winner.id] = (this.playerScores[winner.id] || 0) + 1;
        }
        this.updateHUD();

        const scoreLine = this.players
            .map(p => `J${p.id}: ${this.playerScores[p.id] || 0}`)
            .join('  |  ');

        if (winner && this.winsLimit !== 999 && this.playerScores[winner.id] >= this.winsLimit) {
            this.endGame(winner);
            return;
        }

        const roundOverlay = document.getElementById('round-overlay');
        const roundWinnerText = document.getElementById('round-winner-text');
        const roundScoreText = document.getElementById('round-score-text');

        if (roundWinnerText) {
            roundWinnerText.textContent = winner ? `JUGADOR ${winner.id} GANA LA RONDA` : 'DESTRUCCION MUTUA';
            roundWinnerText.style.color = winner ? winner.baseColor : '#ffffff';
            roundWinnerText.style.textShadow = winner ? `0 0 25px ${winner.baseColor}` : '0 0 25px #ffffff';
        }
        if (roundScoreText) {
            roundScoreText.textContent = `${scoreLine}${this.selectedMap === 'random' ? '  |  Siguiente mapa aleatorio' : ''}`;
        }
        if (roundOverlay) {
            roundOverlay.style.display = 'flex';
            roundOverlay.style.opacity = '1';
        }

        this.time.delayedCall(2600, () => {
            if (roundOverlay) {
                roundOverlay.style.opacity = '0';
            }
            this.time.delayedCall(550, () => {
                if (roundOverlay) roundOverlay.style.display = 'none';
                this.scene.start('GameScene', {
                    mapType: this.selectedMap,
                    gameMode: this.gameMode,
                    winsLimit: this.winsLimit,
                    playerConfigs: this.playerConfigs,
                    playerScores: this.playerScores
                });
            });
        });
    }

    endGame(champion = null) {
        this.gameState = 'GAMEOVER';
        this.clearCanvasFilter();
        
        const hud = document.getElementById('hud');
        const bossHud = document.getElementById('boss-hud');
        const roundOverlay = document.getElementById('round-overlay');
        const gameOverScreen = document.getElementById('game-over-screen');
        const winnerText = document.getElementById('winner-text');
        const statsText = document.getElementById('stats-text');

        if (hud) hud.style.display = 'none';
        if (bossHud) bossHud.style.display = 'none';
        if (roundOverlay) {
            roundOverlay.style.display = 'none';
            roundOverlay.style.opacity = '0';
        }
        this.isRoundTransitioning = false;
        
        if (gameOverScreen) gameOverScreen.style.display = 'flex';

        if (this.gameMode === 'pve' || this.gameMode === 'roguelike') {
            if (winnerText) {
                winnerText.textContent = "CAYERON ANTE LA HORDA";
                winnerText.style.color = "#ffffff";
                winnerText.style.textShadow = "none";
            }
            if (statsText) {
                statsText.textContent = `Llegaste a la Ronda: ${this.currentWave} | Enemigos derrotados: ${this.enemiesDefeated}`;
            }
        } else {
            if (statsText) statsText.textContent = "";
            let alivePlayers = champion ? [champion] : this.players.filter(p => p.health > 0);
            if (alivePlayers.length === 0) { 
                if (winnerText) {
                    winnerText.textContent = "DESTRUCCION MUTUA";
                    winnerText.style.color = "#ffffff";
                    winnerText.style.textShadow = "none";
                }
            } else { 
                if (winnerText) {
                    winnerText.textContent = `GANA EL JUGADOR ${alivePlayers[0].id}`; 
                    winnerText.style.color = alivePlayers[0].baseColor; 
                    winnerText.style.textShadow = `3px 3px 20px ${alivePlayers[0].baseColor}`; 
                }
                if (statsText) {
                    statsText.textContent = `Marcador final: ${this.players.map(p => `J${p.id}: ${this.playerScores[p.id] || 0}`).join('  |  ')}`;
                }
            }
        }
    }

    startUpgradeDraftSequence() {
        this.gameState = 'DRAFT';
        this.draftQueue = this.players.filter(p => p.health > 0 && !p.exploded);
        this.processNextDraft();
    }

    processNextDraft() {
        if (this.draftQueue.length === 0) {
            const overlay = document.getElementById('upgrade-overlay');
            if (overlay) overlay.style.display = 'none';

            this.currentWave++;
            this.enemiesToSpawn = 6 + (this.currentWave * 4);
            this.rollRoguelikeMutator();
            for (let reward = 0; reward < Math.min(3, 1 + Math.floor(this.currentWave / 3)); reward++) {
                this.spawnPowerup();
            }
            this.triggerCinematic(`${this.roguelikeMutator?.name || 'OLEADA'} ${this.currentWave}`, this.roguelikeMutator?.color || '#00f3ff');
            this.gameState = 'PLAYING';
            return;
        }

        const currentPlayer = this.draftQueue[0];
        const pool = [
            {
                name: 'DOBLE SALTO',
                desc: '+1 Salto Adicional',
                effect: (p) => { p.maxJumps = (p.maxJumps || 1) + 1; }
            },
            {
                name: 'CADENCIA RAPIDA',
                desc: '15% Reducción de Cooldown',
                effect: (p) => { p.cooldownReduction = Math.min(0.85, (p.cooldownReduction || 0) + 0.15); }
            },
            {
                name: 'DAÑO EXTREMO',
                desc: '+20% Daño Multiplicador',
                effect: (p) => { p.damageMultiplier = (p.damageMultiplier || 1.0) + 0.20; }
            },
            {
                name: 'ROBO DE VIDA',
                desc: '+15% Lifesteal físico',
                effect: (p) => { p.lifesteal = (p.lifesteal || 0.0) + 0.15; }
            },
            {
                name: 'VELOCIDAD ULTRA',
                desc: '+15% Velocidad de Movimiento',
                effect: (p) => { p.speedBonus = (p.speedBonus || 0.0) + 0.15; }
            },
            {
                name: 'VIDA MAXIMA',
                desc: '+150 Vida Máxima y Cura',
                effect: (p) => { 
                    p.maxHealth += 150; 
                    p.health = Math.min(p.maxHealth, p.health + 150); 
                }
            },
            {
                name: 'BLINDAJE PRISMATICO',
                desc: 'Invulnerabilidad inicial y reflejo breve por oleada',
                effect: (p) => {
                    p.invulnTimer = Math.max(p.invulnTimer || 0, 2200);
                    p.reflectTimer = Math.max(p.reflectTimer || 0, 1800);
                }
            },
            {
                name: 'ARSENAL CROMO',
                desc: 'Obtienes un arma con municion extra',
                effect: (p) => {
                    p.weapon = Phaser.Utils.Array.GetRandom([
                        { type: 'SHOTGUN', ammo: 18 },
                        { type: 'MACHINEGUN', ammo: 130 }
                    ]);
                }
            },
            {
                name: 'HECHIZO RARO',
                desc: 'Agrega un poder ofensivo garantizado',
                effect: (p) => {
                    const picks = ['PURPURA_HUECO', 'CRUEL_SUN', 'MAKANKOSAPPO', 'GRAVITY_MINE', 'PAINT_RAIL', 'TESLA_RAIL', 'KIRIN', 'MASTER_SPARK'];
                    const spell = Phaser.Utils.Array.GetRandom(picks);
                    if (!p.spells.includes(spell)) {
                        if (p.spells.length < 5) p.spells.push(spell);
                        else p.spells[p.selectedSpellIndex || 0] = spell;
                    }
                    p.selectedSpellIndex = Math.max(0, p.spells.indexOf(spell));
                }
            },
            {
                name: 'REGENERACION',
                desc: 'Cura grande y mas vida maxima',
                effect: (p) => {
                    p.maxHealth += 80;
                    p.health = Math.min(p.maxHealth, p.health + 300);
                }
            },
            {
                name: 'TRIPLE SALTO',
                desc: 'Sube saltos minimos a 3',
                effect: (p) => {
                    p.maxJumps = Math.max(p.maxJumps || 1, 3);
                }
            },
            {
                name: 'PINTURA GIGANTE',
                desc: 'Tus disparos pintan y golpean mas fuerte por 2 rondas',
                effect: (p) => {
                    p.passives.GIANT_PAINT = Math.max(p.passives.GIANT_PAINT || 0, 30000);
                }
            },
            {
                name: 'CORAZON VAMPIRO',
                desc: 'Robo de vida y poder vampirico',
                effect: (p) => {
                    p.lifesteal = (p.lifesteal || 0) + 0.10;
                    p.passives.VAMPIRE = Math.max(p.passives.VAMPIRE || 0, 22000);
                }
            },
            {
                name: 'DISPARO DIVIDIDO',
                desc: 'Tus disparos lanzan permanentemente 2 proyectiles extra inclinados',
                effect: (p) => {
                    p.passives.SPLIT_SHOT = 99999999;
                }
            },
            {
                name: 'REBOTE CAÓTICO',
                desc: 'Tus proyectiles rebotan +3 veces permanentemente',
                effect: (p) => {
                    p.passives.BOUNCE_RELIC = 99999999;
                }
            },
            {
                name: 'SANGRE POR ORO',
                desc: '-100 Vida Máxima a cambio de +50% Daño Multiplicador permanentemente',
                effect: (p) => {
                    p.maxHealth = Math.max(50, p.maxHealth - 100);
                    p.damageMultiplier = (p.damageMultiplier || 1.0) * 1.5;
                    p.health = Math.min(p.maxHealth, p.health);
                }
            },
            {
                name: 'PASOS DE FUEGO',
                desc: 'Dejas un rastro de llamas de fuego negro al caminar permanentemente',
                effect: (p) => {
                    p.passives.FIRE_TRAIL = 99999999;
                }
            },
            {
                name: 'EXPLOSION AL DERROTAR',
                desc: 'Los enemigos derrotados explotan haciendo daño en área permanentemente',
                effect: (p) => {
                    p.passives.EXPLODE_ON_KILL = 99999999;
                }
            }
        ];

        Phaser.Utils.Array.Shuffle(pool);
        this.draftOptions = pool.slice(0, 3);
        this.selectedCardIndex = 0;

        const overlay = document.getElementById('upgrade-overlay');
        const title = document.getElementById('upgrade-player-title');
        
        if (title) {
            title.textContent = `JUGADOR ${currentPlayer.id} ELIGE UNA MEJORA`;
            title.style.color = currentPlayer.baseColor;
            title.style.textShadow = `0 0 15px ${currentPlayer.baseColor}`;
        }
        if (overlay) overlay.style.display = 'flex';

        this.updateDraftUI();
    }

    rollRoguelikeMutator() {
        const mutators = [
            {
                key: 'overclock',
                name: 'OVERCLOCK',
                desc: 'Portales mas rapidos, mas recompensa',
                color: '#ffff00',
                spawnRate: 0.68,
                extraEnemies: 3,
                powerups: 1.35
            },
            {
                key: 'low_gravity',
                name: 'GRAVEDAD LIGERA',
                desc: 'Mas control aereo para todos',
                color: '#aaffff',
                spawnRate: 1.05,
                extraEnemies: 1,
                powerups: 1.0
            },
            {
                key: 'scarcity',
                name: 'ESCASEZ',
                desc: 'Menos pickups, enemigos mas contenidos',
                color: '#ffb000',
                spawnRate: 1.15,
                extraEnemies: -2,
                powerups: 0.65
            },
            {
                key: 'swarm',
                name: 'ENJAMBRE',
                desc: 'Mas enemigos y cadencia alta',
                color: '#ff4dd8',
                spawnRate: 0.82,
                extraEnemies: 5,
                powerups: 1.1
            }
        ];
        this.roguelikeMutator = Phaser.Utils.Array.GetRandom(mutators);
        this.roguelikeSpawnRateMultiplier = this.roguelikeMutator.spawnRate;
        this.roguelikePowerupMultiplier = this.roguelikeMutator.powerups;
        this.enemiesToSpawn = Math.max(4, this.enemiesToSpawn + this.roguelikeMutator.extraEnemies);

        this.players.forEach(p => {
            if (this.roguelikeMutator.key === 'low_gravity') {
                p.passives.FEATHER = Math.max(p.passives.FEATHER || 0, 14000);
            } else if (this.roguelikeMutator.key === 'overclock') {
                p.passives.HASTE = Math.max(p.passives.HASTE || 0, 7000);
            }
        });

        const waveText = document.getElementById('wave-text');
        if (waveText) waveText.textContent = this.getWaveStatusText();
    }

    getWaveStatusText() {
        const base = `RONDA ${this.currentWave} - Faltan: ${this.enemiesToSpawn} | Kills: ${this.enemiesDefeated}`;
        if (this.gameMode !== 'roguelike' || !this.roguelikeMutator) return base;
        return `${base} | ${this.roguelikeMutator.name}`;
    }

    updateDraftUI() {
        const wrapper = document.getElementById('upgrade-cards-wrapper');
        if (!wrapper) return;

        wrapper.innerHTML = this.draftOptions.map((opt, idx) => {
            const isSelected = idx === this.selectedCardIndex;
            return `
                <div class="upgrade-card ${isSelected ? 'selected focused' : ''}" onclick="window.selectUpgradeCard(${idx})" style="${isSelected ? 'border-color:' + this.draftQueue[0].baseColor + '; box-shadow: 0 0 25px ' + this.draftQueue[0].baseColor + ';' : ''}">
                    <h3>${opt.name}</h3>
                    <p>${opt.desc}</p>
                </div>
            `;
        }).join('');
    }

    updateDojoWind(delta) {
        if (this.gameState !== 'PLAYING') return;

        const dtMs = delta;
        if (this.windDuration > 0) {
            this.windDuration -= dtMs;
            
            const force = this.windDirection * this.windForce * (delta / 16.666);
            this.players.forEach(p => {
                if (p.health > 0 && !p.exploded && !p.isBoss) {
                    p.vx += force;
                }
            });
            this.enemies.forEach(e => {
                if (e.health > 0 && !e.exploded) {
                    e.vx += force;
                }
            });

            if (Math.random() < 0.08) {
                const wx = this.windDirection > 0 ? -120 : this.worldWidth + 120;
                const wy = Math.random() * this.worldHeight;
                let windLine = new Projectile(this, wx, wy, this.windDirection * 15, 0, '#6bff9b', 'wind');
                windLine.isBeam = false;
                windLine.followOwner = false;
                windLine.width = 120;
                windLine.height = 3;
                windLine.timer = 1800;
                windLine.checkCollisions = () => {};
                this.projectiles.push(windLine);
            }

            if (this.windDuration <= 0) {
                this.windTimer = 8000 + Math.random() * 6000;
            }
        } else {
            this.windTimer -= dtMs;
            if (this.windTimer <= 0) {
                this.windDirection = Math.random() < 0.5 ? 1 : -1;
                this.windDuration = 4000;
                this.windForce = 0.16;
                this.triggerCinematic(this.windDirection > 0 ? 'VIENTO DEL ESTE' : 'VIENTO DEL OESTE', '#6bff9b');
                this.playSfx('spell');
            }
        }
    }

    updateVolcanoEruption(delta) {
        if (this.gameState !== 'PLAYING') return;

        // Initialize state if not present
        if (this.volcanoState === undefined) {
            this.volcanoState = 'IDLE';
            this.volcanoTimer = 18000; // 18 seconds before rumble
            this.volcanoLavaRise = 0;
            this.volcanoTargetLavaRise = 0;
        }

        const dtMs = delta;
        this.volcanoTimer -= dtMs;

        // Lava height transition speed (smooth linear / lerp)
        const diff = this.volcanoTargetLavaRise - this.volcanoLavaRise;
        if (Math.abs(diff) > 0.1) {
            this.volcanoLavaRise += Math.sign(diff) * Math.min(Math.abs(diff), 1.5 * (delta / 16.666));
        } else {
            this.volcanoLavaRise = this.volcanoTargetLavaRise;
        }

        // Bubbling lava sounds/shaking particles on lava line
        const killY = this.getKillPlaneY();
        if (Math.random() < 0.18) {
            this.ambientParticles.push({
                x: Math.random() * this.worldWidth,
                y: killY,
                vx: (Math.random() - 0.5) * 1.2,
                vy: -1.2 - Math.random() * 1.8,
                color: '#ff4500',
                size: 3 + Math.random() * 4,
                alpha: 1.0,
                life: 1.0,
                decay: 0.015 + Math.random() * 0.015,
                isBubble: true
            });
        }

        if (this.volcanoState === 'IDLE') {
            if (this.volcanoTimer <= 0) {
                // Change to RUMBLE
                this.volcanoState = 'RUMBLE';
                this.volcanoTimer = 5000; // 5 seconds rumble
                this.triggerCinematic('¡EL VOLCÁN ESTÁ RETUMBANDO!', '#ff4500');
                this.playSfx('spell');
            }
        } else if (this.volcanoState === 'RUMBLE') {
            // Shake camera periodically
            if (Math.random() < 0.15) {
                this.shakeTime = Math.max(this.shakeTime, 15);
                this.shakeMagnitude = Math.max(this.shakeMagnitude, 6);
            }

            // Spawn ash/lava bubble particles from the bottom
            if (Math.random() < 0.4) {
                this.ambientParticles.push({
                    x: Math.random() * this.worldWidth,
                    y: this.worldHeight - 20,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -4 - Math.random() * 4,
                    color: '#ffa500',
                    size: 3 + Math.random() * 5,
                    alpha: 1.0,
                    life: 1.0,
                    decay: 0.008 + Math.random() * 0.008
                });
            }

            if (this.volcanoTimer <= 0) {
                // Change to ERUPTING
                this.volcanoState = 'ERUPTING';
                this.volcanoTimer = 15000; // 15 seconds of eruption
                this.volcanoTargetLavaRise = 350; // Lava rises 350px!
                this.triggerCinematic('¡ERUPCIÓN! ESCALA A LAS PLATAFORMAS', '#ff0000');
                this.playSfx('gameover'); // High tension alert sound
            }
        } else if (this.volcanoState === 'ERUPTING') {
            // Intense screen shake
            if (Math.random() < 0.25) {
                this.shakeTime = Math.max(this.shakeTime, 20);
                this.shakeMagnitude = Math.max(this.shakeMagnitude, 10);
            }

            // Spawn falling fireballs!
            if (this.fireballSpawnTimer === undefined) this.fireballSpawnTimer = 0;
            this.fireballSpawnTimer -= dtMs;
            if (this.fireballSpawnTimer <= 0) {
                this.fireballSpawnTimer = 800 + Math.random() * 600;
                
                const startX = Math.random() * this.worldWidth;
                const vx = (Math.random() - 0.5) * 6;
                const vy = 5 + Math.random() * 4;
                
                let fireball = new Projectile(this, startX, -50, vx, vy, '#ff4500', 'volcano');
                fireball.isVolcanoFireball = true;
                fireball.width = 18;
                fireball.height = 18;
                fireball.timer = 8000;
                fireball.checkCollisions = () => {};
                
                this.projectiles.push(fireball);
            }

            if (this.volcanoTimer <= 0) {
                // Change to RETREATING
                this.volcanoState = 'RETREATING';
                this.volcanoTimer = 8000; // 8 seconds to cool down and descend
                this.volcanoTargetLavaRise = 0; // Lava retreats
            }
        }
    }

    updateHellHazards(delta) {
        if (this.gameState !== 'PLAYING') return;

        if (this.hellTimer === undefined) {
            this.hellTimer = 0;
        }

        this.hellTimer -= delta;
        if (this.hellTimer <= 0) {
            // Spawn 1 to 2 rising fireballs
            const count = Math.random() < 0.4 ? 2 : 1;
            for (let i = 0; i < count; i++) {
                const rx = 520 + Math.random() * 550; // In the gap (504 to 1096)
                const ry = this.worldHeight + 30;
                const vx = (Math.random() - 0.5) * 4;
                const vy = -8 - Math.random() * 5; // Negative velocity to rise up

                let fireball = new Projectile(this, rx, ry, vx, vy, '#ff3300', 'hell');
                fireball.isVolcanoFireball = true;
                fireball.width = 18;
                fireball.height = 18;
                fireball.timer = 9000;
                fireball.checkCollisions = () => {};

                this.projectiles.push(fireball);
            }
            this.hellTimer = 1200 + Math.random() * 1200; // Spawn every 1.2 to 2.4 seconds
        }
    }

    updateFactoryDrips(delta) {
        if (this.gameState !== 'PLAYING') return;

        if (!this.factoryNozzles) {
            this.factoryNozzles = [
                { x: 220, progress: 0, speed: 0.008 + Math.random() * 0.012, color: '#ff007f' },
                { x: 420, progress: 0, speed: 0.008 + Math.random() * 0.012, color: '#00f3ff' },
                { x: 720, progress: 0, speed: 0.008 + Math.random() * 0.012, color: '#da00ff' },
                { x: 960, progress: 0, speed: 0.008 + Math.random() * 0.012, color: '#ffee00' },
                { x: 1180, progress: 0, speed: 0.008 + Math.random() * 0.012, color: '#00ff66' },
                { x: 1450, progress: 0, speed: 0.008 + Math.random() * 0.012, color: '#ff3366' },
                { x: 1680, progress: 0, speed: 0.008 + Math.random() * 0.012, color: '#00ffcc' },
                { x: 1900, progress: 0, speed: 0.008 + Math.random() * 0.012, color: '#ffaa00' }
            ];
        }

        const colors = ['#ff007f', '#00f3ff', '#da00ff', '#ffee00', '#00ff66', '#ff3366', '#00ffcc', '#ffaa00'];

        this.factoryNozzles.forEach(nozzle => {
            nozzle.progress += nozzle.speed * (delta / 16.666);
            if (nozzle.progress >= 1.0) {
                // Drop is fully formed! Spawn it physical!
                let drip = new Projectile(this, nozzle.x, 22, 0, 7.5, nozzle.color, 'factory');
                drip.isFactoryDrip = true;
                drip.width = 12;
                drip.height = 12;
                drip.timer = 6000;
                drip.checkCollisions = () => {};
                this.projectiles.push(drip);

                // Reset this nozzle state
                nozzle.progress = 0;
                nozzle.speed = 0.005 + Math.random() * 0.014;
                nozzle.color = colors[Math.floor(Math.random() * colors.length)];
            }
        });
    }

    getMapDisplayName(type) {
        const names = {
            classic: 'Clásico',
            grand_arena: 'Gran Arena',
            floating_islands: 'Islas Flotantes',
            towers: 'Torres Gemelas',
            pit: 'El Foso Mortal',
            hell: 'Infierno',
            volcano: 'El Volcán',
            dojo: 'Dojo de Bambú',
            factory: 'Fábrica de Pintura',
            garden: 'Jardín Gigante',
            pirate_bay: 'Bahía Pirata',
            choke_point: 'Choke Point',
            sky_temple: 'Templo Celeste'
        };
        return names[type] || 'Desconocido';
    }

    beginRoundPreview() {
        this.gameState = 'PREVIEW';
        this.clearCanvasFilter();
        
        const previewOverlay = document.getElementById('map-preview-overlay');
        const previewTitle = document.getElementById('map-preview-title');
        const previewText = document.getElementById('map-preview-text');
        
        if (previewTitle) {
            previewTitle.textContent = `Preview: ${this.getMapDisplayName(this.mapType)}`;
        }
        if (previewText) {
            previewText.textContent = 'Rojo = caida peligrosa. Puntos brillantes = spawns seguros. La pelea empieza en 2 segundos.';
        }
        if (previewOverlay) {
            previewOverlay.style.display = 'flex';
        }
        
        this.playSfx('preview');
        
        this.time.delayedCall(2200, () => {
            if (this.gameState !== 'PREVIEW') return;
            if (previewOverlay) {
                previewOverlay.style.display = 'none';
            }
            this.gameState = 'PLAYING';
            
            // If PvE mode, trigger cinematic for wave start
            if (this.gameMode === 'pve' || this.gameMode === 'roguelike') {
                this.triggerCinematic(`OLEADA ${this.currentWave}`, '#00f3ff');
            }
        });
    }

    drawMapPreviewFrame(ctx) {
        ctx.fillStyle = '#030308';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        const pad = 70;
        const scale = Math.min((this.canvasWidth - pad * 2) / this.worldWidth, (this.canvasHeight - pad * 2) / this.worldHeight);
        const ox = (this.canvasWidth - this.worldWidth * scale) / 2;
        const oy = (this.canvasHeight - this.worldHeight * scale) / 2;

        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(scale, scale);

        ctx.fillStyle = 'rgba(255, 0, 60, 0.20)';
        ctx.fillRect(0, this.worldHeight - 38, this.worldWidth, 38);
        ctx.strokeStyle = 'rgba(255, 0, 60, 0.8)';
        ctx.lineWidth = 5 / scale;
        ctx.beginPath();
        ctx.moveTo(0, this.worldHeight - 38);
        ctx.lineTo(this.worldWidth, this.worldHeight - 38);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
        ctx.lineWidth = 1 / scale;
        for (let x = 0; x <= this.worldWidth; x += 120) { 
            ctx.beginPath(); 
            ctx.moveTo(x, 0); 
            ctx.lineTo(x, this.worldHeight); 
            ctx.stroke(); 
        }
        for (let y = 0; y <= this.worldHeight; y += 120) { 
            ctx.beginPath(); 
            ctx.moveTo(0, y); 
            ctx.lineTo(this.worldWidth, y); 
            ctx.stroke(); 
        }

        this.platforms.forEach(p => {
            const color = p.getTileColorAt(p.x + 2, p.y + 2);
            ctx.fillStyle = color !== '#222222' ? color : '#4b5563';
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.fillRect(p.x, p.y, p.width, Math.max(3, 4 / scale));
        });

        const spawns = this.getSafeSpawnPositions(Math.max(this.players.length, 2));
        spawns.forEach((s, i) => {
            const color = this.players[i]?.baseColor || '#ffffff';
            ctx.shadowBlur = 24 / scale;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(s.x + 15, s.y + 15, 20, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    safeEllipse(ctx, x, y, rx, ry, rot, start, end, anticlockwise = false) {
        if (!ctx) return;
        if (isNaN(x) || isNaN(y) || isNaN(rx) || isNaN(ry) || isNaN(rot)) return;
        rx = Math.abs(rx);
        ry = Math.abs(ry);
        if (rx < 0.001 || ry < 0.001) return;
        
        if (ctx.ellipse) {
            try {
                ctx.ellipse(x, y, rx, ry, rot, start, end, anticlockwise);
                return;
            } catch (e) {
                // Fallback to scaling path
            }
        }
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(rx, ry);
        ctx.beginPath();
        ctx.arc(0, 0, 1, start, end, anticlockwise);
        ctx.restore();
    }

    drawWaifuCompanion(ctx, x, y, color, facingRight) {
        if (!ctx) return;
        if (!color) color = '#ffffff';
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        
        try {
            ctx.save(); 
            ctx.translate(x, y);
            if (!facingRight) ctx.scale(-1, 1);
            
            // Scaled slightly smaller to look more compact and fit in a 30x40 area nicely
            ctx.scale(0.85, 0.85); 

            const flap = Math.sin(Date.now() / 110) * 0.22;
            const hairWave = Math.sin(Date.now() / 140) * 0.15;
            
            // 1. Wings (Cute angel wings floating behind)
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            for (let w = 0; w < 3; w++) {
                ctx.save();
                ctx.translate(-10, 8);
                ctx.rotate(-0.3 + flap - w * 0.18);
                ctx.beginPath();
                this.safeEllipse(ctx, -8 - w * 2, -2, 10 - w * 2, 4.5 - w * 0.6, -0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();

            // 2. Back Hair / Twintails (Drawn behind the head/body)
            ctx.fillStyle = color;
            // Left Twintail
            ctx.save();
            ctx.translate(-7, 4);
            ctx.rotate(-0.35 + hairWave);
            ctx.beginPath();
            this.safeEllipse(ctx, -6, 12, 4, 15, 0.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Right Twintail
            ctx.save();
            ctx.translate(7, 4);
            ctx.rotate(0.35 - hairWave);
            ctx.beginPath();
            this.safeEllipse(ctx, 6, 12, 4, 15, -0.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 3. Back Bob Hair (Rounded hair behind the head)
            ctx.beginPath();
            ctx.arc(0, 0, 11, Math.PI, 0); // Rounded top hair dome
            ctx.fill();
            // Rounded side hair locks
            ctx.beginPath();
            this.safeEllipse(ctx, -10, 4, 2.5, 7, 0.15, 0, Math.PI * 2);
            this.safeEllipse(ctx, 10, 4, 2.5, 7, -0.15, 0, Math.PI * 2);
            ctx.fill();

            // 4. Headset (Band and cat ears)
            ctx.strokeStyle = '#1e1e24';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, -1, 10.5, Math.PI, 0);
            ctx.stroke();
            
            // Cat Ears
            ctx.fillStyle = '#1e1e24';
            ctx.beginPath();
            ctx.moveTo(-7, -8);
            ctx.quadraticCurveTo(-11, -17, -13, -17);
            ctx.quadraticCurveTo(-9, -13, -3, -10);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ffb3d1';
            ctx.beginPath();
            ctx.moveTo(-6, -9);
            ctx.quadraticCurveTo(-9, -15, -11, -15);
            ctx.quadraticCurveTo(-8, -12, -4, -10);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#1e1e24';
            ctx.beginPath();
            ctx.moveTo(7, -8);
            ctx.quadraticCurveTo(11, -17, 13, -17);
            ctx.quadraticCurveTo(9, -13, 3, -10);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ffb3d1';
            ctx.beginPath();
            ctx.moveTo(6, -9);
            ctx.quadraticCurveTo(9, -15, 11, -15);
            ctx.quadraticCurveTo(8, -12, 4, -10);
            ctx.closePath();
            ctx.fill();

            // Ear cups
            ctx.fillStyle = color;
            ctx.strokeStyle = '#1e1e24';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            this.safeEllipse(ctx, -10.5, 2, 2.5, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            this.safeEllipse(ctx, 10.5, 2, 2.5, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 5. Face / Skin
            ctx.fillStyle = '#ffe5d9'; // Soft skin tone
            ctx.beginPath();
            ctx.arc(0, 1, 9, 0, Math.PI * 2);
            ctx.fill();

            // 6. Sailor Outfit (Body, Collar, Ribbon, Skirt)
            // Sailor Collar
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(-5, 9);
            ctx.lineTo(5, 9);
            ctx.lineTo(3.5, 12);
            ctx.lineTo(-3.5, 12);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#1e1e24';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Dress Body
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-4, 12);
            ctx.lineTo(4, 12);
            ctx.lineTo(6.5, 21);
            ctx.lineTo(-6.5, 21);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Ribbon Bow
            ctx.fillStyle = '#ff3b6f';
            ctx.beginPath();
            ctx.arc(0, 13.5, 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, 13.5);
            ctx.lineTo(-3.5, 16.5);
            ctx.lineTo(-1, 16.5);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, 13.5);
            ctx.lineTo(3.5, 16.5);
            ctx.lineTo(1, 16.5);
            ctx.closePath();
            ctx.fill();

            // 7. Legs & Boots
            ctx.fillStyle = '#ffe5d9'; // Thighs
            ctx.fillRect(-2, 21, 1.5, 3.5);
            ctx.fillRect(0.5, 21, 1.5, 3.5);
            
            ctx.fillStyle = '#222225'; // Black knee-high socks/boots
            ctx.beginPath();
            this.safeEllipse(ctx, -1.25, 26, 1.6, 2, 0, 0, Math.PI * 2);
            this.safeEllipse(ctx, 1.25, 26, 1.6, 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // 8. Eyes (Big Anime Style)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            this.safeEllipse(ctx, -2.8, 1.5, 2.5, 4.2, 0, 0, Math.PI * 2);
            this.safeEllipse(ctx, 2.8, 1.5, 2.5, 4.2, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = color; // Iris
            ctx.beginPath();
            this.safeEllipse(ctx, -2.5, 1.5, 1.8, 3.2, 0, 0, Math.PI * 2);
            this.safeEllipse(ctx, 2.5, 1.5, 1.8, 3.2, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#1e1e24'; // Pupil
            ctx.beginPath();
            this.safeEllipse(ctx, -2.3, 1.5, 1.1, 1.8, 0, 0, Math.PI * 2);
            this.safeEllipse(ctx, 2.3, 1.5, 1.1, 1.8, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff'; // Highlights
            ctx.beginPath();
            ctx.arc(-2.6, 0.2, 0.8, 0, Math.PI * 2);
            ctx.arc(2.2, 0.2, 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-1.7, 2.5, 0.4, 0, Math.PI * 2);
            ctx.arc(3.1, 2.5, 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Eyelashes/Brows
            ctx.strokeStyle = '#1e1e24';
            ctx.lineWidth = 1.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(-2.8, -1, 3, Math.PI * 1.2, Math.PI * 1.8);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(2.8, -1, 3, Math.PI * 1.2, Math.PI * 1.8);
            ctx.stroke();

            // 9. Blushing Cheeks
            ctx.fillStyle = 'rgba(255, 94, 120, 0.45)';
            ctx.beginPath();
            this.safeEllipse(ctx, -5.5, 5, 2, 1.1, 0, 0, Math.PI * 2);
            this.safeEllipse(ctx, 5.5, 5, 2, 1.1, 0, 0, Math.PI * 2);
            ctx.fill();

            // 10. Cute Smile
            ctx.strokeStyle = '#333339';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(0, 5.5, 1.4, 0, Math.PI);
            ctx.stroke();

            // 11. Front Hair Bangs (Layered and curved locks)
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-9.5, -3);
            ctx.quadraticCurveTo(-6, 2, -5, 2.5); // Left strand
            ctx.quadraticCurveTo(-4, 0, -2.5, -4);
            ctx.quadraticCurveTo(0, 3, 1, 3.2);    // Middle strand
            ctx.quadraticCurveTo(1.5, 0, 3.5, -3);
            ctx.quadraticCurveTo(6, 1.5, 8.5, -2);   // Right strand
            ctx.lineTo(9.5, -7);
            ctx.quadraticCurveTo(0, -11, -9.5, -7);
            ctx.closePath();
            ctx.fill();

            // Star clip
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            const scX = 4.5, scY = -5.5, scSize = 2;
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5;
                ctx.lineTo(scX + Math.cos(angle) * scSize, scY + Math.sin(angle) * scSize);
            }
            ctx.closePath();
            ctx.fill();
        } catch (e) {
            console.error("Error drawing waifu companion:", e);
        } finally {
            ctx.restore();
        }
    }


    getSafeSpawnPositions(count) {
        const surfaces = this.platforms
            .filter(p => p.height <= 45 && p.width >= 10 && p.y < this.getKillPlaneY() - 8)
            .sort((a, b) => a.y - b.y || a.x - b.x);
        const grouped = [];

        surfaces.forEach(p => {
            let last = grouped[grouped.length - 1];
            if (last && Math.abs(last.y - p.y) < 2 && p.x <= last.x + last.width + 14) {
                last.width = Math.max(last.width, p.x + p.width - last.x);
            } else {
                grouped.push({ x: p.x, y: p.y, width: p.width });
            }
        });

        const candidates = grouped
            .filter(s => s.width >= 48)
            .sort((a, b) => a.y - b.y || Math.abs((a.x + a.width / 2) - this.worldWidth / 2) - Math.abs((b.x + b.width / 2) - this.worldWidth / 2));

        if (candidates.length === 0) {
            return Array.from({ length: count }, (_, i) => ({
                x: 160 + ((this.worldWidth - 320) * ((i + 1) / (count + 1))),
                y: this.worldHeight - 150
            }));
        }

        const topBandY = candidates[0].y + 180;
        const spawnPool = candidates.filter(s => s.y <= topBandY);
        return Array.from({ length: count }, (_, i) => {
            const segment = spawnPool[i % spawnPool.length];
            const lane = (i + 1) / (count + 1);
            const x = Math.max(20, Math.min(segment.x + segment.width * lane - 15, this.worldWidth - 50));
            return { x, y: Math.max(20, segment.y - 45) };
        });
    }

}

class FloatingText {
    constructor(scene, x, y, text, color, isGiant = false, targetId = null) {
        this.scene = scene;
        this.isGiant = isGiant;
        this.targetId = targetId;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = isGiant ? -1.5 - Math.random() * 1.5 : -3.5 - Math.random() * 2.5;
        this.life = isGiant ? 1.0 : 0.6;
        this.initialLife = this.life;
        this.textObj = scene.add.text(x, y, text, {
            fontFamily: 'Montserrat',
            fontSize: isGiant ? '44px' : '20px',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: isGiant ? 6 : 3
        }).setOrigin(0.5);

        this.scaleMultiplier = isGiant ? 1.45 : 1.25;
        this.textObj.setScale(this.scaleMultiplier);
    }

    update(dt) {
        this.textObj.x += this.vx * dt;
        this.textObj.y += this.vy * dt;
        if (!this.isGiant) {
            this.vy += 0.15 * dt;
        }
        this.life -= (this.isGiant ? 0.015 : 0.025) * dt;
        
        const lifeProgress = Math.max(0, Math.min(1, this.life / this.initialLife));
        const currentScale = 1.0 + (this.scaleMultiplier - 1.0) * Math.pow(lifeProgress, 2.5);
        this.textObj.setScale(currentScale);

        this.textObj.setAlpha(Math.max(0, Math.min(1, this.life)));
        if (this.life <= 0) {
            this.textObj.destroy();
            return false;
        }
        return true;
    }
}

class BambooPole {
    constructor(x, y, height, thickness) {
        this.x = x;
        this.y = y;
        this.height = height || (120 + Math.random() * 80);
        this.thickness = thickness || (6 + Math.random() * 6);
        this.angle = 0;   // radians
        this.av = 0;      // angular velocity
        this.k = 0.005;   // spring restoring force constant
        this.c = 0.05;    // damping
    }

    update(windDir, windForce, players, enemies, dt) {
        // Spring torque
        let springTorque = -this.k * this.angle;
        // Damping torque
        let dampingTorque = -this.c * this.av;
        // Wind torque
        let windTorque = windForce > 0 ? windDir * windForce * 0.02 : 0;
        
        // Entity push
        let interactionTorque = 0;
        const checkEntity = (ent) => {
            if (ent.health <= 0 || ent.exploded) return;
            const entBottom = ent.y + ent.height / 2;
            const entTop = ent.y - ent.height / 2;
            if (entBottom >= this.y - this.height && entTop <= this.y) {
                const relativeHeight = this.y - ent.y;
                const currentPoleX = this.x + relativeHeight * Math.sin(this.angle);
                const tolerance = ent.width / 2 + this.thickness / 2 + 10;
                const dx = ent.x - currentPoleX;
                if (Math.abs(dx) < tolerance) {
                    const pushDirection = dx > 0 ? -1 : 1;
                    const entityForce = (ent.vx || 0) * 0.05 + pushDirection * 0.02;
                    interactionTorque += entityForce * (relativeHeight / this.height);
                }
            }
        };

        players.forEach(checkEntity);
        enemies.forEach(checkEntity);

        let totalTorque = springTorque + dampingTorque + windTorque + interactionTorque;
        this.av += totalTorque * dt;
        this.angle += this.av * dt;

        // Clamp angle
        const maxAngle = 1.1;
        if (this.angle > maxAngle) {
            this.angle = maxAngle;
            this.av = 0;
        } else if (this.angle < -maxAngle) {
            this.angle = -maxAngle;
            this.av = 0;
        }
    }

    draw(ctx) {
        const numSegments = 5;
        let lastX = this.x;
        let lastY = this.y;
        const segHeight = this.height / numSegments;

        ctx.save();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 1; i <= numSegments; i++) {
            const ratio = i / numSegments;
            const currentAngle = this.angle * ratio;
            
            const nextX = lastX + Math.sin(currentAngle) * segHeight;
            const nextY = lastY - Math.cos(currentAngle) * segHeight;

            // Draw segment line
            ctx.strokeStyle = '#55bc3b';
            ctx.lineWidth = this.thickness;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(nextX, nextY);
            ctx.stroke();

            // Draw node rings (joints)
            ctx.strokeStyle = '#3d822a';
            ctx.lineWidth = this.thickness + 2.5;
            ctx.beginPath();
            const dx = Math.cos(currentAngle) * 3;
            const dy = Math.sin(currentAngle) * 3;
            ctx.moveTo(lastX - dx, lastY - dy);
            ctx.lineTo(lastX + dx, lastY + dy);
            ctx.stroke();

            // Draw leaves at upper joints
            if (i >= 3) {
                ctx.fillStyle = '#65d943';
                ctx.save();
                ctx.translate(lastX, lastY);
                ctx.rotate(currentAngle);
                
                // Leaf Left
                ctx.beginPath();
                ctx.ellipse(-this.thickness, 0, 10, 3, -Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Leaf Right
                ctx.beginPath();
                ctx.ellipse(this.thickness, 0, 10, 3, Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            }

            lastX = nextX;
            lastY = nextY;
        }
        ctx.restore();
    }
}
