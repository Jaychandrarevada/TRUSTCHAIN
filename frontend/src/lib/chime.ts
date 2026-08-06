/**
 * Tiny WebAudio chime generator — no external audio files, no CDN, no network
 * request. Synthesized in-browser so the "subtle sounds" for the issuance
 * ceremony cost nothing to bundle and work offline like the rest of the app.
 *
 * User-mutable and off by default in a fresh browser is NOT what we want here
 * (silence-by-default would make an optional feature invisible) — instead it
 * defaults ON but is a one-click, persisted toggle in the ceremony UI itself.
 */
const MUTE_KEY = "tc-ceremony-sound-muted";

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) ctx = new AudioCtor();
  if (ctx.state === "suspended") void ctx.resume(); // requires the user gesture already in hand (button click)
  return ctx;
}

export function isChimeMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export function setChimeMuted(muted: boolean): void {
  try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch { /* private mode — session-only */ }
}

function tone(freq: number, startOffset: number, duration: number, gain: number, audio: AudioContext) {
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  const t0 = audio.currentTime + startOffset;
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** A soft, single-note tick — one per ceremony step. */
export function playStepChime(): void {
  if (isChimeMuted()) return;
  const audio = getCtx();
  if (!audio) return;
  tone(680, 0, 0.14, 0.045, audio);
}

/** A brighter two-note rise — the final "verified" beat. */
export function playFinalChime(): void {
  if (isChimeMuted()) return;
  const audio = getCtx();
  if (!audio) return;
  tone(660, 0, 0.16, 0.05, audio);
  tone(990, 0.09, 0.28, 0.055, audio);
}

/** A low, brief tone for a failed step — distinct from success, never silent-fails. */
export function playErrorChime(): void {
  if (isChimeMuted()) return;
  const audio = getCtx();
  if (!audio) return;
  tone(220, 0, 0.22, 0.05, audio);
}
