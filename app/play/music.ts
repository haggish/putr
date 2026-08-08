"use client";

// Procedural SID-style background music via the Web Audio API — no asset files,
// every track is synthesized from oscillators + noise. A lookahead scheduler
// clocks short looping patterns (a couple of bars each), and the scene switches
// the loop by game situation: adventure, shop, Späti (style per "nationality"),
// combat, and club (minimal techno / gabber / acid). Low volume and non-intrusive.
//
// Companion to sfx.ts; the AudioContext unlocks on the first keydown (resume()).

const A4 = 440;
const midiFreq = (n: number) => A4 * Math.pow(2, (n - 69) / 12);

type Wave = OscillatorType;

interface Voice {
  kind: "tone" | "drum";
  wave?: Wave;
  gain: number;
  /** Semitone shift applied to every note in this voice. */
  octave?: number;
  /** Tone voices: semitone offsets from the track root; null = rest. */
  notes?: (number | null)[];
  /** Drum voices: 0 = rest, 1 = hit, 2 = accent. */
  hits?: number[];
  drum?: "kick" | "gkick" | "hat" | "clap";
  /** Note length as a multiple of one step (default 0.9). */
  release?: number;
  /** Per-note low-pass sweep — the acid/techno squelch. */
  filter?: { from: number; to: number; q: number };
  /** Route through the distortion shaper (gabber). */
  distort?: boolean;
}

interface Track {
  bpm: number;
  /** Loop length in 16th-note steps. */
  steps: number;
  /** MIDI note of semitone offset 0. */
  root: number;
  voices: Voice[];
}

// Pattern helpers: one character per step. "." = rest; 0-9,a-z = semitone
// offset (base-36); for drums "x" = hit, "X" = accent.
const N = (s: string): (number | null)[] =>
  [...s].map((c) => (c === "." ? null : parseInt(c, 36)));
const H = (s: string): number[] =>
  [...s].map((c) => (c === "X" ? 2 : c === "x" ? 1 : 0));

export const SPAETI_STYLES = [
  "turkish",
  "arabic",
  "balkan",
  "vietnamese",
  "latin",
] as const;
export const CLUB_STYLES = ["techno", "gabber", "acid"] as const;

// A longer, evolving overworld piece (cue: Floating Points — "Ocotillo"): a
// rolling arpeggio over a slowly shifting progression of warm extended chords,
// with soft swelling pads and a gentle bass. ~50s of harmony before it loops,
// so long stretches of adventuring don't feel repetitive.
function buildAdventure(): Track {
  const CHORD_STEPS = 32; // two bars per chord
  const SHAPES: Record<string, number[]> = {
    maj9: [0, 4, 7, 11, 14],
    min9: [0, 3, 7, 10, 14],
    dom9: [0, 4, 7, 10, 14],
  };
  // A gentle, circular ii–V–I-ish wander that resolves back to the top.
  const PROG: [number, string][] = [
    [0, "maj9"], [9, "min9"], [5, "maj9"], [7, "dom9"],
    [4, "min9"], [9, "min9"], [2, "min9"], [7, "dom9"],
    [0, "maj9"], [9, "min9"], [5, "maj9"], [7, "dom9"],
  ];
  const steps = PROG.length * CHORD_STEPS;
  const arp: (number | null)[] = new Array(steps).fill(null);
  const padA: (number | null)[] = new Array(steps).fill(null);
  const padB: (number | null)[] = new Array(steps).fill(null);
  const bass: (number | null)[] = new Array(steps).fill(null);

  PROG.forEach(([root, name], ci) => {
    const shape = SHAPES[name];
    const b = ci * CHORD_STEPS;
    // Continuous 16th-note arpeggio through the chord tones (phase drifts each
    // chord because 32 isn't a multiple of 5 — a little organic variation).
    for (let s = 0; s < CHORD_STEPS; s++) arp[b + s] = root + shape[s % shape.length];
    // Pads: root + fifth swell in on bar one, the colour tone enters on bar two.
    padA[b] = root + shape[0];
    padB[b] = root + shape[2];
    padA[b + 16] = root + shape[3];
    // Bass: root, then the fifth mid-chord.
    bass[b] = root;
    bass[b + 16] = root + 7;
  });

  return {
    bpm: 112,
    steps,
    root: 48, // C3
    voices: [
      { kind: "tone", wave: "triangle", octave: -12, gain: 0.13, release: 16, notes: bass },
      { kind: "tone", wave: "triangle", octave: 0, gain: 0.07, release: 34, notes: padA },
      { kind: "tone", wave: "triangle", octave: 0, gain: 0.06, release: 34, notes: padB },
      { kind: "tone", wave: "square", octave: 12, gain: 0.05, release: 0.9, notes: arp },
    ],
  };
}

const TRACKS: Record<string, Track> = {
  // Neutral wandering — long, evolving, Ocotillo-flavoured (see buildAdventure).
  adventure: buildAdventure(),
  // Shop — bright and bouncy with a light hat.
  shop: {
    bpm: 124,
    steps: 32,
    root: 55,
    voices: [
      { kind: "tone", wave: "triangle", octave: -12, gain: 0.15, release: 1.3, notes: N("0..7..5..7..4.2.") },
      { kind: "tone", wave: "square", octave: 12, gain: 0.09, notes: N("7.7.4.7.9.7.5.4." + "7.9.c.9.7.4.5.7.") },
      { kind: "drum", drum: "hat", gain: 0.5, hits: H("..x...x...x...x.") },
    ],
  },
  // Combat — driving minor, urgent bass, four-ish on the floor.
  combat: {
    bpm: 150,
    steps: 16,
    root: 45,
    voices: [
      { kind: "drum", drum: "kick", gain: 0.9, hits: H("x..x..x.x..x..x.") },
      { kind: "drum", drum: "hat", gain: 0.4, hits: H("..x...x...x...x.") },
      { kind: "tone", wave: "sawtooth", octave: -12, gain: 0.16, release: 0.5, notes: N("00700070056a5070") },
      { kind: "tone", wave: "square", octave: 0, gain: 0.1, release: 0.8, notes: N("c..a..7..a..c.a.") },
    ],
  },

  // ── Späti styles (scale/feel per "nationality") ──────────────────────
  // Turkish — hijaz / phrygian-dominant, doubek rhythm.
  "spaeti:turkish": {
    bpm: 120,
    steps: 16,
    root: 50,
    voices: [
      { kind: "tone", wave: "triangle", octave: -12, gain: 0.16, release: 2, notes: N("0.......7.......") },
      { kind: "tone", wave: "square", octave: 12, gain: 0.1, notes: N("0.1.4.5.4.1.0.b.") },
      { kind: "drum", drum: "hat", gain: 0.4, hits: H("x.x.xx.x.x.xx.x.") },
    ],
  },
  // Arabic — hijaz, hand-drum masmoudi feel.
  "spaeti:arabic": {
    bpm: 104,
    steps: 16,
    root: 43,
    voices: [
      { kind: "tone", wave: "triangle", octave: -12, gain: 0.16, release: 2, notes: N("0.....5.0.....7.") },
      { kind: "tone", wave: "square", octave: 12, gain: 0.1, notes: N("0.4.5.1.4.5.4.1.") },
      { kind: "drum", drum: "kick", gain: 0.55, hits: H("x..x.x..x..x.x..") },
      { kind: "drum", drum: "hat", gain: 0.3, hits: H(".x.x.x.x.x.x.x.x") },
    ],
  },
  // Balkan — harmonic minor, brisk.
  "spaeti:balkan": {
    bpm: 132,
    steps: 16,
    root: 45,
    voices: [
      { kind: "tone", wave: "triangle", octave: -12, gain: 0.16, notes: N("0.0.7.0.0.0.5.7.") },
      { kind: "tone", wave: "square", octave: 12, gain: 0.1, notes: N("0230570b0230570.") },
      { kind: "drum", drum: "hat", gain: 0.4, hits: H("x.xx.x.xx.x.xx.x") },
    ],
  },
  // Vietnamese / East-Asian — major pentatonic, gentle.
  "spaeti:vietnamese": {
    bpm: 96,
    steps: 16,
    root: 48,
    voices: [
      { kind: "tone", wave: "triangle", octave: -12, gain: 0.15, release: 3, notes: N("0.......7.......") },
      { kind: "tone", wave: "triangle", octave: 12, gain: 0.09, notes: N("0.2.4.7.9.7.4.2.") },
      { kind: "drum", drum: "hat", gain: 0.25, hits: H("....x.......x...") },
    ],
  },
  // Latin — major, syncopated montuno + clave.
  "spaeti:latin": {
    bpm: 116,
    steps: 16,
    root: 53,
    voices: [
      { kind: "tone", wave: "triangle", octave: -12, gain: 0.16, notes: N("0..0..7..0.5..7.") },
      { kind: "tone", wave: "square", octave: 12, gain: 0.1, notes: N("4.7.9.7.4.0.4.7.") },
      { kind: "drum", drum: "clap", gain: 0.4, hits: H("..x.....x..x....") },
      { kind: "drum", drum: "hat", gain: 0.3, hits: H(".x.x.x.x.x.x.x.x") },
    ],
  },

  // ── Club styles ──────────────────────────────────────────────────────
  // Minimal techno — 4-on-the-floor, sparse filtered bleep.
  "club:techno": {
    bpm: 126,
    steps: 16,
    root: 45,
    voices: [
      { kind: "drum", drum: "kick", gain: 0.9, hits: H("x...x...x...x...") },
      { kind: "drum", drum: "hat", gain: 0.35, hits: H("..x...x...x...x.") },
      { kind: "tone", wave: "sawtooth", octave: -12, gain: 0.13, release: 0.5, notes: N("..0...0...0...0.") },
      { kind: "tone", wave: "square", octave: 0, gain: 0.09, release: 0.6, filter: { from: 2600, to: 500, q: 6 }, notes: N("0.......c.......") },
    ],
  },
  // Gabber — fast, distorted hoover stabs, hard kick.
  "club:gabber": {
    bpm: 180,
    steps: 16,
    root: 45,
    voices: [
      { kind: "drum", drum: "gkick", gain: 1, hits: H("x...x...x...x...") },
      { kind: "drum", drum: "hat", gain: 0.4, hits: H("..x...x...x...x.") },
      { kind: "tone", wave: "sawtooth", octave: 0, gain: 0.1, release: 0.9, distort: true, notes: N("0000....3333....") },
    ],
  },
  // Acid — squelchy 303 line (resonant per-note sweep), 4-on-the-floor.
  "club:acid": {
    bpm: 128,
    steps: 16,
    root: 45,
    voices: [
      { kind: "drum", drum: "kick", gain: 0.85, hits: H("x...x...x...x...") },
      { kind: "drum", drum: "hat", gain: 0.3, hits: H("..x...x...x...x.") },
      { kind: "tone", wave: "sawtooth", octave: 0, gain: 0.12, release: 0.85, filter: { from: 3000, to: 300, q: 14 }, notes: N("0.3.0.7.0.c.a.7.") },
    ],
  },
};

function trackId(scene: string, seed?: string): string {
  if (scene === "spaeti")
    return `spaeti:${SPAETI_STYLES[hash(seed ?? "") % SPAETI_STYLES.length]}`;
  if (scene === "club")
    return `club:${CLUB_STYLES[hash(seed ?? "") % CLUB_STYLES.length]}`;
  return TRACKS[scene] ? scene : "adventure";
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class Music {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private shaper: WaveShaperNode | null = null; // gabber distortion
  private noiseBuf: AudioBuffer | null = null;
  enabled = true;

  private track: Track | null = null;
  private id = "";
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly lookahead = 0.12;

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
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
      // Distortion chain for gabber voices.
      this.shaper = this.ctx.createWaveShaper();
      this.shaper.curve = distortionCurve(28);
      const sg = this.ctx.createGain();
      sg.gain.value = 0.5;
      this.shaper.connect(sg).connect(this.master);
      // A reusable second of white noise for percussion.
      this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Called from a user gesture (keydown) so the context can start. */
  resume(): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (ctx && this.track) {
      if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
      this.startTimer();
    }
  }

  /** Switch the loop to match the current scene (no-op if unchanged). */
  setScene(scene: string, seed?: string): void {
    const id = trackId(scene, seed);
    if (id === this.id) return;
    this.id = id;
    this.track = TRACKS[id] ?? TRACKS.adventure;
    this.step = 0;
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.nextTime = ctx.currentTime + 0.05;
    this.startTimer();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) {
      this.stopTimer();
      if (this.master && this.ctx) {
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setValueAtTime(this.master.gain.value, t);
        this.master.gain.linearRampToValueAtTime(0.0001, t + 0.15);
      }
    } else if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(0.16, this.ctx.currentTime);
      this.resume();
    }
  }

  /** Stop the scheduler (leave the context alive). */
  stop(): void {
    this.stopTimer();
  }

  private startTimer(): void {
    if (this.timer == null) this.timer = setInterval(() => this.schedule(), 25);
  }
  private stopTimer(): void {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.track || !this.enabled) return;
    const stepDur = 60 / this.track.bpm / 4;
    while (this.nextTime < ctx.currentTime + this.lookahead) {
      this.playStep(this.track, this.step, this.nextTime, stepDur);
      this.step = (this.step + 1) % this.track.steps;
      this.nextTime += stepDur;
    }
  }

  private playStep(track: Track, i: number, time: number, stepDur: number): void {
    for (const v of track.voices) {
      if (v.kind === "tone") {
        const seq = v.notes;
        if (!seq) continue;
        const off = seq[i % seq.length];
        if (off == null) continue;
        this.playTone(track.root + (v.octave ?? 0) + off, time, stepDur, v);
      } else {
        const seq = v.hits;
        if (!seq) continue;
        const hit = seq[i % seq.length];
        if (hit) this.playDrum(time, hit, v);
      }
    }
  }

  private playTone(midi: number, time: number, stepDur: number, v: Voice): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const out = v.distort && this.shaper ? this.shaper : this.master;
    const dur = stepDur * (v.release ?? 0.9);
    const osc = ctx.createOscillator();
    osc.type = v.wave ?? "square";
    osc.frequency.setValueAtTime(midiFreq(midi), time);
    const g = ctx.createGain();
    let node: AudioNode = osc;
    if (v.filter) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.Q.value = v.filter.q;
      f.frequency.setValueAtTime(v.filter.from, time);
      f.frequency.exponentialRampToValueAtTime(Math.max(60, v.filter.to), time + dur);
      osc.connect(f);
      node = f;
    }
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(v.gain, time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    node.connect(g).connect(out);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private playDrum(time: number, hit: number, v: Voice): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuf) return;
    const amp = v.gain * (hit === 2 ? 1.3 : 1);
    const noise = () => {
      const s = ctx.createBufferSource();
      s.buffer = this.noiseBuf;
      return s;
    };

    if (v.drum === "hat" || v.drum === "clap") {
      const src = noise();
      const filt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      if (v.drum === "hat") {
        filt.type = "highpass";
        filt.frequency.value = 7000;
        g.gain.setValueAtTime(0.2 * amp, time);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
        src.connect(filt).connect(g).connect(this.master);
        src.start(time);
        src.stop(time + 0.05);
      } else {
        filt.type = "bandpass";
        filt.frequency.value = 1500;
        filt.Q.value = 1.2;
        g.gain.setValueAtTime(0.35 * amp, time);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
        src.connect(filt).connect(g).connect(this.master);
        src.start(time);
        src.stop(time + 0.1);
      }
      return;
    }

    // kick / gkick: a pitch-dropping sine with a noise click transient.
    const gab = v.drum === "gkick";
    const dest = gab && this.shaper ? this.shaper : this.master;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const dur = gab ? 0.16 : 0.13;
    osc.frequency.setValueAtTime(gab ? 170 : 130, time);
    osc.frequency.exponentialRampToValueAtTime(gab ? 38 : 45, time + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9 * amp, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g).connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.02);

    const click = noise();
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.3 * amp, time);
    cg.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
    click.connect(cg).connect(dest);
    click.start(time);
    click.stop(time + 0.03);
  }
}

function distortionCurve(amount: number) {
  const n = 256;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}