import type { WeaponId } from './types';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private muted = false;
  private lastShootAudioAt = 0;
  private lastChainsawAudioAt = 0;

  // Mysterious nocturnal title music state
  private titleMusicWanted = false;
  private titleMusicRunning = false;
  private titleMusicGain: GainNode | null = null;
  private titleMusicTimer: number | null = null;
  private titleDroneOscs: OscillatorNode[] = [];
  private titleDroneLfo: OscillatorNode | null = null;
  private titleStep = 0;

  // Backrooms fluorescent ballast hum
  private backroomsHumOsc: OscillatorNode | null = null;
  private backroomsHumOsc2: OscillatorNode | null = null;
  private backroomsHumGain: GainNode | null = null;

  // Backrooms 2D Nextbot spatial proximity MP3 tracks
  private nextbotTracks: Record<
    'en_este_pueblo' | 'bob_esponja' | 'among_us',
    {
      src: string;
      audioEl: HTMLAudioElement | null;
      sourceNode: MediaElementAudioSourceNode | null;
      pannerNode: StereoPannerNode | null;
      gainNode: GainNode | null;
      wanted: boolean;
    }
  > = {
    en_este_pueblo: {
      src: '/assets/aistudio/en_este_pueblo_____memes__audio_949455a5.mp3',
      audioEl: null,
      sourceNode: null,
      pannerNode: null,
      gainNode: null,
      wanted: false,
    },
    bob_esponja: {
      src: '/assets/bob_esponja_chase.mp3',
      audioEl: null,
      sourceNode: null,
      pannerNode: null,
      gainNode: null,
      wanted: false,
    },
    among_us: {
      src: '/assets/among_us_funk.mp3',
      audioEl: null,
      sourceNode: null,
      pannerNode: null,
      gainNode: null,
      wanted: false,
    },
  };

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.windGain && this.ctx) {
      this.windGain.gain.setTargetAtTime(muted ? 0 : 0.032, this.ctx.currentTime, 0.08);
    }
    if (this.backroomsHumGain && this.ctx) {
      this.backroomsHumGain.gain.setTargetAtTime(muted ? 0 : 0.035, this.ctx.currentTime, 0.08);
    }
    if (muted) {
      for (const track of Object.values(this.nextbotTracks)) {
        if (track.gainNode && this.ctx) {
          track.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        }
        if (track.audioEl) {
          track.audioEl.volume = 0;
        }
      }
    }
    if (this.titleMusicGain && this.ctx) {
      this.titleMusicGain.gain.setTargetAtTime(
        muted ? 0.0001 : 0.25,
        this.ctx.currentTime,
        0.12
      );
    }
    if (!muted && this.titleMusicWanted && !this.titleMusicRunning) {
      this.resumeTitleMusicIfWanted();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    if (!this.noiseBuffer && this.ctx) {
      const sampleRate = this.ctx.sampleRate;
      const length = Math.floor(sampleRate * 1.4);
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }

    if (!this.reverbNode && this.ctx) {
      const sampleRate = this.ctx.sampleRate;
      const irLen = Math.floor(sampleRate * 1.65);
      const irBuffer = this.ctx.createBuffer(2, irLen, sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const chData = irBuffer.getChannelData(ch);
        for (let i = 0; i < irLen; i++) {
          const t = i / sampleRate;
          const slap = Math.abs(t - 0.115) < 0.01 ? 0.45 : 0;
          const decay = Math.exp(-t * 2.9);
          chData[i] = (Math.random() * 2 - 1) * 0.42 * decay + slap * (Math.random() * 2 - 1);
        }
      }
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = irBuffer;
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.28;
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.ctx.destination);
    }

    return this.ctx;
  }

  public startAmbience() {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer || this.windSource) return;

    const windBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const data = windBuf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.025 * white) / 1.025;
      data[i] = lastOut * 2.8;
    }

    const src = ctx.createBufferSource();
    src.buffer = windBuf;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 340;
    filter.Q.value = 1.4;

    const gain = ctx.createGain();
    gain.gain.value = this.muted ? 0 : 0.032;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();

    this.windSource = src;
    this.windGain = gain;
  }

  public playShoot(weaponId: WeaponId) {
    if (weaponId === 'chainsaw') {
      this.playChainsawCut(false);
      return;
    }
    const perfNow = performance.now();
    if (perfNow - this.lastShootAudioAt < 38) return;
    this.lastShootAudioAt = perfNow;

    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const noiseGain = ctx.createGain();

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    const mech = ctx.createOscillator();
    const mechGain = ctx.createGain();

    if (weaponId === 'pistol') {
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(380, now + 0.14);
      filter.Q.value = 0.9;
      noiseGain.gain.setValueAtTime(0.42, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.09);
      oscGain.gain.setValueAtTime(0.44, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      mech.type = 'square';
      mech.frequency.setValueAtTime(1450, now + 0.02);
      mech.frequency.exponentialRampToValueAtTime(520, now + 0.06);
      mechGain.gain.setValueAtTime(0.09, now + 0.02);
      mechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    } else if (weaponId === 'rifle') {
      filter.frequency.setValueAtTime(2800, now);
      filter.frequency.exponentialRampToValueAtTime(420, now + 0.12);
      filter.Q.value = 0.75;
      noiseGain.gain.setValueAtTime(0.38, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(170, now);
      osc.frequency.exponentialRampToValueAtTime(44, now + 0.085);
      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      mech.type = 'square';
      mech.frequency.setValueAtTime(1950, now + 0.015);
      mech.frequency.exponentialRampToValueAtTime(760, now + 0.05);
      mechGain.gain.setValueAtTime(0.08, now + 0.015);
      mechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    } else if (weaponId === 'shotgun') {
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.34);
      filter.Q.value = 0.6;
      noiseGain.gain.setValueAtTime(0.66, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.24);
      oscGain.gain.setValueAtTime(0.68, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      mech.type = 'triangle';
      mech.frequency.setValueAtTime(640, now + 0.26);
      mech.frequency.exponentialRampToValueAtTime(280, now + 0.36);
      mechGain.gain.setValueAtTime(0.001, now);
      mechGain.gain.setValueAtTime(0.14, now + 0.26);
      mechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    } else if (weaponId === 'sniper') {
      // High-powered sniper crack + bolt cycle clack
      filter.frequency.setValueAtTime(3400, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.36);
      filter.Q.value = 0.65;
      noiseGain.gain.setValueAtTime(0.68, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.22);
      oscGain.gain.setValueAtTime(0.64, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      mech.type = 'triangle';
      mech.frequency.setValueAtTime(1180, now + 0.28);
      mech.frequency.exponentialRampToValueAtTime(620, now + 0.38);
      mechGain.gain.setValueAtTime(0.001, now);
      mechGain.gain.setValueAtTime(0.16, now + 0.28);
      mechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    } else if (weaponId === 'chicken_combo') {
      // Hyper-hybrid burst: crisp sniper snap + shotgun boom + golden rooster chirp
      filter.frequency.setValueAtTime(3100, now);
      filter.frequency.exponentialRampToValueAtTime(240, now + 0.16);
      filter.Q.value = 0.7;
      noiseGain.gain.setValueAtTime(0.45, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.14);
      oscGain.gain.setValueAtTime(0.48, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      mech.type = 'triangle';
      mech.frequency.setValueAtTime(980, now);
      mech.frequency.exponentialRampToValueAtTime(1420, now + 0.045);
      mechGain.gain.setValueAtTime(0.11, now);
      mechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    } else {
      // Rocket Launcher whoosh + deep tube thump
      filter.frequency.setValueAtTime(920, now);
      filter.frequency.exponentialRampToValueAtTime(190, now + 0.42);
      filter.Q.value = 0.7;
      noiseGain.gain.setValueAtTime(0.58, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.26);
      oscGain.gain.setValueAtTime(0.62, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      mech.type = 'sawtooth';
      mech.frequency.setValueAtTime(240, now);
      mech.frequency.exponentialRampToValueAtTime(95, now + 0.24);
      mechGain.gain.setValueAtTime(0.14, now);
      mechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    }

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    if (this.reverbNode) noiseGain.connect(this.reverbNode);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    mech.connect(mechGain);
    mechGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.46);
    osc.start(now);
    osc.stop(now + 0.3);
    mech.start(now);
    mech.stop(now + 0.4);

    if (weaponId !== 'shotgun' && weaponId !== 'rocket') {
      this.playShellCasing(0.32 + Math.random() * 0.14);
    }
  }

  public playChainsawCut(hittingTarget = false) {
    const perfNow = performance.now();
    if (perfNow - this.lastChainsawAudioAt < 65) return;
    this.lastChainsawAudioAt = perfNow;

    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const motor = ctx.createOscillator();
    const motorGain = ctx.createGain();
    motor.type = 'sawtooth';
    motor.frequency.setValueAtTime(hittingTarget ? 112 : 92, now);
    motor.frequency.exponentialRampToValueAtTime(hittingTarget ? 148 : 118, now + 0.08);
    motorGain.gain.setValueAtTime(hittingTarget ? 0.24 : 0.16, now);
    motorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    const teeth = ctx.createBufferSource();
    teeth.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(hittingTarget ? 2100 : 1450, now);
    bp.Q.value = 1.6;
    const teethGain = ctx.createGain();
    teethGain.gain.setValueAtTime(hittingTarget ? 0.26 : 0.14, now);
    teethGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    motor.connect(motorGain);
    motorGain.connect(ctx.destination);
    teeth.connect(bp);
    bp.connect(teethGain);
    teethGain.connect(ctx.destination);

    motor.start(now);
    motor.stop(now + 0.1);
    teeth.start(now);
    teeth.stop(now + 0.1);
  }

  public playBotLaser(isBoss = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc2.type = 'square';
    osc.frequency.setValueAtTime(isBoss ? 380 : 620, now);
    osc.frequency.exponentialRampToValueAtTime(isBoss ? 85 : 140, now + 0.14);
    osc2.frequency.setValueAtTime(isBoss ? 190 : 310, now);
    osc2.frequency.exponentialRampToValueAtTime(60, now + 0.14);

    gain.gain.setValueAtTime(isBoss ? 0.18 : 0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    if (this.reverbNode) gain.connect(this.reverbNode);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.16);
    osc2.stop(now + 0.16);
  }

  public playKoopaLaser(isBoss = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(isBoss ? 880 : 1240, now);
    osc.frequency.exponentialRampToValueAtTime(isBoss ? 190 : 280, now + 0.14);
    osc2.frequency.setValueAtTime(isBoss ? 440 : 620, now);
    osc2.frequency.exponentialRampToValueAtTime(130, now + 0.14);

    gain.gain.setValueAtTime(isBoss ? 0.16 : 0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    if (this.reverbNode) gain.connect(this.reverbNode);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.16);
    osc2.stop(now + 0.16);
  }

  public playBoomerangThrow() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480 + (i % 2) * 180, t);
      osc.frequency.exponentialRampToValueAtTime(290, t + 0.07);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  public playZoomClick(zoomLevel: 4 | 8) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(zoomLevel === 8 ? 1420 : 960, now);
    osc.frequency.exponentialRampToValueAtTime(zoomLevel === 8 ? 1840 : 720, now + 0.04);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playTruckCannon(isBoss = false) {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isBoss ? 110 : 165, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.16);
    oscGain.gain.setValueAtTime(isBoss ? 0.28 : 0.21, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBoss ? 920 : 1280, now);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(isBoss ? 0.24 : 0.18, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    if (this.reverbNode) nGain.connect(this.reverbNode);

    osc.start(now);
    osc.stop(now + 0.19);
    noise.start(now);
    noise.stop(now + 0.15);
  }

  public playLegoHop() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420 + Math.random() * 60, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.05);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playCaptainPolloSqawk() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [
      { offset: 0, start: 860, end: 1240, dur: 0.06 },
      { offset: 0.075, start: 980, end: 720, dur: 0.07 },
      { offset: 0.16, start: 1120, end: 1520, dur: 0.09 },
    ];
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(n.start, now + n.offset);
      osc.frequency.exponentialRampToValueAtTime(n.end, now + n.offset + n.dur);
      gain.gain.setValueAtTime(0.085, now + n.offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.offset + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.offset);
      osc.stop(now + n.offset + n.dur + 0.01);
    });
  }

  public playChestOpen() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Mechanical latch clunk
    const latch = ctx.createOscillator();
    const latchGain = ctx.createGain();
    latch.type = 'square';
    latch.frequency.setValueAtTime(340, now);
    latch.frequency.exponentialRampToValueAtTime(110, now + 0.09);
    latchGain.gain.setValueAtTime(0.18, now);
    latchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    latch.connect(latchGain);
    latchGain.connect(ctx.destination);
    latch.start(now);
    latch.stop(now + 0.12);

    // Rising triumphant reward chord
    const fanfare = [392.0, 493.88, 587.33, 783.99, 1046.5];
    fanfare.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + 0.14 + idx * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (this.reverbNode) gain.connect(this.reverbNode);
      osc.start(t);
      osc.stop(t + 0.58);
    });
  }

  public playEnemyShoot(isBossMinigun = false) {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isBossMinigun ? 1600 : 1900, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.11);
    filter.Q.value = 1.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(isBossMinigun ? 0.26 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isBossMinigun ? 120 : 155, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(isBossMinigun ? 0.25 : 0.18, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    if (this.reverbNode) gain.connect(this.reverbNode);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.14);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playPlayerHurt() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playBossSpawnHorn() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc.frequency.setValueAtTime(68, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 1.1);
    osc2.frequency.setValueAtTime(102, now);
    osc2.frequency.exponentialRampToValueAtTime(78, now + 1.1);

    filter.type = 'lowpass';
    filter.frequency.value = 420;

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 1.3);
    osc2.stop(now + 1.3);
  }

  public playExplosion() {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(980, now);
    filter.frequency.exponentialRampToValueAtTime(75, now + 0.95);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    const boom = ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(115, now);
    boom.frequency.exponentialRampToValueAtTime(26, now + 0.55);
    const boomGain = ctx.createGain();
    boomGain.gain.setValueAtTime(0.62, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    if (this.reverbNode) gain.connect(this.reverbNode);

    boom.connect(boomGain);
    boomGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 1.05);
    boom.start(now);
    boom.stop(now + 0.62);
  }

  public playGrenadePin() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1850, now);
    osc.frequency.exponentialRampToValueAtTime(2650, now + 0.045);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playGrenadeThrow() {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(340, now + 0.14);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.16);
  }

  public playGrenadeBounce() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620 + Math.random() * 140, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.055);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playUpgradePickup() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.065;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  private playShellCasing(delaySec: number) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = 3900 + Math.random() * 700;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.setValueAtTime(baseFreq * 1.08, t + 0.045);
    gain.gain.setValueAtTime(0.032, t);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.03);
    gain.gain.setValueAtTime(0.018, t + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.075);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.085);
  }

  public playChickenCluck() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [
      { offset: 0, start: 640, end: 880, dur: 0.065 },
      { offset: 0.085, start: 720, end: 520, dur: 0.075 },
      { offset: 0.18, start: 820, end: 1120, dur: 0.08 },
    ];
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.start, now + n.offset);
      osc.frequency.exponentialRampToValueAtTime(n.end, now + n.offset + n.dur);

      filter.type = 'bandpass';
      filter.frequency.value = 1350;
      filter.Q.value = 2.4;

      gain.gain.setValueAtTime(0.11, now + n.offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.offset + n.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.offset);
      osc.stop(now + n.offset + n.dur + 0.01);
    });
  }

  public playZombieGroan(isDeath = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    const base = isDeath ? 105 : 135 + Math.random() * 25;
    const dur = isDeath ? 0.45 : 0.24;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(isDeath ? 52 : base * 0.72, now + dur);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isDeath ? 380 : 520, now);
    filter.Q.value = 3.2;

    gain.gain.setValueAtTime(isDeath ? 0.18 : 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  public playTargetClang(bullseye = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(bullseye ? 1480 : 980, now);
    osc2.frequency.setValueAtTime(bullseye ? 2210 : 1470, now);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  public playSurfaceImpact(surface: 'concrete' | 'metal') {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    if (surface === 'metal') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400 + Math.random() * 500, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 820;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.065, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.07);
    }
  }

  public playHit(type: 'body' | 'head' | 'kill') {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'head') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1650, now);
      osc.frequency.exponentialRampToValueAtTime(2280, now + 0.04);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    } else if (type === 'kill') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(560, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.16);
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(720, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.05);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playReload(weaponId: WeaponId) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const mechClick = (offset: number, freqStart: number, freqEnd: number, dur = 0.055) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freqStart, now + offset);
      osc.frequency.exponentialRampToValueAtTime(freqEnd, now + offset + dur);
      gain.gain.setValueAtTime(0.09, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur + 0.01);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + dur + 0.015);
    };

    if (weaponId === 'rocket') {
      mechClick(0.15, 220, 140, 0.08);
      mechClick(0.95, 310, 480, 0.09);
      mechClick(1.65, 580, 290, 0.11);
    } else if (weaponId === 'sniper') {
      mechClick(0.1, 360, 220, 0.06);
      mechClick(0.85, 280, 490, 0.075);
      mechClick(1.55, 680, 380, 0.085);
      mechClick(1.88, 920, 520, 0.07);
    } else if (weaponId === 'shotgun') {
      mechClick(0.12, 420, 290, 0.045);
      mechClick(0.55, 440, 300, 0.045);
      mechClick(0.98, 460, 310, 0.045);
      mechClick(1.42, 720, 420, 0.09);
    } else if (weaponId === 'rifle') {
      mechClick(0.08, 480, 260, 0.05);
      mechClick(0.75, 290, 560, 0.065);
      mechClick(1.22, 840, 480, 0.08);
    } else {
      mechClick(0.06, 520, 310, 0.04);
      mechClick(0.55, 360, 680, 0.05);
      mechClick(0.88, 920, 560, 0.06);
    }
  }

  public playDryFire() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1020, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.028);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playSwitch() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.06);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playFootstep(sprinting: boolean) {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(sprinting ? 420 : 280, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(sprinting ? 0.085 : 0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.09);
  }

  public playLand() {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.15);
  }

  public playDash() {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    // Air rush whoosh
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.exponentialRampToValueAtTime(1650, now + 0.08);
    filter.frequency.exponentialRampToValueAtTime(340, now + 0.22);
    filter.Q.value = 1.2;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.01, now);
    nGain.gain.linearRampToValueAtTime(0.24, now + 0.035);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    // Subtle kinetic impulse thump
    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(64, now + 0.14);
    oGain.gain.setValueAtTime(0.18, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);

    osc.connect(oGain);
    oGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.25);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public startTitleMusic() {
    this.titleMusicWanted = true;
    if (this.muted || this.titleMusicRunning) return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    // Wait until AudioContext is actually running so notes don't stack silently while suspended
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => {
        if (this.titleMusicWanted && !this.muted && !this.titleMusicRunning && ctx.state === 'running') {
          this.launchTitleMusicGraph(ctx);
        }
      });
      return;
    }

    this.launchTitleMusicGraph(ctx);
  }

  public resumeTitleMusicIfWanted() {
    if (!this.titleMusicWanted || this.muted) return;
    if (this.titleMusicRunning) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    this.startTitleMusic();
  }

  public playBoardTick(isClick = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isClick ? 520 : 380, now);
    osc.frequency.exponentialRampToValueAtTime(isClick ? 240 : 190, now + 0.045);
    gain.gain.setValueAtTime(isClick ? 0.11 : 0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  private launchTitleMusicGraph(ctx: AudioContext) {
    if (this.titleMusicRunning) return;
    this.titleMusicRunning = true;
    this.titleStep = 0;

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(this.muted ? 0.0001 : 0.28, now + 1.8);
    master.connect(ctx.destination);
    this.titleMusicGain = master;

    // Layer 1: Deep Nocturnal Choir/Pad with slow breathing lowpass filter & chord progression
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(240, now);
    droneFilter.Q.value = 2.6;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.065, now);
    lfoGain.gain.setValueAtTime(175, now);
    lfo.connect(lfoGain);
    lfoGain.connect(droneFilter.frequency);
    lfo.start(now);
    this.titleDroneLfo = lfo;

    const padSpecs: Array<{ freq: number; type: OscillatorType; gain: number; detune: number }> = [
      { freq: 73.42, type: 'sine', gain: 0.26, detune: 0 }, // Bass root (changes per bar)
      { freq: 110.0, type: 'triangle', gain: 0.11, detune: -6 }, // Hollow 5th
      { freq: 174.61, type: 'sine', gain: 0.075, detune: 6 }, // Minor color voice
    ];

    this.titleDroneOscs = [];
    for (const spec of padSpecs) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.freq, now);
      osc.detune.setValueAtTime(spec.detune, now);
      g.gain.setValueAtTime(spec.gain, now);
      osc.connect(g);
      g.connect(droneFilter);
      osc.start(now);
      this.titleDroneOscs.push(osc);
    }

    const droneOut = ctx.createGain();
    droneOut.gain.setValueAtTime(0.58, now);
    droneFilter.connect(droneOut);
    droneOut.connect(master);
    if (this.reverbNode) {
      const droneRev = ctx.createGain();
      droneRev.gain.setValueAtTime(0.24, now);
      droneOut.connect(droneRev);
      droneRev.connect(this.reverbNode);
    }

    // 4-Bar D Harmonic Minor / Phrygian Mystery Progression (8 steps per bar = 32-step cycle @ 480ms)
    const chords: Array<{ bass: number; fifth: number; color: number }> = [
      { bass: 73.42, fifth: 110.0, color: 174.61 }, // Bar 1: Dm
      { bass: 58.27, fifth: 87.31, color: 146.83 }, // Bar 2: Bbmaj7
      { bass: 49.0, fifth: 73.42, color: 164.81 }, // Bar 3: Gm6 / E half-dim flavor
      { bass: 55.0, fifth: 82.41, color: 138.59 }, // Bar 4: A7(b9) tension
    ];

    // Layer 2: Haunted Celesta / Music-Box Arpeggio (32-step cycle)
    const arpPattern: Array<number | null> = [
      // Bar 1 (Dm add9)
      293.66, 440.0, 349.23, 659.25, 587.33, 440.0, 349.23, 329.63,
      // Bar 2 (Bbmaj7)
      233.08, 349.23, 440.0, 587.33, 523.25, 440.0, 349.23, null,
      // Bar 3 (Gm6 / E°)
      196.0, 293.66, 466.16, 659.25, 587.33, 466.16, 392.0, 329.63,
      // Bar 4 (A7sus4 -> A7b9)
      220.0, 329.63, 440.0, 554.37, 466.16, 440.0, 277.18, null,
    ];

    // Layer 3: Ghostly Night Flute Sustain (plays on select steps for haunting melody)
    const fluteNotes: Record<number, { freq: number; dur: number }> = {
      0: { freq: 440.0, dur: 1.8 },
      4: { freq: 466.16, dur: 1.6 },
      8: { freq: 440.0, dur: 1.9 },
      13: { freq: 349.23, dur: 1.4 },
      16: { freq: 392.0, dur: 1.8 },
      20: { freq: 329.63, dur: 1.6 },
      24: { freq: 277.18, dur: 1.9 },
      28: { freq: 293.66, dur: 1.7 },
    };

    const scheduleStep = () => {
      if (!this.titleMusicRunning || !this.ctx || !this.titleMusicGain) return;
      if (this.ctx.state !== 'running' || this.muted) return;

      const t = this.ctx.currentTime + 0.03;
      const stepIdx = this.titleStep % 32;
      const barIdx = Math.floor(stepIdx / 8);

      // Smoothly glide the continuous nocturnal pad to the current bar's chord
      if (stepIdx % 8 === 0 && this.titleDroneOscs.length === 3) {
        const ch = chords[barIdx];
        this.titleDroneOscs[0].frequency.setTargetAtTime(ch.bass, t, 0.38);
        this.titleDroneOscs[1].frequency.setTargetAtTime(ch.fifth, t, 0.38);
        this.titleDroneOscs[2].frequency.setTargetAtTime(ch.color, t, 0.38);

        // Crystalline wind-chime sparkle on bar transition
        const chime = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(barIdx % 2 === 0 ? 1174.66 : 880.0, t);
        chimeGain.gain.setValueAtTime(0.0001, t);
        chimeGain.gain.linearRampToValueAtTime(0.035, t + 0.02);
        chimeGain.gain.exponentialRampToValueAtTime(0.0005, t + 2.1);
        chime.connect(chimeGain);
        chimeGain.connect(this.titleMusicGain);
        if (this.reverbNode) chimeGain.connect(this.reverbNode);
        chime.start(t);
        chime.stop(t + 2.15);
      }

      // Celesta / Music-Box Arpeggio note
      const arpFreq = arpPattern[stepIdx];
      if (arpFreq !== null) {
        const bell = this.ctx.createOscillator();
        const shimmer = this.ctx.createOscillator();
        const overtone = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        const shimmerGain = this.ctx.createGain();
        const overtoneGain = this.ctx.createGain();

        bell.type = 'sine';
        bell.frequency.setValueAtTime(arpFreq, t);

        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(arpFreq, t);
        shimmer.detune.setValueAtTime(7, t);
        shimmerGain.gain.setValueAtTime(0.45, t);

        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(arpFreq * 2, t);
        overtoneGain.gain.setValueAtTime(0.14, t);

        const accent = stepIdx % 4 === 0 ? 0.13 : 0.095;
        noteGain.gain.setValueAtTime(0.0001, t);
        noteGain.gain.linearRampToValueAtTime(accent, t + 0.022);
        noteGain.gain.exponentialRampToValueAtTime(0.0007, t + 1.55);

        bell.connect(noteGain);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(noteGain);
        overtone.connect(overtoneGain);
        overtoneGain.connect(noteGain);

        noteGain.connect(this.titleMusicGain);
        if (this.reverbNode) {
          const revSend = this.ctx.createGain();
          revSend.gain.setValueAtTime(0.65, t);
          noteGain.connect(revSend);
          revSend.connect(this.reverbNode);
        }

        bell.start(t);
        shimmer.start(t);
        overtone.start(t);
        bell.stop(t + 1.6);
        shimmer.stop(t + 1.6);
        overtone.stop(t + 1.6);
      }

      // Ghostly Night Flute Lead with subtle pitch vibrato
      const fluteCfg = fluteNotes[stepIdx];
      if (fluteCfg) {
        const flute = this.ctx.createOscillator();
        const vib = this.ctx.createOscillator();
        const vibGain = this.ctx.createGain();
        const fluteFilter = this.ctx.createBiquadFilter();
        const fluteGain = this.ctx.createGain();

        flute.type = 'triangle';
        flute.frequency.setValueAtTime(fluteCfg.freq, t);

        vib.type = 'sine';
        vib.frequency.setValueAtTime(5.1, t);
        vibGain.gain.setValueAtTime(4.5, t);
        vib.connect(vibGain);
        vibGain.connect(flute.frequency);

        fluteFilter.type = 'lowpass';
        fluteFilter.frequency.setValueAtTime(920, t);

        fluteGain.gain.setValueAtTime(0.0001, t);
        fluteGain.gain.linearRampToValueAtTime(0.075, t + 0.24);
        fluteGain.gain.exponentialRampToValueAtTime(0.0008, t + fluteCfg.dur);

        flute.connect(fluteFilter);
        fluteFilter.connect(fluteGain);
        fluteGain.connect(this.titleMusicGain);
        if (this.reverbNode) {
          const fRev = this.ctx.createGain();
          fRev.gain.setValueAtTime(0.55, t);
          fluteGain.connect(fRev);
          fRev.connect(this.reverbNode);
        }

        flute.start(t);
        vib.start(t);
        flute.stop(t + fluteCfg.dur + 0.05);
        vib.stop(t + fluteCfg.dur + 0.05);
      }

      // Layer 4: Soft Forest Frame-Drum Heartbeat on beat 1 & 3 of every bar
      if (stepIdx % 4 === 0) {
        const drum = this.ctx.createOscillator();
        const drumGain = this.ctx.createGain();
        drum.type = 'sine';
        drum.frequency.setValueAtTime(stepIdx % 8 === 0 ? 64 : 52, t);
        drum.frequency.exponentialRampToValueAtTime(28, t + 0.28);
        drumGain.gain.setValueAtTime(stepIdx % 8 === 0 ? 0.14 : 0.09, t);
        drumGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.32);
        drum.connect(drumGain);
        drumGain.connect(this.titleMusicGain);
        drum.start(t);
        drum.stop(t + 0.35);
      }

      this.titleStep++;
    };

    scheduleStep();
    this.titleMusicTimer = window.setInterval(scheduleStep, 480);
  }

  public stopTitleMusic() {
    this.titleMusicWanted = false;
    this.titleMusicRunning = false;
    if (this.titleMusicTimer !== null) {
      window.clearInterval(this.titleMusicTimer);
      this.titleMusicTimer = null;
    }

    const ctx = this.ctx;
    const gainNode = this.titleMusicGain;
    const oscs = this.titleDroneOscs;
    const lfo = this.titleDroneLfo;

    this.titleMusicGain = null;
    this.titleDroneOscs = [];
    this.titleDroneLfo = null;

    if (ctx && gainNode) {
      const now = ctx.currentTime;
      try {
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(Math.max(0.0001, gainNode.gain.value), now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      } catch {
        // ignore if already closing
      }
    }

    window.setTimeout(() => {
      for (const osc of oscs) {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // already stopped
        }
      }
      if (lfo) {
        try {
          lfo.stop();
          lfo.disconnect();
        } catch {
          // already stopped
        }
      }
      if (gainNode) {
        try {
          gainNode.disconnect();
        } catch {
          // already disconnected
        }
      }
    }, 480);
  }

  public startBackroomsHum() {
    const ctx = this.ensureContext();
    if (!ctx || this.backroomsHumOsc) return;
    const now = ctx.currentTime;

    const hum1 = ctx.createOscillator();
    hum1.type = 'sawtooth';
    hum1.frequency.setValueAtTime(60, now);

    const hum2 = ctx.createOscillator();
    hum2.type = 'triangle';
    hum2.frequency.setValueAtTime(120.5, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(210, now);
    filter.Q.value = 1.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(this.muted ? 0.0001 : 0.035, now + 0.6);

    hum1.connect(filter);
    hum2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    hum1.start(now);
    hum2.start(now);

    this.backroomsHumOsc = hum1;
    this.backroomsHumOsc2 = hum2;
    this.backroomsHumGain = gain;
  }

  public stopBackroomsHum() {
    const osc1 = this.backroomsHumOsc;
    const osc2 = this.backroomsHumOsc2;
    const gain = this.backroomsHumGain;
    this.backroomsHumOsc = null;
    this.backroomsHumOsc2 = null;
    this.backroomsHumGain = null;

    if (osc1) {
      try {
        osc1.stop();
        osc1.disconnect();
      } catch {
        // ignore
      }
    }
    if (osc2) {
      try {
        osc2.stop();
        osc2.disconnect();
      } catch {
        // ignore
      }
    }
    if (gain) {
      try {
        gain.disconnect();
      } catch {
        // ignore
      }
    }
  }

  public playNextbotSlap() {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.14);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playNextbotSpawn() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.11);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  private ensureNextbotTrack(kind: 'en_este_pueblo' | 'bob_esponja' | 'among_us') {
    const track = this.nextbotTracks[kind];
    if (!track.audioEl) {
      const el = new Audio(track.src);
      el.loop = true;
      el.preload = 'auto';
      el.volume = 1.0;
      track.audioEl = el;
    }

    const ctx = this.ctx;
    if (ctx && !track.sourceNode && track.audioEl) {
      try {
        const src = ctx.createMediaElementSource(track.audioEl);
        const panner = ctx.createStereoPanner();
        const gain = ctx.createGain();
        gain.gain.value = 0;

        src.connect(panner);
        panner.connect(gain);
        gain.connect(ctx.destination);

        track.sourceNode = src;
        track.pannerNode = panner;
        track.gainNode = gain;
      } catch {
        // Fallback cleanly to HTMLAudioElement.volume if MediaElementSource cannot attach
      }
    }
  }

  public updateNextbotProximityAudio(
    kind: 'en_este_pueblo' | 'bob_esponja' | 'among_us',
    distance: number | null,
    pan: number,
    active: boolean
  ) {
    const track = this.nextbotTracks[kind];
    track.wanted = active;

    if (!active || this.muted || distance === null || distance > 36) {
      if (track.gainNode && this.ctx) {
        track.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.09);
      }
      if (track.audioEl) {
        if (!active) {
          if (!track.audioEl.paused) {
            track.audioEl.pause();
            track.audioEl.currentTime = 0;
          }
        } else if (!track.gainNode) {
          track.audioEl.volume = 0;
        }
      }
      return;
    }

    const ctx = this.ensureContext();
    this.ensureNextbotTrack(kind);

    const maxRange = 34;
    const norm = Math.max(0, Math.min(1, 1 - distance / maxRange));
    const targetVol = Math.pow(norm, 1.38) * 0.9;
    const clampedPan = Math.max(-0.9, Math.min(0.9, pan));

    if (track.audioEl && track.audioEl.paused && track.wanted && !this.muted) {
      void track.audioEl.play().catch(() => {
        // Will start on next user gesture
      });
    }

    if (track.gainNode && track.pannerNode && ctx) {
      track.gainNode.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.08);
      track.pannerNode.pan.setTargetAtTime(clampedPan, ctx.currentTime, 0.08);
      if (track.audioEl) track.audioEl.volume = 1.0;
    } else if (track.audioEl) {
      track.audioEl.volume = targetVol;
    }
  }

  public updatePuebloThemeAudio(nearestDist: number | null, pan: number, active: boolean) {
    const track = this.nextbotTracks.en_este_pueblo;
    track.wanted = active;

    if (!active || this.muted) {
      if (track.gainNode && this.ctx) {
        track.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.09);
      }
      if (track.audioEl) {
        if (!track.audioEl.paused) {
          track.audioEl.pause();
        }
        if (!track.gainNode) {
          track.audioEl.volume = 0;
        }
      }
      return;
    }

    const ctx = this.ensureContext();
    this.ensureNextbotTrack('en_este_pueblo');

    const distFactor =
      nearestDist === null ? 0.28 : Math.max(0.28, Math.min(1, 1 - nearestDist / 32));
    const targetVol = 0.24 + distFactor * 0.56;
    const clampedPan = Math.max(-0.65, Math.min(0.65, pan));

    if (track.audioEl && track.audioEl.paused && track.wanted && !this.muted) {
      void track.audioEl.play().catch(() => {
        // Will start on next user gesture
      });
    }

    if (track.gainNode && track.pannerNode && ctx) {
      track.gainNode.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.12);
      track.pannerNode.pan.setTargetAtTime(clampedPan, ctx.currentTime, 0.12);
      if (track.audioEl) track.audioEl.volume = 1.0;
    } else if (track.audioEl) {
      track.audioEl.volume = targetVol;
    }
  }

  public stopAllNextbotAudio() {
    for (const track of Object.values(this.nextbotTracks)) {
      track.wanted = false;
      if (track.gainNode && this.ctx) {
        track.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
      if (track.audioEl) {
        try {
          track.audioEl.pause();
          track.audioEl.currentTime = 0;
        } catch {
          // ignore
        }
      }
    }
  }

  public playMedkitPickup() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.048;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playBuildPlace() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.08);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playEditStart() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.055);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playEditTile() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1120, now);
    osc.frequency.exponentialRampToValueAtTime(1440, now + 0.032);
    gain.gain.setValueAtTime(0.085, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playEditConfirm() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [760, 1040].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.035;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.075);
    });
  }

  public playBuildBreak() {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(480, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.18);
  }

  public dispose() {
    this.stopTitleMusic();
    this.stopBackroomsHum();
    this.stopAllNextbotAudio();
    for (const track of Object.values(this.nextbotTracks)) {
      if (track.audioEl) {
        track.audioEl.src = '';
        track.audioEl = null;
      }
      track.sourceNode = null;
      track.pannerNode = null;
      track.gainNode = null;
    }
    if (this.windSource) {
      try {
        this.windSource.stop();
      } catch {
        // stopped
      }
      this.windSource = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
