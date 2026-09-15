/**
 * SigitOS retro sound engine — 100% sintesis Web Audio API, tanpa file audio
 * eksternal. Gaya PC speaker / Windows 9x: nada pendek, kotak, lembut.
 * Semua efek volume-nya sangat rendah agar tidak berisik, dan menghormati
 * preferensi pengguna (toggle suara di Start Menu → "sigitos_sound").
 */

export type OSSound =
  | "click"
  | "key"
  | "nav"
  | "windowOpen"
  | "windowClose"
  | "minimize"
  | "maximize"
  | "error"
  | "notify"
  | "success"
  | "boot"
  | "bot";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
}

export function isSoundOn(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return window.localStorage?.getItem("sigitos_sound") !== "off";
  } catch {
    return true;
  }
}

interface ToneOptions {
  freq: number;
  endFreq?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone({ freq, endFreq, dur, type = "square", gain = 0.03, delay = 0 }: ToneOptions): void {
  const audio = getCtx();
  if (!audio) return;
  const t0 = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq && endFreq > 0) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  }
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/** Mainkan satu efek suara retro. Tidak pernah melempar error. */
export function playOS(sound: OSSound): void {
  try {
    if (!isSoundOn()) return;
    switch (sound) {
      // Ketukan tombol: tik sangat pendek & pelan
      case "click":
        tone({ freq: 1500, dur: 0.03, gain: 0.02 });
        break;
      case "key":
        tone({ freq: 1900, dur: 0.018, gain: 0.014 });
        break;
      // Pindah aplikasi/halaman: "duk-dik" dua nada ala menu Windows
      case "nav":
        tone({ freq: 660, dur: 0.045, gain: 0.026 });
        tone({ freq: 990, dur: 0.055, gain: 0.026, delay: 0.05 });
        break;
      // Jendela/dialog
      case "windowOpen":
        tone({ freq: 320, endFreq: 940, dur: 0.12, gain: 0.028, type: "triangle" });
        break;
      case "windowClose":
        tone({ freq: 820, endFreq: 260, dur: 0.12, gain: 0.028, type: "triangle" });
        break;
      case "minimize":
        tone({ freq: 880, endFreq: 430, dur: 0.09, gain: 0.024 });
        break;
      case "maximize":
        tone({ freq: 430, endFreq: 880, dur: 0.09, gain: 0.024 });
        break;
      // Error: "dung-dung" rendah khas dialog kesalahan lawas
      case "error":
        tone({ freq: 300, dur: 0.09, gain: 0.034 });
        tone({ freq: 238, dur: 0.13, gain: 0.034, delay: 0.1 });
        break;
      // Notifikasi kecil: dua nada naik
      case "notify":
        tone({ freq: 660, dur: 0.06, gain: 0.024, type: "triangle" });
        tone({ freq: 880, dur: 0.09, gain: 0.024, type: "triangle", delay: 0.07 });
        break;
      // Sukses: arpeggio mayor pendek (ta-da yang sopan)
      case "success":
        tone({ freq: 523, dur: 0.07, gain: 0.024, type: "triangle" });
        tone({ freq: 659, dur: 0.07, gain: 0.024, type: "triangle", delay: 0.07 });
        tone({ freq: 784, dur: 0.07, gain: 0.024, type: "triangle", delay: 0.14 });
        tone({ freq: 1046, dur: 0.12, gain: 0.024, type: "triangle", delay: 0.21 });
        break;
      // Chime boot singkat
      case "boot":
        tone({ freq: 750, dur: 0.1, gain: 0.03 });
        tone({ freq: 880, dur: 0.05, gain: 0.026, delay: 0.14 });
        tone({ freq: 1050, dur: 0.12, gain: 0.028, delay: 0.24 });
        break;
      // Sigit_Bot menjawab: "blip" robot pendek (chirp dua nada)
      case "bot":
        tone({ freq: 880, dur: 0.035, gain: 0.02, type: "square" });
        tone({ freq: 1240, dur: 0.05, gain: 0.02, type: "square", delay: 0.04 });
        break;
    }
  } catch {
    // Audio bisa diblokir kebijakan autoplay — abaikan dengan tenang.
  }
}
