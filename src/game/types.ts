export interface Effect {
  funds?: number;
  users?: number;
  fame?: number;
  team?: number;
  /** [techId|null, amount] —— null 表示加到当前研究项目上 */
  tech?: [string | null, number];
  flags?: string[];
  rel?: [string, number][];
  invest?: string;
  end?: 'exit';
  log?: string;
}

export interface Choice {
  label: string;
  hint?: string;
  cost?: number;
  fx: Effect;
}

export interface GameEvent {
  id: string;
  turn: number;
  kind: 'history' | 'person' | 'random' | 'payout' | 'special';
  title: string;
  body: string;
  footnote?: string;
  person?: string;
  cond?: (s: GameState) => boolean;
  choices: Choice[];
}

export interface TechDef {
  id: string;
  name: string;
  era: number;
  cost: number;
  req?: string[];
  reqAny?: string[];
  unlocks?: string;
  desc: string;
}

export interface ProductDef {
  id: string;
  name: string;
  tech: string;
  devCost: number;
  work: number;
  upkeep: number;
  base: number;
  ucoef: number;
  pull: number;
  fame: number;
  desc: string;
}

export interface PolicyDef {
  id: string;
  name: string;
  desc: string;
  tag: string;
}

export interface PersonDef {
  id: string;
  name: string;
  title: string;
  co: string;
  quote: string;
  windowTurn: number;
  color: string;
  hireCost: number;
  buffName: string;
  buffDesc: string;
}

export interface ProductInst {
  uid: number;
  def: string;
  progress: number;
  launched: boolean;
  launchedTurn?: number;
}

export interface LogEntry {
  id: number;
  turn: number;
  kind: 'history' | 'company' | 'person' | 'warn' | 'gain';
  text: string;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'good' | 'bad' | 'era' | 'ach';
}

export interface Outcome {
  type: 'final' | 'bankrupt' | 'exit';
  valuation: number;
  rank: string;
  rankTitle: string;
  rankDesc: string;
  board: { name: string; val: number; you?: boolean }[];
  achievements: string[];
  stats: { years: string; users: number; products: number; persons: number; investments: number };
}

export interface GameState {
  phase: 'boot' | 'setup' | 'play' | 'over';
  turn: number; // 0..47
  name: string;
  track: string;
  funds: number;
  users: number;
  fame: number;
  team: number;
  ap: number;
  apMax: number;
  debt: number;
  policies: string[];
  researched: string[];
  /** 当前主攻研发的技术 id */
  cur: string | null;
  /** 各技术研发进度存档 */
  prog: Record<string, number>;
  /** 可注入研发的存量技术点 */
  techPts: number;
  equity: number;
  products: ProductInst[];
  rel: Record<string, number>;
  met: string[];
  advisors: string[];
  flags: Record<string, boolean>;
  log: LogEntry[];
  queue: string[];
  toasts: Toast[];
  history: number[];
  eraBanner: { name: string; sub: string } | null;
  outcome: Outcome | null;
  seq: number;
}

export type Action =
  | { type: 'NEW_GAME'; name: string; track: string }
  | { type: 'LOAD_GAME'; state: GameState }
  | { type: 'BOOT_DONE' }
  | { type: 'END_TURN' }
  | { type: 'RESOLVE_EVENT'; idx: number }
  | { type: 'ACT'; kind: 'research' | 'marketing' | 'hire' | 'raise' | 'coffee'; person?: string }
  | { type: 'BUILD'; def: string }
  | { type: 'SET_RESEARCH'; id: string }
  | { type: 'TOGGLE_POLICY'; id: string }
  | { type: 'HIRE_ADVISOR'; person: string }
  | { type: 'TOAST_GONE'; id: number }
  | { type: 'BANNER_GONE' }
  | { type: 'RESTART' };
