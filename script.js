(() => {
  const POLISH = true;
  const ICON_DINO = true;
  const ASSET_DEBUG_OVERLAY = false;
  const AUDIO_BASE_CANDIDATES = ['assets/', ''];
  const SPRITE_BASE_CANDIDATES = ['assets/sprites/', 'sprites/', 'assets/', ''];
  const AUDIO_FILES = {
    bgm: 'bgm.mp3',
    jump: 'jump.wav.mp3',
    win: 'win.wav.mp3',
    hit: 'hit.wav.mp3'
  };
  const SPRITE_FILES = [
    'player_idle_0.png',
    'player_run_0.png',
    'player_run_1.png',
    'player_run_2.png',
    'player_jump_0.png',
    'player_fall_0.png',
    'player_skid_0.png',
    'player_hurt_0.png',
    'player_win_0.png',
    'enemy_walk_0.png',
    'enemy_walk_1.png',
    'coin_0.png',
    'coin_1.png',
    'coin_2.png',
    'coin_3.png',
    'power_0.png',
    'power_1.png',
    'tile_ground_top.png',
    'tile_ground_fill.png',
    'tile_platform_stone.png',
    'tile_platform_tech.png',
    'prop_bush_0.png',
    'prop_bush_1.png'
  ];
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;

  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const livesEl = document.getElementById('lives');
  const timeEl = document.getElementById('time');
  const bestEl = document.getElementById('best');
  const levelInfoEl = document.getElementById('levelInfo');
  const statusEl = document.getElementById('status');
  const hudEl = document.getElementById('hud');
  const controlsEl = document.getElementById('controls');
  const touchPadEl = document.getElementById('touchPad');

  const menuOverlayEl = document.getElementById('menuOverlay');
  const menuStartBtn = document.getElementById('menuStartBtn');
  const menuHowBtn = document.getElementById('menuHowBtn');
  const howToTextEl = document.getElementById('howToText');
  const levelBtns = Array.from(document.querySelectorAll('.levelBtn'));

  const finalOverlayEl = document.getElementById('finalOverlay');
  const finalScoreEl = document.getElementById('finalScore');
  const finalBestEl = document.getElementById('finalBest');
  const finalReplayBtn = document.getElementById('finalReplayBtn');
  const finalMenuBtn = document.getElementById('finalMenuBtn');
  const muteBtn = document.getElementById('muteBtn');

  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const missingAssets = new Set();
  const soundBank = loadSounds();
  const bgm = soundBank.bgm;
  const jumpSfx = soundBank.jump;
  const winSfx = soundBank.win;
  const hitSfx = soundBank.hit;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const initialMuted = localStorage.getItem('dinoSurvivalMuted') === '1';
  let bgmStarted = false;

  const sprites = {
    playerIdle: [],
    playerRun: [],
    playerJump: [],
    playerFall: [],
    playerSkid: [],
    playerHurt: [],
    playerWin: [],
    enemyWalk: [],
    coin: [],
    power: [],
    groundTop: [],
    groundFill: [],
    platformStone: [],
    platformTech: [],
    bush: []
  };
  const spriteSheets = {
    ready: false,
    playerIdle: null,
    playerRun: null,
    playerJump: null,
    playerFall: null,
    playerSkid: null,
    playerHurt: null,
    playerWin: null,
    enemyWalk: null,
    coin: null,
    power: null,
    bush: null
  };

  const WORLD_WIDTH = 6200;
  const GROUND_Y = 480;
  const PLAYER_W = 32;
  const PLAYER_H = 42;

  const player = {
    x: 100,
    y: GROUND_Y - PLAYER_H,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    face: 1,
    powerTimer: 0,
    hurtTimer: 0,
    jumpBoostTime: 0,
    landingSquashTimer: 0,
    animState: 'idle',
    animTimer: 0,
    animFrame: 0
  };

  const state = {
    mode: 'menu',
    level: 1,
    score: 0,
    coins: 0,
    lives: 3,
    time: 180,
    cameraX: 0,
    dropSpawnTimer: 1.2,
    shakeTimer: 0,
    shakeAmp: 0,
    stageBannerTimer: 1.8,
    stageBannerText: 'BOLUM 1',
    stageCompleteText: 'BOLUM 1 TAMAMLANDI',
    transition: { active: false, timer: 0, targetLevel: 0, text: '', kind: 'none', portalX: 0 },
    shootCooldown: 0,
    bossDefeated: false,
    homeScene: { active: false },
    teleport: { active: false, phase: 'none', timer: 0, targetPipe: -1 },
    lastTs: 0,
    animTime: 0,
    checkpointX: 100,
    bestScore: Number(localStorage.getItem('dinoSurvivalBest') || 0),
    muted: initialMuted
  };

  const input = {
    left: false,
    right: false,
    down: false,
    jumpPressed: false,
    jumpHeld: false,
    shootPressed: false,
    shootHeld: false
  };

  const platforms = [];
  const coins = [];
  const enemies = [];
  const mushrooms = [];

  const portal = { active: false, x: 0, y: 0, h: 220 };
  const home = { active: false, x: 0, y: 0, w: 130, h: 100 };
  const skyDrops = [];
  const floatingTexts = [];
  const dustParticles = [];
  const sparkles = [];
  const blockDebris = [];
  const playerShots = [];
  const bossShots = [];
  const boss = { active: false, x: 0, y: 0, w: 86, h: 72, hp: 0, maxHp: 0, dir: -1, shootTimer: 0, bobPhase: 0 };
  const skyDropTypes = [
    { kind: 'coin', points: 90, color: '#ffe082' },
    { kind: 'meat', points: 140, color: '#ffb4ad' },
    { kind: 'energy', points: 210, color: '#a9ecff' }
  ];
  const decorPipes = [];
  const pipeLinks = [];

  function getPipeRect(pipe) {
    return { x: pipe.x, y: pipe.y, w: pipe.w, h: pipe.h };
  }

  function pushCoinLine(x, y, count, step) {
    for (let i = 0; i < count; i += 1) {
      coins.push({ x: x + i * step, y, r: 9, taken: false });
    }
  }

  function setPlatformDefaults(p) {
    p.bumpTimer = 0;
    p.questionUsed = false;
    p.itemTimer = 0;
    p.itemType = '';
  }

  function clearLevelData() {
    platforms.length = 0;
    coins.length = 0;
    enemies.length = 0;
    mushrooms.length = 0;
    decorPipes.length = 0;
    pipeLinks.length = 0;
    skyDrops.length = 0;
    floatingTexts.length = 0;
    dustParticles.length = 0;
    sparkles.length = 0;
    blockDebris.length = 0;
    playerShots.length = 0;
    bossShots.length = 0;
    boss.active = false;
    boss.hp = 0;
    boss.maxHp = 0;
    portal.active = false;
    home.active = false;
  }

  function loadLevel(level) {
    clearLevelData();
    state.level = level;

    const basePlatforms =
      level === 1
        ? [
            { x: 0, y: GROUND_Y, w: WORLD_WIDTH, h: 80, type: 'ground' },
            { x: 260, y: 400, w: 130, h: 20, type: 'brick' },
            { x: 460, y: 350, w: 130, h: 20, type: 'brick' },
            { x: 690, y: 300, w: 140, h: 20, type: 'brick' },
            { x: 980, y: 420, w: 150, h: 20, type: 'brick' },
            { x: 1290, y: 360, w: 180, h: 20, type: 'brick' },
            { x: 1600, y: 300, w: 160, h: 20, type: 'brick' },
            { x: 1870, y: 420, w: 150, h: 20, type: 'brick' },
            { x: 2220, y: 340, w: 220, h: 20, type: 'brick' },
            { x: 2540, y: 280, w: 120, h: 20, type: 'question' },
            { x: 2760, y: 350, w: 160, h: 20, type: 'brick' },
            { x: 3120, y: 290, w: 180, h: 20, type: 'brick' },
            { x: 3470, y: 370, w: 180, h: 20, type: 'brick' },
            { x: 3860, y: 320, w: 220, h: 20, type: 'brick' },
            { x: 4280, y: 390, w: 200, h: 20, type: 'brick' },
            { x: 4700, y: 320, w: 170, h: 20, type: 'question' },
            { x: 5030, y: 260, w: 150, h: 20, type: 'brick' },
            { x: 5320, y: 340, w: 220, h: 20, type: 'brick' },
            { x: 5620, y: 390, w: 170, h: 20, type: 'brick' }
          ]
        : level === 2
        ? [
            { x: 0, y: GROUND_Y, w: WORLD_WIDTH, h: 80, type: 'ground' },
            { x: 300, y: 410, w: 140, h: 20, type: 'brick' },
            { x: 560, y: 350, w: 120, h: 20, type: 'question' },
            { x: 770, y: 295, w: 130, h: 20, type: 'brick' },
            { x: 1020, y: 400, w: 160, h: 20, type: 'brick' },
            { x: 1320, y: 332, w: 150, h: 20, type: 'brick' },
            { x: 1610, y: 278, w: 180, h: 20, type: 'question' },
            { x: 1980, y: 420, w: 160, h: 20, type: 'brick' },
            { x: 2280, y: 355, w: 180, h: 20, type: 'brick' },
            { x: 2620, y: 300, w: 130, h: 20, type: 'brick' },
            { x: 2920, y: 256, w: 130, h: 20, type: 'question' },
            { x: 3210, y: 340, w: 180, h: 20, type: 'brick' },
            { x: 3560, y: 286, w: 160, h: 20, type: 'brick' },
            { x: 3880, y: 230, w: 140, h: 20, type: 'brick' },
            { x: 4190, y: 345, w: 220, h: 20, type: 'brick' },
            { x: 4620, y: 300, w: 180, h: 20, type: 'question' },
            { x: 4960, y: 245, w: 170, h: 20, type: 'brick' },
            { x: 5310, y: 335, w: 200, h: 20, type: 'brick' },
            { x: 5650, y: 280, w: 160, h: 20, type: 'brick' }
          ]
        : [
            { x: 0, y: GROUND_Y, w: WORLD_WIDTH, h: 80, type: 'ground' },
            { x: 320, y: 420, w: 180, h: 20, type: 'brick' },
            { x: 710, y: 370, w: 150, h: 20, type: 'brick' },
            { x: 1040, y: 320, w: 170, h: 20, type: 'brick' },
            { x: 1420, y: 390, w: 180, h: 20, type: 'brick' },
            { x: 1820, y: 340, w: 190, h: 20, type: 'question' },
            { x: 2240, y: 280, w: 180, h: 20, type: 'brick' },
            { x: 2690, y: 350, w: 200, h: 20, type: 'brick' },
            { x: 3140, y: 300, w: 180, h: 20, type: 'brick' },
            { x: 3600, y: 250, w: 200, h: 20, type: 'brick' },
            { x: 4070, y: 320, w: 170, h: 20, type: 'brick' },
            { x: 4480, y: 360, w: 220, h: 20, type: 'brick' },
            { x: 5000, y: 310, w: 260, h: 20, type: 'brick' }
          ];

    for (const p of basePlatforms) {
      setPlatformDefaults(p);
      platforms.push(p);
    }

    if (level === 1) {
      portal.active = true;
      portal.x = 6000;
      portal.y = GROUND_Y - 230;
      portal.h = 230;
      pushCoinLine(280, 360, 6, 55);
      pushCoinLine(1010, 380, 5, 45);
      pushCoinLine(1630, 260, 6, 45);
      pushCoinLine(2240, 300, 5, 50);
      pushCoinLine(3140, 250, 6, 50);
      pushCoinLine(3890, 280, 7, 45);
      pushCoinLine(5060, 220, 4, 50);
      mushrooms.push({ x: 2580, y: 246, w: 24, h: 24, taken: false });
      mushrooms.push({ x: 4740, y: 286, w: 24, h: 24, taken: false });

      enemies.push(
        { type: 'walker', x: 720, y: GROUND_Y - 30, w: 30, h: 30, minX: 640, maxX: 930, vx: 80, dead: false, tone: '#d65757' },
        { type: 'walker', x: 1730, y: GROUND_Y - 30, w: 30, h: 30, minX: 1660, maxX: 1960, vx: 90, dead: false, tone: '#d65757' },
        { type: 'walker', x: 2870, y: GROUND_Y - 30, w: 30, h: 30, minX: 2830, maxX: 3140, vx: 75, dead: false, tone: '#d65757' },
        { type: 'walker', x: 4360, y: GROUND_Y - 30, w: 30, h: 30, minX: 4300, maxX: 4580, vx: 100, dead: false, tone: '#d65757' },
        { type: 'walker', x: 5480, y: GROUND_Y - 30, w: 30, h: 30, minX: 5400, maxX: 5820, vx: 95, dead: false, tone: '#d65757' }
      );
      decorPipes.push(
        { x: 890, y: GROUND_Y - 64, w: 56, h: 64 },
        { x: 2090, y: GROUND_Y - 78, w: 60, h: 78 },
        { x: 3370, y: GROUND_Y - 70, w: 58, h: 70 },
        { x: 4540, y: GROUND_Y - 84, w: 64, h: 84 }
      );
      pipeLinks.push({ from: 0, to: 2 }, { from: 1, to: 3 });
      return;
    }

    if (level === 2) {
      portal.active = true;
      portal.x = 6060;
      portal.y = GROUND_Y - 250;
      portal.h = 250;
      pushCoinLine(340, 362, 5, 55);
      pushCoinLine(820, 250, 5, 50);
      pushCoinLine(1370, 298, 6, 46);
      pushCoinLine(2320, 310, 6, 45);
      pushCoinLine(3250, 292, 6, 48);
      pushCoinLine(4220, 300, 7, 44);
      pushCoinLine(5360, 250, 6, 50);
      mushrooms.push({ x: 1650, y: 244, w: 24, h: 24, taken: false });
      mushrooms.push({ x: 4650, y: 266, w: 24, h: 24, taken: false });

      enemies.push(
        { type: 'walker', x: 680, y: GROUND_Y - 30, w: 30, h: 30, minX: 610, maxX: 920, vx: 95, dead: false, tone: '#d43c3c' },
        { type: 'bat', x: 1480, y: 255, baseY: 255, w: 32, h: 28, minX: 1380, maxX: 1850, vx: 120, dead: false, amp: 26, flapPhase: 0.8, tone: '#d74646' },
        { type: 'walker', x: 2460, y: GROUND_Y - 30, w: 30, h: 30, minX: 2370, maxX: 2720, vx: 110, dead: false, tone: '#d43c3c' },
        { type: 'bat', x: 3380, y: 220, baseY: 220, w: 32, h: 28, minX: 3280, maxX: 3720, vx: 135, dead: false, amp: 24, flapPhase: 2.6, tone: '#c93a3a' },
        { type: 'walker', x: 4780, y: GROUND_Y - 30, w: 30, h: 30, minX: 4680, maxX: 5100, vx: 115, dead: false, tone: '#d94848' },
        { type: 'bat', x: 5560, y: 235, baseY: 235, w: 32, h: 28, minX: 5460, maxX: 5920, vx: 130, dead: false, amp: 22, flapPhase: 1.7, tone: '#cf4545' }
      );

      decorPipes.push(
        { x: 980, y: GROUND_Y - 70, w: 60, h: 70 },
        { x: 2720, y: GROUND_Y - 88, w: 66, h: 88 },
        { x: 4020, y: GROUND_Y - 76, w: 62, h: 76 },
        { x: 5200, y: GROUND_Y - 92, w: 70, h: 92 }
      );
      pipeLinks.push({ from: 0, to: 3 }, { from: 1, to: 2 });
      return;
    }

    portal.active = false;
    pushCoinLine(360, 382, 4, 48);
    pushCoinLine(1130, 282, 5, 46);
    pushCoinLine(2320, 240, 4, 44);
    pushCoinLine(3660, 210, 5, 46);
    mushrooms.push({ x: 1860, y: 306, w: 24, h: 24, taken: false });

    enemies.push(
      { type: 'walker', x: 880, y: GROUND_Y - 30, w: 30, h: 30, minX: 790, maxX: 1230, vx: 105, dead: false, tone: '#bf3b3b' },
      { type: 'bat', x: 2760, y: 210, baseY: 210, w: 32, h: 28, minX: 2670, maxX: 3140, vx: 140, dead: false, amp: 20, flapPhase: 1.1, tone: '#b53636' },
      { type: 'walker', x: 4240, y: GROUND_Y - 30, w: 30, h: 30, minX: 4140, maxX: 4720, vx: 118, dead: false, tone: '#b73838' }
    );

    boss.active = true;
    boss.x = 5660;
    boss.y = GROUND_Y - boss.h;
    boss.w = 96;
    boss.h = 78;
    boss.hp = 22;
    boss.maxHp = 22;
    boss.dir = -1;
    boss.shootTimer = 1.25;
    boss.bobPhase = 0;
    home.active = false;
    home.x = 6005;
    home.y = GROUND_Y - 118;
    home.w = 130;
    home.h = 100;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function rectHit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function reportMissingAsset(path, kind = 'asset', detail = '') {
    if (missingAssets.has(path)) return;
    missingAssets.add(path);
    const suffix = detail ? ` (${detail})` : '';
    console.error(`[asset-missing] ${kind}: ${path}${suffix}`);
  }

  function uniquePaths(paths) {
    const seen = new Set();
    const out = [];
    for (const p of paths) {
      const k = String(p || '').trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
    return out;
  }

  function buildCandidatePaths(fileName, bases) {
    return uniquePaths(
      bases.map(base => {
        if (!base) return fileName;
        return `${base}${fileName}`;
      })
    );
  }

  function loadSounds() {
    function makeAudio(fileName, volume, loop = false) {
      const candidates = buildCandidatePaths(fileName, AUDIO_BASE_CANDIDATES);
      const track = new Audio(candidates[0]);
      track.volume = volume;
      track.loop = loop;
      let idx = 0;
      track.addEventListener('error', () => {
        const err = track.error ? track.error.code : 'unknown';
        if (idx < candidates.length - 1) {
          idx += 1;
          const next = candidates[idx];
          console.warn(`[asset-fallback] audio ${fileName} -> ${next}`);
          track.src = next;
          track.load();
          return;
        }
        reportMissingAsset(candidates.join(' | '), 'audio', `media-error-${err}`);
      });
      track.addEventListener('stalled', () => {
        reportMissingAsset(candidates[idx], 'audio', 'stalled');
      });
      return track;
    }

    return {
      bgm: makeAudio(AUDIO_FILES.bgm, 0.34, true),
      jump: makeAudio(AUDIO_FILES.jump, 0.45),
      win: makeAudio(AUDIO_FILES.win, 0.5),
      hit: makeAudio(AUDIO_FILES.hit, 0.42)
    };
  }

  async function assetSelfTest() {
    if (window.location.protocol === 'file:') return;
    const spriteChecks = SPRITE_FILES.map(name => ({ kind: 'sprite', file: name, candidates: buildCandidatePaths(name, SPRITE_BASE_CANDIDATES) }));
    const audioChecks = Object.values(AUDIO_FILES).map(name => ({ kind: 'audio', file: name, candidates: buildCandidatePaths(name, AUDIO_BASE_CANDIDATES) }));
    const checks = [...audioChecks, ...spriteChecks].map(async entry => {
      let ok = false;
      try {
        for (const path of entry.candidates) {
          const url = new URL(path, window.location.href);
          let res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
          if (!res.ok) {
            res = await fetch(url, { method: 'GET', cache: 'no-store' });
          }
          if (res.ok) {
            ok = true;
            break;
          }
        }
      } catch (err) {
        reportMissingAsset(entry.candidates.join(' | '), 'fetch', err && err.message ? err.message : 'request-failed');
        return;
      }
      if (!ok) {
        reportMissingAsset(entry.candidates.join(' | '), 'fetch', `not-found (${entry.kind})`);
      }
    });
    await Promise.all(checks);
    if (missingAssets.size === 0) {
      console.info('[asset-self-test] all assets reachable');
    }
  }

  function playBeep(freq, ms) {
    if (state.muted) return;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.value = 0.06;
      o.connect(g);
      g.connect(ac.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + ms / 1000);
      o.stop(ac.currentTime + ms / 1000);
    } catch (_) {}
  }

  function playSfx(sfx) {
    if (state.muted) return;
    try {
      const snd = sfx.cloneNode();
      snd.volume = sfx.volume;
      snd.play().catch(() => {});
    } catch (_) {}
  }

  function updateMuteButtonText() {
    muteBtn.textContent = `Ses: ${state.muted ? 'Kapali' : 'Acik'}`;
    muteBtn.setAttribute('aria-pressed', state.muted ? 'true' : 'false');
  }

  function applyMuteState() {
    bgm.muted = state.muted;
    localStorage.setItem('dinoSurvivalMuted', state.muted ? '1' : '0');
    updateMuteButtonText();
  }

  function updateUiVisibility() {
    const inMenu = state.mode === 'menu';
    const inFinal = state.mode === 'won';
    const hideGameUi = inMenu || inFinal;
    hudEl.classList.toggle('hidden', hideGameUi);
    controlsEl.classList.toggle('hidden', hideGameUi);
    statusEl.classList.toggle('hidden', hideGameUi);
    menuOverlayEl.classList.toggle('hidden', !inMenu);
    finalOverlayEl.classList.toggle('hidden', state.mode !== 'won');
    if (state.mode === 'won') {
      finalScoreEl.textContent = String(state.score);
      finalBestEl.textContent = String(state.bestScore);
    }
    const shouldHideTouch = hideGameUi || (!isTouchDevice && window.innerWidth > 920);
    if (shouldHideTouch) {
      touchPadEl.classList.add('hidden');
    } else {
      touchPadEl.classList.remove('hidden');
    }
  }

  function loadSpriteByName(fileName) {
    const candidates = buildCandidatePaths(fileName, SPRITE_BASE_CANDIDATES);
    const img = new Image();
    let idx = 0;
    img.addEventListener('error', () => {
      if (idx < candidates.length - 1) {
        idx += 1;
        const next = candidates[idx];
        console.warn(`[asset-fallback] image ${fileName} -> ${next}`);
        img.src = next;
        return;
      }
      reportMissingAsset(candidates.join(' | '), 'image', 'image-error');
    });
    img.src = candidates[0];
    return img;
  }

  function setupSprites() {
    sprites.playerIdle = [loadSpriteByName('player_idle_0.png')];
    sprites.playerRun = [
      loadSpriteByName('player_run_0.png'),
      loadSpriteByName('player_run_1.png'),
      loadSpriteByName('player_run_2.png')
    ];
    sprites.playerJump = [loadSpriteByName('player_jump_0.png')];
    sprites.playerFall = [loadSpriteByName('player_fall_0.png')];
    sprites.playerSkid = [loadSpriteByName('player_skid_0.png')];
    sprites.playerHurt = [loadSpriteByName('player_hurt_0.png')];
    sprites.playerWin = [loadSpriteByName('player_win_0.png')];
    sprites.enemyWalk = [
      loadSpriteByName('enemy_walk_0.png'),
      loadSpriteByName('enemy_walk_1.png')
    ];
    sprites.coin = [
      loadSpriteByName('coin_0.png'),
      loadSpriteByName('coin_1.png'),
      loadSpriteByName('coin_2.png'),
      loadSpriteByName('coin_3.png')
    ];
    sprites.power = [
      loadSpriteByName('power_0.png'),
      loadSpriteByName('power_1.png')
    ];
    sprites.groundTop = [loadSpriteByName('tile_ground_top.png')];
    sprites.groundFill = [loadSpriteByName('tile_ground_fill.png')];
    sprites.platformStone = [loadSpriteByName('tile_platform_stone.png')];
    sprites.platformTech = [loadSpriteByName('tile_platform_tech.png')];
    sprites.bush = [loadSpriteByName('prop_bush_0.png'), loadSpriteByName('prop_bush_1.png')];
  }

  function drawSprite(img, x, y, w, h, flip = false) {
    if (!img || !img.complete || img.naturalWidth === 0) return false;
    ctx.save();
    if (flip) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.restore();
    return true;
  }

  function buildSpriteSheet(images) {
    if (!images || images.length === 0) return null;
    for (const img of images) {
      if (!img || !img.complete || img.naturalWidth === 0) return null;
    }
    const frameW = images[0].naturalWidth;
    const frameH = images[0].naturalHeight;
    const canvasSheet = document.createElement('canvas');
    canvasSheet.width = frameW * images.length;
    canvasSheet.height = frameH;
    const g = canvasSheet.getContext('2d');
    g.imageSmoothingEnabled = true;
    for (let i = 0; i < images.length; i += 1) {
      g.drawImage(images[i], i * frameW, 0, frameW, frameH);
    }
    return { image: canvasSheet, frameW, frameH, count: images.length };
  }

  function drawSheetFrame(sheet, frame, x, y, w, h, flip = false, scaleX = 1, scaleY = 1) {
    if (!sheet || !sheet.image) return false;
    const idx = ((Math.floor(frame) % sheet.count) + sheet.count) % sheet.count;
    const sx = idx * sheet.frameW;
    const sy = 0;
    const cx = x + w * 0.5;
    const cy = y + h * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale((flip ? -1 : 1) * scaleX, scaleY);
    ctx.drawImage(sheet.image, sx, sy, sheet.frameW, sheet.frameH, -w * 0.5, -h * 0.5, w, h);
    ctx.restore();
    return true;
  }

  function ensureSpriteSheets() {
    if (spriteSheets.ready) return;
    const readyArrays = [
      sprites.playerIdle,
      sprites.playerRun,
      sprites.playerJump,
      sprites.playerFall,
      sprites.playerSkid,
      sprites.playerHurt,
      sprites.playerWin,
      sprites.enemyWalk,
      sprites.coin,
      sprites.power,
      sprites.bush
    ];
    for (const arr of readyArrays) {
      if (!arr || arr.length === 0) return;
      for (const img of arr) {
        if (!img || !img.complete || img.naturalWidth === 0) return;
      }
    }

    spriteSheets.playerIdle = buildSpriteSheet(sprites.playerIdle);
    spriteSheets.playerRun = buildSpriteSheet(sprites.playerRun);
    spriteSheets.playerJump = buildSpriteSheet(sprites.playerJump);
    spriteSheets.playerFall = buildSpriteSheet(sprites.playerFall);
    spriteSheets.playerSkid = buildSpriteSheet(sprites.playerSkid);
    spriteSheets.playerHurt = buildSpriteSheet(sprites.playerHurt);
    spriteSheets.playerWin = buildSpriteSheet(sprites.playerWin);
    spriteSheets.enemyWalk = buildSpriteSheet(sprites.enemyWalk);
    spriteSheets.coin = buildSpriteSheet(sprites.coin);
    spriteSheets.power = buildSpriteSheet(sprites.power);
    spriteSheets.bush = buildSpriteSheet(sprites.bush);
    spriteSheets.ready = true;
  }

  function getPlayerAnimState() {
    if (state.mode === 'won') return 'win';
    if (player.hurtTimer > 0.04) return 'hurt';
    if (!player.onGround) return player.vy < 20 ? 'jump' : 'fall';
    const braking = (input.left && player.vx > 120) || (input.right && player.vx < -120);
    if (braking) return 'skid';
    if (Math.abs(player.vx) > 34) return 'run';
    return 'idle';
  }

  function updatePlayerAnimation(dt) {
    const next = getPlayerAnimState();
    if (next !== player.animState) {
      player.animState = next;
      player.animFrame = 0;
      player.animTimer = 0;
    }

    const fps =
      player.animState === 'run'
        ? 12
        : player.animState === 'skid'
        ? 10
        : player.animState === 'idle'
        ? 4
        : 1;
    const count =
      player.animState === 'run' || player.animState === 'skid'
        ? Math.max(1, (spriteSheets.playerRun && spriteSheets.playerRun.count) || sprites.playerRun.length)
        : Math.max(1, (spriteSheets.playerIdle && spriteSheets.playerIdle.count) || sprites.playerIdle.length);

    player.animTimer += dt;
    if (fps > 1 && player.animTimer >= 1 / fps) {
      player.animTimer = 0;
      player.animFrame = (player.animFrame + 1) % count;
    }
  }

  function drawShadow(x, y, w, h, alpha = 0.24) {
    ctx.save();
    ctx.fillStyle = `rgba(12, 24, 10, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.9, w * 0.4, h * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawIconDino(x, y, w, h, flip, scaleX, scaleY, mood = 'normal') {
    const cx = x + w * 0.5;
    const cy = y + h * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale((flip ? -1 : 1) * scaleX, scaleY);
    ctx.translate(-w * 0.5, -h * 0.5);

    const bodyMain = mood === 'hurt' ? '#d47070' : mood === 'win' ? '#7fdc93' : '#69c57b';
    const bodyLight = mood === 'hurt' ? '#efb1b1' : '#bff0c8';
    const stripe = mood === 'hurt' ? '#b84f4f' : '#4fa663';

    ctx.fillStyle = bodyMain;
    ctx.beginPath();
    ctx.ellipse(19, 24, 10, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(20, 12, 12, 10);

    ctx.beginPath();
    ctx.moveTo(9, 22);
    ctx.lineTo(1, 25);
    ctx.lineTo(9, 27);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = bodyLight;
    ctx.beginPath();
    ctx.ellipse(18, 25, 5.5, 4.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = stripe;
    ctx.beginPath();
    ctx.moveTo(14, 13);
    ctx.lineTo(16, 9);
    ctx.lineTo(19, 13);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(19, 11);
    ctx.lineTo(21, 7);
    ctx.lineTo(24, 11);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(24, 13);
    ctx.lineTo(26, 9);
    ctx.lineTo(29, 13);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#304a33';
    ctx.fillRect(15, 31, 4, 9);
    ctx.fillRect(21, 31, 4, 9);

    ctx.fillStyle = '#13251a';
    ctx.fillRect(28, 16, 2, 2);
    if (mood === 'win') {
      ctx.fillStyle = '#f6ffe5';
      ctx.fillRect(30, 14, 2, 2);
      ctx.fillRect(32, 14, 2, 2);
    }
    ctx.restore();
  }

  function drawIconEnemy(x, y, w, h, flip, t = 0, variant = 'walker', tone = '#d65757') {
    ctx.save();
    const cx = x + w * 0.5;
    const cy = y + h * 0.5;
    ctx.translate(cx, cy);
    ctx.scale(flip ? -1 : 1, 1);
    ctx.translate(-w * 0.5, -h * 0.5);

    if (variant === 'bat') {
      const wing = Math.sin(t * 18) * 4.2;
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.ellipse(18, 17, 8.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(17, 17);
      ctx.lineTo(4, 10 + wing);
      ctx.lineTo(8, 20 + wing * 0.5);
      ctx.lineTo(17, 19);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(19, 17);
      ctx.lineTo(32, 10 + wing);
      ctx.lineTo(28, 20 + wing * 0.5);
      ctx.lineTo(19, 19);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd5d5';
      ctx.fillRect(16, 15, 3, 2);
      ctx.fillStyle = '#2a1111';
      ctx.fillRect(14, 14, 2, 2);
      ctx.fillRect(20, 14, 2, 2);
      ctx.restore();
      return;
    }

    const bounce = Math.abs(Math.sin(t * 11)) * 1.2;
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.ellipse(18, 20 + bounce, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(20, 11 + bounce, 11, 9);

    ctx.beginPath();
    ctx.moveTo(8, 21 + bounce);
    ctx.lineTo(0, 24 + bounce);
    ctx.lineTo(8, 26 + bounce);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f2b0b0';
    ctx.beginPath();
    ctx.ellipse(18, 21 + bounce, 5.6, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8f2f2f';
    ctx.fillRect(15, 30, 4, 8);
    ctx.fillRect(21, 30, 4, 8);

    ctx.fillStyle = '#2a1111';
    ctx.fillRect(27, 15 + bounce, 2, 2);
    ctx.restore();
  }

  function triggerLandingFeedback(speed) {
    if (!POLISH) return;
    const normalized = clamp((speed - 140) / 520, 0, 1);
    player.landingSquashTimer = 0.12;
    state.shakeTimer = 0.1;
    state.shakeAmp = 0.9 + normalized * 0.7;

    const count = 2 + Math.floor(Math.random() * 3);
    const baseX = player.x + player.w * 0.5;
    const baseY = player.y + player.h - 1;
    for (let i = 0; i < count; i += 1) {
      dustParticles.push({
        x: baseX + (Math.random() * 20 - 10),
        y: baseY + (Math.random() * 2 - 1),
        vx: Math.random() * 80 - 40,
        vy: -(25 + Math.random() * 36),
        size: 2 + Math.random() * 2,
        life: 0.3,
        maxLife: 0.3
      });
    }
  }

  function spawnSparkles(x, y, color = [255, 242, 168], count = 5) {
    for (let i = 0; i < count; i += 1) {
      sparkles.push({
        x: x + (Math.random() * 14 - 7),
        y: y + (Math.random() * 14 - 7),
        vx: Math.random() * 120 - 60,
        vy: -(40 + Math.random() * 90),
        life: 0.34,
        maxLife: 0.34,
        size: 1.5 + Math.random() * 1.8,
        color
      });
    }
  }

  function spawnBlockDebris(p) {
    const pieces = 6;
    for (let i = 0; i < pieces; i += 1) {
      blockDebris.push({
        x: p.x + p.w * 0.5 + (Math.random() * 16 - 8),
        y: p.y + p.h * 0.5,
        vx: Math.random() * 220 - 110,
        vy: -(80 + Math.random() * 120),
        life: 0.38,
        maxLife: 0.38,
        size: 3 + Math.random() * 2,
        color: p.type === 'question' ? [176, 228, 248] : [198, 164, 121]
      });
    }
  }

  function activateQuestionBlock(p) {
    if (p.questionUsed || p.type !== 'question') return;
    p.questionUsed = true;
    p.itemTimer = 0.5;
    p.itemType = Math.random() < 0.28 ? 'energy' : 'coin';
    if (p.itemType === 'coin') {
      state.coins += 1;
      state.score += 180;
      addFloatingText(p.x + p.w * 0.5, p.y - 8, '+180', '#ffe082');
      spawnSparkles(p.x + p.w * 0.5, p.y, [255, 238, 140], 7);
      playBeep(1020, 50);
    } else {
      player.powerTimer = Math.max(player.powerTimer, 7);
      state.score += 260;
      addFloatingText(p.x + p.w * 0.5, p.y - 8, '+260', '#b6ecff');
      spawnSparkles(p.x + p.w * 0.5, p.y, [186, 236, 255], 8);
      playBeep(760, 70);
    }
  }

  function tryStartPipeTeleport() {
    if (state.mode !== 'running' || state.teleport.active) return;
    if (!player.onGround) return;
    for (const link of pipeLinks) {
      const enterPipe = decorPipes[link.from];
      const exitPipe = decorPipes[link.to];
      const playerCenter = player.x + player.w * 0.5;
      const insideX = playerCenter > enterPipe.x + 8 && playerCenter < enterPipe.x + enterPipe.w - 8;
      const nearTop = Math.abs(player.y + player.h - enterPipe.y) < 8;
      if (!insideX || !nearTop) continue;
      state.teleport.active = true;
      state.teleport.phase = 'in';
      state.teleport.timer = 0.22;
      state.teleport.targetPipe = link.to;
      player.vx = 0;
      player.vy = 0;
      player.animState = 'idle';
      player.animFrame = 0;
      player.animTimer = 0;
      state.stageBannerTimer = 0.6;
      state.stageBannerText = 'GIZLI GECIS';
      spawnSparkles(enterPipe.x + enterPipe.w * 0.5, enterPipe.y + 6, [185, 255, 177], 7);
      return;
    }
  }

  function updateTeleport(dt) {
    if (!state.teleport.active) return false;
    player.vx = 0;
    player.vy = 0;
    const outPipe = decorPipes[state.teleport.targetPipe];
    if (!outPipe) {
      state.teleport.active = false;
      return false;
    }

    if (state.teleport.phase === 'in') {
      player.y += 86 * dt;
      state.teleport.timer -= dt;
      if (state.teleport.timer <= 0) {
        player.x = outPipe.x + outPipe.w * 0.5 - player.w * 0.5;
        player.y = outPipe.y - player.h + 14;
        state.teleport.phase = 'out';
        state.teleport.timer = 0.22;
      }
      return true;
    }

    if (state.teleport.phase === 'out') {
      player.y -= 86 * dt;
      state.teleport.timer -= dt;
      if (state.teleport.timer <= 0) {
        player.y = outPipe.y - player.h;
        state.teleport.active = false;
        state.teleport.phase = 'none';
        state.teleport.targetPipe = -1;
        spawnSparkles(outPipe.x + outPipe.w * 0.5, outPipe.y + 2, [180, 250, 190], 7);
      }
      return true;
    }
    return true;
  }

  function updatePolish(dt) {
    if (!POLISH) return;
    if (player.landingSquashTimer > 0) player.landingSquashTimer = Math.max(0, player.landingSquashTimer - dt);
    if (state.shakeTimer > 0) state.shakeTimer = Math.max(0, state.shakeTimer - dt);

    for (let i = dustParticles.length - 1; i >= 0; i -= 1) {
      const p = dustParticles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.9;
      p.vy += 90 * dt;
      p.size += 13 * dt;
      if (p.life <= 0) dustParticles.splice(i, 1);
    }

    for (let i = sparkles.length - 1; i >= 0; i -= 1) {
      const s = sparkles[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.92;
      s.vy += 150 * dt;
      if (s.life <= 0) sparkles.splice(i, 1);
    }

    for (const p of platforms) {
      if (p.type === 'ground') continue;
      if (p.bumpTimer > 0) p.bumpTimer = Math.max(0, p.bumpTimer - dt);
      if (p.itemTimer > 0) p.itemTimer = Math.max(0, p.itemTimer - dt);
    }

    for (let i = blockDebris.length - 1; i >= 0; i -= 1) {
      const d = blockDebris[i];
      d.life -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 350 * dt;
      if (d.y > GROUND_Y + 8 || d.life <= 0) {
        blockDebris.splice(i, 1);
      }
    }
  }

  function drawDustParticles() {
    if (!POLISH) return;
    for (const p of dustParticles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      const x = p.x - state.cameraX;
      if (x < -20 || x > canvas.width + 20) continue;
      ctx.fillStyle = `rgba(232, 236, 222, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSparkles() {
    for (const s of sparkles) {
      const a = clamp(s.life / s.maxLife, 0, 1);
      const x = s.x - state.cameraX;
      if (x < -20 || x > canvas.width + 20) continue;
      const c = Array.isArray(s.color) ? s.color : [255, 240, 170];
      ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
      ctx.fillRect(x - s.size, s.y - 1, s.size * 2, 2);
      ctx.fillRect(x - 1, s.y - s.size, 2, s.size * 2);
    }
  }

  function drawBlockDebris() {
    for (const d of blockDebris) {
      const a = clamp(d.life / d.maxLife, 0, 1);
      const x = d.x - state.cameraX;
      if (x < -20 || x > canvas.width + 20) continue;
      ctx.fillStyle = `rgba(${d.color[0]}, ${d.color[1]}, ${d.color[2]}, ${a})`;
      ctx.fillRect(x - d.size * 0.5, d.y - d.size * 0.5, d.size, d.size);
    }
  }

  function getGroundDistanceUnderPlayer() {
    const bottom = player.y + player.h;
    let nearest = GROUND_Y - bottom;
    for (const p of platforms) {
      if (p.type === 'ground') continue;
      const overlapX = player.x + player.w > p.x + 2 && player.x < p.x + p.w - 2;
      if (!overlapX) continue;
      if (p.y < bottom - 1) continue;
      const d = p.y - bottom;
      if (d < nearest) nearest = d;
    }
    return Math.max(0, nearest);
  }

  function tryStartBgm() {
    if (state.muted) return;
    if (bgmStarted) {
      if (bgm.paused) {
        bgm.play().catch(err => {
          console.warn(`[audio] bgm resume failed: ${err && err.message ? err.message : 'unknown'}`);
        });
      }
      return;
    }
    bgm
      .play()
      .then(() => {
        bgmStarted = true;
      })
      .catch(err => {
        console.warn(`[audio] bgm play failed: ${err && err.message ? err.message : 'unknown'}`);
      });
  }

  function resetPlayerToCheckpoint() {
    player.x = state.checkpointX;
    player.y = GROUND_Y - player.h;
    player.vx = 0;
    player.vy = 0;
    player.hurtTimer = 1.2;
    player.jumpBoostTime = 0;
    player.landingSquashTimer = 0;
    player.animState = 'idle';
    player.animTimer = 0;
    player.animFrame = 0;
  }

  function spawnSkyDrop() {
    const t = skyDropTypes[Math.floor(Math.random() * skyDropTypes.length)];
    const x = state.cameraX + 60 + Math.random() * (canvas.width - 120);
    const y = 80 + Math.random() * 36;
    skyDrops.push({
      kind: t.kind,
      points: t.points,
      color: t.color,
      x,
      y,
      vy: 45 + Math.random() * 40,
      phase: Math.random() * Math.PI * 2
    });
  }

  function addFloatingText(x, y, text, color) {
    floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 1.1,
      maxLife: 1.1
    });
  }

  function updateFloatingTexts(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
      const ft = floatingTexts[i];
      ft.life -= dt;
      ft.y -= 45 * dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  function updateSkyDrops(dt) {
    state.dropSpawnTimer -= dt;
    if (state.dropSpawnTimer <= 0) {
      spawnSkyDrop();
      state.dropSpawnTimer = 0.75 + Math.random() * 1.1;
    }

    for (let i = skyDrops.length - 1; i >= 0; i -= 1) {
      const d = skyDrops[i];
      d.vy = Math.min(320, d.vy + 420 * dt);
      d.y += d.vy * dt;
      d.phase += dt * 4;

      if (d.y > GROUND_Y + 6) {
        skyDrops.splice(i, 1);
        continue;
      }

      const hitBox = { x: d.x - 12, y: d.y - 12, w: 24, h: 24 };
      if (rectHit(player, hitBox)) {
        state.score += d.points;
        if (d.kind === 'coin') state.coins += 1;
        addFloatingText(d.x, d.y - 6, `+${d.points}`, d.color);
        playBeep(d.kind === 'energy' ? 880 : d.kind === 'meat' ? 520 : 980, 50);
        skyDrops.splice(i, 1);
      }
    }
  }

  function setMode(nextMode, text) {
    state.mode = nextMode;
    if (text) statusEl.textContent = text;
    updateUiVisibility();
  }

  function levelTitle(level) {
    if (level === 2) return 'BOLUM 2 GECE';
    if (level === 3) return 'BOLUM 3 MAGARA BOSS';
    return 'BOLUM 1';
  }

  function transitionText(level) {
    if (level === 2) return 'BOLUM 2 YE GECILIYOR...';
    if (level === 3) return 'BOLUM 3 BOSS BASLIYOR...';
    return 'YENI BOLUM';
  }

  function startLevelTransition(targetLevel, seconds = 2) {
    state.transition.active = true;
    state.transition.timer = seconds;
    state.transition.targetLevel = targetLevel;
    state.transition.text = transitionText(targetLevel);
    state.transition.kind = 'portal';
    state.transition.portalX = portal.x;
    state.stageBannerTimer = Math.max(state.stageBannerTimer, seconds);
    state.stageBannerText = state.transition.text;
    input.shootPressed = false;
    input.jumpPressed = false;
    input.jumpHeld = false;
    setMode('transition', state.transition.text);
  }

  function resetPlayerForLevel() {
    player.x = 100;
    player.y = GROUND_Y - player.h;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.powerTimer = 0;
    player.hurtTimer = 0;
    player.jumpBoostTime = 0;
    player.landingSquashTimer = 0;
    player.animState = 'idle';
    player.animTimer = 0;
    player.animFrame = 0;
    input.jumpPressed = false;
    input.jumpHeld = false;
    input.shootPressed = false;
    input.shootHeld = false;
  }

  function prepareLevel(level, keepTimeAndPower = false) {
    loadLevel(level);
    state.cameraX = 0;
    state.dropSpawnTimer = 1.2;
    state.stageBannerTimer = 1.8;
    state.stageBannerText = levelTitle(level);
    state.stageCompleteText = `BOLUM ${level} TAMAMLANDI`;
    state.teleport.active = false;
    state.teleport.phase = 'none';
    state.teleport.timer = 0;
    state.teleport.targetPipe = -1;
    state.transition.active = false;
    state.transition.timer = 0;
    state.transition.targetLevel = 0;
    state.transition.text = '';
    state.transition.kind = 'none';
    state.transition.portalX = 0;
    state.checkpointX = 100;
    state.shakeTimer = 0;
    state.shakeAmp = 0;
    if (!keepTimeAndPower) state.time = level === 2 ? 210 : level === 3 ? 230 : 180;
    state.shootCooldown = 0;
    state.bossDefeated = false;
    state.homeScene.active = false;
    resetPlayerForLevel();
  }

  function tryAdvanceLevel(timeBonus) {
    if (state.level === 1) {
      state.score += 800 + timeBonus;
      state.time = Math.max(190, state.time + 8);
      startLevelTransition(2, 2);
      playSfx(winSfx);
      return true;
    }
    if (state.level === 2) {
      state.score += 1200 + timeBonus;
      state.time = Math.max(200, state.time + 12);
      startLevelTransition(3, 2);
      playSfx(winSfx);
      return true;
    }
    return false;
  }

  function shootPlayerProjectile() {
    if (state.mode !== 'running') return;
    if (state.shootCooldown > 0) return;
    const dir = player.face >= 0 ? 1 : -1;
    playerShots.push({
      x: player.x + player.w * 0.5 + dir * 10,
      y: player.y + player.h * 0.45,
      vx: dir * 560,
      life: 1.1
    });
    state.shootCooldown = state.level === 3 ? 0.16 : 0.2;
    playBeep(780, 35);
  }

  function triggerFinalWin() {
    state.bossDefeated = true;
    home.active = true;
    state.score += 1800;
    setMode('running', 'Boss etkisiz! Eve kadar devam et.');
    state.stageBannerTimer = 1.5;
    state.stageBannerText = 'BOSS YENILDI';
    state.stageCompleteText = 'EVE DONUS';
    playSfx(winSfx);
  }

  function updateHud() {
    scoreEl.textContent = String(state.score);
    coinsEl.textContent = String(state.coins);
    livesEl.textContent = String(state.lives);
    timeEl.textContent = String(Math.max(0, Math.ceil(state.time)));
    bestEl.textContent = String(state.bestScore);
    levelInfoEl.textContent = String(state.level);
  }

  function startFromLevel(level) {
    const target = clamp(level, 1, 3);
    if (target === 1) fullReset(false);
    else {
      state.score = 0;
      state.coins = 0;
      state.lives = 3;
      prepareLevel(target, false);
      updateHud();
    }
    setMode('running', 'Raptorla kos, dusmanlari gec ve portala ulas!');
    state.stageBannerTimer = 1.2;
    state.stageBannerText = levelTitle(state.level);
    tryStartBgm();
  }

  function openMainMenu() {
    setMode('menu', 'Ana menu');
    howToTextEl.classList.add('hidden');
    updateHud();
  }

  function startGame() {
    if (state.mode === 'running') return;
    startFromLevel(1);
    playBeep(460, 80);
  }

  function togglePause() {
    if (state.mode === 'running') {
      setMode('paused', 'Duraklatildi. Devam etmek icin tekrar bas.');
      return;
    }
    if (state.mode === 'paused') {
      setMode('running', 'Devam!');
    }
  }

  function fullReset(openMenuAfter = false) {
    state.score = 0;
    state.coins = 0;
    state.lives = 3;
    state.time = 180;
    prepareLevel(1, true);
    setMode('ready', "Hareket: A/D veya Ok tuslari, ates: Space, zipla: W/Ok Yukari");
    if (openMenuAfter) openMainMenu();
    updateHud();
  }

  function handlePlayerPhysics(dt) {
    const wasOnGround = player.onGround;
    let landedNow = false;
    let landingSpeed = 0;
    const acc = 1300;
    const maxSpeed = player.powerTimer > 0 ? 360 : 290;
    const friction = 1900;

    if (input.left) {
      player.vx -= acc * dt;
      player.face = -1;
    }
    if (input.right) {
      player.vx += acc * dt;
      player.face = 1;
    }
    if (!input.left && !input.right) {
      if (player.vx > 0) player.vx = Math.max(0, player.vx - friction * dt);
      else player.vx = Math.min(0, player.vx + friction * dt);
    }

    player.vx = clamp(player.vx, -maxSpeed, maxSpeed);

    if (input.jumpPressed && player.onGround) {
      player.vy = player.powerTimer > 0 ? -760 : -700;
      player.onGround = false;
      player.jumpBoostTime = 0;
      playSfx(jumpSfx);
    }
    input.jumpPressed = false;

    if (!player.onGround && input.jumpHeld && player.vy < 0 && player.jumpBoostTime < 0.16) {
      player.vy -= 1500 * dt;
      player.jumpBoostTime += dt;
    }
    player.vy = Math.max(player.vy, -860);

    player.vy += 1900 * dt;

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    player.onGround = false;
    for (const p of platforms) {
      if (p.type === 'ground') continue;
      if (!rectHit(player, p)) continue;

      const prevY = player.y - player.vy * dt;
      const prevBottom = prevY + player.h;

      if (prevBottom <= p.y + 8 && player.vy >= 0) {
        landingSpeed = Math.max(landingSpeed, player.vy);
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
        landedNow = true;
        player.jumpBoostTime = 0;
      } else if (player.x + player.w * 0.55 < p.x || player.x + player.w * 0.45 > p.x + p.w) {
        if (player.x < p.x) player.x = p.x - player.w;
        else player.x = p.x + p.w;
        player.vx *= -0.1;
      } else if (player.vy < 0) {
        player.y = p.y + p.h;
        player.vy = 50;
        if (p.type !== 'ground') {
          p.bumpTimer = 0.12;
          if (p.type === 'question') activateQuestionBlock(p);
          spawnSparkles(p.x + p.w * 0.5, p.y + 4, p.type === 'question' ? [186, 236, 255] : [255, 220, 178], 5);
          spawnBlockDebris(p);
        }
      }
    }

    for (let pipeIndex = 0; pipeIndex < decorPipes.length; pipeIndex += 1) {
      const pipe = decorPipes[pipeIndex];
      const solid = getPipeRect(pipe);
      if (!rectHit(player, solid)) continue;

      const prevY = player.y - player.vy * dt;
      const prevBottom = prevY + player.h;
      const isTeleportEntry = pipeLinks.some(link => link.from === pipeIndex);
      const allowPipeEnter = isTeleportEntry && input.down;

      if (prevBottom <= solid.y + 8 && player.vy >= 0) {
        landingSpeed = Math.max(landingSpeed, player.vy);
        player.y = solid.y - player.h;
        landedNow = true;
        player.jumpBoostTime = 0;
        if (allowPipeEnter) {
          player.vy = 0;
          player.onGround = true;
        } else {
          player.vy = -620;
          player.onGround = false;
          spawnSparkles(solid.x + solid.w * 0.5, solid.y + 2, [170, 255, 185], 4);
        }
      } else if (player.x + player.w * 0.55 < solid.x || player.x + player.w * 0.45 > solid.x + solid.w) {
        if (player.x < solid.x) player.x = solid.x - player.w;
        else player.x = solid.x + solid.w;
        player.vx *= -0.08;
      } else if (player.vy < 0) {
        player.y = solid.y + solid.h;
        player.vy = 40;
      }
    }

    if (player.y + player.h >= GROUND_Y) {
      landingSpeed = Math.max(landingSpeed, player.vy);
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      player.onGround = true;
      landedNow = true;
      player.jumpBoostTime = 0;
    }

    if (!wasOnGround && landedNow) {
      triggerLandingFeedback(landingSpeed);
    }

    player.x = clamp(player.x, 0, WORLD_WIDTH - player.w);

    if (player.x > state.checkpointX + 500) {
      state.checkpointX = player.x - 60;
    }

    if (player.y > canvas.height + 250) {
      state.lives -= 1;
      if (state.lives <= 0) {
        setMode('over', 'Oyun bitti! Sifirla ile yeniden baslayabilirsin.');
      } else {
        setMode('running', 'Cukurdan dustun! Kontrol noktasina donuyorsun.');
        resetPlayerToCheckpoint();
      }
    }
  }

  function handleCollectiblesAndCombat(dt) {
    if (player.powerTimer > 0) player.powerTimer -= dt;
    if (player.hurtTimer > 0) player.hurtTimer -= dt;

    for (const c of coins) {
      if (c.taken) continue;
      const fake = { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
      if (rectHit(player, fake)) {
        c.taken = true;
        state.coins += 1;
        state.score += 100;
        playBeep(980, 45);
        spawnSparkles(c.x, c.y, [255, 241, 143], 6);
      }
    }

    for (const m of mushrooms) {
      if (m.taken) continue;
      if (rectHit(player, m)) {
        m.taken = true;
        player.powerTimer = 10;
        state.score += 300;
        playBeep(620, 120);
        statusEl.textContent = 'Adrenalin modu aktif! 10 saniye hiz ve ziplaman artar.';
      }
    }

    for (const e of enemies) {
      if (e.dead) continue;
      if (e.type === 'bat') {
        e.x += e.vx * dt;
        if (e.x < e.minX || e.x > e.maxX) e.vx *= -1;
        e.y = e.baseY + Math.sin(state.animTime * 4.5 + e.flapPhase) * e.amp;
      } else {
        e.x += e.vx * dt;
        if (e.x < e.minX || e.x > e.maxX) e.vx *= -1;
      }

      if (!rectHit(player, e)) continue;

      const stomp = player.vy > 0 && player.y + player.h - e.y < (e.type === 'bat' ? 16 : 18);
      if (stomp) {
        e.dead = true;
        player.vy = e.type === 'bat' ? -330 : -360;
        state.score += e.type === 'bat' ? 320 : 250;
        playSfx(hitSfx);
        spawnSparkles(e.x + e.w * 0.5, e.y + 8, [210, 246, 198], 5);
        continue;
      }

      if (player.hurtTimer <= 0) {
        state.lives -= 1;
        player.hurtTimer = 1.2;
        playSfx(hitSfx);
        if (state.lives <= 0) {
          setMode('over', 'Dusmanlara yakalandin. Oyun bitti!');
          return;
        }
        resetPlayerToCheckpoint();
      }
    }

    if (state.level < 3 && portal.active && !state.transition.active) {
      const nearPortal = Math.abs(player.x + player.w * 0.5 - portal.x) < 26 && player.y + player.h > portal.y + portal.h - 24;
      if (nearPortal) {
        const timeBonus = Math.max(0, Math.floor(state.time)) * 20;
        if (tryAdvanceLevel(timeBonus)) {
          updateHud();
          return;
        }
      }
    }

    if (state.level === 3 && state.bossDefeated && home.active) {
      const door = { x: home.x + 48, y: home.y + 56, w: 30, h: 44 };
      if (rectHit(player, door)) {
        state.score += 900 + Math.max(0, Math.floor(state.time)) * 10;
        if (state.score > state.bestScore) {
          state.bestScore = state.score;
          localStorage.setItem('dinoSurvivalBest', String(state.bestScore));
        }
        setMode('won', 'TEBRIKLER KAZANDINIZ!');
        state.homeScene.active = true;
        state.stageBannerTimer = 1.7;
        state.stageBannerText = 'EVE HOS GELDIN';
        state.stageCompleteText = 'TEBRIKLER KAZANDINIZ';
        playSfx(winSfx);
      }
    }

  }

  function updateBossFight(dt) {
    if (state.level !== 3 || !boss.active || boss.hp <= 0) return;

    boss.bobPhase += dt * 2.3;
    const targetX = clamp(player.x + 240, 5400, 5940);
    const dx = targetX - boss.x;
    boss.x += clamp(dx, -120 * dt, 120 * dt);
    boss.dir = dx >= 0 ? 1 : -1;
    boss.y = GROUND_Y - boss.h + Math.sin(boss.bobPhase) * 6;

    boss.shootTimer -= dt;
    if (boss.shootTimer <= 0) {
      const angle = Math.atan2(player.y + player.h * 0.45 - (boss.y + 26), player.x - boss.x);
      bossShots.push({
        x: boss.x + boss.w * 0.25,
        y: boss.y + 26,
        vx: Math.cos(angle) * 260,
        vy: Math.sin(angle) * 260,
        life: 2.2
      });
      boss.shootTimer = 1.1 + Math.random() * 0.6;
      playBeep(460, 55);
    }

    if (rectHit(player, boss) && player.hurtTimer <= 0) {
      state.lives -= 1;
      player.hurtTimer = 1.2;
      playSfx(hitSfx);
      if (state.lives <= 0) {
        setMode('over', 'Boss seni yakaladi. Oyun bitti!');
        return;
      }
      resetPlayerToCheckpoint();
    }

    for (let i = bossShots.length - 1; i >= 0; i -= 1) {
      const b = bossShots[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.y > GROUND_Y + 40 || b.x < -40 || b.x > WORLD_WIDTH + 40) {
        bossShots.splice(i, 1);
        continue;
      }
      if (!rectHit(player, { x: b.x - 7, y: b.y - 7, w: 14, h: 14 })) continue;
      bossShots.splice(i, 1);
      if (player.hurtTimer > 0) continue;
      state.lives -= 1;
      player.hurtTimer = 1.1;
      playSfx(hitSfx);
      if (state.lives <= 0) {
        setMode('over', 'Boss mermisi seni vurdu. Oyun bitti!');
        return;
      }
      resetPlayerToCheckpoint();
    }
  }

  function updatePlayerProjectiles(dt) {
    for (let i = playerShots.length - 1; i >= 0; i -= 1) {
      const s = playerShots[i];
      s.life -= dt;
      s.x += s.vx * dt;
      if (s.life <= 0 || s.x < state.cameraX - 60 || s.x > state.cameraX + canvas.width + 60) {
        playerShots.splice(i, 1);
        continue;
      }

      let hit = false;
      for (const e of enemies) {
        if (e.dead) continue;
        if (!rectHit({ x: s.x - 5, y: s.y - 3, w: 10, h: 6 }, e)) continue;
        e.dead = true;
        state.score += e.type === 'bat' ? 260 : 200;
        spawnSparkles(e.x + e.w * 0.5, e.y + e.h * 0.5, [255, 192, 140], 6);
        hit = true;
        break;
      }

      if (!hit && state.level === 3 && boss.active && boss.hp > 0) {
        if (rectHit({ x: s.x - 5, y: s.y - 3, w: 10, h: 6 }, boss)) {
          boss.hp -= 1;
          state.score += 120;
          spawnSparkles(s.x, s.y, [255, 165, 135], 4);
          if (boss.hp <= 0) {
            boss.hp = 0;
            boss.active = false;
            triggerFinalWin();
          }
          hit = true;
        }
      }

      if (hit) {
        playerShots.splice(i, 1);
      }
    }
  }

  function update(dt) {
    if (state.stageBannerTimer > 0) state.stageBannerTimer = Math.max(0, state.stageBannerTimer - dt);
    if (state.shootCooldown > 0) state.shootCooldown = Math.max(0, state.shootCooldown - dt);

    if (state.mode === 'transition' && state.transition.active) {
      state.transition.timer -= dt;
      if (state.transition.kind === 'portal') {
        const targetX = state.transition.portalX - player.w * 0.5;
        player.vx = 0;
        player.vy = 0;
        player.x += (targetX - player.x) * Math.min(1, dt * 8);
        player.y -= 130 * dt;
      }
      updatePolish(dt);
      updatePlayerAnimation(dt);
      state.cameraX = clamp(player.x - canvas.width * 0.35, 0, WORLD_WIDTH - canvas.width);
      updateHud();
      if (state.transition.timer <= 0) {
        const nextLevel = state.transition.targetLevel || 1;
        const carryTime = true;
        prepareLevel(nextLevel, carryTime);
        const msg =
          nextLevel === 2
            ? 'BOLUM 2 ye gecildi! Gece tehlikelerine dikkat.'
            : nextLevel === 3
            ? 'BOLUM 3 MAGARA: Space ile ates et, W/Ok Yukari ile zipla!'
            : 'Yeni bolum basladi.';
        setMode('running', msg);
        state.stageBannerTimer = 1.8;
        state.stageBannerText = levelTitle(nextLevel);
      }
      return;
    }

    if (state.mode !== 'running') {
      updatePolish(dt);
      updatePlayerAnimation(dt);
      return;
    }

    if (updateTeleport(dt)) {
      updatePolish(dt);
      updatePlayerAnimation(dt);
      state.cameraX = clamp(player.x - canvas.width * 0.35, 0, WORLD_WIDTH - canvas.width);
      updateHud();
      return;
    }

    state.time -= dt;
    if (state.time <= 0) {
      state.time = 0;
      setMode('over', 'Sure doldu!');
      return;
    }

    if (input.down) tryStartPipeTeleport();
    if (input.shootPressed || input.shootHeld) {
      shootPlayerProjectile();
      input.shootPressed = false;
    }

    handlePlayerPhysics(dt);
    if (state.level < 3) updateSkyDrops(dt);
    updatePlayerProjectiles(dt);
    handleCollectiblesAndCombat(dt);
    updateBossFight(dt);
    updateFloatingTexts(dt);
    updatePolish(dt);
    updatePlayerAnimation(dt);

    state.cameraX = clamp(player.x - canvas.width * 0.35, 0, WORLD_WIDTH - canvas.width);
    updateHud();
  }

  function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isNight = state.level === 2;
    const isCave = state.level === 3;
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (isCave) {
      grad.addColorStop(0, '#1e1a24');
      grad.addColorStop(0.55, '#2b2533');
      grad.addColorStop(1, '#3e322f');
    } else if (isNight) {
      grad.addColorStop(0, '#081429');
      grad.addColorStop(0.56, '#122544');
      grad.addColorStop(1, '#1e3453');
    } else {
      grad.addColorStop(0, '#86d2ff');
      grad.addColorStop(0.56, '#63b8f0');
      grad.addColorStop(1, '#3a8eb9');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const offset1 = -(state.cameraX * 0.2) % 520;
    const offset2 = -(state.cameraX * 0.38) % 680;
    const cloudOffset = -(state.cameraX * 0.12) % 340;
    const farMount = -(state.cameraX * 0.09) % 760;
    const midMount = -(state.cameraX * 0.16) % 620;

    if (isCave) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      for (let i = 0; i < canvas.width; i += 110) {
        ctx.beginPath();
        ctx.moveTo(i - 40, 0);
        ctx.lineTo(i + 10, 70 + (i % 3) * 18);
        ctx.lineTo(i + 46, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(90, 74, 84, 0.34)';
      for (let i = -1; i < 6; i += 1) {
        const x = i * 260 + cloudOffset * 0.6;
        ctx.fillRect(x, 140 + (i % 2) * 16, 140, 46);
      }
    } else if (isNight) {
      const moonX = canvas.width - 120;
      const moonY = 88;
      ctx.fillStyle = 'rgba(235, 244, 255, 0.92)';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(138, 171, 211, 0.35)';
      ctx.beginPath();
      ctx.arc(moonX + 8, moonY - 3, 27, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(223, 242, 255, 0.78)';
      for (let i = 0; i < 35; i += 1) {
        const sx = ((i * 173 + state.level * 77) % (canvas.width + 80)) - 40;
        const sy = 28 + ((i * 59) % 180);
        const tw = i % 4 === 0 ? 2 : 1;
        ctx.fillRect(sx, sy, tw, tw);
      }
    }

    ctx.fillStyle = isCave ? '#4f4352' : isNight ? '#2e4c70' : '#8ec7ea';
    for (let i = -1; i < 4; i += 1) {
      const x = i * 760 + farMount;
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x + 180, isCave ? 300 : isNight ? 250 : 220);
      ctx.lineTo(x + 350, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = isCave ? '#43394a' : isNight ? '#244264' : '#77b7df';
    for (let i = -1; i < 4; i += 1) {
      const x = i * 620 + midMount;
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x + 130, isCave ? 326 : isNight ? 278 : 250);
      ctx.lineTo(x + 260, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = isCave ? '#4d423f' : isNight ? '#35546b' : '#6ebf75';
    for (let i = -1; i < 5; i += 1) {
      const x = i * 520 + offset1;
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.quadraticCurveTo(x + 160, isCave ? 350 : isNight ? 304 : 270, x + 330, GROUND_Y);
      ctx.fill();
    }

    ctx.fillStyle = isCave ? '#3a3036' : isNight ? '#2b4558' : '#4ca75d';
    for (let i = -1; i < 5; i += 1) {
      const x = i * 700 + offset2;
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.quadraticCurveTo(x + 180, isCave ? 330 : isNight ? 272 : 230, x + 360, GROUND_Y);
      ctx.fill();
    }

    ctx.fillStyle = isCave ? 'rgba(198, 176, 160, 0.14)' : isNight ? 'rgba(219, 232, 255, 0.28)' : 'rgba(255, 255, 255, 0.86)';
    for (let i = -1; i < 5; i += 1) {
      const x = i * 340 + cloudOffset;
      ctx.beginPath();
      ctx.arc(x + 64, isCave ? 152 : isNight ? 110 : 92, 22, 0, Math.PI * 2);
      ctx.arc(x + 86, isCave ? 146 : isNight ? 104 : 86, 28, 0, Math.PI * 2);
      ctx.arc(x + 116, isCave ? 152 : isNight ? 110 : 92, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + 64, isCave ? 150 : isNight ? 108 : 90, 52, 20);
    }
  }

  function drawWorld() {
    const cam = state.cameraX;
    const t = state.animTime;
    const tile = 32;
    const isNight = state.level === 2;
    const isCave = state.level === 3;

    const topTile = sprites.groundTop[0];
    const fillTile = sprites.groundFill[0];
    let paintedGround = false;
    if (topTile && fillTile && topTile.complete && fillTile.complete) {
      paintedGround = true;
      for (let x = -tile; x < canvas.width + tile; x += tile) {
        drawSprite(topTile, x, GROUND_Y, tile, tile);
      }
      for (let y = GROUND_Y + tile; y < canvas.height + tile; y += tile) {
        for (let x = -tile; x < canvas.width + tile; x += tile) {
          drawSprite(fillTile, x, y, tile, tile);
        }
      }
    }

    if (!paintedGround) {
      ctx.fillStyle = isCave ? '#5a463b' : isNight ? '#5b4a36' : '#805f3b';
      ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
      ctx.fillStyle = isCave ? '#6c5b4d' : isNight ? '#4e7b57' : '#57b45f';
      ctx.fillRect(0, GROUND_Y, canvas.width, 16);
      ctx.fillStyle = isCave ? '#514238' : isNight ? '#3a6648' : '#3f9b4f';
      for (let i = 0; i < canvas.width; i += 26) {
        ctx.fillRect(i, GROUND_Y + ((i / 26) % 2 === 0 ? 10 : 14), 14, 8);
      }
    }

    ctx.fillStyle = isCave ? 'rgba(142, 124, 96, 0.45)' : isNight ? 'rgba(89, 132, 106, 0.45)' : 'rgba(103, 190, 98, 0.45)';
    ctx.fillRect(0, GROUND_Y, canvas.width, 8);
    ctx.fillStyle = isCave ? 'rgba(84, 60, 46, 0.45)' : isNight ? 'rgba(70, 52, 36, 0.4)' : 'rgba(88, 58, 34, 0.38)';
    for (let i = 0; i < canvas.width; i += 22) {
      const y = GROUND_Y + 20 + (i % 5) * 9;
      ctx.fillRect(i + (i % 3), y, 6, 3);
    }
    ctx.fillStyle = isCave ? 'rgba(58, 40, 30, 0.38)' : isNight ? 'rgba(58, 37, 24, 0.34)' : 'rgba(70, 44, 24, 0.3)';
    for (let i = 0; i < canvas.width; i += 34) {
      const y = GROUND_Y + 34 + (i % 4) * 7;
      ctx.fillRect(i + 4, y, 8, 3);
    }

    for (const pipe of decorPipes) {
      const x = pipe.x - cam;
      if (x + pipe.w < -40 || x > canvas.width + 40) continue;
      const capH = Math.max(16, Math.floor(pipe.h * 0.22));
      ctx.fillStyle = isCave ? '#6b5748' : isNight ? '#3c8b58' : '#48b85b';
      ctx.fillRect(x, pipe.y, pipe.w, pipe.h);
      ctx.fillStyle = isCave ? '#8b7661' : isNight ? '#5ab575' : '#66d279';
      ctx.fillRect(x + 6, pipe.y + 3, pipe.w - 12, pipe.h - 8);
      ctx.fillStyle = isCave ? '#5f4d41' : isNight ? '#2f7048' : '#3a9448';
      ctx.fillRect(x, pipe.y, pipe.w, capH);
      ctx.fillStyle = isCave ? '#927e69' : isNight ? '#70c889' : '#7de089';
      ctx.fillRect(x + 4, pipe.y + 4, pipe.w - 8, capH - 6);
      ctx.strokeStyle = 'rgba(18, 64, 24, 0.65)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, pipe.y, pipe.w, pipe.h);
    }

    for (const p of platforms) {
      if (p.type === 'ground') continue;
      const x = p.x - cam;
      const bump = p.bumpTimer > 0 ? Math.sin((p.bumpTimer / 0.12) * Math.PI) * 6 : 0;
      const py = p.y - bump;
      if (x + p.w < -20 || x > canvas.width + 20) continue;
      const isUsedQuestion = p.type === 'question' && p.questionUsed;
      const tileImg = p.type === 'question' && !isUsedQuestion ? sprites.platformTech[0] : sprites.platformStone[0];
      let paintedPlatform = false;
      if (tileImg && tileImg.complete) {
        paintedPlatform = true;
        for (let px = 0; px < p.w; px += tile) {
          drawSprite(tileImg, x + px, py, Math.min(tile, p.w - px), p.h);
        }
      }
      if (!paintedPlatform) {
        ctx.fillStyle = p.type === 'question' && !isUsedQuestion ? '#7ec2dd' : '#8d6d4a';
        ctx.fillRect(x, py, p.w, p.h);
        ctx.strokeStyle = p.type === 'question' && !isUsedQuestion ? '#3e89a5' : '#674f37';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, py, p.w, p.h);
        ctx.fillStyle = p.type === 'question' && !isUsedQuestion ? '#b8ecff' : '#b1946f';
        for (let px = x + 8; px < x + p.w - 8; px += 18) {
          ctx.fillRect(px, py + 6, 8, 3);
        }
      }

      if (p.itemTimer > 0 && p.itemType) {
        const k = 1 - p.itemTimer / 0.5;
        const itemY = py - 24 - k * 24;
        const itemX = x + p.w * 0.5;
        if (p.itemType === 'coin') {
          const coinIndex = Math.floor(state.animTime * 10) % Math.max(1, sprites.coin.length);
          if (!drawSheetFrame(spriteSheets.coin, coinIndex, itemX - 12, itemY - 12, 24, 24)) {
            ctx.fillStyle = '#ffe082';
            ctx.beginPath();
            ctx.arc(itemX, itemY, 7, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          const powerIndex = Math.floor(state.animTime * 8) % Math.max(1, sprites.power.length);
          if (!drawSheetFrame(spriteSheets.power, powerIndex, itemX - 13, itemY - 13, 26, 26)) {
            ctx.fillStyle = '#b6ecff';
            ctx.fillRect(itemX - 7, itemY - 9, 14, 18);
          }
        }
      }
    }

    for (const c of coins) {
      if (c.taken) continue;
      const x = c.x - cam;
      if (x < -20 || x > canvas.width + 20) continue;
      const pulse = 1 + Math.sin(t * 7 + c.x * 0.04) * 0.08;
      const r = c.r * pulse;
      const coinIndex = Math.floor(t * 10) % Math.max(1, sprites.coin.length);
      if (spriteSheets.coin && drawSheetFrame(spriteSheets.coin, coinIndex, x - 14 * pulse, c.y - 14 * pulse, 28 * pulse, 28 * pulse)) continue;
      const coinFrame = sprites.coin[coinIndex];
      if (drawSprite(coinFrame, x - 14 * pulse, c.y - 14 * pulse, 28 * pulse, 28 * pulse)) continue;
      ctx.fillStyle = '#ffd95c';
      ctx.beginPath();
      ctx.arc(x, c.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff4be';
      ctx.fillRect(x - 1, c.y - 7 * pulse, 2, 14 * pulse);
      ctx.fillRect(x - 7 * pulse, c.y - 1, 14 * pulse, 2);
    }

    for (const m of mushrooms) {
      if (m.taken) continue;
      const x = m.x - cam;
      if (x + m.w < -20 || x > canvas.width + 20) continue;
      const floatY = Math.sin(t * 5 + m.x * 0.02) * 3;
      const powerIndex = Math.floor(t * 8) % Math.max(1, sprites.power.length);
      if (spriteSheets.power && drawSheetFrame(spriteSheets.power, powerIndex, x - 2, m.y - 2 + floatY, 28, 28)) continue;
      const powerFrame = sprites.power[powerIndex];
      if (drawSprite(powerFrame, x - 2, m.y - 2 + floatY, 28, 28)) continue;
      ctx.fillStyle = '#9fd6ef';
      ctx.fillRect(x + 4, m.y + 2 + floatY, 16, 20);
      ctx.fillStyle = '#d9f1ff';
      ctx.fillRect(x + 6, m.y + 5 + floatY, 12, 5);
      ctx.fillStyle = '#6d90a7';
      ctx.fillRect(x + 9, m.y + 12 + floatY, 6, 8);
    }

    for (const e of enemies) {
      if (e.dead) continue;
      const x = e.x - cam;
      if (x + e.w < -20 || x > canvas.width + 20) continue;
      const drawW = e.type === 'bat' ? 38 : 36;
      const drawH = e.type === 'bat' ? 32 : 36;
      const shadowAlpha = e.type === 'bat' ? 0.12 : 0.22;
      drawShadow(x - 2, e.y + 4, drawW, 26, shadowAlpha);
      drawIconEnemy(x - 2, e.y - 2, drawW, drawH, e.vx < 0, t + e.x * 0.01, e.type, e.tone || '#d65757');
    }

    for (const s of playerShots) {
      const sx = s.x - cam;
      ctx.fillStyle = '#ffd27f';
      ctx.beginPath();
      ctx.arc(sx, s.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff5cc';
      ctx.fillRect(sx - 1, s.y - 1, 2, 2);
    }

    for (const s of bossShots) {
      const sx = s.x - cam;
      ctx.fillStyle = '#ff7474';
      ctx.beginPath();
      ctx.arc(sx, s.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd5d5';
      ctx.fillRect(sx - 1, s.y - 1, 2, 2);
    }

    if (boss.active || boss.hp > 0) {
      const bx = boss.x - cam;
      const by = boss.y;
      drawShadow(bx + 8, by + boss.h - 4, boss.w * 0.7, 22, 0.22);
      drawIconEnemy(bx + 10, by + 10, boss.w - 20, boss.h - 20, boss.dir < 0, t * 0.8, 'bat', '#a82b2b');
      ctx.fillStyle = '#8f2b2b';
      ctx.fillRect(bx + 16, by + 8, boss.w - 32, 10);
      const hpW = ((boss.w - 36) * Math.max(0, boss.hp)) / Math.max(1, boss.maxHp);
      ctx.fillStyle = '#ff7668';
      ctx.fillRect(bx + 18, by + 10, hpW, 6);
    }

    if (state.level < 3 && portal.active) {
      const px = portal.x - cam;
      const beamTop = 0;
      const pulse = 0.6 + Math.sin(t * 5.6) * 0.22;
      const beamW = 38 + pulse * 10;
      const grad = ctx.createLinearGradient(px, beamTop, px, portal.y + portal.h);
      grad.addColorStop(0, 'rgba(210, 242, 255, 0.04)');
      grad.addColorStop(0.2, 'rgba(180, 235, 255, 0.28)');
      grad.addColorStop(0.7, 'rgba(145, 216, 255, 0.48)');
      grad.addColorStop(1, 'rgba(120, 185, 255, 0.64)');
      ctx.fillStyle = grad;
      ctx.fillRect(px - beamW * 0.5, beamTop, beamW, portal.y + portal.h - beamTop);

      ctx.strokeStyle = 'rgba(185, 236, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - beamW * 0.38, beamTop);
      ctx.lineTo(px - beamW * 0.2, portal.y + portal.h);
      ctx.moveTo(px + beamW * 0.38, beamTop);
      ctx.lineTo(px + beamW * 0.2, portal.y + portal.h);
      ctx.stroke();

      ctx.fillStyle = 'rgba(181, 225, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(px, portal.y + portal.h - 3, 26 + pulse * 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(220, 248, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(px, portal.y + portal.h - 7, 6 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.level === 3 && (home.active || state.bossDefeated)) {
      const hx = home.x - cam;
      const hy = home.y;
      ctx.fillStyle = '#7b4c35';
      ctx.fillRect(hx, hy + 24, home.w, home.h);
      ctx.fillStyle = '#5c3528';
      ctx.beginPath();
      ctx.moveTo(hx - 12, hy + 28);
      ctx.lineTo(hx + home.w * 0.5, hy - 28);
      ctx.lineTo(hx + home.w + 12, hy + 28);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2f1d18';
      ctx.fillRect(hx + 48, hy + 62, 30, 62);
      ctx.fillStyle = '#e4c092';
      ctx.fillRect(hx + 12, hy + 46, 22, 18);
      ctx.fillRect(hx + home.w - 34, hy + 46, 22, 18);
    }
  }

  function drawPlayer() {
    const x = player.x - state.cameraX;
    const y = player.y;
    const t = state.animTime;

    if (player.hurtTimer > 0 && Math.floor(player.hurtTimer * 10) % 2 === 0) return;

    const flip = player.face < 0 ? -1 : 1;
    const headX = flip > 0 ? x + 20 : x + 4;
    const eyeX = flip > 0 ? x + 28 : x + 8;
    const bodyColor = player.powerTimer > 0 ? '#8ad7ae' : '#76b684';
    const bellyColor = player.powerTimer > 0 ? '#dcf6e5' : '#c6e6cf';
    const moving = Math.abs(player.vx) > 25;
    const run = Math.sin(t * 16) * 2;
    const bob = player.onGround ? (moving ? Math.abs(run) * 0.6 : Math.sin(t * 4) * 0.4) : 0;
    const legA = moving ? run : 0;
    const legB = moving ? -run : 0;
    const tailLift = player.onGround ? 0 : -2;
    const runCount = Math.max(1, (spriteSheets.playerRun && spriteSheets.playerRun.count) || sprites.playerRun.length);
    const runFrame = player.animFrame % runCount;
    const playerState = player.animState;
    const useRun = playerState === 'run';
    const groundDistance = getGroundDistanceUnderPlayer();
    const shadowScale = clamp(1 - groundDistance / 220, 0.48, 1);
    const shadowW = 40 * shadowScale;
    const shadowH = 11 * shadowScale;
    const shadowX = x + player.w * 0.5 - shadowW * 0.5;
    const shadowY = y + player.h + groundDistance;
    drawShadow(shadowX, shadowY, shadowW, shadowH, 0.1 + shadowScale * 0.18);

    let scaleX = 1;
    let scaleY = 1;
    if (POLISH && !player.onGround && player.vy < -80) {
      const k = clamp((-player.vy - 80) / 420, 0, 1);
      scaleX *= 1 - 0.08 * k;
      scaleY *= 1 + 0.08 * k;
    }
    if (POLISH && player.landingSquashTimer > 0) {
      const k = player.landingSquashTimer / 0.12;
      scaleX *= 1 + 0.08 * k;
      scaleY *= 1 - 0.08 * k;
    }

    const drawX = x - 4;
    const drawY = y + 2;
    const drawW = 40;
    const drawH = 40;
    const cx = drawX + drawW * 0.5;
    const cy = drawY + drawH * 0.5;
    if (ICON_DINO) {
      const mood = playerState === 'hurt' ? 'hurt' : playerState === 'win' ? 'win' : 'normal';
      drawIconDino(drawX, drawY, drawW, drawH, flip < 0, scaleX, scaleY, mood);
      return;
    }
    if (spriteSheets.ready) {
      const targetSheet =
        playerState === 'fall'
          ? spriteSheets.playerFall
          : playerState === 'skid'
          ? spriteSheets.playerSkid
          : playerState === 'hurt'
          ? spriteSheets.playerHurt
          : playerState === 'win'
          ? spriteSheets.playerWin
          : playerState === 'jump'
          ? spriteSheets.playerJump
          : useRun
          ? spriteSheets.playerRun
          : spriteSheets.playerIdle;
      const targetFrame = useRun ? runFrame : 0;
      if (drawSheetFrame(targetSheet, targetFrame, drawX, drawY, drawW, drawH, flip < 0, scaleX, scaleY)) return;
    }

    const playerFrame =
      playerState === 'fall'
        ? sprites.playerFall[0]
        : playerState === 'skid'
        ? sprites.playerSkid[0]
        : playerState === 'hurt'
        ? sprites.playerHurt[0]
        : playerState === 'win'
        ? sprites.playerWin[0]
        : playerState === 'jump'
        ? sprites.playerJump[0]
        : useRun
        ? sprites.playerRun[runFrame % Math.max(1, sprites.playerRun.length)]
        : sprites.playerIdle[0];
    if (playerFrame && playerFrame.complete && playerFrame.naturalWidth > 0) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale((flip < 0 ? -1 : 1) * scaleX, scaleY);
      ctx.drawImage(playerFrame, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
      ctx.restore();
      return;
    }

    ctx.fillStyle = bodyColor;
    ctx.fillRect(x + 5, y + 13 + bob, 18, 18);
    ctx.fillRect(headX, y + 8 + bob, 10, 10);

    ctx.beginPath();
    if (flip > 0) {
      ctx.moveTo(x + 5, y + 18 + bob);
      ctx.lineTo(x - 8, y + 24 + bob + tailLift);
      ctx.lineTo(x + 5, y + 26 + bob);
    } else {
      ctx.moveTo(x + 23, y + 18 + bob);
      ctx.lineTo(x + 36, y + 24 + bob + tailLift);
      ctx.lineTo(x + 23, y + 26 + bob);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = bellyColor;
    ctx.fillRect(x + 10, y + 18 + bob, 10, 10);

    ctx.fillStyle = '#4d7d5a';
    ctx.fillRect(x + 8, y + 31 + legA, 5, 11 - Math.abs(legA) * 0.25);
    ctx.fillRect(x + 16, y + 31 + legB, 5, 11 - Math.abs(legB) * 0.25);

    ctx.fillStyle = '#24312a';
    ctx.fillRect(eyeX, y + 11 + bob, 2, 2);

    ctx.fillStyle = '#a8dcc2';
    ctx.fillRect(x + 9, y + 9 + bob, 3, 3);
    ctx.fillRect(x + 14, y + 7 + bob, 3, 3);
    ctx.fillRect(x + 18, y + 9 + bob, 3, 3);
  }

  function drawSkyDrops() {
    const t = state.animTime;
    for (const d of skyDrops) {
      const x = d.x - state.cameraX;
      if (x < -30 || x > canvas.width + 30) continue;
      const y = d.y + Math.sin(d.phase + t * 2) * 1.8;

      if (d.kind === 'coin') {
        const coinIndex = Math.floor(t * 12) % Math.max(1, sprites.coin.length);
        if (spriteSheets.coin && drawSheetFrame(spriteSheets.coin, coinIndex, x - 13, y - 13, 26, 26)) continue;
        const coinFrame = sprites.coin[coinIndex];
        if (drawSprite(coinFrame, x - 13, y - 13, 26, 26)) continue;
        ctx.fillStyle = '#ffd95c';
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      if (d.kind === 'energy') {
        const powerIndex = Math.floor(t * 8) % Math.max(1, sprites.power.length);
        if (spriteSheets.power && drawSheetFrame(spriteSheets.power, powerIndex, x - 13, y - 13, 26, 26)) continue;
        const powerFrame = sprites.power[powerIndex];
        if (drawSprite(powerFrame, x - 13, y - 13, 26, 26)) continue;
        ctx.fillStyle = '#9fe7ff';
        ctx.fillRect(x - 7, y - 9, 14, 18);
        continue;
      }

      ctx.fillStyle = '#b05b56';
      ctx.beginPath();
      ctx.arc(x - 2, y, 8, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 3, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2dbcb';
      ctx.fillRect(x + 6, y - 3, 8, 3);
    }
  }

  function drawFloatingTexts() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px Candara, Trebuchet MS, sans-serif';
    for (const ft of floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      const x = ft.x - state.cameraX;
      if (x < -80 || x > canvas.width + 80) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(8, 20, 28, 0.5)';
      ctx.fillText(ft.text, x + 1, ft.y + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, x, ft.y);
    }
    ctx.restore();
  }

  function drawStageBanner() {
    if (state.stageBannerTimer <= 0) return;
    const k = clamp(state.stageBannerTimer / 1.8, 0, 1);
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.35 + k);
    const w = 320;
    const h = 56;
    const x = (canvas.width - w) * 0.5;
    const y = 18;
    ctx.fillStyle = 'rgba(12, 28, 40, 0.78)';
    ctx.strokeStyle = 'rgba(180, 235, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#dff7ff';
    ctx.font = 'bold 26px Candara, Trebuchet MS, sans-serif';
    ctx.fillText(state.stageBannerText, x + w * 0.5, y + 36);
    ctx.restore();
  }

  function drawTeleportWipe() {
    if (!state.teleport.active) return;
    const base = 0.22;
    const progress =
      state.teleport.phase === 'in'
        ? 1 - clamp(state.teleport.timer / base, 0, 1)
        : clamp(state.teleport.timer / base, 0, 1);
    const sideW = canvas.width * 0.5 * progress;
    if (sideW <= 0.1) return;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 15, 24, 0.62)';
    ctx.fillRect(0, 0, sideW, canvas.height);
    ctx.fillRect(canvas.width - sideW, 0, sideW, canvas.height);
    ctx.restore();
  }

  function drawTransitionOverlay() {
    if (!state.transition.active || state.mode !== 'transition') return;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 14, 24, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const w = Math.min(canvas.width - 120, 520);
    const h = 108;
    const x = (canvas.width - w) * 0.5;
    const y = 84;
    ctx.fillStyle = 'rgba(10, 26, 38, 0.9)';
    ctx.strokeStyle = 'rgba(178, 232, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#dff7ff';
    ctx.font = 'bold 30px Candara, Trebuchet MS, sans-serif';
    ctx.fillText(state.transition.text, x + w * 0.5, y + 44);
    ctx.font = 'bold 22px Candara, Trebuchet MS, sans-serif';
    ctx.fillStyle = '#ffe6a4';
    ctx.fillText(`${Math.max(0, state.transition.timer).toFixed(1)} sn`, x + w * 0.5, y + 78);
    ctx.restore();
  }

  function drawHomeScene() {
    if (!state.homeScene.active || state.level !== 3 || !state.bossDefeated) return;
    ctx.save();
    ctx.fillStyle = 'rgba(7, 11, 18, 0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e7f3ff';
    ctx.font = 'bold 34px Candara, Trebuchet MS, sans-serif';
    ctx.fillText('Her yolculuk, eve varmak içindir.', canvas.width * 0.5, canvas.height * 0.46);
    ctx.fillStyle = '#9fd3ff';
    ctx.font = 'bold 24px Candara, Trebuchet MS, sans-serif';
    ctx.fillText('Ütopik Konsol present.', canvas.width * 0.5, canvas.height * 0.58);
    ctx.restore();
  }

  function drawWinBanner() {
    if (state.mode !== 'won') return;
    ctx.save();
    const w = Math.min(canvas.width - 80, 560);
    const h = 134;
    const x = (canvas.width - w) * 0.5;
    const y = 54;

    ctx.fillStyle = 'rgba(10, 28, 38, 0.82)';
    ctx.strokeStyle = 'rgba(165, 233, 255, 0.92)';
    ctx.lineWidth = 3;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#d8ffff';
    ctx.font = state.level === 3 ? 'bold 34px Candara, Trebuchet MS, sans-serif' : 'bold 42px Candara, Trebuchet MS, sans-serif';
    ctx.fillText(state.level === 3 ? 'TEBRIKLER KAZANDINIZ' : 'TEBRIKLER', x + w * 0.5, y + 52);

    ctx.fillStyle = '#9be8ff';
    ctx.font = 'bold 18px Candara, Trebuchet MS, sans-serif';
    ctx.fillText(state.stageCompleteText, x + w * 0.5, y + 78);
    ctx.fillStyle = '#ffe79e';
    ctx.font = 'bold 24px Candara, Trebuchet MS, sans-serif';
    ctx.fillText(`Puan: ${state.score}`, x + w * 0.5, y + 102);
    ctx.fillStyle = '#b9e9ff';
    ctx.font = 'bold 18px Candara, Trebuchet MS, sans-serif';
    ctx.fillText(`Rekor: ${state.bestScore}`, x + w * 0.5, y + 126);
    ctx.restore();
  }

  function drawAssetDebugOverlay() {
    if (!ASSET_DEBUG_OVERLAY || missingAssets.size === 0) return;
    const list = Array.from(missingAssets).slice(0, 6);
    const h = 26 + list.length * 18;
    ctx.save();
    ctx.fillStyle = 'rgba(16, 10, 10, 0.78)';
    ctx.strokeStyle = 'rgba(255, 160, 160, 0.9)';
    ctx.lineWidth = 1;
    ctx.fillRect(10, 10, canvas.width - 20, h);
    ctx.strokeRect(10, 10, canvas.width - 20, h);
    ctx.fillStyle = '#ffd1d1';
    ctx.font = 'bold 14px Consolas, monospace';
    ctx.fillText('Eksik dosyalar:', 18, 30);
    ctx.fillStyle = '#ffe7e7';
    ctx.font = '12px Consolas, monospace';
    for (let i = 0; i < list.length; i += 1) {
      ctx.fillText(`- ${list[i]}`, 18, 48 + i * 16);
    }
    ctx.restore();
  }

  function render() {
    ensureSpriteSheets();
    let shakeX = 0;
    let shakeY = 0;
    if (POLISH && state.shakeTimer > 0) {
      const life = state.shakeTimer / 0.1;
      const amp = state.shakeAmp * life;
      shakeX = Math.sin(state.animTime * 52) * amp;
      shakeY = Math.cos(state.animTime * 38) * amp * 0.35;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawBackground();
    drawWorld();
    if (state.level < 3) drawSkyDrops();
    drawDustParticles();
    drawBlockDebris();
    drawSparkles();
    drawPlayer();
    drawFloatingTexts();
    drawStageBanner();
    drawTransitionOverlay();
    drawWinBanner();
    drawHomeScene();
    drawTeleportWipe();
    ctx.restore();
    drawAssetDebugOverlay();
  }

  function loop(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.05, (ts - state.lastTs) / 1000);
    state.lastTs = ts;
    state.animTime += dt;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  function bindButtons() {
    startBtn.addEventListener('click', startGame);
    resetBtn.addEventListener('click', () => fullReset(false));
    pauseBtn.addEventListener('click', togglePause);
    muteBtn.addEventListener('click', () => {
      state.muted = !state.muted;
      applyMuteState();
      if (state.muted) {
        bgm.pause();
      } else if (state.mode === 'running') {
        tryStartBgm();
      }
    });

    menuStartBtn.addEventListener('click', () => startFromLevel(1));
    menuHowBtn.addEventListener('click', () => {
      howToTextEl.classList.toggle('hidden');
    });
    for (const btn of levelBtns) {
      btn.addEventListener('click', () => {
        const lv = Number(btn.getAttribute('data-level') || '1');
        startFromLevel(lv);
      });
    }

    finalReplayBtn.addEventListener('click', () => startFromLevel(1));
    finalMenuBtn.addEventListener('click', () => {
      fullReset(true);
    });

    const touchMap = [
      ['leftBtn', 'left'],
      ['rightBtn', 'right']
    ];

    for (const [id, key] of touchMap) {
      const el = document.getElementById(id);
      el.addEventListener('pointerdown', e => {
        e.preventDefault();
        input[key] = true;
      });
      el.addEventListener('pointerup', () => {
        input[key] = false;
      });
      el.addEventListener('pointerleave', () => {
        input[key] = false;
      });
      el.addEventListener('pointercancel', () => {
        input[key] = false;
      });
    }

    const jumpBtn = document.getElementById('jumpBtn');
    jumpBtn.addEventListener('pointerdown', e => {
      e.preventDefault();
      input.jumpPressed = true;
      input.jumpHeld = true;
      tryStartBgm();
    });
    jumpBtn.addEventListener('pointerup', () => {
      input.jumpHeld = false;
    });
    jumpBtn.addEventListener('pointerleave', () => {
      input.jumpHeld = false;
    });
    jumpBtn.addEventListener('pointercancel', () => {
      input.jumpHeld = false;
    });

    const fireBtn = document.getElementById('fireBtn');
    if (fireBtn) {
      fireBtn.addEventListener('pointerdown', e => {
        e.preventDefault();
        input.shootPressed = true;
        input.shootHeld = true;
        tryStartBgm();
      });
      fireBtn.addEventListener('pointerup', () => {
        input.shootHeld = false;
      });
      fireBtn.addEventListener('pointerleave', () => {
        input.shootHeld = false;
      });
      fireBtn.addEventListener('pointercancel', () => {
        input.shootHeld = false;
      });
    }
  }

  function bindKeyboard() {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowleft') input.left = true;
      if (k === 'd' || k === 'arrowright') input.right = true;
      if (k === 's' || k === 'arrowdown') {
        input.down = true;
        tryStartPipeTeleport();
      }
      if (k === ' ') {
        e.preventDefault();
        input.shootPressed = true;
      }
      if (k === 'w' || k === 'arrowup') {
        e.preventDefault();
        if (!input.jumpHeld) input.jumpPressed = true;
        input.jumpHeld = true;
      }
      if (k === 'p') togglePause();
      if (k === 'enter' && (state.mode === 'ready' || state.mode === 'paused' || state.mode === 'menu')) startGame();
      tryStartBgm();
    });

    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowleft') input.left = false;
      if (k === 'd' || k === 'arrowright') input.right = false;
      if (k === 's' || k === 'arrowdown') input.down = false;
      if (k === 'w' || k === 'arrowup') input.jumpHeld = false;
      if (k === ' ') input.shootHeld = false;
    });

    window.addEventListener('resize', () => {
      updateUiVisibility();
    });
  }

  bindButtons();
  bindKeyboard();
  setupSprites();
  assetSelfTest().catch(err => {
    console.warn(`[asset-self-test] failed: ${err && err.message ? err.message : 'unknown'}`);
  });
  if (isTouchDevice) document.body.classList.add('touch-device');
  applyMuteState();
  fullReset(true);
  updateUiVisibility();
  render();
  requestAnimationFrame(loop);
})();
