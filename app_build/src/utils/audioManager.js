// src/utils/audioManager.js

let audioCtx = null;
let masterVolumeNode = null;

// Background Music State
let currentBgmPlayer = null;
let nextBgmPlayer = null;
let bgmFadeInterval = null;

// Map game themes to royalty-free loopable background music tracks (SoundHelix public files as stable defaults)
export const BGM_THEME_MAPS = {
  home: 'home',
  desert: 'desert',
  mountain: 'mountain',
  forest: 'forest',
  factory: 'factory',
  adventure: 'adventure',
};

// Speaker profiles for speech synthesis and text-bleeps
export const SPEAKER_PROFILES = {
  fred: {
    pitch: 1.2,
    rate: 1.05,
    bleepFreq: 260, // C4
    bleepWave: 'triangle',
    voiceSearch: 'en-US',
  },
  tinkerer: {
    pitch: 1.5,
    rate: 1.2,
    bleepFreq: 440, // A4
    bleepWave: 'sine',
    voiceSearch: 'en-GB',
  },
  barry: {
    pitch: 0.6,
    rate: 0.8,
    bleepFreq: 110, // A2
    bleepWave: 'sawtooth',
    voiceSearch: 'en-US',
  },
  default: {
    pitch: 1.0,
    rate: 1.0,
    bleepFreq: 220, // A3
    bleepWave: 'triangle',
    voiceSearch: 'en',
  }
};

/**
 * Initializes and unlocks the Web Audio API context.
 * Browsers block audio until a gesture (click/keypress) occurs.
 */
export const initAudioContext = () => {
  if (audioCtx) return audioCtx;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    // Set up master volume control
    masterVolumeNode = audioCtx.createGain();
    masterVolumeNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
    masterVolumeNode.connect(audioCtx.destination);

    console.info("Web Audio Context successfully initialized!");
  } catch (error) {
    console.error("Failed to initialize Web Audio Context:", error);
  }

  return audioCtx;
};

/**
 * Plays a programmatic procedural 8-bit style sound effect using Web Audio oscillators.
 */
export const playSynthSFX = (type, volume = 0.5) => {
  const ctx = initAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.connect(gainNode);
  gainNode.connect(masterVolumeNode || ctx.destination);

  gainNode.gain.setValueAtTime(volume, now);

  switch (type) {
    case 'loot':
      // Sparkling ascending chime arpeggio
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
      break;

    case 'scream':
      // Iconic loud upward pitch sweep
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.35);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;

    case 'danger':
      // Glitched down-sweep buzz
      osc.type = 'square';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.22);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
      break;

    case 'footstep':
      // Subtle, dry low frequency thud
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      osc.start(now);
      osc.stop(now + 0.085);
      break;

    case 'victory':
      // Ascending major fanfare
      osc.type = 'square';
      osc.frequency.setValueAtTime(392.00, now); // G4
      osc.frequency.setValueAtTime(523.25, now + 0.12); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.24); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.36); // G5
      gainNode.gain.setValueAtTime(volume, now + 0.36);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
      break;

    case 'defeat':
      // Melancholic sliding crash
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(55, now + 0.5);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;

    default:
      break;
  }
};

/**
 * Triggers a single retro RPG character "text bleep" tone.
 */
export const playRetroBleep = (speakerName = 'default', volume = 0.3) => {
  const ctx = initAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  const profile = SPEAKER_PROFILES[speakerName.toLowerCase()] || SPEAKER_PROFILES.default;

  osc.connect(gainNode);
  gainNode.connect(masterVolumeNode || ctx.destination);

  osc.type = profile.bleepWave;
  
  // Apply a tiny pitch wiggle for dynamic, voice-like text feel
  const randFreqMod = (Math.random() - 0.5) * 20;
  osc.frequency.setValueAtTime(profile.bleepFreq + randFreqMod, now);
  
  gainNode.gain.setValueAtTime(volume, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.start(now);
  osc.stop(now + 0.06);
};

/**
 * Plays a sequence of retro RPG bleeps for a block of dialogue text.
 */
export const playDialogueBleeps = (speakerName = 'default', text = '', volume = 0.3) => {
  // Determine bleep count based on text length: min 3, max 10
  const bleepCount = Math.min(Math.max(Math.floor(text.length / 8), 3), 10);
  let count = 0;
  
  const playNext = () => {
    if (count >= bleepCount) return;
    playRetroBleep(speakerName, volume);
    count++;
    // Randomize slightly the timing between bleeps (60ms - 100ms)
    const nextDelay = 60 + Math.random() * 40;
    setTimeout(playNext, nextDelay);
  };
  
  playNext();
};

/**
 * Speaks text out loud using window.speechSynthesis.
 */
export const speakDialogue = (speakerName, text, volume = 0.8) => {
  if (!window.speechSynthesis) return;

  // Clear pending utterances so they don't backlog
  window.speechSynthesis.cancel();

  const profile = SPEAKER_PROFILES[speakerName.toLowerCase()] || SPEAKER_PROFILES.default;
  const utterance = new SpeechSynthesisUtterance(text);

  utterance.pitch = profile.pitch;
  utterance.rate = profile.rate;
  utterance.volume = volume;

  // Async load available voices in the client
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(v => v.lang.startsWith(profile.voiceSearch) || v.name.includes(profile.voiceSearch));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  window.speechSynthesis.speak(utterance);
};

class ProceduralPlayer {
  constructor(theme, ctx, outputNode) {
    this.theme = theme;
    this.ctx = ctx;
    this.outputNode = outputNode;
    
    // Create local gain node for fading
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    this.gainNode.connect(this.outputNode);

    this.isPlaying = false;
    this.timerId = null;
    this.activeNodes = new Set();
    
    // Musical parameters based on theme
    this.tempo = 100; // BPM
    this.stepDuration = 60 / this.tempo / 2; // eighth notes
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime;
    
    this.setupTheme();
  }
  
  setupTheme() {
    // Define notes and rhythms
    switch (this.theme) {
      case 'home':
        this.tempo = 100;
        this.bassPattern = [48, 48, 52, 52, 45, 45, 48, 48]; // MIDI numbers (C3, E3, A2, C3)
        this.melodyPattern = [
          [60, 64, 67], [64, 67, 72], [57, 60, 64], [60, 64, 67]
        ];
        this.waveType = 'triangle';
        break;
      case 'desert':
        this.tempo = 75;
        this.bassPattern = [46, 46, 46, 46, 47, 47, 47, 47]; // Bb2, B2
        this.melodyPattern = [
          [58, 62, 65], [62, 65, 68], [59, 63, 66], [63, 66, 69]
        ];
        this.waveType = 'sine';
        break;
      case 'mountain':
        this.tempo = 120;
        this.bassPattern = [43, 47, 50, 47, 40, 43, 47, 43]; // G2, B2, D3, B2, E2...
        this.melodyPattern = [
          [55, 59, 62], [59, 62, 67], [52, 55, 59], [55, 59, 62]
        ];
        this.waveType = 'square';
        break;
      case 'forest':
        this.tempo = 110;
        this.bassPattern = [53, 53, 53, 53, 57, 57, 57, 57]; // F2, A2
        this.melodyPattern = [
          [65, 69, 72], [69, 72, 77], [60, 64, 67], [64, 67, 72]
        ];
        this.waveType = 'triangle';
        break;
      case 'factory':
        this.tempo = 125;
        this.bassPattern = [36, 36, 48, 36, 36, 36, 48, 36]; // C2, C3
        this.melodyPattern = [
          [48, 51, 55], [51, 55, 60], [48, 51, 55], [51, 55, 60]
        ];
        this.waveType = 'sawtooth';
        break;
      case 'adventure':
      default:
        // A tense, spooky procedural chiptune theme utilizing diminished intervals and low bass tritones
        this.tempo = 85;
        this.bassPattern = [40, 40, 46, 46, 40, 40, 41, 41]; // E2, Bb2 (Tritone), E2, F2 (Tense half-step)
        this.melodyPattern = [
          [52, 55, 58], // E Diminished (spooky)
          [55, 58, 64], 
          [53, 56, 59], // F Diminished
          [56, 59, 65]
        ];
        this.waveType = 'sawtooth'; // Ghostly buzzing saw-lead
        break;
    }
    this.stepDuration = 60 / this.tempo / 2; // Duration of one eighth note in seconds
  }
  
  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  
  scheduleNote(step, time) {
    if (this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    if (time < now - 0.1) return; // Don't schedule in the past
    
    // Play Bass note on every beat (even steps)
    if (step % 2 === 0) {
      const bassIndex = Math.floor(step / 2) % this.bassPattern.length;
      const bassMidi = this.bassPattern[bassIndex];
      this.playTone(this.midiToFreq(bassMidi), 'triangle', time, this.stepDuration * 1.8, 0.4);
    }
    
    // Play melody note/chord on specific steps
    const chordIndex = Math.floor(step / 4) % this.melodyPattern.length;
    const chord = this.melodyPattern[chordIndex];
    if (step % 4 === 0) {
      // Arpeggiate
      chord.forEach((midi, idx) => {
        const noteTime = time + idx * 0.08;
        this.playTone(this.midiToFreq(midi), this.waveType, noteTime, 0.15, 0.15);
      });
    } else if (step % 4 === 2) {
      // Offbeat melody note
      const noteMidi = chord[step % 3];
      this.playTone(this.midiToFreq(noteMidi + 12), this.waveType, time, 0.1, 0.1);
    }
    
    // Simple drum beat
    if (step % 4 === 0) {
      this.playKick(time);
    } else if (step % 4 === 2) {
      this.playSnare(time);
    }
  }

  playTone(freq, type, time, duration, vol) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    
    // Avoid clicking with quick ramp in and exponential ramp out
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(vol, time + 0.01);
    gainNode.gain.setValueAtTime(vol, time + duration - 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    osc.connect(gainNode);
    gainNode.connect(this.gainNode);
    
    osc.start(time);
    osc.stop(time + duration);
    
    this.activeNodes.add(osc);
    setTimeout(() => {
      this.activeNodes.delete(osc);
    }, (time + duration - this.ctx.currentTime) * 1000 + 100);
  }

  playKick(time) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.3, time + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(this.gainNode);
    
    osc.start(time);
    osc.stop(time + 0.1);
    
    this.activeNodes.add(osc);
    setTimeout(() => {
      this.activeNodes.delete(osc);
    }, 200);
  }

  playSnare(time) {
    const bufferSize = this.ctx.sampleRate * 0.1; // 0.1s
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.15, time + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.gainNode);
    
    noise.start(time);
    noise.stop(time + 0.08);
    
    this.activeNodes.add(noise);
    setTimeout(() => {
      this.activeNodes.delete(noise);
    }, 200);
  }
  
  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduler();
  }
  
  scheduler() {
    if (!this.isPlaying) return;
    
    // Schedule notes up to 200ms in advance
    const scheduleAheadTime = 0.2;
    if (this.ctx.state === 'suspended') {
      this.nextNoteTime = this.ctx.currentTime + 0.05;
    } else {
      while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
        this.scheduleNote(this.currentStep, this.nextNoteTime);
        this.nextNoteTime += this.stepDuration;
        this.currentStep = (this.currentStep + 1) % 64;
      }
    }
    
    this.timerId = setTimeout(() => this.scheduler(), 50);
  }
  
  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.activeNodes.forEach(node => {
      try {
        node.stop();
      } catch (e) {}
    });
    this.activeNodes.clear();
    try {
      this.gainNode.disconnect();
    } catch (e) {}
  }
  
  get volume() {
    return this.gainNode.gain.value;
  }
  
  set volume(val) {
    this.gainNode.gain.setValueAtTime(val, this.ctx.currentTime);
  }
}

/**
 * Starts background music (BGM) loop with smooth crossfade.
 */
export const transitionBGM = (themeKey, targetVolume = 0.4) => {
  if (!themeKey) {
    stopAllBGM();
    return;
  }

  // If already playing this track, adjust volume if needed and exit
  if (currentBgmPlayer && currentBgmPlayer.theme === themeKey) {
    currentBgmPlayer.volume = targetVolume;
    return;
  }

  clearInterval(bgmFadeInterval);

  const ctx = initAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // Initialize new track
  nextBgmPlayer = new ProceduralPlayer(themeKey, ctx, masterVolumeNode || ctx.destination);
  nextBgmPlayer.volume = 0;
  nextBgmPlayer.start();

  // Smooth Crossfade Loop
  const fadeDuration = 1500; // ms
  const fadeStep = 50; // ms
  let elapsed = 0;

  const startVolume = currentBgmPlayer ? currentBgmPlayer.volume : 0;

  bgmFadeInterval = setInterval(() => {
    elapsed += fadeStep;
    const progress = Math.min(elapsed / fadeDuration, 1.0);

    // Fade out previous BGM
    if (currentBgmPlayer) {
      currentBgmPlayer.volume = Math.max(0, startVolume * (1.0 - progress));
    }

    // Fade in new BGM
    if (nextBgmPlayer) {
      nextBgmPlayer.volume = targetVolume * progress;
    }

    if (progress >= 1.0) {
      clearInterval(bgmFadeInterval);
      
      if (currentBgmPlayer) {
        currentBgmPlayer.stop();
        currentBgmPlayer = null;
      }

      currentBgmPlayer = nextBgmPlayer;
      nextBgmPlayer = null;
    }
  }, fadeStep);
};

/**
 * Adjusts active BGM volume on settings updates.
 */
export const setBgmVolume = (volume) => {
  if (currentBgmPlayer) {
    currentBgmPlayer.volume = volume;
  }
};

/**
 * Completely terminates BGM players.
 */
export const stopAllBGM = () => {
  clearInterval(bgmFadeInterval);
  if (currentBgmPlayer) {
    currentBgmPlayer.stop();
    currentBgmPlayer = null;
  }
  if (nextBgmPlayer) {
    nextBgmPlayer.stop();
    nextBgmPlayer = null;
  }
};
