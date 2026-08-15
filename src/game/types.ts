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
  /** 负面突发事件：抽取时触发红色全屏警报 */
  neg?: boolean;
  /** 处境评估：结算前动态生成一句话，告诉玩家"这件事和你有什么关系" */
  assess?: (s: GameState) => string | null;
  /** 行业冲击：事件发生时作用于玩家公司的临时/即时影响 */
  impact?: { label: string; incomeMult?: number; turns?: number; users?: number; fame?: number; tech?: [string | null, number] };
  /** 产品级竞争冲击：若玩家拥有该产品，事件主角会直接挤压其业务 */
  competes?: { product: string; label: string; mult: number; turns: number; heat?: number; users?: number; note: string };
  /** 先驱变体：若玩家已抢先做出相关产品，事件文案与奖励会承认玩家的影响 */
  variant?: { when: (s: GameState) => boolean; body?: string; note?: string; bonus?: Effect };
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

/** 定价策略：免费拉新 / 标准 / 高价高 ARPU */
export type PriceMode = 'free' | 'std' | 'high';

export interface ProductInst {
  uid: number;
  def: string;
  progress: number;
  launched: boolean;
  launchedTurn?: number;
  /** 产品等级 1-3，升级提高收益 */
  level: number;
  /** 定价策略 */
  price: PriceMode;
  /** 运营热度 0-100，每回合衰减，推广/内容运营可提升 */
  heat: number;
  /** 已停运 */
  shut?: boolean;
  /** 首次落后于时代的回合号（按产品类型所属时代判定） */
  behindSince?: number;
}

/** 行业冲击波：重大历史事件对全行业（或特定产品）的临时影响 */
export interface Shock {
  label: string;
  mult: number;
  left: number;
  /** 仅作用于特定产品 id（产品级竞争冲击） */
  product?: string;
}

/** 全屏冲击横幅（时代突发事件的醒目告知） */
export interface ShockBanner {
  label: string;
  detail: string;
  good: boolean;
}

/** 上市信息 */
export interface IpoInfo {
  turn: number;
  /** 流通股比例 % */
  float: number;
  /** 当前市值（万元） */
  cap: number;
  /** 上市发行价（元/股，仅展示） */
  price: number;
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

export type Difficulty = 'easy' | 'normal' | 'hard';

/** 资金不足时被延后的历史人物事件 */
export interface DeferredEv { id: string; n: number }

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
  difficulty: Difficulty;
  perk: string | null;
  funds: number;
  users: number;
  fame: number;
  team: number;
  ap: number;
  apMax: number;
  debt: number;
  /** 过桥贷款剩余还款期数（每期还 7 万） */
  loanTurns: number;
  /** 机房等级索引（SERVER_TIERS） */
  servers: number;
  /** 因资金不足延后的人物事件 */
  deferred: DeferredEv[];
  /** 行业冲击波（重大历史事件的临时影响） */
  shocks: Shock[];
  /** 上市信息（null = 未上市） */
  ipo: IpoInfo | null;
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
  /** 时代冲击全屏横幅 */
  shockBanner: ShockBanner | null;
  outcome: Outcome | null;
  seq: number;
}

export type Action =
  | { type: 'NEW_GAME'; name: string; track: string; difficulty?: string; perk?: string | null }
  | { type: 'LOAD_GAME'; state: GameState }
  | { type: 'BOOT_DONE' }
  | { type: 'END_TURN' }
  | { type: 'RESOLVE_EVENT'; idx: number }
  | { type: 'ACT'; kind: 'research' | 'marketing' | 'hire' | 'raise' | 'coffee'; person?: string }
  | { type: 'BUILD'; def: string }
  | { type: 'SET_RESEARCH'; id: string }
  | { type: 'TOGGLE_POLICY'; id: string }
  | { type: 'HIRE_ADVISOR'; person: string }
  | { type: 'TAKE_LOAN' }
  | { type: 'UPGRADE_SERVERS' }
  | { type: 'UPGRADE_PRODUCT'; uid: number }
  | { type: 'SET_PRICE'; uid: number; price: PriceMode }
  | { type: 'OPS'; uid: number; kind: 'ad' | 'content' }
  | { type: 'DISMISS_ADVISOR'; person: string }
  | { type: 'SHUT_PRODUCT'; uid: number }
  | { type: 'IPO' }
  | { type: 'ACCEPT_RAISE'; offer: { investor: string; share: number; amount: number } }
  | { type: 'TOAST_GONE'; id: number }
  | { type: 'BANNER_GONE' }
  | { type: 'SHOCK_BANNER_GONE' }
  | { type: 'SKIP_EVENT' }
  | { type: 'RESTART' };
