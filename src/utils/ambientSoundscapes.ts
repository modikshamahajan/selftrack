import { Platform, Vibration } from 'react-native';
import { createAudioPlayer } from 'expo-audio';

export type SoundscapeType = 'none' | 'rain' | 'forest' | 'waves' | 'lofi';

/**
 * High-fidelity, pleasant local ambient audio assets.
 * Bundled locally to ensure 100% offline playback, zero latency, and no broken remote URLs.
 */
const SOUNDSCAPE_FILES: Record<SoundscapeType, any> = {
  none: null,
  rain: require('../../assets/sounds/rain.mp3'),
  waves: require('../../assets/sounds/waves.mp3'),
  forest: require('../../assets/sounds/forest.mp3'),
  lofi: require('../../assets/sounds/lofi.mp3'),
};

const CHIME_FILES = {
  chime: require('../../assets/sounds/chime.mp3'),
  complete: require('../../assets/sounds/complete.mp3'),
};

class AmbientSoundEngine {
  private currentType: SoundscapeType = 'none';
  private player: any = null;
  private webAudio: any = null;
  private audioCtx: any = null;

  private getAudioContext(): any {
    if (Platform.OS !== 'web') return null;
    const g = globalThis as any;
    if (typeof g.window === 'undefined') return null;
    const AudioCtxClass = g.AudioContext || g.webkitAudioContext || g.window?.AudioContext;
    if (!AudioCtxClass) return null;
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Plays a pleasant chime / bell tone for focus session start, completions, and breathing phases.
   */
  public playChime(kind: 'start' | 'complete' | 'inhale' | 'exhale' | 'hold') {
    // 1. Native / Mobile audio chime with haptics
    if (Platform.OS !== 'web') {
      try {
        const soundAsset = kind === 'complete' ? CHIME_FILES.complete : CHIME_FILES.chime;
        const chimePlayer = createAudioPlayer(soundAsset);
        chimePlayer.volume = 0.65;
        chimePlayer.play();
        setTimeout(() => {
          try {
            if (typeof chimePlayer.remove === 'function') chimePlayer.remove();
          } catch (e) {}
        }, 2200);
      } catch (e) {
        // Fallback or ignore
      }

      try {
        if (kind === 'complete') {
          Vibration.vibrate([0, 80, 60, 120]);
        } else {
          Vibration.vibrate(35);
        }
      } catch (e) {}
      return;
    }

    // 2. Web harmonic sine chime synthesis
    const ctx = this.getAudioContext();
    if (ctx) {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (kind === 'complete') {
          // Double uplifting chime: C5 (523Hz) -> G5 (784Hz)
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.28);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
          osc.start(now);
          osc.stop(now + 0.95);
        } else if (kind === 'inhale') {
          // Gentle rising tone: C4 -> E4
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(261.63, now);
          osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.45);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          osc.start(now);
          osc.stop(now + 0.6);
        } else if (kind === 'exhale') {
          // Gentle grounding tone: E4 -> A3
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(329.63, now);
          osc.frequency.exponentialRampToValueAtTime(220.00, now + 0.45);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          osc.start(now);
          osc.stop(now + 0.6);
        } else {
          // Soft start ping: A4 (440Hz)
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.45);
        }
      } catch (e) {}
    }
  }

  /**
   * Starts playing a pleasant, authentic ambient soundscape (Rain, Ocean Waves, Forest, or Lo-Fi).
   * Automatically loops seamlessly and allows volume adjustments.
   */
  public startSoundscape(type: SoundscapeType, volume: number = 0.5) {
    this.stopSoundscape();
    this.currentType = type;
    if (type === 'none') return;

    const soundAsset = SOUNDSCAPE_FILES[type];
    if (!soundAsset) return;

    const normalizedVol = Math.max(0.05, Math.min(1.0, volume));

    // Platform-specific audio player initialization
    if (Platform.OS !== 'web') {
      try {
        const player = createAudioPlayer(soundAsset);
        player.loop = true;
        player.volume = normalizedVol;
        player.play();
        this.player = player;
      } catch (err) {
        console.warn('Native soundscape player note:', err);
      }
      return;
    }

    // Web execution: try createAudioPlayer first, fallback to HTML5 Audio element
    try {
      const player = createAudioPlayer(soundAsset);
      player.loop = true;
      player.volume = normalizedVol;
      player.play();
      this.player = player;
    } catch (err) {
      try {
        const g = globalThis as any;
        if (typeof g.window !== 'undefined' && g.Audio) {
          const audioSrc = typeof soundAsset === 'string' ? soundAsset : (soundAsset?.default || soundAsset);
          const webAudio = new g.Audio(audioSrc);
          webAudio.loop = true;
          webAudio.volume = normalizedVol;
          webAudio.play().catch(() => {});
          this.webAudio = webAudio;
        }
      } catch (webErr) {
        console.warn('Web soundscape player note:', webErr);
      }
    }
  }

  /**
   * Stops any currently playing soundscape and releases resources.
   */
  public stopSoundscape() {
    if (this.player) {
      try {
        this.player.pause();
        if (typeof this.player.remove === 'function') {
          this.player.remove();
        }
      } catch (e) {}
      this.player = null;
    }

    if (this.webAudio) {
      try {
        this.webAudio.pause();
        this.webAudio.currentTime = 0;
      } catch (e) {}
      this.webAudio = null;
    }

    this.currentType = 'none';
  }

  public getCurrentType(): SoundscapeType {
    return this.currentType;
  }
}

export const ambientSoundEngine = new AmbientSoundEngine();
