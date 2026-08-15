import {
  ACHIEVEMENTS, ERAS, EVENTS, HISTORICAL_BOARD, PERSONS, POLICIES, PRODUCTS,
  RANDOMS, RANKS, TECHS, TOTAL_TURNS, TRACKS, eraOf, turnLabel,
} from './data';
import type { Action, Choice, GameEvent, GameState, Outcome, ProductDef } from './types';

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
  return EVENTS.find((e) => e.id === id);
}

/* ---------------- buff 查询 ---------------- */
const has = (s: GameState, p: string) => s.policies.includes(p);
const adv = (s: GameState, p: string) => s.advisors.includes(p);

export function apFor(team: number) {
  return team >= 24 ? 5 : team >= 12 ? 4 : 3;
}

export function valuation(s: GameState): number {
  let v = s.users * 2 + s.fame * 2.5 + s.techPts * 2;
  v += s.researched.length * 6;
  for (const p of s.products) {
    const d = productDef(p.def);
    v += p.launched ? d.devCost + d.base * 10 : d.devCost * 0.4;
  }
  v += eraOf(s.turn).id * 30;
  const pays = Object.keys(s.flags).filter((f) => f.startsWith('payoff_')).length;
  const invs = Object.keys(s.flags).filter((f) => f.startsWith('inv_')).length;
  v += pays * 40 + Math.max(0, invs - pays) * 15;
  if (has(s, 'p_cap')) v *= 1.25;
  if (adv(s, 'xiong')) v *= 1.1;
  if (adv(s, 'wang')) v *= 1.15;
  return Math.round(v);
}

function productIncome(s: GameState, defId: string): number {
  const d = productDef(defId);
  const mult = eraOf(s.turn).mult;
  let inc = (d.base + s.users * d.ucoef) * mult;
  if (has(s, 'p_free')) inc *= 0.9;
  if (adv(s, 'mayun')) inc *= 1.1;
  if (has(s, 'p_sp2') && (defId === 'p_sp' || defId === 'p_game')) inc *= 1.35;
  if (adv(s, 'chen') && defId === 'p_game') inc *= 1.3;
  if (adv(s, 'wangzhidong') && (defId === 'p_portal' || defId === 'p_mail')) inc *= 1.25;
  if (defId === 'p_sp' && s.flags.sp_clean) inc *= 0.8;
  if (defId === 'p_sp' && s.flags.sp_black) inc *= 1.3;
  return inc;
}

function upkeepSum(s: GameState) {
  return s.products.filter((p) => p.launched).reduce((a, p) => a + productDef(p.def).upkeep, 0);
}

function salaryCost(s: GameState) {
  let c = s.team * 0.55 * (1 + s.turn * 0.004);
  if (has(s, 'p_frugal')) c *= 0.7;
  if (adv(s, 'dinglei')) c *= 0.85;
  return c;
}

export function quarterReport(s: GameState) {
  const revenue = s.products.filter((p) => p.launched).reduce((a, p) => a + productIncome(s, p.def), 0);
  return { revenue, upkeep: upkeepSum(s), salary: salaryCost(s), net: revenue - upkeepSum(s) - salaryCost(s) };
}

function devSpeed(s: GameState) {
  let sp = 1 + s.team * 0.08;
  if (adv(s, 'lei')) sp *= 1.25;
  return sp;
}
function effWork(s: GameState, d: ProductDef) {
  return has(s, 'p_fast') ? d.work * 0.7 : d.work;
}

export function researchSpeed(s: GameState) {
  let sp = 1 + (has(s, 'p_tech') ? 1 : 0);
  if (adv(s, 'robin')) sp *= 1.3;
  return sp;
}

export function organicGrowth(s: GameState) {
  const pull = s.products.filter((p) => p.launched).reduce((a, p) => a + productDef(p.def).pull, 0);
  let g = (0.15 + s.fame * 0.04 + pull * 0.6) * Math.pow(eraOf(s.turn).mult, 0.8);
  if (has(s, 'p_user')) g *= 1.4;
  if (has(s, 'p_free')) g *= 1.25;
  if (adv(s, 'pony')) g *= 1.15;
  if (adv(s, 'zhou')) g *= 1.2;
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

export function newGame(name: string, trackId: string): GameState {
  const tr = TRACKS.find((t) => t.id === trackId)!;
  let s: GameState = {
    phase: 'play', turn: 0, name: name || '未命名网络公司', track: trackId,
    funds: tr.funds, users: tr.users, fame: tr.fame, team: 3, ap: 3, apMax: 3, debt: 0,
    policies: [], researched: ['t_bbs'], cur: null, prog: {}, techPts: 0, equity: 100,
    products: [], rel: {}, met: [], advisors: [], flags: {}, log: [], queue: [],
    toasts: [], history: [], eraBanner: null, outcome: null, seq: 100,
  };
  const [tid, amt] = tr.techBoost;
  s.prog = { [tid]: amt };
  s = mkLog(s, 'company', `${s.name} 在中关村一间 20 平米的民房里注册成立了。启动资金 ${tr.funds} 万，团队 3 人。`);
  s = mkLog(s, 'company', `创业方向：${tr.name} —— ${tr.desc}`);
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
    if (tid) n.prog[tid] = (n.prog[tid] || 0) + amt;
    else n.techPts += amt;
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
    }
  }
  // 未指定研发方向时，techPts 作为技术储备计入估值

  /* 3. 财务结算 */
  const rep = quarterReport(s);
  s.funds = +(s.funds + rep.net).toFixed(1);

  /* 4. 用户与声望 */
  s.users = +(s.users + organicGrowth(s)).toFixed(1);
  const fameGain = s.products.filter((p) => p.launched).reduce((a, p) => a + productDef(p.def).fame, 0);
  s.fame = clamp(+(s.fame + fameGain * (adv(s, 'zhang') ? 1.3 : 1) - 0.3).toFixed(1), 0, 100);

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

  /* 7. 事件入队：历史事件 */
  const scheduled = EVENTS.filter((e) => e.turn === s.turn && e.kind !== 'payout');
  const payouts = EVENTS.filter((e) => e.turn === s.turn && e.kind === 'payout' && (!e.cond || e.cond(s)));
  const queue = [...payouts.map((e) => e.id), ...scheduled.map((e) => e.id)];

  /* 随机事件 */
  if (scheduled.length === 0 && Math.random() < 0.42) {
    const pool = RANDOMS.filter((r) => !s.flags[`used_${r.id}`] && (!r.cond || r.cond(s)));
    if (pool.length) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      s.flags[`used_${pick.id}`] = true;
      queue.push(pick.id);
    }
  }

  /* 收购要约 */
  if (s.turn >= 28 && !s.flags.acq_seen && !s.flags.acq_refused && valuation(s) >= 350 && Math.random() < 0.3) {
    s.flags.acq_seen = true;
    queue.push('ev_acq');
  }

  s.queue = queue;
  for (const id of queue) {
    const ev = findEvent(id);
    if (ev && (ev.kind === 'history' || ev.kind === 'payout')) {
      s = mkLog(s, ev.kind === 'payout' ? 'gain' : 'history', `★ ${turnLabel(s.turn)} · ${ev.title}`);
    }
  }

  /* 8. 破产检查 */
  if (s.funds < 0) {
    s.debt += 1;
    s = mkLog(s, 'warn', `现金流告急！账面资金 ${s.funds.toFixed(1)} 万。${s.debt >= 1 ? '再这样下去要发不出工资了！' : ''}`);
    s = toast(s, '警告：现金流转负', 'bad');
  } else {
    s.debt = 0;
  }
  if (s.funds < -30 || s.debt >= 2) {
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
      return newGame(a.name, a.track);
    case 'LOAD_GAME':
      return a.state;
    case 'BOOT_DONE':
      return { ...s, phase: 'setup' };
    case 'RESTART':
      return { ...s, phase: 'setup', toasts: [], eraBanner: null };
    case 'TOAST_GONE':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case 'BANNER_GONE':
      return { ...s, eraBanner: null };

    case 'END_TURN': {
      if (s.queue.length > 0 || s.phase !== 'play') return s;
      return endTurn(s);
    }

    case 'RESOLVE_EVENT': {
      const id = s.queue[0];
      const ev = findEvent(id);
      if (!ev) return { ...s, queue: s.queue.slice(1) };
      const choice = ev.choices[a.idx] ?? ev.choices[0];
      let n = applyFx(s, choice.fx);
      if (ev.person) n = grantMet(n, ev.person);
      n.queue = n.queue.slice(1);
      n = checkAch(n);
      if (choice.fx.end === 'exit') {
        const val = valuation(n) * 1.2;
        n = { ...n, phase: 'over', outcome: makeOutcome(n, 'exit', val) };
      }
      return n;
    }

    case 'ACT': {
      if (s.phase !== 'play' || s.ap <= 0 || s.queue.length > 0) return s;
      let n: GameState = { ...s, flags: { ...s.flags }, prog: { ...s.prog }, rel: { ...s.rel } };
      switch (a.kind) {
        case 'research': {
          if (!n.cur) return s;
          n.ap -= 1;
          n.prog[n.cur] = (n.prog[n.cur] || 0) + 3 * researchSpeed(n);
          const t = techDef(n.cur);
          if (n.prog[n.cur] >= t.cost) {
            n.researched = [...n.researched, n.cur];
            n = mkLog(n, 'company', `技术突破：「${t.name}」研发完成！${t.unlocks ? `解锁「${productDef(t.unlocks).name}」` : ''}`);
            n = toast(n, `研发完成：${t.name}`, 'good');
            n.cur = null;
          }
          return checkAch(n);
        }
        case 'marketing': {
          if (n.funds < 12) return s;
          n.ap -= 1;
          n.funds = +(n.funds - 12).toFixed(1);
          const eraIdx = eraOf(n.turn).id;
          let gain = 2 + eraIdx * 1.5;
          if (has(n, 'p_burn')) gain *= 1.6;
          n.users = +(n.users + gain).toFixed(1);
          n.fame = clamp(+(n.fame + 1.5).toFixed(1), 0, 100);
          n = mkLog(n, 'company', `投入 12 万市场推广（报纸中缝+网吧桌面+公交拉手），新增用户约 ${gain.toFixed(1)} 万。`);
          return checkAch(n);
        }
        case 'hire': {
          if (n.funds < 8 || n.team >= 30) return s;
          n.ap -= 1;
          n.funds = +(n.funds - 8).toFixed(1);
          n.team += 1;
          n.apMax = apFor(n.team);
          n = mkLog(n, 'company', `在人才市场招到一名新员工（猎头费 8 万）。团队 ${n.team} 人。`);
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
      let n: GameState = { ...s, ap: s.ap - 1, funds: +(s.funds - d.devCost).toFixed(1), products: [...s.products, { uid: s.seq + 7, def: a.def, progress: 0, launched: false }] };
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
  let mult = 0.28 + ((seed * 17) % 18) / 100;
  if (s.flags.idg_early) mult += 0.08;
  const amount = Math.max(8, Math.round(valuation(s) * (share / 100) * mult));
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
