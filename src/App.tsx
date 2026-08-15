import { useEffect, useReducer, useRef, useState } from 'react';
import {
  ActionsPanel, Chronicle, CompanyPanel, EraBanner, EventDialog, HelpDialog,
  PersonsPanel, PolicyPanel, ResourceBar, Taskbar, TechPanel, Toasts,
} from './components/panels';
import { BootScreen, OverScreen, SetupScreen } from './components/screens';
import { reducer } from './game/engine';
import type { GameState } from './game/types';

const SAVE_KEY = 'wangshi1999_save_v1';

const bootState: GameState = {
  phase: 'boot', turn: 0, name: '', track: 'tr_portal',
  difficulty: 'normal', perk: null, loanTurns: 0, servers: 0, deferred: [],
  funds: 0, users: 0, fame: 0, team: 3, ap: 3, apMax: 3, debt: 0,
  policies: [], researched: ['t_bbs'], cur: null, prog: {}, techPts: 0, equity: 100,
  products: [], rel: {}, met: [], advisors: [], flags: {}, log: [], queue: [],
  toasts: [], history: [], eraBanner: null, outcome: null, seq: 1,
};

export default function App() {
  const [s, d] = useReducer(reducer, bootState);
  const [help, setHelp] = useState(false);
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
      if (s.phase === 'play' && s.queue.length === 0 && !help) d({ type: 'END_TURN' });
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [s.phase, s.queue.length, help]);

  if (s.phase === 'boot') {
    return (
      <BootScreen
        hasSave={hasSave}
        onDone={(load) => {
          if (load && loadRef.current) d({ type: 'LOAD_GAME', state: loadRef.current });
          else d({ type: 'BOOT_DONE' });
        }}
      />
    );
  }

  if (s.phase === 'setup') {
    return <SetupScreen onStart={(name, track) => d({ type: 'NEW_GAME', name, track })} />;
  }

  if (s.phase === 'over') {
    return <OverScreen s={s} onRestart={() => d({ type: 'RESTART' })} />;
  }

  return (
    <div className="h-screen flex flex-col gap-1.5 p-1.5 md:p-2 max-w-[1600px] mx-auto">
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
      <Taskbar s={s} d={d} onHelp={() => setHelp(true)} />

      {s.queue.length > 0 && <EventDialog s={s} d={d} />}
      {help && <HelpDialog onClose={() => setHelp(false)} />}
      <EraBanner s={s} d={d} />
      <Toasts s={s} d={d} />
    </div>
  );
}
