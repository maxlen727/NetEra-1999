import {
  ACHIEVEMENTS, DIFFICULTIES, ERAS, EVENTS, HISTORICAL_BOARD, MILESTONES, OPS_ACTIONS, PERKS, PERSONS, POLICIES,
  PRICE_MODES, PRODUCTS, RANDOMS, RANKS, RIVAL_CURVES, SERVER_TIERS, TECHS, TOTAL_TURNS, TRACKS, eraOf, turnLabel,
} from './data';
import type { Action, Choice, Effect, GameEvent, GameState, Outcome, PriceMode, ProductDef, ProductInst } from './types';

/* ---------------- 工具 ---------------- */
export const fmtW = (v: number, unit = '万') => {
  const abs = Math.abs(v);
  if (abs >= 10000) return `${(v / 10000).toFixed(1)}亿`;
  return `${v >= 0 ? '' : '-'}${abs >= 100 ? Math.round(abs) : abs.toFixed(1)}${unit}`;
};

/** 估值显示：1 估值点 = 100 万元 */
export const fmtVal = (v: number) => fmtW(Math.round(v * 100));

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const productDef = (id: string): ProductDef => PRODUCTS.find((p) => p.id === id)!;
export const techDef = (id: string) => TECHS.find((t) => t.id === id)!;
export const personDef = (id: string) => PERSONS.find((p) => p.id === id)!;

/** 某项技术的前置条件是否满足 */
function techReqOk(s: GameState, t: (typeof TECHS)[number]) {
  return (
    (!t.req || t.req.every((r) => s.researched.includes(r))) &&
    (!t.reqAny || t.reqAny.some((r) => s.researched.includes(r)))
  );
}

/** 下一个可研发的技术（未研发且前置满足），用于研发接力与顶部提示 */
export function nextResearchable(s: GameState) {
  return TECHS.find((t) => !s.researched.includes(t.id) && techReqOk(s, t)) ?? null;
}

const EV_ACQ: GameEvent = {
  id: 'ev_acq', turn: -1, kind: 'special',
  title: '一份收购要约',
  body: '一家不愿透露姓名的巨头通过投行递来 Term Sheet：全资收购你的公司，创始团队套现离场，从此财务自由。签字笔就放在桌上，咖啡还是热的。整个中关村都在等你的答案。',
  footnote: '那个年代，无数创业者的终点不是上市，而是被收购——这也是一种胜利。',
  choices: [
    { label: '签字套现：See you, my company', fx: { end: 'exit', log: '你在收购协议上签了字。一个时代落幕，一个富翁诞生。' } },
    { label: '撕掉要约：我要自己敲钟', fx: { fame: 4, flags: ['acq_refused'], log: '你把 Term Sheet 垫了桌角：「十年后纳斯达克见。」' } },
  ],
};

export function findEvent(id: string): GameEvent | undefined {
  if (id === 'ev_acq') return EV_ACQ;
  /* 历史事件与随机/突发/压力事件都要能查到——漏掉 RANDOMS 会导致随机事件入队后被「净化」误删 */
  return EVENTS.find((e) => e.id === id) ?? RANDOMS.find((e) => e.id === id);
}

/* ---------------- buff 查询 ---------------- */
const has = (s: GameState, p: string) => s.policies.includes(p);
const adv = (s: GameState, p: string) => s.advisors.includes(p);

export function apFor(team: number) {
  return team >= 24 ? 5 : team >= 12 ? 4 : 3;
}

export const diffOf = (s: GameState) => DIFFICULTIES.find((d) => d.id === s.difficulty) ?? DIFFICULTIES[1];

/** 选项真实花费 = 明面 cost + 暗扣的负向资金效果 */
export const choiceCost = (c: Choice) => (c.cost ?? 0) + Math.max(0, -(c.fx.funds ?? 0));

/** 机房容量（万用户） */
export const capacityOf = (s: GameState) => SERVER_TIERS[Math.min(s.servers, SERVER_TIERS.length - 1)].cap;
export const isOverloaded = (s: GameState) => s.users > capacityOf(s);
export function serverUpgradeCost(s: GameState): number {
  if (s.servers >= SERVER_TIERS.length - 1) return 0;
  return SERVER_TIERS[s.servers + 1].cost;
}
export const productUpgradeCost = (level: number) => 12 + 10 * (level - 1);
export const levelMult = (p: { level: number }) => 1 + 0.3 * ((p.level || 1) - 1);

/** 定价策略查询（缺省按标准价） */
export const priceMode = (p: { price?: PriceMode }) =>
  PRICE_MODES.find((m) => m.id === (p.price ?? 'std')) ?? PRICE_MODES[1];
/** 运营热度对收入的加成 */
export const heatIncomeMult = (p: { heat?: number }) => 1 + (p.heat || 0) / 250;
/** 运营热度对拉新的加成 */
export const heatPullMult = (p: { heat?: number }) => 1 + (p.heat || 0) / 300;
export const opsDef = (kind: 'ad' | 'content') => OPS_ACTIONS.find((o) => o.kind === kind)!;

/** 全行业冲击波对收入的总倍率（不含产品级） */
export function shockMult(s: GameState): number {
  return s.shocks.filter((sh) => !sh.product).reduce((a, sh) => a * sh.mult, 1);
}
/** 产品级竞争冲击倍率（如 OICQ 挤压 IM） */
export function productShockMult(s: GameState, def: string): number {
  return s.shocks.filter((sh) => sh.product === def).reduce((a, sh) => a * sh.mult, 1);
}
/** 产品上的竞争冲击标签（UI 展示用） */
export const productShocks = (s: GameState, def: string) => s.shocks.filter((sh) => sh.product === def);
/**
 * 产品老化（v5 · 难度下调）：按「产品类型所属时代」对比当前时代。
 * 落后 1 个时代只衰减不亏损（给转型缓冲期）；落后 2 个时代满 3 个季度才进入 rot：
 * 收入强制转负、加速流失用户，倒逼停运或转型。
 */
export function agingOf(p: ProductInst, turn: number): { eraDiff: number; income: number; arpu: number; pull: number; churn: number; rot: boolean; behindQuarters: number } {
  const prodEra = techDef(productDef(p.def).tech).era;
  const curEra = eraOf(turn).id;
  const eraDiff = Math.max(0, curEra - prodEra);
  const behindQuarters = eraDiff >= 2 && p.behindSince != null ? Math.max(0, turn - p.behindSince) : 0;
  const rot = eraDiff >= 2 && behindQuarters >= 3;
  return {
    eraDiff,
    income: Math.pow(0.45, eraDiff),          // 收入断崖式衰减
    arpu: Math.pow(0.45, eraDiff),            // 用户付费意愿同步下滑
    pull: Math.pow(0.7, eraDiff),             // 拉新能力衰减
    churn: rot ? 1.5 + eraDiff : eraDiff >= 2 ? 0.4 * (eraDiff - 1) : 0, // 落后 2 时代起少量流失，rot 后大幅流失
    rot,
    behindQuarters,
  };
}
/** 单产品运维成本：老产品运维成本随「类型落后」通胀 */
export function upkeepOf(p: ProductInst, turn: number): number {
  const d = productDef(p.def);
  const prodEra = techDef(d.tech).era;
  const eraDiff = Math.max(0, eraOf(turn).id - prodEra);
  return d.upkeep * (1 + 0.6 * eraDiff);
}
/** 品牌溢价：声望带来收入加成 */
export const brandMult = (fame: number) => 1 + fame / 500;

/* -------- 团队单位（随时代升级） -------- */
const TEAM_UNITS = [
  { mult: 1, unit: '人', hire: '招募 1 名员工' },
  { mult: 1, unit: '人', hire: '招募 1 名员工' },
  { mult: 5, unit: '小组', hire: '扩编 1 个小组（+5 人）' },
  { mult: 10, unit: '事业部', hire: '新建 1 个事业部（+10 人）' },
];
/** 当前时代的团队单位 */
export const teamUnitOf = (turn: number) => TEAM_UNITS[eraOf(turn).id];
/** 团队规模文案：12 人 / 12 小组 ×5 = 60 人 */
export function teamText(s: GameState): string {
  const u = teamUnitOf(s.turn);
  return u.mult === 1 ? `${s.team} 人` : `${s.team} ${u.unit} ×${u.mult} = ${s.team * u.mult} 人`;
}
/** 每人头薪资（随时代上升），team 存的是「单位数」 */
const UNIT_SALARY = [0.55, 0.6, 2.6, 4.5];

/* -------- 处境评估辅助（供事件 assess 使用） -------- */
/** 是否拥有并运营某产品 */
export const owns = (s: GameState, def: string) => s.products.some((p) => p.def === def && p.launched && !p.shut);
/** 是否在某回合前上线某产品（抢跑判定） */
export const before = (s: GameState, def: string, turn: number) => s.products.some((p) => p.def === def && p.launched && (p.launchedTurn ?? 99) < turn);
/** 用户规模对比描述 */
export const usersVs = (mine: number, theirs: number, theirsLabel: string) =>
  mine >= theirs
    ? `你的 ${fmtW(mine)} 用户已超过${theirsLabel}的 ${fmtW(theirs)}——这一局，你领先。`
    : `你的 ${fmtW(mine)} 用户对比${theirsLabel}的 ${fmtW(theirs)}，还有差距，但窗口期还在。`;

/** 对手估值行情：按回合线性插值（单位：百万元） */
export function rivalVal(curve: { pts: [number, number][] }, turn: number): number {
  const pts = curve.pts;
  if (turn <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (turn <= pts[i][0]) {
      const [t0, v0] = pts[i - 1];
      const [t1, v1] = pts[i];
      return v0 + ((v1 - v0) * (turn - t0)) / (t1 - t0);
    }
  }
  return pts[pts.length - 1][1];
}

/** 当前回合市面估值最高的对手（与 valuation 同量纲） */
export function topRivalVal(turn: number): number {
  return Math.max(...RIVAL_CURVES.map((c) => rivalVal(c, turn)), 0);
}
/**
 * 估值压力（枪打出头鸟）：估值超过市面第一的 30% 后，
 * 负面事件概率与惩罚都会加大。仅在中后期（2004 年起）生效。
 */
export function isPressured(s: GameState): boolean {
  if (s.turn < 18) return false;
  const top = topRivalVal(s.turn);
  return top > 0 && valuation(s) > top * 0.3;
}
/** 压力状态下对负面随机事件惩罚的放大倍率 */
export const PRESSURE_AMP = { funds: 1.35, users: 1.25, fame: 1.25 };

export function valuation(s: GameState): number {
  /* 已上市：以市值为准 */
  if (s.ipo) return Math.round(s.ipo.cap);
  /* 估值 v4：每个分项都设硬上限，杜绝后期任何单一维度把估值撑爆。
     健康终局估值 ≈ 1600~2400（S 级门槛 2200），与历史巨头榜同量级。 */
  let v = Math.min(Math.max(0, s.funds), 800) * 0.5;                       // 现金 ≤400
  v += Math.min(Math.sqrt(Math.max(0, s.users)) * 7, 240);                // 用户资产 ≤240
  v += Math.min(s.fame * 2, 160) + Math.min(s.techPts * 1.2, 60);         // 品牌 ≤160，技术储备 ≤60
  v += Math.min(s.researched.length * 8, 128);                            // 技术组合 ≤128
  let prodV = 0;
  for (const p of s.products) {
    if (p.shut) continue;
    const d = productDef(p.def);
    prodV += p.launched
      ? d.devCost * 0.3 + d.base * 1.1 + ((p.level || 1) - 1) * 5 + (p.heat || 0) * 0.04
      : d.devCost * 0.2;
  }
  v += Math.min(prodV, 360);                                              // 产品组合 ≤360
  v += Math.min(s.servers * 12, 48);                                      // 机房 ≤48
  v += eraOf(s.turn).id * 25;                                             // 时代红利 ≤75
  v += Math.min(Math.sqrt(Math.max(0, quarterReport(s).revenue)) * 10, 300); // 营收(P/S) ≤300
  const pays = Object.keys(s.flags).filter((f) => f.startsWith('payoff_')).length;
  const invs = Object.keys(s.flags).filter((f) => f.startsWith('inv_')).length;
  v += Math.min(pays * 25 + Math.max(0, invs - pays) * 10, 150);          // 投资布局 ≤150
  if (has(s, 'p_cap')) v *= 1.15;
  if (adv(s, 'xiong')) v *= 1.08;
  if (adv(s, 'wang')) v *= 1.1;
  return Math.round(v);
}

export function productIncome(s: GameState, p: ProductInst): number {
  const d = productDef(p.def);
  const diff = diffOf(s);
  const mult = eraOf(s.turn).mult;
  const pm = priceMode(p);
  const ag = agingOf(p, s.turn);
  /* rot：落后时代满 3 季，产品强制亏损（收入为负，持续失血） */
  if (ag.rot) {
    return -upkeepOf(p, s.turn) * 0.6;
  }
  /* 用户付费额随产品老化衰减（arpu）；用户贡献设软上限（基础收入 ×2.5），防后期数值爆炸 */
  const userPart = Math.min(s.users * d.ucoef * ag.arpu, d.base * 2.5);
  let inc = (d.base + userPart) * mult * diff.revMult * levelMult(p) * pm.incomeMult * heatIncomeMult(p)
    * shockMult(s) * productShockMult(s, p.def) * ag.income * brandMult(s.fame);
  if (has(s, 'p_free')) inc *= 0.9;
  if (adv(s, 'mayun')) inc *= 1.1;
  if (has(s, 'p_sp2') && (p.def === 'p_sp' || p.def === 'p_game')) inc *= 1.35;
  if (adv(s, 'chen') && p.def === 'p_game') inc *= 1.3;
  if (adv(s, 'wangzhidong') && (p.def === 'p_portal' || p.def === 'p_mail')) inc *= 1.25;
  if (p.def === 'p_sp' && s.flags.sp_clean) inc *= 0.8;
  if (p.def === 'p_sp' && s.flags.sp_black) inc *= 1.3;
  if (isOverloaded(s)) inc *= 0.75; // 服务器过载惩罚
  return inc;
}

/** 仍在运营的产品（已上线且未停运） */
export const active = (s: GameState) => s.products.filter((p) => p.launched && !p.shut);
function upkeepSum(s: GameState) {
  return active(s).reduce((a, p) => a + upkeepOf(p, s.turn), 0);
}

function salaryCost(s: GameState) {
  const eraId = eraOf(s.turn).id;
  let c = s.team * UNIT_SALARY[eraId] * (1 + s.turn * 0.003) * diffOf(s).salaryMult;
  if (has(s, 'p_frugal')) c *= 0.7;
  if (adv(s, 'dinglei')) c *= 0.85;
  return c;
}

export function quarterReport(s: GameState) {
  const launched = active(s);
  const rows = launched.map((p) => ({
    name: productDef(p.def).name, def: p.def, level: p.level,
    val: productIncome(s, p), upkeep: upkeepOf(p, s.turn), aging: agingOf(p, s.turn).eraDiff,
  }));
  const revenue = rows.reduce((a, r) => a + r.val, 0);
  const upkeep = upkeepSum(s);
  const salary = salaryCost(s);
  return { revenue, upkeep, salary, net: revenue - upkeep - salary, rows, overloaded: isOverloaded(s), capacity: capacityOf(s) };
}

function devSpeed(s: GameState) {
  let sp = 1 + s.team * 0.12;
  if (adv(s, 'lei')) sp *= 1.25;
  return sp;
}
function effWork(s: GameState, d: ProductDef) {
  return has(s, 'p_fast') ? d.work * 0.7 : d.work;
}

export function researchSpeed(s: GameState) {
  let sp = 1 + (has(s, 'p_tech') ? 1 : 0) + s.team * 0.02;
  if (adv(s, 'robin')) sp *= 1.3;
  return sp;
}

export function organicGrowth(s: GameState) {
  const pull = active(s)
    .reduce((a, p) => a + productDef(p.def).pull * priceMode(p).pullMult * heatPullMult(p) * agingOf(p, s.turn).pull, 0);
  let g = (0.15 + s.fame * 0.04 + pull * 0.6) * Math.pow(eraOf(s.turn).mult, 0.8) * diffOf(s).growthMult;
  if (has(s, 'p_user')) g *= 1.4;
  if (has(s, 'p_free')) g *= 1.25;
  if (adv(s, 'pony')) g *= 1.15;
  if (adv(s, 'zhou')) g *= 1.2;
  if (isOverloaded(s)) g *= 0.5; // 服务器撑不住，新用户流失
  return g;
}

/* ---------------- 状态构造 ---------------- */
let seq = 1;

function mkLog(s: GameState, kind: 'history' | 'company' | 'person' | 'warn' | 'gain', text: string): GameState {
  return { ...s, seq: s.seq + 1, log: [{ id: s.seq + 1000 * seq++, turn: s.turn, kind, text }, ...s.log].slice(0, 120) };
}

function toast(s: GameState, text: string, kind: 'info' | 'good' | 'bad' | 'era' | 'ach' = 'info'): GameState {
  return { ...s, seq: s.seq + 1, toasts: [...s.toasts, { id: s.seq + 5000 * seq++, text, kind }].slice(-4) };
}

export function newGame(name: string, trackId: string, difficultyId: string = 'normal', perk: string | null = null): GameState {
  const tr = TRACKS.find((t) => t.id === trackId)!;
  const diff = DIFFICULTIES.find((d) => d.id === difficultyId) ?? DIFFICULTIES[1];
  const funds = Math.round(tr.funds * diff.fundsMult);
  let s: GameState = {
    phase: 'play', turn: 0, name: name || '未命名网络公司', track: trackId,
    difficulty: diff.id, perk,
    funds, users: tr.users, fame: tr.fame, team: 3, ap: 3, apMax: 3, debt: 0,
    loanTurns: 0, servers: 0, deferred: [], shocks: [], ipo: null, shockBanner: null,
    policies: [], researched: ['t_bbs'], cur: null, prog: {}, techPts: diff.techPts, equity: 100,
    products: [], rel: {}, met: [], advisors: [], flags: {}, log: [], queue: [],
    toasts: [], history: [], eraBanner: null, outcome: null, seq: 100,
  };
  const [tid, amt] = tr.techBoost;
  s.prog = { [tid]: amt };
  s.cur = nextResearchable(s)?.id ?? null; // 默认锁定第一个可研发课题，顶部不再显示「未立项」
  /* 穿越物资 */
  const perkDef = PERKS.find((p) => p.id === perk);
  if (perk === 'perk_angel') { s.funds += 25; s.equity = 95; }
  if (perk === 'perk_veteran') { s.team += 1; s.fame += 2; }
  if (perk === 'perk_media') { s.fame += 6; }
  if (perk === 'perk_server') { s.servers = 1; }
  if (perk === 'perk_code') { s.techPts += 2; }
  s = mkLog(s, 'company', `${s.name} 在中关村一间 20 平米的民房里注册成立了。启动资金 ${s.funds} 万，团队 ${s.team} 人。难度：${diff.name}。`);
  s = mkLog(s, 'company', `创业方向：${tr.name} —— ${tr.desc}`);
  if (perkDef) s = mkLog(s, 'company', `穿越物资「${perkDef.name}」已生效：${perkDef.desc}`);
  // 开局事件
  const first = EVENTS.filter((e) => e.turn === 0);
  s = { ...s, queue: first.map((e) => e.id) };
  s.history = [valuation(s)];
  return s;
}

/* ---------------- 效果结算 ---------------- */
function applyFx(s: GameState, fx: Choice['fx']): GameState {
  let n = { ...s, flags: { ...s.flags }, rel: { ...s.rel }, prog: { ...s.prog } };
  if (fx.funds) n.funds = +(n.funds + fx.funds).toFixed(1);
  if (fx.users) n.users = Math.max(0, +(n.users + fx.users).toFixed(1));
  if (fx.fame) n.fame = clamp(+(n.fame + fx.fame).toFixed(1), 0, 100);
  if (fx.team) n.team = Math.max(1, n.team + fx.team);
  if (fx.tech) {
    const [tid, amt] = fx.tech;
    if (tid) n.prog[tid] = Math.max(0, (n.prog[tid] || 0) + amt);
    else n.techPts = Math.max(0, n.techPts + amt);
  }
  if (fx.rel) for (const [pid, d] of fx.rel) n.rel[pid] = (n.rel[pid] || 0) + d;
  if (fx.flags) for (const f of fx.flags) n.flags[f] = true;
  if (fx.invest) {
    n.flags[fx.invest] = true;
    n = toast(n, '投资已生效，等待历史给出回报', 'good');
  }
  if (fx.log) n = mkLog(n, 'company', fx.log);
  return n;
}

function grantMet(s: GameState, pid: string): GameState {
  if (s.met.includes(pid)) return s;
  let n: GameState = { ...s, met: [...s.met, pid], rel: { ...s.rel, [pid]: (s.rel[pid] || 0) + 1 } };
  const p = personDef(pid);
  n = mkLog(n, 'person', `结识了 ${p.name}（${p.title}）。「${p.quote}」`);
  n = toast(n, `结识时代人物：${p.name}`, 'good');
  return n;
}

function checkAch(s: GameState, final = false): GameState {
  let n = s;
  for (const a of ACHIEVEMENTS) {
    const key = `done_${a.id}`;
    if (!n.flags[key] && a.check(n, final)) {
      n = { ...n, flags: { ...n.flags, [key]: true } };
      n = toast(n, `成就解锁 · ${a.name}：${a.desc}`, 'ach');
    }
  }
  return n;
}

/* ---------------- 结局 ---------------- */
function makeOutcome(s: GameState, type: Outcome['type'], val: number): Outcome {
  const rank = RANKS.find((r) => val >= r.min) ?? RANKS[RANKS.length - 1];
  const board = [...HISTORICAL_BOARD, { name: `${s.name}（你）`, val, you: true }]
    .sort((a, b) => b.val - a.val)
    .map((b) => ({ ...b, val: Math.round(b.val) }));
  const achievements = ACHIEVEMENTS.filter((a) => s.flags[`done_${a.id}`]).map((a) => a.name);
  const investments = Object.keys(s.flags).filter((f) => f.startsWith('inv_')).length;
  return {
    type, valuation: Math.round(val), rank: rank.rank, rankTitle: rank.title, rankDesc: rank.desc,
    board, achievements,
    stats: {
      years: `${turnLabel(0)} — ${turnLabel(Math.min(s.turn, TOTAL_TURNS - 1))}`,
      users: Math.round(s.users),
      products: s.products.filter((p) => p.launched).length,
      persons: s.met.length,
      investments,
    },
  };
}

/* ---------------- 回合推进 ---------------- */
function endTurn(prev: GameState): GameState {
  let s: GameState = { ...prev, products: prev.products.map((p) => ({ ...p })), prog: { ...prev.prog }, flags: { ...prev.flags } };

  /* 1. 产品开发进度 */
  for (const p of s.products) {
    if (p.launched) continue;
    p.progress += devSpeed(s);
    const d = productDef(p.def);
    if (p.progress >= effWork(s, d)) {
      p.launched = true;
      p.launchedTurn = s.turn;
      s.fame = clamp(s.fame + 2, 0, 100);
      s = mkLog(s, 'company', `产品「${d.name}」正式上线！${d.desc}`);
      s = toast(s, `新产品上线：${d.name}`, 'good');
    }
  }

  /* 1.5 运营热度自然衰减（每季 −20，热度需要持续运营维持） */
  for (const p of s.products) {
    if (p.launched && (p.heat || 0) > 0) {
      p.heat = Math.max(0, (p.heat || 0) - 20);
    }
  }

  /* 1.6 行业冲击波倒计时 */
  s.shocks = s.shocks
    .map((sh) => ({ ...sh, left: sh.left - 1 }))
    .filter((sh) => sh.left > 0);

  /* 2. 研发自动推进 + 存量技术点 */
  if (s.cur) {
    s.prog[s.cur] = (s.prog[s.cur] || 0) + researchSpeed(s) + s.techPts;
    s.techPts = 0;
    const t = techDef(s.cur);
    if (s.prog[s.cur] >= t.cost) {
      s.researched = [...s.researched, s.cur];
      s = mkLog(s, 'company', `技术突破：「${t.name}」研发完成！${t.unlocks ? `解锁产品「${productDef(t.unlocks).name}」` : ''}`);
      s = toast(s, `研发完成：${t.name}`, 'good');
      s.cur = null;
      const nxt = nextResearchable(s);
      if (nxt) {
        s.cur = nxt.id;
        s = mkLog(s, 'company', `研发团队自动转入下一课题「${nxt.name}」（可在科技树中改换方向）。`);
      }
    }
  }
  // 未指定研发方向时，techPts 作为技术储备计入估值

  /* 3. 财务结算 */
  const rep = quarterReport(s);
  s.funds = +(s.funds + rep.net).toFixed(1);

  /* 3.5 记录产品首次落后 2 个时代的回合（用于 rot 强制亏损的 3 季计时） */
  for (const p of s.products) {
    if (p.launched && !p.shut && p.behindSince == null) {
      const prodEra = techDef(productDef(p.def).tech).era;
      if (eraOf(s.turn).id - prodEra >= 2) p.behindSince = s.turn;
    }
  }
  /* rot 预警：刚开始亏损的落后产品单独提示 */
  for (const p of active(s)) {
    const ag = agingOf(p, s.turn);
    const flag = `rotwarn_${p.uid}`;
    if (ag.rot && !s.flags[flag]) {
      s.flags = { ...s.flags, [flag]: true };
      s = mkLog(s, 'warn', `【产品亏损】「${productDef(p.def).name}」已落后 ${ag.eraDiff} 个时代超过 3 个季度，开始持续亏损（每季 −${(upkeepOf(p, s.turn) * 0.6).toFixed(1)} 万）并大量流失用户。停运或转型刻不容缓！`);
      s = toast(s, `「${productDef(p.def).name}」开始亏损`, 'bad');
    }
  }

  /* 4. 用户与声望 */
  /* 落后产品流失用户（rot 后加速流失），与新增相抵；单季净变化下限 −5 万 */
  const churn = active(s).reduce((a, p) => a + agingOf(p, s.turn).churn, 0);
  const netUsers = clamp(organicGrowth(s) - churn, -5, Infinity);
  s.users = Math.max(0, +(s.users + netUsers).toFixed(1));
  if (churn > 0.3) {
    s = mkLog(s, 'warn', `老产品跟不上时代，本季流失用户 ${churn.toFixed(1)} 万。考虑停运落后产品或迭代升级。`);
  }
  const fameGain = active(s).reduce((a, p) => a + productDef(p.def).fame, 0);
  s.fame = clamp(+(s.fame + fameGain * (adv(s, 'zhang') ? 1.3 : 1) - 0.3).toFixed(1), 0, 100);

  /* 4.2 上市季度：合规成本 + 股权结构惩罚 + 市值波动 + 财报压力 */
  if (s.ipo) {
    const ipo = s.ipo; // 局部承接，避免中途 s 重赋值导致窄化失效
    /* 股权不健康：创始人持股越低，治理成本越高、市场信心越差 */
    let compliance = 2.5;
    let confPenalty = 0;
    if (s.equity < 20) {
      compliance = 8;
      confPenalty = -0.12;
      s.fame = clamp(s.fame - 2, 0, 100);
      s = mkLog(s, 'warn', `【控制权危机】创始人持股仅 ${s.equity}%，机构投资者联合逼宫，治理成本飙升至 8 万/季，市场信心崩塌。`);
    } else if (s.equity < 34) {
      compliance = 4.5;
      confPenalty = -0.06;
      s.fame = clamp(s.fame - 1, 0, 100);
      s = mkLog(s, 'warn', `【股权不健康】创始人持股 ${s.equity}% 低于安全线 34%，董事会博弈加剧，合规成本升至 4.5 万/季。`);
    }
    s.funds = +(s.funds - compliance).toFixed(1);
    const netNow = quarterReport(s).net;
    const drift = clamp(netNow / 150, -0.15, 0.25) + confPenalty + (Math.random() - 0.45) * 0.15;
    const newCap = Math.max(50, Math.round(ipo.cap * (1 + drift)));
    const up = newCap >= ipo.cap;
    s.ipo = { ...ipo, cap: newCap };
    s = mkLog(s, up ? 'gain' : 'warn', `上市后季报：本季度${netNow >= 0 ? '盈利' : '亏损'}，市值${up ? '上涨' : '回撤'}至 ${fmtVal(newCap)}（合规成本 −${compliance} 万${confPenalty ? ' · 含股权折价' : ''}）。`);
    if (netNow < 0) s.fame = clamp(s.fame - 1, 0, 100); // 财报压力
  }

  /* 4.3 先驱者里程碑：抢在历史事件之前做出同类产品 */
  for (const m of MILESTONES) {
    if (s.flags[m.flag]) continue;
    const p = s.products.find((x) => x.def === m.product && x.launched && !x.shut);
    if (p && (p.launchedTurn ?? 99) < m.beforeTurn) {
      s.flags = { ...s.flags, [m.flag]: true };
      s.fame = clamp(s.fame + m.fame, 0, 100);
      s = mkLog(s, 'gain', `【先驱者】${m.text}（声望 +${m.fame}）`);
      s = toast(s, '先驱者里程碑达成！', 'ach');
    }
  }

  /* 4.4 用户里程碑 */
  const um = [
    { flag: 'u10', at: 10, fame: 2 }, { flag: 'u100', at: 100, fame: 3 },
    { flag: 'u1000', at: 1000, fame: 4 }, { flag: 'u5000', at: 5000, fame: 5 },
  ];
  for (const u of um) {
    if (!s.flags[u.flag] && s.users >= u.at) {
      s.flags = { ...s.flags, [u.flag]: true };
      s.fame = clamp(s.fame + u.fame, 0, 100);
      s = toast(s, `用户突破 ${u.at} 万！声望 +${u.fame}`, 'good');
    }
  }

  /* 4.5 过桥贷款还款 */
  if (s.loanTurns > 0) {
    s.funds = +(s.funds - 7).toFixed(1);
    s.loanTurns -= 1;
    s = s.loanTurns === 0
      ? mkLog(s, 'company', '过桥贷款已全部还清！信用恢复，信托公司愿意再给你授信了。')
      : mkLog(s, 'company', `过桥贷款还款 7 万，剩余 ${s.loanTurns} 期。`);
  }

  /* 4.6 服务器过载预警 */
  if (isOverloaded(s) && !s.flags.overload_warned) {
    s.flags.overload_warned = true;
    s = mkLog(s, 'warn', `服务器过载！用户 ${fmtW(s.users)} 已超过「${SERVER_TIERS[s.servers].name}」容量（${capacityOf(s)} 万）。收入 −25%、增长减半——尽快在「行动」里升级机房！`);
    s = toast(s, '警告：机房容量不足', 'bad');
  } else if (!isOverloaded(s) && s.flags.overload_warned) {
    s.flags.overload_warned = false;
    s = mkLog(s, 'company', '扩容完成，服务器负载恢复正常。');
  }

  /* 5. 推进回合 */
  const oldEra = eraOf(s.turn);
  s.turn += 1;

  if (s.turn >= TOTAL_TURNS) {
    s = checkAch(s, true);
    s.history = [...s.history, valuation(s)];
    s = { ...s, phase: 'over', outcome: makeOutcome(s, 'final', valuation(s)), history: [...s.history.slice(0, -1), valuation(s)] };
    return s;
  }

  /* 6. 时代更替 */
  const newEra = eraOf(s.turn);
  if (newEra.id !== oldEra.id) {
    s.eraBanner = { name: newEra.name, sub: newEra.sub };
    s = mkLog(s, 'history', `【时代更替】${newEra.name}来临 —— ${newEra.sub}。市场乘数 ×${newEra.mult}。`);
  }

  /* 7. 事件入队：历史事件。
     人物事件若「所有选项都付不起」则自动延后（最多 3 次，超期作错过处理），
     只要有任何一个选项付得起就正常弹出——绝不把玩家锁死在弹窗里。 */
  const scheduled = EVENTS.filter((e) => e.turn === s.turn && e.kind !== 'payout');
  const payouts = EVENTS.filter((e) => e.turn === s.turn && e.kind === 'payout' && (!e.cond || e.cond(s)));
  const queue = [...payouts.map((e) => e.id)];
  const deferred = [...s.deferred];
  const payable = (e: GameEvent) => e.choices.some((c) => choiceCost(c) <= s.funds);
  for (const e of scheduled) {
    if (e.person && !payable(e)) {
      const dd = deferred.find((x) => x.id === e.id);
      if (dd) {
        if (dd.n + 1 >= 3) {
          deferred.splice(deferred.indexOf(dd), 1);
          s = mkLog(s, 'person', `囊中羞涩，你第三次错过了与${personDef(e.person!).name}会面的机会。他托人带话：「江湖再见。」`);
        } else {
          deferred[deferred.indexOf(dd)] = { ...dd, n: dd.n + 1 };
        }
      } else {
        deferred.push({ id: e.id, n: 1 });
        s = mkLog(s, 'person', `${personDef(e.person!).name}本想来访，但你正为下个月工资发愁——会面自动延后了。`);
      }
    } else {
      queue.push(e.id);
    }
  }
  /* 手头宽裕了，把延后的人物请回来（同样要检查付得起才弹） */
  if (deferred.length) {
    for (const dd of [...deferred]) {
      const ev = findEvent(dd.id);
      if (ev && payable(ev) && !queue.includes(dd.id)) {
        queue.push(dd.id);
        deferred.splice(deferred.indexOf(dd), 1);
        s = mkLog(s, 'person', '之前错过会面的时代人物，托人捎话约你改日再聚。');
      }
    }
  }
  s.deferred = deferred;

  /* 估值压力检测（枪打出头鸟）：估值超市面第一 30% 后进入被围剿状态 */
  const pressured = isPressured(s);
  if (pressured && !s.flags.pressure_on) {
    s.flags = { ...s.flags, pressure_on: true };
    const top = Math.round(topRivalVal(s.turn));
    s = mkLog(s, 'warn', `【枪打出头鸟】你的估值已达行业第一（${top} 万）的 ${(valuation(s) / top * 100).toFixed(0)}%。监管、巨头与同行的目光都盯上了你——负面事件概率与惩罚将显著加大。`);
    s = toast(s, '警告：你已被行业盯上', 'bad');
    s = { ...s, shockBanner: { label: '枪打出头鸟', detail: `估值超过行业第一的 30%。负面事件概率 +60%，惩罚 +35%。`, good: false } };
  } else if (!pressured && s.flags.pressure_on) {
    s.flags = { ...s.flags, pressure_on: false };
    s = mkLog(s, 'company', '你的估值回落到安全线以下，行业的注意力暂时从你身上移开了。');
  }

  /* 特别事件（董事会博弈 / 上市股价波动）：独立判定，保证关键剧情触发 */
  if (Math.random() < 0.22) {
    const specials = RANDOMS.filter((r) => r.kind === 'special' && !s.flags[`used_${r.id}`] && (!r.cond || r.cond(s)));
    if (specials.length) {
      const pick = specials[Math.floor(Math.random() * specials.length)];
      s.flags[`used_${pick.id}`] = true;
      queue.push(pick.id);
      if (pick.neg) {
        s.shockBanner = { label: pick.title, detail: '一起突发负面事件正在发生，处理不当将付出代价。请在事件窗口中做出应对。', good: false };
        s = mkLog(s, 'warn', `【突发事件】${pick.title}！`);
      }
    }
  }

  /* 随机事件：后期（Web2.0 起）竞争加剧，触发概率上调；
     门户时代（前 10 回合）新手保护：负面随机事件不触发；
     估值压力下：概率 +60%，且优先抽负面事件 */
  let rndP = queue.length === payouts.length ? 0.42 : s.turn >= 22 ? 0.3 : 0.18;
  if (pressured) rndP = Math.min(0.85, rndP * 1.6);
  if (Math.random() < rndP) {
    let pool = RANDOMS.filter((r) => r.kind !== 'special' && !s.flags[`used_${r.id}`] && (!r.cond || r.cond(s)) && !(r.neg && s.turn < 10));
    /* 压力下优先负面事件：若池中有负面事件，70% 概率只从负面里抽 */
    if (pressured && Math.random() < 0.7) {
      const negPool = pool.filter((r) => r.neg);
      if (negPool.length) pool = negPool;
    }
    if (pool.length) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      s.flags[`used_${pick.id}`] = true;
      queue.push(pick.id);
      /* 负面突发事件：红色全屏警报，确保玩家注意到 */
      if (pick.neg) {
        s.shockBanner = { label: pick.title, detail: '一起突发负面事件正在发生，处理不当将付出代价。请在事件窗口中做出应对。', good: false };
        s = mkLog(s, 'warn', `【突发事件】${pick.title}！`);
      }
    }
  }

  /* 收购要约 */
  if (s.turn >= 28 && !s.flags.acq_seen && !s.flags.acq_refused && valuation(s) >= 350 && Math.random() < 0.3) {
    s.flags.acq_seen = true;
    queue.push('ev_acq');
  }

  /* 队列净化：去重 + 剔除无法识别的事件 id，杜绝「待处理」假死 */
  s.queue = [...new Set(queue)].filter((qid) => !!findEvent(qid));
  for (const id of queue) {
    const ev = findEvent(id);
    if (ev && (ev.kind === 'history' || ev.kind === 'payout')) {
      s = mkLog(s, ev.kind === 'payout' ? 'gain' : 'history', `★ ${turnLabel(s.turn)} · ${ev.title}`);
    }
  }

  /* 8. 破产检查（破产线随难度浮动；提示过桥贷款自救） */
  if (s.funds < 0) {
    s.debt += 1;
    s = mkLog(s, 'warn', `现金流告急！账面资金 ${s.funds.toFixed(1)} 万（破产线 ${diffOf(s).bankruptAt} 万）。${s.loanTurns === 0 ? '提示：可以在「行动」里借过桥贷款续命。' : '贷款还在还款期，撑住！'}`);
    s = toast(s, '警告：现金流转负', 'bad');
  } else {
    s.debt = 0;
  }
  if (s.funds < diffOf(s).bankruptAt || s.debt >= 2) {
    s = mkLog(s, 'warn', '公司资金链断裂，团队解散。1999–2010 的互联网大潮里，多了一个无人记得的名字。');
    s = { ...s, phase: 'over', outcome: makeOutcome(s, 'bankrupt', Math.max(0, valuation(s) * 0.3)) };
    s.history = [...s.history, Math.max(0, valuation(s) * 0.3)];
    return s;
  }

  /* 9. 行动点重置 + 历史记录 */
  s.apMax = apFor(s.team);
  s.ap = s.apMax;
  s.history = [...s.history, valuation(s)];
  s = checkAch(s);
  return s;
}

/* ---------------- reducer ---------------- */
export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'NEW_GAME':
      return newGame(a.name, a.track, a.difficulty ?? 'normal', a.perk ?? null);
    case 'LOAD_GAME': {
      /* 旧存档兼容：补齐新版本字段 */
      const st = a.state;
      const loaded: GameState = {
        ...st,
        difficulty: st.difficulty ?? 'normal',
        perk: st.perk ?? null,
        loanTurns: st.loanTurns ?? 0,
        servers: st.servers ?? 0,
        deferred: st.deferred ?? [],
        ipo: st.ipo ?? null,
        techPts: st.techPts ?? 0,
        cur: st.cur ?? null,
        products: (st.products ?? []).map((p) => {
          const prodEra = techDef(productDef(p.def).tech).era;
          const behindOk = eraOf(st.turn).id - prodEra >= 2;
          return {
            ...p,
            level: (p as { level?: number }).level ?? 1,
            price: (p as { price?: PriceMode }).price ?? 'std',
            heat: (p as { heat?: number }).heat ?? 0,
            behindSince: behindOk ? (p as { behindSince?: number }).behindSince : undefined,
          };
        }),
        queue: (st.queue ?? []).filter((qid) => !!findEvent(qid)),
        toasts: [], eraBanner: null, shockBanner: null,
        shocks: (st.shocks ?? []).filter((sh) => sh.left > 0).map((sh) => ({ label: sh.label, mult: sh.mult, left: sh.left, product: (sh as { product?: string }).product })),
      };
      if (!loaded.cur) loaded.cur = nextResearchable(loaded)?.id ?? null;
      return loaded;
    }
    case 'SKIP_EVENT': {
      if (!s.queue.length) return s;
      return mkLog({ ...s, queue: s.queue.slice(1) }, 'warn', '一条无法读取的时代记录被跳过，时间继续向前。');
    }
    case 'BOOT_DONE':
      return { ...s, phase: 'setup' };
    case 'RESTART':
      return { ...s, phase: 'setup', toasts: [], eraBanner: null };
    case 'TOAST_GONE':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case 'BANNER_GONE':
      return { ...s, eraBanner: null };
    case 'SHOCK_BANNER_GONE':
      return { ...s, shockBanner: null };

    case 'END_TURN': {
      if (s.queue.length > 0 || s.phase !== 'play') return s;
      return endTurn(s);
    }

    case 'RESOLVE_EVENT': {
      const id = s.queue[0];
      const ev = findEvent(id);
      if (!ev) return { ...s, queue: s.queue.slice(1) };
      const choice = ev.choices[a.idx] ?? ev.choices[0];
      /* 资金门槛：真实花费 = 明面 cost + 负向资金效果。免费选项永远放行，花钱选项钱不够才拦 */
      const pay = choiceCost(choice);
      if (pay > 0 && s.funds < pay) return toast(s, `资金不足（此选项需 ${pay} 万），换一个吧`, 'bad');
      let n: GameState = { ...s, funds: +(s.funds - (choice.cost ?? 0)).toFixed(1) };
      const gainF = choice.fx.funds ?? 0;
      let fx: Effect = { ...choice.fx, funds: gainF > 0 ? 0 : gainF }; // 正向入账单独加，避免与 cost 重复结算
      /* 估值压力下：负面随机事件的惩罚放大 */
      const amplify = ev.neg && isPressured(n);
      if (amplify) {
        fx = {
          ...fx,
          funds: (fx.funds ?? 0) < 0 ? +((fx.funds ?? 0) * PRESSURE_AMP.funds).toFixed(1) : fx.funds,
          users: (fx.users ?? 0) < 0 ? +((fx.users ?? 0) * PRESSURE_AMP.users).toFixed(1) : fx.users,
          fame: (fx.fame ?? 0) < 0 ? +((fx.fame ?? 0) * PRESSURE_AMP.fame).toFixed(1) : fx.fame,
        };
      }
      n = applyFx(n, fx);
      if (amplify) n = mkLog(n, 'warn', '【压力反噬】你树大招风，这次危机的代价被放大了。');
      if (gainF > 0) n = { ...n, funds: +(n.funds + gainF).toFixed(1) };
      if (ev.person) n = grantMet(n, ev.person);
      /* 行业冲击波：重大事件对全行业的临时影响（门户时代负面冲击减半，新手保护） */
      if (ev.impact) {
        if (ev.impact.incomeMult && ev.impact.turns) {
          const dampN = eraOf(n.turn).id === 0 && ev.impact.incomeMult < 1 ? 0.5 : 1;
          const mult = +(1 - (1 - ev.impact.incomeMult) * dampN).toFixed(2);
          n = { ...n, shocks: [...n.shocks.filter((sh) => sh.label !== ev.impact!.label), { label: ev.impact.label, mult, left: ev.impact.turns }] };
          n = mkLog(n, 'history', `【行业冲击】${ev.title}引发「${ev.impact.label}」：全行业收入 ×${mult}，持续 ${ev.impact.turns} 个季度。`);
          n = { ...n, shockBanner: { label: ev.impact.label, detail: `全行业收入 ×${mult} · 持续 ${ev.impact.turns} 季`, good: mult >= 1 } };
        }
        if (ev.impact.users) n.users = Math.max(0, +(n.users + ev.impact.users).toFixed(1));
        if (ev.impact.fame) n.fame = clamp(+(n.fame + ev.impact.fame).toFixed(1), 0, 100);
        if (ev.impact.tech && n.cur) n.prog = { ...n.prog, [n.cur]: (n.prog[n.cur] || 0) + (ev.impact.tech[1] ?? 0) };
      }
      /* 产品级竞争冲击：事件主角直接挤压玩家的同类业务（门户时代冲击减半，新手保护） */
      if (ev.competes && owns(n, ev.competes.product)) {
        const cp = ev.competes;
        const dampC = eraOf(n.turn).id === 0 ? 0.5 : 1;
        const cmult = +(1 - (1 - cp.mult) * dampC).toFixed(2);
        const cusers = (cp.users ?? 0) * dampC;
        const cheat = Math.round((cp.heat ?? 0) * dampC);
        n = { ...n, shocks: [...n.shocks.filter((sh) => !(sh.product === cp.product && sh.label === cp.label)), { label: cp.label, mult: cmult, left: cp.turns, product: cp.product }] };
        if (cheat) n = { ...n, products: n.products.map((p) => (p.def === cp.product ? { ...p, heat: Math.max(0, (p.heat || 0) - cheat) } : p)) };
        if (cusers) n.users = Math.max(0, +(n.users - cusers).toFixed(1));
        n = mkLog(n, 'warn', `【正面竞争】${cp.note}`);
        n = toast(n, `竞争冲击：你的${productDef(cp.product).name}被挤压`, 'bad');
        n = { ...n, shockBanner: { label: cp.label, detail: `${productDef(cp.product).name}收入 ×${cmult} · ${cp.turns} 季${cusers ? ` · 流失 ${cusers} 万用户` : ''}`, good: false } };
      }
      /* 先驱变体：玩家抢先做出相关产品时的额外承认 */
      if (ev.variant && ev.variant.when(n)) {
        if (ev.variant.bonus) n = applyFx(n, ev.variant.bonus);
        if (ev.variant.note) n = mkLog(n, 'gain', `【业界瞩目】${ev.variant.note}`);
      }
      n = { ...n, queue: n.queue.slice(1) };
      n = checkAch(n);
      if (choice.fx.end === 'exit') {
        const val = Math.round(valuation(n) * 1.2);
        n = { ...n, history: [...n.history, val], phase: 'over', outcome: makeOutcome(n, 'exit', val) };
      }
      return n;
    }

    case 'ACT': {
      if (s.phase !== 'play' || s.ap <= 0 || s.queue.length > 0) return s;
      let n: GameState = { ...s, flags: { ...s.flags }, prog: { ...s.prog }, rel: { ...s.rel } };
      switch (a.kind) {
        case 'research': {
          if (!n.cur) {
            const nxt = nextResearchable(n);
            if (!nxt) return toast(s, '暂无可研发的技术', 'bad');
            n.cur = nxt.id; // 未设方向时自动锁定下一课题
          }
          n.ap -= 1;
          n.prog[n.cur] = (n.prog[n.cur] || 0) + 3 * researchSpeed(n);
          const t = techDef(n.cur);
          if (n.prog[n.cur] >= t.cost) {
            n.researched = [...n.researched, n.cur];
            n = mkLog(n, 'company', `技术突破：「${t.name}」研发完成！${t.unlocks ? `解锁「${productDef(t.unlocks).name}」` : ''}`);
            n = toast(n, `研发完成：${t.name}`, 'good');
            n.cur = null;
            const nx = nextResearchable(n);
            if (nx) n.cur = nx.id;
          }
          return checkAch(n);
        }
        case 'marketing': {
          if (n.funds < 8) return s;
          n.ap -= 1;
          n.funds = +(n.funds - 8).toFixed(1);
          const eraIdx = eraOf(n.turn).id;
          let gain = 2.5 + eraIdx * 1.5;
          if (has(n, 'p_burn')) gain *= 1.6;
          n.users = +(n.users + gain).toFixed(1);
          n.fame = clamp(+(n.fame + 1.5).toFixed(1), 0, 100);
          n = mkLog(n, 'company', `投入 8 万市场推广（报纸中缝+网吧桌面+公交拉手），新增用户约 ${gain.toFixed(1)} 万。`);
          return checkAch(n);
        }
        case 'hire': {
          const u = teamUnitOf(n.turn);
          const hireCost = [8, 8, 20, 35][eraOf(n.turn).id];
          if (n.funds < hireCost || n.team >= 40) return s;
          n.ap -= 1;
          n.funds = +(n.funds - hireCost).toFixed(1);
          n.team += 1;
          n.apMax = apFor(n.team);
          n = mkLog(n, 'company', `${u.hire}（猎头费 ${hireCost} 万）。团队规模 ${teamText(n)}。`);
          return checkAch(n);
        }
        case 'raise': {
          n.ap -= 1;
          return n; // 报价弹窗由 UI 呈现，确认走 ACCEPT_RAISE
        }
        case 'coffee': {
          const pid = a.person;
          if (!pid || n.funds < 1 || !n.met.includes(pid)) return s;
          n.ap -= 1;
          n.funds = +(n.funds - 1).toFixed(1);
          n.rel[pid] = (n.rel[pid] || 0) + 1;
          const p = personDef(pid);
          n = mkLog(n, 'person', `请 ${p.name} 喝了杯咖啡（1 万），聊了聊行业大势。好感 +1（当前 ${n.rel[pid]}）。`);
          return n;
        }
        default:
          return s;
      }
    }

    case 'BUILD': {
      const d = productDef(a.def);
      const inDev = s.products.filter((p) => !p.launched).length;
      if (s.phase !== 'play' || s.ap <= 0 || s.queue.length > 0) return s;
      if (!s.researched.includes(d.tech)) return s;
      if (s.products.some((p) => p.def === a.def)) return s;
      if (inDev >= 2 || s.funds < d.devCost) return s;
      let n: GameState = { ...s, ap: s.ap - 1, funds: +(s.funds - d.devCost).toFixed(1), products: [...s.products, { uid: s.seq + 7, def: a.def, progress: 0, launched: false, level: 1, price: 'std', heat: 0 }] };
      n = mkLog(n, 'company', `立项开发「${d.name}」，投入 ${d.devCost} 万，预计需要 ${Math.ceil(effWork(n, d) / devSpeed(n))} 个季度。`);
      return n;
    }

    case 'SET_RESEARCH': {
      const t = techDef(a.id);
      if (s.researched.includes(a.id)) return s;
      const reqOk = (!t.req || t.req.every((r) => s.researched.includes(r))) && (!t.reqAny || t.reqAny.some((r) => s.researched.includes(r)));
      if (!reqOk) return s;
      let n: GameState = { ...s, cur: a.id };
      n = mkLog(n, 'company', `研发重心转向「${t.name}」（进度 ${Math.round(n.prog[a.id] || 0)}/${t.cost}）。`);
      return n;
    }

    case 'TOGGLE_POLICY': {
      let n = { ...s };
      if (n.policies.includes(a.id)) n.policies = n.policies.filter((p) => p !== a.id);
      else if (n.policies.length < 2) n.policies = [...n.policies, a.id];
      else return s;
      const pd = POLICIES.find((p) => p.id === a.id)!;
      n = mkLog(n, 'company', `公司战略调整：${n.policies.includes(a.id) ? `启用「${pd.name}」` : `取消「${pd.name}」`}。${n.policies.includes(a.id) ? pd.desc : ''}`);
      return n;
    }

    case 'HIRE_ADVISOR': {
      const p = personDef(a.person);
      if (s.advisors.length >= 2 || s.advisors.includes(a.person)) return s;
      if ((s.rel[a.person] || 0) < 3 || s.funds < p.hireCost) return s;
      let n: GameState = { ...s, advisors: [...s.advisors, a.person], funds: +(s.funds - p.hireCost).toFixed(1) };
      n = mkLog(n, 'person', `${p.name} 出任公司战略顾问（年薪 ${p.hireCost} 万）：「${p.buffName}」—— ${p.buffDesc}。`);
      n = toast(n, `顾问加盟：${p.name}`, 'good');
      return n;
    }

    /* 过桥贷款：破产边缘的救命钱（仅在资金 <30 万时可借） */
    case 'TAKE_LOAN': {
      if (s.phase !== 'play' || s.ap <= 0 || s.queue.length > 0) return s;
      if (s.funds >= 30 || s.loanTurns > 0) return s;
      let n: GameState = { ...s, ap: s.ap - 1, funds: +(s.funds + 30).toFixed(1), loanTurns: 6 };
      n = mkLog(n, 'company', '从信托投资公司拿到 30 万过桥贷款！此后 6 个季度每季度自动还款 7 万（合计 42 万）。信用是第二次生命，且用且珍惜。');
      return toast(n, '过桥贷款到账 +30 万', 'good');
    }

    /* 机房扩容：提升用户容量 */
    case 'UPGRADE_SERVERS': {
      const cost = serverUpgradeCost(s);
      if (s.phase !== 'play' || s.ap <= 0 || s.queue.length > 0) return s;
      if (!cost || s.funds < cost) return s;
      let n: GameState = { ...s, ap: s.ap - 1, funds: +(s.funds - cost).toFixed(1), servers: s.servers + 1 };
      n = mkLog(n, 'company', `机房升级为「${SERVER_TIERS[n.servers].name}」，用户容量提升至 ${capacityOf(n)} 万。风扇声都变好听了。`);
      return toast(n, `机房升级：${SERVER_TIERS[n.servers].name}`, 'good');
    }

    /* 产品升级：已上线产品最高 Lv.3，每级收入 +30% */
    case 'UPGRADE_PRODUCT': {
      if (s.phase !== 'play' || s.ap <= 0 || s.queue.length > 0) return s;
      const p = s.products.find((x) => x.uid === a.uid);
      if (!p || !p.launched || p.level >= 3) return s;
      const cost = productUpgradeCost(p.level);
      if (s.funds < cost) return s;
      const d = productDef(p.def);
      let n: GameState = { ...s, ap: s.ap - 1, funds: +(s.funds - cost).toFixed(1), products: s.products.map((x) => (x.uid === a.uid ? { ...x, level: x.level + 1 } : x)) };
      n = mkLog(n, 'company', `产品「${d.name}」迭代至 Lv.${p.level + 1}（投入 ${cost} 万），季度收入 +30%。`);
      return toast(n, `${d.name} 升级至 Lv.${p.level + 1}`, 'good');
    }

    /* 调整产品定价策略（免费 / 标准 / 高价） */
    case 'SET_PRICE': {
      const p = s.products.find((x) => x.uid === a.uid);
      if (!p || !p.launched || p.price === a.price) return s;
      const d = productDef(p.def);
      const pm = PRICE_MODES.find((m) => m.id === a.price)!;
      let n: GameState = { ...s, products: s.products.map((x) => (x.uid === a.uid ? { ...x, price: a.price } : x)) };
      n = mkLog(n, 'company', `产品「${d.name}」调价至「${pm.name}」：${pm.desc}`);
      return n;
    }

    /* 产品运营：推广活动 / 内容运营 */
    case 'OPS': {
      if (s.phase !== 'play' || s.ap <= 0 || s.queue.length > 0) return s;
      const p = s.products.find((x) => x.uid === a.uid);
      if (!p || !p.launched) return s;
      const op = opsDef(a.kind);
      if (s.funds < op.cost) return s;
      const d = productDef(p.def);
      const newHeat = Math.min(100, (p.heat || 0) + op.heat);
      let n: GameState = { ...s, ap: s.ap - 1, funds: +(s.funds - op.cost).toFixed(1), products: s.products.map((x) => (x.uid === a.uid ? { ...x, heat: newHeat } : x)) };
      if (a.kind === 'ad') {
        n.users = +(n.users + 1.5).toFixed(1);
        n = mkLog(n, 'company', `为「${d.name}」投放推广（${op.cost} 万）：热度升至 ${newHeat}，新增用户 1.5 万。`);
      } else {
        n.fame = clamp(+(n.fame + 1.5).toFixed(1), 0, 100);
        n = mkLog(n, 'company', `为「${d.name}」做内容运营（${op.cost} 万）：热度升至 ${newHeat}，声望 +1.5。`);
      }
      if (newHeat >= 80 && (p.heat || 0) < 80) n = toast(n, `「${d.name}」成为爆款！`, 'good');
      return n;
    }

    /* 解聘战略顾问 */
    case 'DISMISS_ADVISOR': {
      if (!s.advisors.includes(a.person)) return s;
      const p = personDef(a.person);
      let n: GameState = { ...s, advisors: s.advisors.filter((x) => x !== a.person), rel: { ...s.rel, [a.person]: Math.max(0, (s.rel[a.person] || 0) - 1) } };
      n = mkLog(n, 'person', `与 ${p.name} 结束顾问合作（「${p.buffName}」加成消失）。好聚好散，江湖再见。`);
      return n;
    }

    /* 产品停运 */
    case 'SHUT_PRODUCT': {
      const p = s.products.find((x) => x.uid === a.uid);
      if (!p || !p.launched || p.shut) return s;
      const d = productDef(p.def);
      let n: GameState = {
        ...s,
        products: s.products.map((x) => (x.uid === a.uid ? { ...x, shut: true, heat: 0 } : x)),
        users: +(s.users * 0.92).toFixed(1),
      };
      n.fame = clamp(+(n.fame - 1.5).toFixed(1), 0, 100);
      n = mkLog(n, 'warn', `产品「${d.name}」正式停运：停止维护与收费，约 8% 用户流失，声望 −1.5。轻装上阵，把资源留给下一代产品。`);
      return toast(n, `${d.name} 已停运`, 'info');
    }

    /* 上市 IPO */
    case 'IPO': {
      if (s.phase !== 'play' || s.ipo || s.ap < 2 || s.queue.length > 0) return s;
      const val = valuation(s);
      if (eraOf(s.turn).id < 2 || val < 300 || active(s).length < 3 || s.fame < 25 || s.funds < 15) return s;
      const appetite = 0.75 + s.fame / 200 + (quarterReport(s).net > 0 ? 0.15 : 0);
      const cap = Math.round(val * 1.1);
      const proceeds = Math.round(cap * 0.25 * appetite);
      const price = Math.max(1, Math.round(cap / 40));
      let n: GameState = {
        ...s,
        ap: s.ap - 2,
        funds: +(s.funds - 15 + proceeds).toFixed(1),
        equity: Math.max(5, s.equity - 25),
        ipo: { turn: s.turn, float: 25, cap, price },
      };
      n = mkLog(n, 'gain', `🔔 敲钟时刻！${n.name} 正式挂牌上市，发行价 ${price} 元/股，募资 ${proceeds} 万（承销费 15 万），公众持股 25%。上市首日市值 ${fmtVal(cap)}。`);
      n = mkLog(n, 'warn', '【上市阵痛】从此每季固定支出 2.5 万合规/审计/信披成本；业绩不达标会被资本市场用脚投票，市值随财报剧烈波动。');
      return toast(n, `上市成功！募资 ${proceeds} 万`, 'ach');
    }

    /* 融资确认到账 */
    case 'ACCEPT_RAISE': {
      if (s.phase !== 'play' || s.queue.length > 0) return s;
      let n: GameState = { ...s, funds: +(s.funds + a.offer.amount).toFixed(1), equity: Math.max(5, s.equity - a.offer.share) };
      n = mkLog(n, 'company', `${a.offer.investor} 的投资款 ${a.offer.amount} 万到账，出让 ${a.offer.share}% 股权。账上现有 ${n.funds.toFixed(1)} 万，创始人持股 ${n.equity}%。`);
      return toast(n, `融资到账 +${a.offer.amount} 万`, 'good');
    }

    default:
      return s;
  }
}

/* ---------------- 融资报价 ---------------- */
export function raiseOffer(s: GameState) {
  const seed = s.turn * 7 + s.team * 13 + Math.floor(s.users);
  const inv = (n: number) => INVESTOR_POOL[n % INVESTOR_POOL.length];
  const shareBase = 10 + ((seed * 31) % 8);
  let share = shareBase;
  if (has(s, 'p_cap')) share -= 3;
  if (adv(s, 'xiong')) share -= 5;
  share = Math.max(5, share);
  const eraIdx = eraOf(s.turn).id;
  let mult = 0.5 + eraIdx * 0.12 + ((seed * 17) % 15) / 100; // 0.5 → 0.86+，越往后越值钱
  if (s.flags.idg_early) mult += 0.1;
  const floor = 12 + eraIdx * 10; // 保底 12/22/32/42 万，早期也能解渴
  const amount = Math.max(floor, Math.round(valuation(s) * (share / 100) * mult));
  return { investor: inv(seed), share, amount };
}

const INVESTOR_POOL = [
  'IDG 资本 · 熊晓鸽',
  '软银 · 孙先生',
  '今日资本 · 徐女士',
  '红杉 · 沈先生',
  '经纬 · 邵先生',
];

export function acceptRaise(s: GameState): GameState {
  const o = raiseOffer(s);
  if (s.equity - o.share < 34) return toast(s, '创始人股权低于 34%，董事会否决了这轮融资。', 'bad');
  let n: GameState = { ...s, funds: +(s.funds + o.amount).toFixed(1), equity: s.equity - o.share };
  n = mkLog(n, 'company', `完成新一轮融资：${o.investor} 出资 ${o.amount} 万，占股 ${o.share}%。创始人持股降至 ${n.equity}%。`);
  n = toast(n, `融资到账 +${o.amount} 万`, 'good');
  return n;
}

export { eraOf, turnLabel, ERAS, TECHS, PRODUCTS, POLICIES, PERSONS, TOTAL_TURNS };
