import { Component, useEffect, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AchievementWall, ActionsPanel, Chronicle, CompanyPanel, EraBanner, EventDialog, HelpDialog,
  PersonsPanel, PolicyPanel, ResourceBar, Taskbar, TechPanel, Toasts,
} from './components/panels';
import { BootScreen, OverScreen, SetupScreen } from './components/screens';
import { ERA_THEMES, eraOf } from './game/data';
import { reducer } from './game/engine';
import { sfx } from './game/sfx';
import type { Action, Difficulty, GameState } from './game/types';

const SAVE_KEY = 'wangshi1999_save_v1';

const bootState: GameState = {
  phase: 'boot', turn: 0, name: '', track: 'tr_portal',
  difficulty: 'normal', perk: null, loanTurns: 0, servers: 0, deferred: [], shocks: [], ipo: null,
  funds: 0, users: 0, fame: 0, team: 3, ap: 3, apMax: 3, debt: 0,
  policies: [], researched: ['t_bbs'], cur: null, prog: {}, techPts: 0, equity: 100,
  products: [], rel: {}, met: [], advisors: [], flags: {}, log: [], queue: [],
  toasts: [], history: [], eraBanner: null, outcome: null, seq: 1,
};

/* 蓝屏兜底：任何渲染异常都不会再白屏，存档依旧安全 */
class BSOD extends Component<{ children: ReactNode; onReset: () => void }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="min-h-screen grid place-items-center p-6" style={{ background: '#00007b' }}>
        <div className="font-term text-white max-w-xl text-lg leading-relaxed">
          <p className="mb-4">发生了一个致命的例外错误：0x1999</p>
          <p className="mb-4">你的互联网创业之旅遇到了程序异常。存档仍然安全，按下面按钮回到开机画面，读取存档即可继续。</p>
          <button
            className="bg-white text-[#00007b] px-6 py-2 font-bold hover:bg-[#dfe6ff]"
            onClick={() => { this.setState({ err: false }); this.props.onReset(); }}
          >
            按此继续 *
          </button>
        </div>
      </div>
    );
  }
}

export default function App() {
  const [s, d] = useReducer(reducer, bootState);
  const [help, setHelp] = useState(false);
  const [ach, setAch] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const loadRef = useRef<GameState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GameState;
        if (parsed && parsed.phase === 'play') {
          setHasSave(true);
          loadRef.current = parsed;
        }
      }
    } catch { /* 存档损坏则忽略 */ }
  }, []);

  /* 自动存档 */
  useEffect(() => {
    if (s.phase === 'play') {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, toasts: [], eraBanner: null })); } catch { /* 空间不足忽略 */ }
    }
  }, [s]);

  /* Toast 自动消失 */
  useEffect(() => {
    if (s.toasts.length === 0) return;
    const ts = s.toasts.map((t) => setTimeout(() => d({ type: 'TOAST_GONE', id: t.id }), t.kind === 'ach' ? 5000 : 3200));
    return () => ts.forEach(clearTimeout);
  }, [s.toasts]);

  /* -------- 音效系统：监听状态变化自动播音 -------- */
  const sfxRef = useRef({ funds: 0, head: null as string | null, turn: -1, toastId: 0, banner: false, phase: 'boot', logId: 0 });
  useEffect(() => {
    const p = sfxRef.current;
    if (s.phase === 'play' || s.phase === 'over') {
      if (p.funds !== s.funds) {
        if (s.funds - p.funds > 0.4) sfx.cash();
        else if (p.funds - s.funds > 0.4) sfx.spend();
      }
      const head = s.queue[0] ?? null;
      if (head && head !== p.head) sfx.pop();
      if (s.turn > p.turn && p.turn >= 0 && s.phase === 'play') sfx.whoosh();
      const last = s.toasts[s.toasts.length - 1];
      if (last && last.id !== p.toastId) {
        if (last.kind === 'good') sfx.ding();
        else if (last.kind === 'bad') sfx.warn();
        else if (last.kind === 'ach') sfx.ach();
        else sfx.tick();
      }
      if (s.eraBanner && !p.banner) sfx.era();
      if (s.phase === 'over' && p.phase !== 'over') {
        if (s.outcome?.type === 'bankrupt') sfx.sad();
        else sfx.fanfare();
      }
      const logHead = s.log[0];
      if (logHead && logHead.id !== p.logId && (logHead.kind === 'history' || logHead.kind === 'person')) sfx.type();
    }
    sfxRef.current = {
      funds: s.funds, head: s.queue[0] ?? null, turn: s.turn, banner: !!s.eraBanner, phase: s.phase,
      toastId: s.toasts.length ? s.toasts[s.toasts.length - 1].id : p.toastId,
      logId: s.log.length ? s.log[0].id : p.logId,
    };
  }, [s]);

  /* 全局按钮点击音 + 首次手势解锁音频 */
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest?.('button');
      if (btn && !btn.disabled) sfx.tick();
    };
    const unlock = () => sfx.unlock();
    window.addEventListener('click', click);
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => { window.removeEventListener('click', click); window.removeEventListener('pointerdown', unlock); };
  }, []);

  /* 时代横幅自动消失 */
  useEffect(() => {
    if (!s.eraBanner) return;
    const t = setTimeout(() => d({ type: 'BANNER_GONE' }), 3500);
    return () => clearTimeout(t);
  }, [s.eraBanner]);

  /* 键盘：回车 = 下一回合 */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (s.phase === 'play' && s.queue.length === 0 && !help && !ach) d({ type: 'END_TURN' });
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [s.phase, s.queue.length, help, ach]);

  if (s.phase === 'boot') {
    return (
      <BSOD onReset={() => d({ type: 'RESTART' })}>
        <BootScreen
          hasSave={hasSave}
          onDone={(load) => {
            if (load && loadRef.current) d({ type: 'LOAD_GAME', state: loadRef.current });
            else d({ type: 'BOOT_DONE' });
          }}
        />
      </BSOD>
    );
  }

  if (s.phase === 'setup') {
    return (
      <BSOD onReset={() => d({ type: 'RESTART' })}>
        <SetupScreen onStart={(name, track, difficulty, perk) => d({ type: 'NEW_GAME', name, track, difficulty, perk })} />
      </BSOD>
    );
  }

  if (s.phase === 'over') {
    return (
      <BSOD onReset={() => d({ type: 'RESTART' })}>
        <OverScreen s={s} onRestart={() => d({ type: 'RESTART' })} />
      </BSOD>
    );
  }

  /* 主题随时代演化 */
  const theme = ERA_THEMES[eraOf(s.turn).id] ?? ERA_THEMES[0];

  return (
    <BSOD onReset={() => d({ type: 'RESTART' })}>
      <div
        className="theme-root relative h-screen overflow-hidden"
        style={{ background: theme.bg, ...(theme.vars as Record<string, string>) }}
      >
        <span className="era-watermark font-term" aria-hidden>{theme.label}</span>
        <div className="relative z-10 h-full flex flex-col gap-1.5 p-1.5 md:p-2 max-w-[1600px] mx-auto">
          <ResourceBar s={s} d={d} />
          <main className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-1.5 scroll-98">
            <div className="lg:col-span-3 flex flex-col gap-1.5 min-h-0 order-2 lg:order-1">
              <CompanyPanel s={s} d={d} />
              <div className="lg:h-56 min-h-0"><PolicyPanel s={s} d={d} /></div>
            </div>
            <div className="lg:col-span-6 flex flex-col gap-1.5 min-h-0 order-1 lg:order-2">
              <div className="flex-1 min-h-[280px]"><Chronicle s={s} /></div>
              <div className="lg:h-64 min-h-0"><ActionsPanel s={s} d={d} /></div>
            </div>
            <div className="lg:col-span-3 flex flex-col gap-1.5 min-h-0 order-3">
              <div className="flex-1 min-h-[260px]"><TechPanel s={s} d={d} /></div>
              <div className="lg:h-72 min-h-0"><PersonsPanel s={s} d={d} /></div>
            </div>
          </main>
          <Taskbar s={s} d={d} onHelp={() => setHelp(true)} onAch={() => setAch(true)} />

          {s.queue.length > 0 && <EventDialog s={s} d={d} />}
          {help && <HelpDialog onClose={() => setHelp(false)} />}
          {ach && <AchievementWall s={s} onClose={() => setAch(false)} />}
          <EraBanner s={s} d={d} />
          <Toasts s={s} d={d} />
        </div>
      </div>
    </BSOD>
  );
}

export type { Action, Difficulty };
