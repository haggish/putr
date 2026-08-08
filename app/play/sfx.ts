"use client";

// Procedural chiptune sound effects via the Web Audio API. Every sound is
// synthesized on the fly from oscillators + noise, so there are no asset files
// and it's all original. The AudioContext is created lazily on the first play
// (which happens during a keydown), satisfying the browser autoplay-unlock rule.

type Wave = OscillatorType;

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** Flip to false to mute without tearing down the context. */
  enabled = true;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    // A tab that was backgrounded suspends the context; nudge it awake.
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** One enveloped oscillator tone (attack ~5ms, exponential decay). */
  private tone(opts: {
    freq: number;
    type?: Wave;
    dur: number;
    gain?: number;
    at?: number; // start offset in seconds
    slideTo?: number; // glide the pitch to this frequency over `dur`
  }): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + (opts.at ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? "square";
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, opts.slideTo),
        t0 + opts.dur,
      );
    }
    const peak = opts.gain ?? 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.02);
  }

  /** A short filtered noise burst — the body of an impact. */
  private noise(opts: {
    dur: number;
    gain?: number;
    at?: number;
    highpass?: number;
  }): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + (opts.at ?? 0);
    const frames = Math.max(1, Math.floor(ctx.sampleRate * opts.dur));
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.gain ?? 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    if (opts.highpass) {
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = opts.highpass;
      src.connect(f).connect(g).connect(this.master);
    } else {
      src.connect(g).connect(this.master);
    }
    src.start(t0);
    src.stop(t0 + opts.dur + 0.02);
  }

  // --- Game events -------------------------------------------------------

  /** A soft, quiet footstep on each step. */
  move(): void {
    if (!this.enabled) return;
    this.tone({ freq: 150, slideTo: 90, type: "triangle", dur: 0.06, gain: 0.05 });
  }

  /** A menacing descending sting when monsters ambush you. */
  encounter(): void {
    if (!this.enabled) return;
    this.tone({ freq: 300, slideTo: 90, type: "sawtooth", dur: 0.35, gain: 0.16 });
    this.tone({ freq: 150, slideTo: 70, type: "square", dur: 0.4, gain: 0.1, at: 0.05 });
  }

  /** A bright, punchy thwack when a hero lands a hit on a monster. */
  hitMonster(): void {
    if (!this.enabled) return;
    this.noise({ dur: 0.07, gain: 0.16, highpass: 800 });
    this.tone({ freq: 440, slideTo: 190, type: "square", dur: 0.1, gain: 0.13 });
  }

  /** A lower, harsher thud when a monster hits the party. */
  hitParty(): void {
    if (!this.enabled) return;
    this.noise({ dur: 0.12, gain: 0.2, highpass: 300 });
    this.tone({ freq: 180, slideTo: 70, type: "sawtooth", dur: 0.14, gain: 0.15 });
  }

  /** A rising major arpeggio for victory. */
  win(): void {
    if (!this.enabled) return;
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone({ freq: f, type: "square", dur: 0.16, gain: 0.15, at: i * 0.11 }),
    );
  }

  /** A slow descending figure for defeat. */
  lose(): void {
    if (!this.enabled) return;
    [392, 311, 262, 196].forEach((f, i) =>
      this.tone({ freq: f, type: "triangle", dur: 0.24, gain: 0.16, at: i * 0.14 }),
    );
  }

  /** Two quick ascending blips — a coin ring for gold/loot. */
  gold(): void {
    if (!this.enabled) return;
    this.tone({ freq: 988, type: "square", dur: 0.08, gain: 0.12 });
    this.tone({ freq: 1319, type: "square", dur: 0.12, gain: 0.12, at: 0.07 });
  }
}