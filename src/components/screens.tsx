import { useEffect, useRef, useState } from 'react';
import { BOOT_LINES, TRACKS } from '../game/data';
import { fmtVal, fmtW } from '../game/engine';
import type { GameState, Outcome } from '../game/types';
import { Btn, Icons } from './ui';

/* 拨号音效（WebAudio 合成，无外部资源） */
export function dialUp() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const t = ctx.currentTime;
    const beep = (f: number, at: number, dur: number, type: OscillatorType = 'sine', gain = 0.06) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(gain, t + at);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t + at); o.stop(t + at + dur);
    };
    beep(950, 0, 0.5); beep(1400, 0.5, 0.4);
    [697, 1209, 770, 1336, 852, 1477].forEach((f, i) => beep(f, 1 + i * 0.09, 0.08, 'square', 0.04));
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    noise.buffer = buf;
    const ng = ctx.createGain(); ng.gain.value = 0.05;
    noise.connect(ng).connect(ctx.destination);
    noise.start(t + 1.6);
  } catch { /* 静音环境忽略 */ }
}

/* ============ 开机画面 ============ */
export function BootScreen({ onDone, hasSave }: { onDone: (load: boolean) => void; hasSave: boolean }) {
  const [line, setLine] = useState(0);
  const [fast, setFast] = useState(false);
  const done = line >= BOOT_LINES.length;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setLine((l) => l + 1), fast ? 60 : line >= 5 && line <= 6 ? 700 : 260);
    return () => clearTimeout(t);
  }, [line, done, fast]);

  return (
    <div className="min-h-screen bg-[#050607] text-[#c8d4c0] font-term p-6 md:p-10 cursor-pointer" onClick={() => (done ? undefined : setFast(true))}>
      <div className="max-w-2xl">
        {BOOT_LINES.slice(0, line).map((l, i) => (
          <div key={i} className={`text-lg md:text-xl leading-relaxed ${i === BOOT_LINES.length - 1 ? 'text-[#7ef0a0]' : ''}`}>{l}</div>
        ))}
        {!done && <span className="blink-cursor inline-block w-3 h-5 bg-[#c8d4c0] align-middle" />}
        {done && (
          <div className="mt-8 space-y-3 win-pop">
            <h1 className="font-disp text-5xl md:text-6xl text-white leading-tight">
              网事<span className="text-[#ff8b2e]">1999</span>
            </h1>
            <p className="text-[#8fa08a] text-lg">中国互联网编年史 · 回合制创业模拟</p>
            <div className="pixel-divider w-48" />
            <div className="flex gap-3 pt-2 flex-wrap">
              <Btn primary className="font-disp text-xl px-8 py-2.5" onClick={() => { dialUp(); onDone(false); }}>
                拨号上网 · 开始穿越
              </Btn>
              {hasSave && (
                <Btn className="font-disp text-xl px-8 py-2.5 !text-[#050607]" onClick={() => onDone(true)}>
                  读取上次存档
                </Btn>
              )}
            </div>
            <p className="text-sm text-[#5f6f5a]">建议桌面端体验 · 数据保存在本地浏览器</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ 创业设置 ============ */
const TRACK_ICON: Record<string, (s?: number) => React.ReactNode> = {
  portal: (s) => Icons.globe(s), im: (s) => Icons.users(s), search: (s) => Icons.flask(s), ec: (s) => Icons.bag(s),
};

export function SetupScreen({ onStart }: { onStart: (name: string, track: string) => void }) {
  const [name, setName] = useState('');
  const [track, setTrack] = useState('tr_portal');
  return (
    <div className="min-h-screen p-4 md:p-8 grid place-items-center">
      <div className="win-pop bevel-out w-full max-w-3xl">
        <header className="titlebar px-3 py-2 flex items-center gap-2 text-white">
          <span>{Icons.globe(16)}</span>
          <h1 className="font-disp text-lg tracking-wide">新公司注册登记 · 1999</h1>
        </header>
        <div className="p-4 md:p-6 space-y-5">
          <div>
            <label className="block font-bold text-[var(--navy-1)] mb-1.5 text-sm">给你的公司起个响亮的名字</label>
            <input
              className="field98 w-full text-lg font-disp tracking-wide"
              placeholder="例如：飞跃在线 / 华夏网联 / 浪潮工作室"
              maxLength={10}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="text-[11px] text-[#5a5750] mt-1">将显示为「{name || '未命名网络公司'}有限公司」，载入中国互联网史册。</div>
          </div>

          <div>
            <div className="font-bold text-[var(--navy-1)] mb-2 text-sm">选择你的出身（决定开局加成）</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TRACKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTrack(t.id)}
                  className={`text-left p-3 border-2 transition-all hover:-translate-y-0.5 ${track === t.id ? 'border-[var(--portal)] bg-[#fdf1e4] shadow-[3px_3px_0_rgba(180,70,0,0.4)]' : 'border-[#b8b4a6] bg-white'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`grid place-items-center w-8 h-8 text-white ${track === t.id ? 'bg-[var(--portal)]' : 'bg-[var(--navy-1)]'}`}>{TRACK_ICON[t.icon](16)}</span>
                    <span className="font-disp text-xl">{t.name}</span>
                  </div>
                  <div className="text-xs text-[#3a3a3a] leading-snug mb-1.5">{t.desc}</div>
                  <div className="text-[11px] font-bold text-[#b34a00] bevel-in bg-white inline-block px-1.5 py-0.5">{t.bonus}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Btn primary className="font-disp text-xl px-10 py-2.5" onClick={() => { dialUp(); onStart(name.trim(), track); }}>
              领取营业执照 · 开局
            </Btn>
            <span className="text-[11px] text-[#5a5750]">初始：3 人团队 · 已掌握「BBS 建站」技术 · 1999 Q1 正式营业</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ 结局画面 ============ */
const RANK_COLOR: Record<string, string> = { S: '#c8901a', A: '#1c63c9', B: '#1f7a48', C: '#7a4fd0', D: '#b34a00', E: '#8a867a' };

export function OverScreen({ s, onRestart }: { s: GameState; onRestart: () => void }) {
  const o = s.outcome as Outcome;
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 300); return () => clearTimeout(t); }, []);
  const bankrupt = o.type === 'bankrupt';
  return (
    <div className="min-h-screen p-4 md:p-8 grid place-items-center items-start md:items-center">
      <div className={`bevel-out w-full max-w-3xl ${show ? 'win-pop' : 'opacity-0'}`}>
        <header className={`px-3 py-2 text-white ${bankrupt ? 'titlebar-inactive' : 'titlebar'}`}>
          <h1 className="font-disp text-lg tracking-wide">
            {bankrupt ? '破产清算通知书' : o.type === 'exit' ? '收购完成公告' : '十年终局 · 2010 年度财报'}
          </h1>
        </header>
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="grid place-items-center w-24 h-24 bevel-out font-disp text-6xl" style={{ color: RANK_COLOR[o.rank] }}>{o.rank}</div>
            <div>
              <div className="font-disp text-3xl text-[var(--navy-1)] leading-tight">{o.rankTitle}</div>
              <div className="text-sm text-[#3a3a3a] mt-1 max-w-md leading-snug">{bankrupt ? '资金链断裂，公司进入破产清算。但 1999–2010 这趟旅程本身，已经值回票价。' : o.rankDesc}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-[11px] text-[#5a5750]">最终估值</div>
              <div className="font-term text-4xl text-[var(--portal)]">¥{fmtVal(o.valuation)}</div>
            </div>
          </div>

          {!bankrupt && (
            <div>
              <div className="font-bold text-[var(--navy-1)] text-sm mb-1.5">2010 年 · 中国互联网公司市值榜（游戏内单位：万元）</div>
              <div className="bevel-in bg-white">
                {o.board.map((b, i) => (
                  <div key={b.name} className={`flex items-center gap-2 px-2 py-1 text-sm ${b.you ? 'bg-[#fdf1e4] font-bold border-y border-[var(--portal)]' : i % 2 ? 'bg-[#f4f2ea]' : ''}`}>
                    <span className="font-term w-6 text-[#8a867a]">{i + 1}</span>
                    <span className={b.you ? 'text-[#b34a00]' : ''}>{b.name}</span>
                    <span className="ml-auto flex-1 mx-2 h-2.5 bg-[#e8e5d8] hidden sm:block"><i className="block h-full bg-[var(--navy-1)]" style={{ width: `${Math.max(2, (b.val / o.board[0].val) * 100)}%` }} /></span>
                    <span className="font-term text-base">{fmtVal(b.val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="bevel-in bg-white p-2.5">
              <div className="font-bold text-[var(--navy-1)] mb-1">十年战绩</div>
              <div className="grid grid-cols-2 gap-y-1">
                <span>经营区间</span><b className="text-right">{o.stats.years}</b>
                <span>累计用户</span><b className="text-right">{fmtW(o.stats.users, '万人')}</b>
                <span>上线产品</span><b className="text-right">{o.stats.products} 款</b>
                <span>结识人物</span><b className="text-right">{o.stats.persons} 位</b>
                <span>风险投资</span><b className="text-right">{o.stats.investments} 笔</b>
                <span>创始人持股</span><b className="text-right">{s.equity}%</b>
              </div>
            </div>
            <div className="bevel-in bg-white p-2.5">
              <div className="font-bold text-[var(--navy-1)] mb-1">成就（{o.achievements.length}）</div>
              {o.achievements.length === 0
                ? <div className="text-[#8a867a]">暂未解锁成就。再开一局，去认识那些改变时代的人。</div>
                : <div className="flex flex-wrap gap-1">{o.achievements.map((a) => (
                  <span key={a} className="bevel-out px-1.5 py-0.5 font-bold text-[#b34a00] flex items-center gap-1"><span className="text-[#e8a400]">{Icons.star(10)}</span>{a}</span>
                ))}</div>}
            </div>
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <Btn primary className="font-disp text-xl px-8 py-2" onClick={onRestart}>再穿越一次</Btn>
            <span className="text-[11px] text-[#5a5750]">小提示：1999 年投马云 10 万、2000 年接住马化腾的 60 万报价，是公认的 S 级通关密码。</span>
          </div>
        </div>
      </div>
    </div>
  );
}
