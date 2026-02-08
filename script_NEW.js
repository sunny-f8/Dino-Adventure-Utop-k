(() => {
  // Will be initialized in initGame()
  let canvas, ctx, startBtn, resetBtn, distanceEl, healthEl, gameStateEl, winTextEl, timerEl, bestTimeEl

  // Game constants (px / s units for frame-rate independent physics)
  const GRAVITY = 1500           // px/s^2 (gravity)
  const JUMP_VELOCITY = 620      // px/s (initial jump velocity) - increased for higher jumps
  const MAX_SPEED = 260          // px/s (requested)
  const ACCEL = 1800             // px/s^2 (acceleration when pressing move)
  const FRICTION = 2200          // px/s^2 (ground friction / deceleration)
  const AIR_ACCEL_FACTOR = 0.6   // multiplier for horizontal accel while in air
  const WORLD_WIDTH = 5200
  const WORLD_HEIGHT = 600
  const CHARACTER_SIZE = 32
  const HEALTH_MAX = 3
  const GOAL_X = 4800
  const INVINCIBLE_TIME = 60   // Frames (1 second at 60fps)

  // Game state
  let running = false
  let gameOver = false
  let won = false
  let health = HEALTH_MAX
  let cloudImage = null
  let backgroundImage = null
  const debugMode = false  // Set to true to see hitboxes

  // Timer and records
  let timerRunning = false
  let currentTime = 0  // in seconds
  let bestTime = null  // best time in seconds (loaded from localStorage)
  const STORAGE_KEY = 'bulutKosRecord'

  // Audio objects (preload)
  let jumpAudio, hitAudio, winAudio
  // Background music: Web Audio API procedural tone generator
  let bgmContext = null
  let bgmOscillator = null
  let bgmGain = null
  let bgmPlaying = false
  let bgmNoteIndex = 0
  const BGM_NOTES = [262, 294, 330, 262] // C4, D4, E4, C4
  const BGM_NOTE_DURATION = 0.5 // seconds per note

  // Player
  const player = {
    x: 100,
    y: 520,  // Start on ground
    vx: 0,
    vy: 0,
    width: CHARACTER_SIZE,
    height: CHARACTER_SIZE,
    jumping: false,
    onGround: false,
    facingLeft: false,
    distanceTravelled: 0,
    invincible: false,
    invincibleCounter: 0
  }

  // Ground constant
  const GROUND_Y = 550  // Ground/bottom platform y position

  // Input tracking
  const keys = {}
  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true
    if (e.key === ' ') {
      e.preventDefault()
      if (player.onGround && running) {
        player.vy = -JUMP_VELOCITY
        player.jumping = true
        player.onGround = false
        playJump()
      }
    }
  })
  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false
  })

  // Platforms
  const platforms = [
    { x: 0, y: 550, w: 200, h: 50 }, // start
    { x: 250, y: 480, w: 120, h: 20 },
    { x: 450, y: 420, w: 120, h: 20 },
    { x: 650, y: 380, w: 150, h: 20 },
    { x: 900, y: 450, w: 140, h: 20 },
    { x: 1200, y: 380, w: 180, h: 20 },
    { x: 1600, y: 420, w: 160, h: 20 },
    { x: 2000, y: 380, w: 200, h: 20 },
    { x: 2400, y: 450, w: 180, h: 20 },
    { x: 2800, y: 380, w: 200, h: 20 },
    { x: 3200, y: 420, w: 220, h: 20 },
    { x: 3600, y: 380, w: 200, h: 20 },
    { x: 4000, y: 450, w: 240, h: 20 },
    { x: 4400, y: 380, w: 200, h: 20 },
    { x: 4700, y: 500, w: 200, h: 50 } // goal area
  ]

  // Obstacles (spikes/enemy blocks)
  const obstacles = [
    { x: 350, y: 500, w: 40, h: 40 },
    { x: 750, y: 510, w: 40, h: 40 },
    { x: 1300, y: 500, w: 40, h: 40 },
    { x: 1800, y: 510, w: 40, h: 40 },
    { x: 2250, y: 500, w: 40, h: 40 },
    { x: 2900, y: 510, w: 40, h: 40 },
    { x: 3400, y: 500, w: 40, h: 40 },
    { x: 3900, y: 510, w: 40, h: 40 }
  ]

  // Goal (mama)
  const goal = {
    x: GOAL_X,
    y: 420,
    r: 20
  }

  // Camera
  let cameraX = 0
  let lastTime = 0

  // Load cloud image
  function loadCloudImage() {
    const img = new Image()
    img.src = 'assets/bulut.jpg'
    img.onload = () => {
      cloudImage = img
      console.log('Cloud image loaded')
    }
    img.onerror = () => {
      console.log('Cloud image not found, using fallback')
      cloudImage = null
    }
  }

  // Load background image
  function loadBackgroundImage() {
    const img = new Image()
    img.src = 'assets/background.jpg'
    img.onload = () => {
      backgroundImage = img
      console.log('Background image loaded')
    }
    img.onerror = () => {
      console.log('Background image not found, using gradient')
      backgroundImage = null
    }
  }

  // Draw player (cloud character)
  function drawPlayer() {
    const screenX = player.x - cameraX
    const screenY = player.y

    ctx.save()
    
    // Visual blinking effect during invincibility (invincibleCounter in seconds)
    if (player.invincible) {
      ctx.globalAlpha = 0.5 + Math.sin(player.invincibleCounter * 20) * 0.4
    }
    
    ctx.translate(screenX + player.width / 2, screenY + player.height / 2)
    if (player.facingLeft) ctx.scale(-1, 1)
    ctx.translate(-(player.width / 2), -(player.height / 2))

    // Circle clip
    ctx.beginPath()
    ctx.arc(player.width / 2, player.height / 2, player.width / 2, 0, Math.PI * 2)
    ctx.clip()

    if (cloudImage) {
      ctx.drawImage(cloudImage, 0, 0, player.width, player.height)
    } else {
      // Fallback: gradient circle
      const grad = ctx.createLinearGradient(0, 0, player.width, player.height)
      grad.addColorStop(0, '#39ff14')
      grad.addColorStop(1, '#9b5cff')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, player.width, player.height)
    }

    ctx.restore()
    ctx.globalAlpha = 1.0  // Reset alpha for other drawings

    // Eye
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(screenX + player.width / 2 - 6, screenY + player.height / 2 - 4, 2, 0, Math.PI * 2)
    ctx.fill()

    // Debug: Draw player hitbox
    if (debugMode) {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)'
      ctx.lineWidth = 2
      ctx.strokeRect(screenX, screenY, player.width, player.height)
      ctx.fillStyle = 'rgba(0, 255, 255, 0.2)'
      ctx.fillRect(screenX, screenY, player.width, player.height)
    }
  }

  // Draw platforms
  function drawPlatforms() {
    // Draw infinite ground
    const groundPlatform = { x: 0, y: GROUND_Y, w: WORLD_WIDTH, h: 50 }
    const x = groundPlatform.x - cameraX
    ctx.fillStyle = '#1a3d26'
    ctx.fillRect(x, groundPlatform.y, canvas.width + Math.abs(x), groundPlatform.h)

    // Draw ground pattern
    ctx.fillStyle = 'rgba(57, 255, 20, 0.15)'
    for (let xi = x; xi < x + canvas.width + 100; xi += 40) {
      ctx.fillRect(xi, groundPlatform.y, 20, 50)
    }

    // Draw platforms
    for (let p of platforms) {
      const px = p.x - cameraX
      if (px + p.w > 0 && px < canvas.width) {
        drawPlatformSolid(ctx, p, cameraX)
      }
    }

    // Debug: Draw ground hitbox
    if (debugMode) {
      ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)'
      ctx.lineWidth = 1
      ctx.strokeRect(x, groundPlatform.y, canvas.width + Math.abs(x), groundPlatform.h)
    }
  }

  // Helper: Draw a hazard/spike obstacle
  function drawHazard(ctx, hazard, cameraX) {
    const x = hazard.x - cameraX
    const y = hazard.y
    const w = hazard.w
    const h = hazard.h

    // Dark red body
    ctx.fillStyle = '#8b0000'
    ctx.fillRect(x, y, w, h)

    // Spikes on top (3 triangles)
    ctx.fillStyle = '#6b0000'
    const spikeSpacing = w / 4
    for (let i = 0; i < 3; i++) {
      const sx = x + spikeSpacing * (i + 0.5)
      ctx.beginPath()
      ctx.moveTo(sx, y)
      ctx.lineTo(sx + 5, y - 8)
      ctx.lineTo(sx - 5, y - 8)
      ctx.closePath()
      ctx.fill()
    }

    // Border/shine
    ctx.strokeStyle = '#ff6666'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)
  }

  // Helper: Draw platform with grass and shadow
  function drawPlatformSolid(ctx, platform, cameraX) {
    const x = platform.x - cameraX
    const y = platform.y
    const w = platform.w
    const h = platform.h

    // Shadow/soil bottom layer
    ctx.fillStyle = '#1a3d26'
    ctx.fillRect(x, y + h - 4, w, 4)

    // Main platform (neon green)
    ctx.fillStyle = '#39ff14'
    ctx.fillRect(x, y, w, h - 4)

    // Grass tufts on top
    ctx.fillStyle = 'rgba(85, 255, 85, 0.6)'
    for (let i = 0; i < w; i += 12) {
      ctx.fillRect(x + i, y - 3, 8, 3)
      ctx.fillRect(x + i + 4, y - 5, 4, 2)
    }

    // Subtle side shadows
    ctx.strokeStyle = 'rgba(100, 150, 100, 0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)
  }

  // Helper: Draw goal with pulse effect
  function drawGoalWithPulse(ctx, goal, cameraX, gameTime) {
    const x = goal.x - cameraX
    const y = goal.y

    // Pulse animation (sine wave)
    const pulse = 0.7 + 0.3 * Math.sin(gameTime * 4)
    const glowR = goal.r + 8 * pulse

    // Outer glow
    ctx.fillStyle = `rgba(255, 180, 0, ${0.15 * pulse})`
    ctx.beginPath()
    ctx.arc(x, y, glowR, 0, Math.PI * 2)
    ctx.fill()

    // Main circle (warm orange)
    ctx.fillStyle = '#ffa500'
    ctx.beginPath()
    ctx.arc(x, y, goal.r, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#ff8c00'
    ctx.lineWidth = 2
    ctx.stroke()

    // Mama icon (bone emoji)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 18px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🍖', x, y)

    // Debug: hitbox
    if (debugMode) {
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, goal.r, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // Draw obstacles
  function drawObstacles() {
    for (let obs of obstacles) {
      const x = obs.x - cameraX
      if (x + obs.w > 0 && x < canvas.width) {
        drawHazard(ctx, obs, cameraX)
      }
    }
  }

  // Draw goal (mama)
  function drawGoal() {
    const x = goal.x - cameraX
    if (x > -50 && x < canvas.width + 50) {
      drawGoalWithPulse(ctx, goal, cameraX, currentTime)
    }
  }

  // Draw background and HUD
  function drawBackground() {
    // Draw sky
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
    grad.addColorStop(0, '#1a3a4d')     // darker sky at top
    grad.addColorStop(0.5, '#2d5a73')   // lighter in middle
    grad.addColorStop(1, '#1a4d3d')     // greenish at bottom
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Far mountains (slow parallax)
    if (backgroundImage) {
      const parallaxX = (cameraX * 0.2) % (backgroundImage.width)
      ctx.drawImage(backgroundImage, -parallaxX, 0, canvas.width, canvas.height / 2)
      ctx.drawImage(backgroundImage, canvas.width - parallaxX, 0, canvas.width, canvas.height / 2)
    } else {
      // Fallback: draw gradient mountains
      ctx.fillStyle = 'rgba(20, 60, 40, 0.4)'
      ctx.beginPath()
      ctx.moveTo(0, canvas.height * 0.6)
      ctx.bezierCurveTo(
        canvas.width * 0.3, canvas.height * 0.3,
        canvas.width * 0.7, canvas.height * 0.4,
        canvas.width, canvas.height * 0.5
      )
      ctx.lineTo(canvas.width, 0)
      ctx.lineTo(0, 0)
      ctx.fill()
    }

    // Trees (parallax, slower than camera)
    ctx.fillStyle = 'rgba(30, 80, 50, 0.6)'
    const treePattern = 300
    const parallaxTreeX = (cameraX * 0.5) % treePattern
    for (let txOffset = -parallaxTreeX; txOffset < canvas.width + treePattern; txOffset += treePattern) {
      // Tree trunk
      ctx.fillRect(txOffset + 100, canvas.height * 0.65, 20, 80)
      // Tree foliage
      ctx.beginPath()
      ctx.arc(txOffset + 110, canvas.height * 0.65, 40, 0, Math.PI * 2)
      ctx.fill()
    }

    // Ground color overlay
    ctx.fillStyle = 'rgba(30, 100, 60, 0.8)'
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y)

    // Grid pattern for debugging world alignment
    if (debugMode) {
      ctx.strokeStyle = 'rgba(155, 92, 255, 0.1)'
      ctx.lineWidth = 1
      const gridSize = 100
      for (let xi = Math.floor(cameraX / gridSize) * gridSize; xi < cameraX + canvas.width + gridSize; xi += gridSize) {
        ctx.beginPath()
        ctx.moveTo(xi - cameraX, 0)
        ctx.lineTo(xi - cameraX, canvas.height)
        ctx.stroke()
      }
    }
  }

  // Update camera
  function updateCamera() {
    const targetCameraX = player.x - canvas.width / 3
    // Smoothly follow player without tying directly to player velocity
    cameraX += (targetCameraX - cameraX) * 0.06
    cameraX = Math.max(0, Math.min(cameraX, WORLD_WIDTH - canvas.width))
  }

  // Collision detection
  function checkCollisions() {
    // Infinite ground platform
    const groundPlatform = { x: 0, y: GROUND_Y, w: WORLD_WIDTH, h: 50 }
    
    // All platforms including ground
    const allPlatforms = [groundPlatform, ...platforms]
    
    // Reset ground state
    player.onGround = false
    
    for (let p of allPlatforms) {
      // AABB collision: Bottom collision (landing)
      if (player.vy >= 0 &&
          player.y + player.height >= p.y &&
          player.y + player.height <= p.y + 10 &&
          player.x + player.width > p.x &&
          player.x < p.x + p.w) {
        player.y = p.y - player.height
        player.vy = 0
        player.onGround = true
        player.jumping = false
      }
    }

    // Obstacle collisions
    for (let obs of obstacles) {
      if (player.x + player.width > obs.x &&
          player.x < obs.x + obs.w &&
          player.y + player.height > obs.y &&
          player.y < obs.y + obs.h) {
        takeDamage()
        player.x = 100
        player.y = GROUND_Y - player.height
        player.vx = 0
        player.vy = 0
      }
    }

    // Goal collision
    const dx = (player.x + player.width / 2) - goal.x
    const dy = (player.y + player.height / 2) - goal.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < player.width / 2 + goal.r) {
      win()
    }
    
    // Also win if reached distance target (4800px)
    if (player.distanceTravelled >= GOAL_X) {
      win()
    }

    // World bounds (fall off world)
    if (player.y > canvas.height + 100) {
      takeDamage()
      player.x = 100
      player.y = GROUND_Y - player.height
      player.vx = 0
      player.vy = 0
    }
  }

  // Take damage
  function takeDamage() {
    // If invincible, ignore damage
    if (player.invincible) return
    
    health--
    healthEl.textContent = health
    
    // Activate invincibility iFrame (convert frames -> seconds)
    player.invincible = true
    player.invincibleCounter = INVINCIBLE_TIME / 60
    
    if (health <= 0) {
      endGame()
    }
    playHit()
  }

  // Load best time from localStorage
  function loadBestTime() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      bestTime = parseFloat(stored)
      console.log(`[DEBUG] Best time loaded: ${bestTime.toFixed(1)}s`)
    }
  }

  // Save best time to localStorage
  function saveBestTime() {
    localStorage.setItem(STORAGE_KEY, bestTime.toString())
    console.log(`[DEBUG] Best time saved: ${bestTime.toFixed(1)}s`)
  }

  // Load audio files
  function loadSounds() {
    try {
      jumpAudio = new Audio('assets/jump.wav.mp3')
      hitAudio = new Audio('assets/hit.wav.mp3')
      winAudio = new Audio('assets/win.wav.mp3')
      // Background music is generated via Web Audio API (no file needed)
      console.log('[DEBUG] Sounds preloaded successfully')
    } catch (e) {
      console.error('[DEBUG] Failed to load sounds:', e)
    }
  }

  // Play jump sound
  function playJump() {
    try {
      console.log('[DEBUG] jump sound')
      if (jumpAudio) {
        jumpAudio.currentTime = 0
        jumpAudio.play().catch(() => {})
      }
    } catch (e) {}
  }

  // Play hit/damage sound
  function playHit() {
    try {
      console.log('[DEBUG] hit sound')
      if (hitAudio) {
        hitAudio.currentTime = 0
        hitAudio.play().catch(() => {})
      }
    } catch (e) {}
  }

  // Play win sound
  function playWin() {
    try {
      console.log('[DEBUG] win sound')
      if (winAudio) {
        winAudio.currentTime = 0
        winAudio.play().catch(() => {})
      }
    } catch (e) {}
  }

  // Background music controls (Web Audio API)
  // Initialize or resume bgm audio context (required for autoplay policy bypass)
  function createBgmContext() {
    if (!bgmContext) {
      try {
        bgmContext = new (window.AudioContext || window.webkitAudioContext)()
        console.log('[DEBUG] bgm context created')
      } catch (e) {
        console.error('[DEBUG] bgm context failed', e)
      }
    }
    if (bgmContext && bgmContext.state === 'suspended') {
      bgmContext.resume().catch(() => {})
    }
  }

  // Play a single bgm note
  function playBgmNote(freq, duration) {
    if (!bgmContext) return
    try {
      bgmOscillator = bgmContext.createOscillator()
      bgmGain = bgmContext.createGain()
      bgmOscillator.frequency.setValueAtTime(freq, bgmContext.currentTime)
      bgmOscillator.type = 'sine'
      bgmGain.gain.setValueAtTime(0.08, bgmContext.currentTime)
      bgmGain.gain.exponentialRampToValueAtTime(0.01, bgmContext.currentTime + duration)
      bgmOscillator.connect(bgmGain)
      bgmGain.connect(bgmContext.destination)
      bgmOscillator.start(bgmContext.currentTime)
      bgmOscillator.stop(bgmContext.currentTime + duration)
    } catch (e) {}
  }

  // Play bgm loop (called after user interaction)
  function playBgm() {
    try {
      createBgmContext()
      if (!bgmContext || bgmPlaying) return
      bgmPlaying = true
      bgmNoteIndex = 0
      console.log('[DEBUG] bgm play')
      scheduleBgmNotes()
    } catch (e) {}
  }

  // Schedule and play bgm notes sequentially
  function scheduleBgmNotes() {
    if (!bgmPlaying || !bgmContext) return
    const freq = BGM_NOTES[bgmNoteIndex % BGM_NOTES.length]
    playBgmNote(freq, BGM_NOTE_DURATION)
    bgmNoteIndex++
    // Schedule next note after current one finishes
    setTimeout(() => scheduleBgmNotes(), BGM_NOTE_DURATION * 1000)
  }

  // Pause bgm
  function pauseBgm() {
    try {
      if (bgmOscillator) {
        bgmOscillator.stop(bgmContext.currentTime + 0.01)
        bgmOscillator = null
      }
      bgmPlaying = false
      console.log('[DEBUG] bgm pause')
    } catch (e) {}
  }

  // Reset bgm to start
  function resetBgm() {
    try {
      pauseBgm()
      bgmNoteIndex = 0
      console.log('[DEBUG] bgm reset')
    } catch (e) {}
  }

  // Format time as mm:ss.t
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`
  }

  // Update timer display
  function updateTimerDisplay() {
    timerEl.textContent = formatTime(currentTime)
  }

  // Update best time display
  function updateBestTimeDisplay() {
    if (bestTime !== null) {
      bestTimeEl.textContent = formatTime(bestTime)
    }
  }

  // Win game
  function win() {
    console.log(`[DEBUG] Win detected! Time: ${currentTime.toFixed(1)}s`)
    won = true
    running = false
    timerRunning = false
    
    // Check and update best time
    if (bestTime === null || currentTime < bestTime) {
      bestTime = currentTime
      saveBestTime()
      console.log(`[DEBUG] New record! ${formatTime(bestTime)}`)
    }
    
    // Show win message with time
    winTextEl.textContent = `🎉 Kazandın! Süre: ${formatTime(currentTime)}`
    winTextEl.classList.remove('hidden')
    // Stop background music when game stops
    pauseBgm()
    playWin()
  }

  // End game
  function endGame() {
    running = false
    gameOver = true
    gameStateEl.textContent = 'Oyun Bitti! Sağlık: 0'
    gameStateEl.classList.remove('hidden')
    // Pause background music when game ends
    pauseBgm()
  }

  // Update player physics
  function updatePlayer(dt) {
    if (!running) return

    // Horizontal input
    let moveDir = 0
    if (keys['a'] || keys['arrowleft']) {
      moveDir -= 1
      player.facingLeft = true
    }
    if (keys['d'] || keys['arrowright']) {
      moveDir += 1
      player.facingLeft = false
    }

    // Apply horizontal acceleration (reduced in air)
    const effectiveAccel = ACCEL * (player.onGround ? 1 : AIR_ACCEL_FACTOR)
    if (moveDir !== 0) {
      player.vx += effectiveAccel * moveDir * dt
    } else if (player.onGround) {
      // Apply friction to slow down to zero when no input on ground
      const decel = FRICTION * dt
      if (player.vx > 0) {
        player.vx = Math.max(0, player.vx - decel)
      } else if (player.vx < 0) {
        player.vx = Math.min(0, player.vx + decel)
      }
    }

    // Cap max speed
    player.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, player.vx))

    // Apply gravity (px/s^2)
    player.vy += GRAVITY * dt

    // Update position using velocity (px/s -> px)
    player.x += player.vx * dt
    player.y += player.vy * dt

    // World bounds
    player.x = Math.max(0, Math.min(player.x, WORLD_WIDTH - player.width))

    // Update distance (pixel-based)
    player.distanceTravelled = Math.max(player.distanceTravelled, player.x)
    distanceEl.textContent = Math.floor(player.distanceTravelled)

    // Update invincibility counter (frames -> convert to seconds using dt)
    if (player.invincible) {
      // INVINCIBLE_TIME is in frames (60 frames = 1s). Convert to seconds.
      const invSec = INVINCIBLE_TIME / 60
      player.invincibleCounter -= dt
      if (player.invincibleCounter <= 0) {
        player.invincible = false
      }
    }

    checkCollisions()
  }

  // Start game
  function startGame() {
    console.log('[DEBUG] start clicked')
    if (running) return
    running = true
    gameOver = false
    won = false
    health = HEALTH_MAX
    healthEl.textContent = health
    player.x = 100
    player.y = GROUND_Y - player.height
    player.vx = 0
    player.vy = 0
    player.invincible = false
    player.invincibleCounter = 0
    player.distanceTravelled = 0
    distanceEl.textContent = '0'
    gameStateEl.classList.add('hidden')
    winTextEl.classList.add('hidden')
    cameraX = 0
    
    // Timer reset and start
    currentTime = 0
    timerRunning = true
    console.log('[DEBUG] timer started')
    updateTimerDisplay()
    
    // Start background music (user interaction - allowed)
    playBgm()

    // Start game loop
    requestAnimationFrame(gameLoop)
  }

  // Reset game
  function resetGame() {
    console.log('[DEBUG] reset clicked')
    running = false
    gameOver = false
    won = false
    health = HEALTH_MAX
    healthEl.textContent = health
    player.x = 100
    player.y = GROUND_Y - player.height
    player.vx = 0
    player.vy = 0
    player.invincible = false
    player.invincibleCounter = 0
    player.distanceTravelled = 0
    distanceEl.textContent = '0'
    gameStateEl.classList.add('hidden')
    winTextEl.classList.add('hidden')
    cameraX = 0
    
    // Reset timer but keep best record
    timerRunning = false
    currentTime = 0
    updateTimerDisplay()
    // Reset background music to start but do not autoplay
    resetBgm()
  }

  // Main game loop (uses timestamp -> dt)
  function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp
    const dt = Math.min(0.05, (timestamp - lastTime) / 1000) // clamp to 50ms
    lastTime = timestamp

    if (!running) {
      // If not running, just clear screen and wait
      ctx.fillStyle = 'rgba(10, 32, 26, 1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      requestAnimationFrame(gameLoop)
      return
    }

    // Update timer if running
    if (timerRunning) {
      currentTime += dt
      updateTimerDisplay()
    }

    updatePlayer(dt)
    updateCamera()

    drawBackground()
    drawPlatforms()
    drawObstacles()
    drawGoal()
    drawPlayer()

    requestAnimationFrame(gameLoop)
  }

  // Initialize and bind events
  function initGame() {
    console.log('Initializing game...')
    
    // Capture DOM elements now that DOM is ready
    canvas = document.getElementById('gameCanvas')
    ctx = canvas.getContext('2d')
    startBtn = document.getElementById('startBtn')
    resetBtn = document.getElementById('resetBtn')
    distanceEl = document.getElementById('distance')
    healthEl = document.getElementById('health')
    gameStateEl = document.getElementById('gameState')
    winTextEl = document.getElementById('winText')
    timerEl = document.getElementById('timer')
    bestTimeEl = document.getElementById('bestTime')

    console.log('Canvas:', canvas)
    console.log('startBtn:', startBtn)
    console.log('resetBtn:', resetBtn)
    
    if (!canvas || !startBtn || !resetBtn) {
      console.error('Required elements not found!')
      return
    }

    // Load best time from storage and display
    loadBestTime()
    updateBestTimeDisplay()
    
    // Load sound files
    loadSounds()
    
    // Load cloud image
    loadCloudImage()
    // Load background image
    loadBackgroundImage()

    startBtn.addEventListener('click', startGame)
    resetBtn.addEventListener('click', resetGame)

    // Pause bgm when tab hidden, resume when visible and game running
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pauseBgm()
      } else {
        if (running) playBgm()
      }
    })

    console.log('Events bound successfully!')
    // Start the main loop
    requestAnimationFrame(gameLoop)
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame)
  } else {
    initGame()
  }
})()
