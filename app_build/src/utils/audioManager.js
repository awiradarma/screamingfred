// src/utils/audioManager.js

let audioCtx = null;
let masterVolumeNode = null;

// Background Music State
let currentBgmPlayer = null;
let nextBgmPlayer = null;
let bgmFadeInterval = null;

// Map game themes to royalty-free loopable background music tracks (SoundHelix public files as stable defaults)
export const BGM_THEME_MAPS = {
  home: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',       // Cozy, nostalgic
  desert: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',     // Warm, atmospheric
  mountain: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',   // Epic, heroic
  forest: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',     // Natural, rhythmic
  factory: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',    // Industrial, techno
  adventure: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',  // General gameplay
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

/**
 * Starts background music (BGM) loop with smooth crossfade.
 */
export const transitionBGM = (url, targetVolume = 0.4) => {
  if (!url) {
    stopAllBGM();
    return;
  }

  // If already playing this track, adjust volume if needed and exit
  if (currentBgmPlayer && currentBgmPlayer.src === url) {
    currentBgmPlayer.volume = targetVolume;
    return;
  }

  clearInterval(bgmFadeInterval);

  // Initialize new track
  nextBgmPlayer = new Audio(url);
  nextBgmPlayer.loop = true;
  nextBgmPlayer.volume = 0;

  // Let browser play the track once ready
  nextBgmPlayer.play().catch(e => console.info("BGM deferred until first user interaction"));

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
        currentBgmPlayer.pause();
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
    currentBgmPlayer.pause();
    currentBgmPlayer = null;
  }
  if (nextBgmPlayer) {
    nextBgmPlayer.pause();
    nextBgmPlayer = null;
  }
};
