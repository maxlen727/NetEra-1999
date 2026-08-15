import {
  ACHIEVEMENTS, DIFFICULTIES, ERAS, EVENTS, HISTORICAL_BOARD, PERKS, PERSONS, POLICIES,
  PRODUCTS, RANDOMS, RANKS, RIVAL_CURVES, SERVER_TIERS, TECHS, TOTAL_TURNS, TRACKS, eraOf, turnLabel,
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

export function valuation(s: GameState): number {
  let v = s.users * 2 + s.fame * 2.5 + s.techPts * 2;
  v += s.researched.length * 6;
  for (const p of s.products) {
    const d = productDef(p.def);
    v += p.launched ? d.devCost + d.base * 10 + ((p.level || 1) - 1) * 10 : d.devCost * 0.4;
  }
  v += s.servers * 20; // 机房资产
  v += eraOf(s.turn).id * 30;
  const pays = Object.keys(s.flags).filter((f) => f.startsWith('payoff_')).length;
  const invs = Object.keys(s.flags).filter((f) => f.startsWith('inv_')).length;
  v += pays * 40 + Math.max(0, invs - pays) * 15;
  if (has(s, 'p_cap')) v *= 1.25;
  if (adv(s, 'xiong')) v *= 1.1;
  if (adv(s, 'wang')) v *= 1.15;
  return Math.round(v);
}

function productIncome(s: GameState, p: { def: string; level: number }): number {
  const d = productDef(p.def);
  const diff = diffOf(s);
  const mult = eraOf(s.turn).mult;
  let inc = (d.base + s.users * d.ucoef) * mult * diff.revMult * levelMult(p);
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

function upkeepSum(s: GameState) {
  return s.products.filter((p) => p.launched).reduce((a, p) => a + productDef(p.def).upkeep, 0);
}

function salaryCost(s: GameState) {
  let c = s.team * 0.55 * (1 + s.turn * 0.004) * diffOf(s).salaryMult;
  if (has(s, 'p_frugal')) c *= 0.7;
  if (adv(s, 'dinglei')) c *= 0.85;
  return c;
}

export function quarterReport(s: GameState) {
  const launched = s.products.filter((p) => p.launched);
  const rows = launched.map((p) => ({ name: productDef(p.def).name, level: p.level, val: productIncome(s, p) }));
  const revenue = rows.reduce((a, r) => a + r.val, 0);
  const upkeep = upkeepSum(s);
  const salary = salaryCost(s);
  return { revenue, upkeep, salary, net: revenue - upkeep - salary, rows, overloaded: isOverloaded(s), capacity: capacityOf(s) };
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
    loanTurns: 0, servers: 0, deferred: [],
    policies: [], researched: ['t_bbs'], cur: null, prog: {}, techPts: diff.techPts, equity: 100,
    products: [], rel: {}, met: [], advisors: [], flags: {}, log: [], queue: [],
    toasts: [], history: [], eraBanner: null, outcome: null, seq: 100,
  };
  const [tid, amt] = tr.techBoost;
  s.prog = { [tid]: amt };
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

  /* 随机事件（事件密集的季度降低概率） */
  if (Math.random() < (queue.length === payouts.length ? 0.42 : 0.15)) {
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
      return {
        ...st,
        difficulty: st.difficulty ?? 'normal',
        perk: st.perk ?? null,
        loanTurns: st.loanTurns ?? 0,
        servers: st.servers ?? 0,
        deferred: st.deferred ?? [],
        techPts: st.techPts ?? 0,
        cur: st.cur ?? null,
        products: (st.products ?? []).map((p) => ({ ...p, level: (p as { level?: number }).level ?? 1 })),
        queue: (st.queue ?? []).filter((qid) => !!findEvent(qid)),
        toasts: [], eraBanner: null,
      };
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
      const fx = { ...choice.fx, funds: gainF > 0 ? 0 : gainF }; // 正向入账单独加，避免与 cost 重复结算
      n = applyFx(n, fx);
      if (gainF > 0) n = { ...n, funds: +(n.funds + gainF).toFixed(1) };
      if (ev.person) n = grantMet(n, ev.person);
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
      let n: GameState = { ...s, ap: s.ap - 1, funds: +(s.funds - d.devCost).toFixed(1), products: [...s.products, { uid: s.seq + 7, def: a.def, progress: 0, launched: false, level: 1 }] };
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
