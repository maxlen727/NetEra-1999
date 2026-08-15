/* ============ 复古音效引擎 ============
   全部由 WebAudio 实时合成，零外部资源。
   风格：90 年代 PC 蜂鸣器 + 软盘时代的清脆感。 */

const KEY = 'wangshi1999_muted';
let ctx: AudioContext | null = null;
let muted = false;
try { muted = localStorage.getItem(KEY) === '1'; } catch { /* ignore */ }

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem(KEY, m ? '1' : '0'); } catch { /* ignore */ }
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  return ctx;
}

/** 基础音元：从 f0 滑到 f1 */
function tone(f0: number, f1: number, dur: number, type: OscillatorType, gain: number, at = 0) {
  const c = ac();
  if (!c || muted) return;
  try {
    const t = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(30, f0), t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  } catch { /* ignore */ }
}

/** 噪声元：拨号杂音 / 时代切换的气声 */
function noise(dur: number, gain: number, at = 0) {
  const c = ac();
  if (!c || muted) return;
  try {
    const t = c.currentTime + at;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(g).connect(c.destination);
    src.start(t);
  } catch { /* ignore */ }
}

export const sfx = {
  /** 首次用户手势时调用，解锁浏览器音频策略 */
  unlock() { ac(); },
  /** 按钮点击 · 蜂鸣器短促 */
  tick() { tone(1900, 1400, 0.045, 'square', 0.022); },
  /** 行动确认 · 双音上行 */
  confirm() { tone(520, 520, 0.06, 'square', 0.038); tone(784, 784, 0.1, 'square', 0.038, 0.06); },
  /** 进账 · 收银机三连音 */
  cash() { tone(880, 880, 0.07, 'triangle', 0.055); tone(1174, 1174, 0.07, 'triangle', 0.055, 0.06); tone(1568, 1568, 0.13, 'triangle', 0.055, 0.12); },
  /** 花钱 · 下行短促 */
  spend() { tone(440, 290, 0.12, 'sawtooth', 0.028); },
  /** 警告 · 双声蜂鸣 */
  warn() { tone(220, 185, 0.12, 'square', 0.04); tone(220, 160, 0.16, 'square', 0.04, 0.16); },
  /** 弹窗出现 · 轻快上滑 */
  pop() { tone(330, 660, 0.09, 'sine', 0.05); },
  /** 好消息提示音 */
  ding() { tone(1046, 1046, 0.1, 'sine', 0.05); tone(1568, 1568, 0.17, 'sine', 0.04, 0.05); },
  /** 坏消息提示音 */
  buzz() { tone(150, 105, 0.18, 'sawtooth', 0.038); },
  /** 成就解锁 · 铃声琶音 */
  ach() { [659, 880, 1318, 1760].forEach((f, i) => tone(f, f, 0.17, 'triangle', 0.05, i * 0.07)); },
  /** 时代更替 · 上扫 + 和弦 + 气声 */
  era() {
    tone(220, 880, 0.5, 'sine', 0.05);
    noise(0.35, 0.02, 0.08);
    [523, 659, 784].forEach((f, i) => tone(f, f, 0.4, 'triangle', 0.04, 0.45 + i * 0.06));
  },
  /** 回合推进 · 翻页风声 */
  whoosh() { noise(0.22, 0.032); tone(620, 210, 0.24, 'sine', 0.028, 0.02); },
  /** 通关凯旋 */
  fanfare() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.32, 'triangle', 0.055, i * 0.11));
    noise(0.4, 0.018, 0.5);
  },
  /** 破产挽歌 */
  sad() { [392, 330, 262].forEach((f, i) => tone(f, f * 0.97, 0.42, 'triangle', 0.05, i * 0.24)); },
  /** 敲键盘 · 编年史滚动 */
  type() { tone(1750, 1500, 0.02, 'square', 0.014); },
};
