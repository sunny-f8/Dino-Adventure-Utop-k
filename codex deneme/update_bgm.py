#!/usr/bin/env python3
import re

# Read script.js
with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace bgmAudio declaration with Web Audio vars
old_bgm_decl = "  let jumpAudio, hitAudio, winAudio\n  let bgmAudio"
new_bgm_decl = """  let jumpAudio, hitAudio, winAudio
  // Background music: Web Audio API procedural tone generator
  let bgmContext = null
  let bgmOscillator = null
  let bgmGain = null
  let bgmPlaying = false
  let bgmNoteIndex = 0
  const BGM_NOTES = [262, 294, 330, 262] // C4, D4, E4, C4
  const BGM_NOTE_DURATION = 0.5 // seconds per note"""

content = content.replace(old_bgm_decl, new_bgm_decl)

# 2. Remove bgmAudio loading code from loadSounds
old_bgm_load = """      winAudio = new Audio('assets/win.wav.mp3')
      // Background music (preload but do not autoplay)
      // Try to load intended bgm file. If it's missing, fall back to an existing asset so
      // the game still has background audio for testing.
      bgmAudio = new Audio('assets/bgm.mp3')
      bgmAudio.loop = true
      bgmAudio.volume = 0.25 // low volume (25%)
      bgmAudio.preload = 'auto'
      // If bgm file fails to load, disable bgm (do not fallback to effect files)
      bgmAudio.addEventListener('error', () => {
        console.warn('[DEBUG] bgm.mp3 not found - background music disabled (no fallback)')
        try {
          // Remove reference so playBgm() will skip playing
          bgmAudio = null
        } catch (e) { console.error('[DEBUG] bgm error handler failed', e) }
      })
      console.log('[DEBUG] Sounds preloaded successfully')"""

new_bgm_load = """      winAudio = new Audio('assets/win.wav.mp3')
      // Background music is procedurally generated via Web Audio API
      console.log('[DEBUG] Sounds preloaded successfully')"""

content = content.replace(old_bgm_load, new_bgm_load)

# 3. Replace old bgm helper functions with Web Audio versions
# Find and replace playBgm, pauseBgm, resetBgm

old_play_bgm = """  // Background music controls
  // Play bgm (called after user interaction - e.g. start button)
  function playBgm() {
    try {
      if (!bgmAudio) return
      // try to play; ignore rejected promise from autoplay policies
      bgmAudio.play().catch(() => {})
      console.log('[DEBUG] bgm play')
    } catch (e) {}
  }

  // Pause bgm
  function pauseBgm() {
    try {
      if (!bgmAudio) return
      bgmAudio.pause()
      console.log('[DEBUG] bgm pause')
    } catch (e) {}
  }

  // Reset bgm to start and pause
  function resetBgm() {
    try {
      if (!bgmAudio) return
      bgmAudio.pause()
      bgmAudio.currentTime = 0
      console.log('[DEBUG] bgm reset')
    } catch (e) {}
  }"""

new_play_bgm = """  // Background music controls (Web Audio API)
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
  }"""

content = content.replace(old_play_bgm, new_play_bgm)

# Write updated script.js
with open('script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ script.js updated: bgmAudio -> Web Audio API procedural tone generator")
