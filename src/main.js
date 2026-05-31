import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';
import './style.css';

// CONTROLS AND COLORS CONSTANTS
const CONTROLS_MAP = {
    KB1: { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW'], down: ['KeyS'], shoot: ['KeyF'], action: ['KeyG'], cyclePrev: ['KeyQ'], cycleNext: ['KeyE'], ragdoll: ['KeyC'], hint: 'Mover: WASD<br>Disparo: F | Poder: G<br>Habilidad: Q/E | Trapo: C' },
    KB2: { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], down: ['ArrowDown'], shoot: ['Numpad0'], action: ['Numpad1'], cyclePrev: ['Numpad2'], cycleNext: ['Numpad3'], ragdoll: ['KeyV'], hint: 'Mover: Flechas<br>Disparo: Num0 | Poder: Num1<br>Habilidad: Num2/Num3 | Trapo: V' },
    GP: { hint: 'Joystick/D-Pad (Mover)<br>A (Saltar)<br>X/RT (Disparar)<br>B (Poder)<br>LB/RB (Cambiar)<br>LT/L3 (Trapo)' }
};

const PREDEF_COLORS = ['#00f3ff', '#ff003c', '#00ff00', '#ffff00', '#aa00ff', '#ffaa00', '#ffffff', '#0000ff'];
const MAX_PLAYERS = 6;

let game = null;
window.cromoPerfSettings = window.cromoPerfSettings || { mode: 'normal' };

// GATHER DYNAMIC CONFIG FROM UI
function getPlayerConfigs() {
    const configs = [];
    for (let i = 1; i <= MAX_PLAYERS; i++) {
        const activeCheckbox = document.getElementById(`active-p${i}`);
        const colorInput = document.getElementById(`color-p${i}`);
        const inputSelect = document.getElementById(`input-p${i}`);
        
        configs.push({
            id: i,
            active: i === 1 ? true : (activeCheckbox ? activeCheckbox.checked : false),
            color: colorInput ? colorInput.value : PREDEF_COLORS[i - 1],
            inputType: inputSelect ? inputSelect.value : (i === 1 ? 'KB1' : 'KB2')
        });
    }
    return configs;
}

// UPDATE PLAYER CARDS INTERFACE
function updateCardsUI() {
    for (let i = 1; i <= MAX_PLAYERS; i++) {
        const card = document.getElementById(`card-p${i}`);
        const activeCheckbox = document.getElementById(`active-p${i}`);
        const colorInput = document.getElementById(`color-p${i}`);
        const inputSelect = document.getElementById(`input-p${i}`);
        const hint = document.getElementById(`hint-p${i}`);

        if (!card) continue;

        const active = i === 1 ? true : (activeCheckbox ? activeCheckbox.checked : false);
        const color = colorInput ? colorInput.value : PREDEF_COLORS[i - 1];
        const inputVal = inputSelect ? inputSelect.value : 'GP0';

        if (active) {
            card.classList.remove('inactive');
            card.style.borderTopColor = color;
            card.style.setProperty('--color', color);
            card.querySelector('span').style.color = color;
        } else {
            card.classList.add('inactive');
            card.style.borderTopColor = '#333';
            card.querySelector('span').style.color = '#777';
        }

        if (inputVal === 'TOUCH') {
            hint.innerHTML = 'Controles en pantalla<br>mover, salto, disparo y poder';
        } else if (inputVal.startsWith('KB')) {
            hint.innerHTML = CONTROLS_MAP[inputVal]?.hint || '-';
        } else {
            hint.innerHTML = CONTROLS_MAP.GP.hint;
        }
    }

    // Shadow title effects
    const c1 = document.getElementById('color-p1')?.value || '#00f3ff';
    const activeP2 = document.getElementById('active-p2')?.checked;
    const c2 = activeP2 ? (document.getElementById('color-p2')?.value || '#ff003c') : c1;
    
    const titleText = document.getElementById('title-text');
    if (titleText) {
        titleText.style.textShadow = `3px 3px 0px ${c1}, -3px -3px 0px ${c2}`;
    }
    const container = document.getElementById('game-container');
    if (container) {
        container.style.boxShadow = `0 0 80px ${c1}33, 0 0 80px ${c2}33`;
    }
}

// MODAL OPEN / CLOSE HOOKS
function openSettingsModal() {
    document.getElementById('settings-modal').classList.add('active');
    document.getElementById('modal-overlay').classList.add('active');
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.remove('active');
    document.getElementById('modal-overlay').classList.remove('active');
}

function openHowToPlayModal() {
    document.getElementById('how-to-play-modal').classList.add('active');
    document.getElementById('modal-overlay').classList.add('active');
    // Reset to the first tab when opening
    const firstTab = document.querySelector('#how-to-play-modal .tab-btn');
    if (firstTab) firstTab.click();
}

function closeHowToPlayModal() {
    document.getElementById('how-to-play-modal').classList.remove('active');
    document.getElementById('modal-overlay').classList.remove('active');
}

function closeAllModals() {
    document.getElementById('settings-modal').classList.remove('active');
    document.getElementById('how-to-play-modal').classList.remove('active');
    document.getElementById('modal-overlay').classList.remove('active');
}

function initHowToPlayTabs() {
    const tabBtns = document.querySelectorAll('#how-to-play-modal .tab-btn');
    const tabPanes = document.querySelectorAll('#how-to-play-modal .tab-content-pane');
    
    tabBtns.forEach(btn => {
        btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.style.display = 'none');
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const targetPane = document.getElementById(tabId);
            if (targetPane) {
                targetPane.style.display = 'block';
            }
        };
    });
}

function updateModeUI() {
    const mode = document.getElementById('mode-select').value;
    const winsGroup = document.getElementById('wins-group');
    if (winsGroup) {
        winsGroup.style.display = (mode === 'pvp') ? 'flex' : 'none';
    }
}

// INITIALIZE PHASER GAME INSTANCE
function initGameInstance() {
    const [initialW, initialH] = getSelectedResolution();
    const config = {
        type: Phaser.CANVAS,
        canvas: document.getElementById('gameCanvas'),
        width: initialW,
        height: initialH,
        parent: 'game-container',
        input: {
            gamepad: true
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [GameScene]
    };

    game = new Phaser.Game(config);
    window.game = game;
}

function getSelectedResolution() {
    const raw = document.getElementById('res-select')?.value || '1280x720';
    const [w, h] = raw.split('x').map(v => parseInt(v, 10));
    return [Number.isFinite(w) ? w : 1280, Number.isFinite(h) ? h : 720];
}

function applyTechnicalSettings() {
    const [width, height] = getSelectedResolution();
    const rawRes = document.getElementById('res-select')?.value || '1280x720';
    const perfMode = document.getElementById('perf-select')?.value || 'normal';
    window.cromoPerfSettings = { mode: perfMode };

    const debugMode = document.getElementById('debug-mode')?.checked || false;
    const touchMode = document.getElementById('touch-mode')?.checked || false;
    const autoaim = document.getElementById('qol-autoaim')?.checked || false;
    const animeMode = document.getElementById('anime-mode')?.checked || false;
    const mapSelect = document.getElementById('map-select')?.value || 'classic';
    const modeSelect = document.getElementById('mode-select')?.value || 'pvp';
    const winsSelect = document.getElementById('wins-select')?.value || '3';

    try {
        localStorage.setItem('cromoResSelect', rawRes);
        localStorage.setItem('cromoPerfSelect', perfMode);
        localStorage.setItem('cromoDebugMode', debugMode.toString());
        localStorage.setItem('cromoTouchMode', touchMode.toString());
        localStorage.setItem('cromoAutoaim', autoaim.toString());
        localStorage.setItem('cromoAnimeMode', animeMode.toString());
        localStorage.setItem('cromoMapSelect', mapSelect);
        localStorage.setItem('cromoModeSelect', modeSelect);
        localStorage.setItem('cromoWinsSelect', winsSelect);
    } catch (e) {
        console.error("Could not save settings to localStorage:", e);
    }

    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.width = width;
        canvas.height = height;
    }

    if (game?.scale) {
        game.scale.resize(width, height);
        game.scale.refresh();
    }

    const scene = game?.scene?.getScene('GameScene');
    if (scene) {
        scene.canvasWidth = width;
        scene.canvasHeight = height;
        scene.cameras?.main?.setSize(width, height);
        scene.resizeCinematicOverlay?.();
    }

    syncTouchCanvasLayout();
    syncContainerSize();
}

// DYNAMIC GAME CONTAINER ASPECT RATIO AND MAX SIZE SYNC
function syncContainerSize() {
    const container = document.getElementById('game-container');
    if (!container) return;
    const touchMode = document.getElementById('touch-mode')?.checked;
    if (touchMode) {
        container.style.width = '100vw';
        container.style.height = '100svh';
        container.style.aspectRatio = '';
        return;
    }
    const [width, height] = getSelectedResolution();
    container.style.aspectRatio = `${width} / ${height}`;
    container.style.maxWidth = '100vw';
    container.style.maxHeight = '100vh';
    if (window.innerWidth / window.innerHeight > width / height) {
        container.style.width = 'auto';
        container.style.height = '100vh';
    } else {
        container.style.width = '100vw';
        container.style.height = 'auto';
    }
}

// DYNAMIC TOUCH CONTROLS CANVAS LAYOUT
function syncTouchCanvasLayout() {
    const container = document.getElementById('game-container');
    const touchMode = document.getElementById('touch-mode')?.checked;
    container.classList.toggle('touch-active', !!touchMode);

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    if (!touchMode) {
        canvas.style.width = '';
        canvas.style.height = '';
        return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const [rw, rh] = getSelectedResolution();
    const aspect = rw / rh;

    if (vw / vh > aspect) {
        canvas.style.height = '100%';
        canvas.style.width = 'auto';
    } else {
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
    }
}

// START A NEW ARENA MATCH
function startMatch() {
    const mapVal = document.getElementById('map-select').value;
    const modeVal = document.getElementById('mode-select').value;
    const winsVal = parseInt(document.getElementById('wins-select').value) || 3;
    const playerConfigs = getPlayerConfigs();

    // Toggle layouts visibility
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'block';

    const touchControls = document.getElementById('touch-controls');
    if (touchControls) {
        const hasTouchPlayer = playerConfigs.some(cfg => cfg.active && cfg.inputType === 'TOUCH');
        touchControls.style.display = (document.getElementById('touch-mode')?.checked || hasTouchPlayer) ? 'block' : 'none';
    }

    // Start scene with user variables
    game.scene.start('GameScene', {
        mapType: mapVal,
        gameMode: modeVal,
        winsLimit: winsVal,
        playerConfigs: playerConfigs
    });
}

// RETURN TO MAIN MENU LOBBY
function returnToMenu() {
    // Stop scene
    game.scene.stop('GameScene');

    // Toggle screen displays
    document.getElementById('hud').style.display = 'none';
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';

    const touchControls = document.getElementById('touch-controls');
    if (touchControls) {
        touchControls.style.display = 'none';
    }
}

// BIND DOM EVENT LISTENERS
window.addEventListener('DOMContentLoaded', () => {
    // Initialize touchState
    window.touchState = {
        left: false, right: false, jump: false, down: false, shoot: false,
        action: false, cycle: false, cyclePrev: false, cycleNext: false, ragdoll: false,
        joyX: 0, joyY: 0
    };

    // Setup touch controls events
    document.querySelectorAll('[data-touch]').forEach(btn => {
        const key = btn.dataset.touch;
        const setTouch = (value, ev) => {
            ev.preventDefault();
            if (value && ev.pointerId !== undefined) {
                try { btn.setPointerCapture(ev.pointerId); } catch (err) {}
            }
            window.touchState[key] = value;
        };
        btn.addEventListener('pointerdown', ev => setTouch(true, ev));
        btn.addEventListener('pointerup', ev => setTouch(false, ev));
        btn.addEventListener('pointercancel', ev => setTouch(false, ev));
        btn.addEventListener('pointerleave', ev => setTouch(false, ev));
    });

    // Joystick Setup
    const touchJoystick = document.getElementById('touch-joystick');
    const touchStick = document.getElementById('touch-stick');
    let touchJoystickPointer = null;

    function updateTouchJoystick(ev, active = true) {
        if (!touchJoystick || !touchStick) return;
        const rect = touchJoystick.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const max = rect.width * 0.34;
        let dx = active ? ev.clientX - cx : 0;
        let dy = active ? ev.clientY - cy : 0;
        const dist = Math.hypot(dx, dy);
        if (dist > max) {
            dx = (dx / dist) * max;
            dy = (dy / dist) * max;
        }
        window.touchState.joyX = dx / max;
        window.touchState.joyY = dy / max;
        window.touchState.left = window.touchState.joyX < -0.32;
        window.touchState.right = window.touchState.joyX > 0.32;
        window.touchState.down = window.touchState.joyY > 0.45;
        touchStick.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    if (touchJoystick) {
        touchJoystick.addEventListener('pointerdown', ev => {
            ev.preventDefault();
            touchJoystickPointer = ev.pointerId;
            try { touchJoystick.setPointerCapture(ev.pointerId); } catch (err) {}
            updateTouchJoystick(ev, true);
        });
        touchJoystick.addEventListener('pointermove', ev => {
            if (touchJoystickPointer === ev.pointerId) updateTouchJoystick(ev, true);
        });
        const releaseJoystick = ev => {
            if (touchJoystickPointer !== ev.pointerId) return;
            touchJoystickPointer = null;
            updateTouchJoystick(ev, false);
        };
        touchJoystick.addEventListener('pointerup', releaseJoystick);
        touchJoystick.addEventListener('pointercancel', releaseJoystick);
    }

    // Load from localStorage
    try {
        const savedRes = localStorage.getItem('cromoResSelect');
        const savedPerf = localStorage.getItem('cromoPerfSelect');
        const savedDebug = localStorage.getItem('cromoDebugMode');
        const savedTouch = localStorage.getItem('cromoTouchMode');
        const savedAutoaim = localStorage.getItem('cromoAutoaim');
        const savedAnime = localStorage.getItem('cromoAnimeMode');
        const savedMap = localStorage.getItem('cromoMapSelect');
        const savedMode = localStorage.getItem('cromoModeSelect');
        const savedWins = localStorage.getItem('cromoWinsSelect');

        if (savedRes) {
            const el = document.getElementById('res-select');
            if (el) el.value = savedRes;
        }
        if (savedPerf) {
            const el = document.getElementById('perf-select');
            if (el) el.value = savedPerf;
        }
        if (savedDebug !== null) {
            const el = document.getElementById('debug-mode');
            if (el) el.checked = savedDebug === 'true';
        }
        if (savedTouch !== null) {
            const el = document.getElementById('touch-mode');
            if (el) el.checked = savedTouch === 'true';
        }
        if (savedAutoaim !== null) {
            const el = document.getElementById('qol-autoaim');
            if (el) el.checked = savedAutoaim === 'true';
        }
        if (savedAnime !== null) {
            const el = document.getElementById('anime-mode');
            if (el) el.checked = savedAnime === 'true';
        }
        if (savedMap) {
            const el = document.getElementById('map-select');
            if (el) el.value = savedMap;
        }
        if (savedMode) {
            const el = document.getElementById('mode-select');
            if (el) el.value = savedMode;
        }
        if (savedWins) {
            const el = document.getElementById('wins-select');
            if (el) el.value = savedWins;
        }
    } catch (e) {
        console.error("Could not load settings from localStorage:", e);
    }

    // Setup player cards and UI elements
    updateModeUI();
    updateCardsUI();

    // Init the engine instance
    initGameInstance();
    applyTechnicalSettings();

    // Bind lobby UI interactions
    document.getElementById('mode-select').onchange = () => {
        updateModeUI();
        try { localStorage.setItem('cromoModeSelect', document.getElementById('mode-select').value); } catch(e){}
    };
    document.getElementById('map-select').onchange = () => {
        try { localStorage.setItem('cromoMapSelect', document.getElementById('map-select').value); } catch(e){}
    };
    document.getElementById('wins-select').onchange = () => {
        try { localStorage.setItem('cromoWinsSelect', document.getElementById('wins-select').value); } catch(e){}
    };
    document.getElementById('start-btn').onclick = startMatch;
    
    // Bind Player configuration change event listeners
    for (let i = 1; i <= MAX_PLAYERS; i++) {
        const checkbox = document.getElementById(`active-p${i}`);
        if (checkbox) checkbox.onchange = updateCardsUI;

        const colorInput = document.getElementById(`color-p${i}`);
        if (colorInput) colorInput.onchange = updateCardsUI;

        const inputSelect = document.getElementById(`input-p${i}`);
        if (inputSelect) inputSelect.onchange = updateCardsUI;
    }

    // Settings Modal
    document.getElementById('settings-toggle-btn').onclick = openSettingsModal;
    document.getElementById('settings-close-btn').onclick = closeSettingsModal;
    document.getElementById('modal-overlay').onclick = closeAllModals;
    document.getElementById('settings-save-btn').onclick = () => {
        applyTechnicalSettings();
        closeSettingsModal();
    };

    // How to Play Modal
    const howToPlayBtn = document.getElementById('how-to-play-btn');
    if (howToPlayBtn) howToPlayBtn.onclick = openHowToPlayModal;
    
    const howToPlayCloseBtn = document.getElementById('how-to-play-close-btn');
    if (howToPlayCloseBtn) howToPlayCloseBtn.onclick = closeHowToPlayModal;
    
    const howToPlayOkBtn = document.getElementById('how-to-play-ok-btn');
    if (howToPlayOkBtn) howToPlayOkBtn.onclick = closeHowToPlayModal;
    
    initHowToPlayTabs();

    const syncLayouts = () => {
        syncTouchCanvasLayout();
        syncContainerSize();
    };
    document.getElementById('touch-mode')?.addEventListener('change', syncLayouts);
    window.addEventListener('resize', syncLayouts);
    window.addEventListener('orientationchange', () => setTimeout(syncLayouts, 120));
    syncLayouts();

    // Pause Screen Buttons
    document.getElementById('resume-btn').onclick = () => {
        const scene = game.scene.getScene('GameScene');
        if (scene) scene.togglePause();
    };
    document.getElementById('quit-btn').onclick = returnToMenu;

    // Game Over Screen Buttons
    document.getElementById('rematch-btn').onclick = startMatch;
    document.getElementById('menu-btn').onclick = returnToMenu;
});
