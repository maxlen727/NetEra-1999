import { useEffect, useMemo, useState } from 'react';
import { DIFFICULTIES, OPS_ACTIONS, PRICE_MODES, RIVAL_CURVES, SERVER_TIERS } from '../game/data';
import { isMuted, setMuted, sfx } from '../game/sfx';
import {
  ERAS, PERSONS, POLICIES, PRODUCTS, TECHS, TOTAL_TURNS, eraOf, findEvent, fmtVal, fmtW,
  organicGrowth, personDef, productDef, quarterReport, raiseOffer, acceptRaise, researchSpeed, techDef, turnLabel, valuation,
  choiceCost, productUpgradeCost, serverUpgradeCost, rivalVal, nextResearchable, productIncome, priceMode, opsDef,
} from '../game/engine';
import type { Action, GameState } from '../game/types';
import { Btn, Icons, Spark, Win } from './ui';

type DP = (a: Action) => void;

const KIND_STYLE: Record<string, string> = {
  history: 'border-l-[#ff6a00] bg-[#fdf1e4]',
  company: 'border-l-[#1c63c9] bg-white',
  person: 'border-l-[#7a4fd0] bg-[#f6f1fd]',
  warn: 'border-l-[#c8322b] bg-[#fdecea]',
  gain: 'border-l-[#1f7a48] bg-[#eaf6ee]',
};

/* ============ 顶部资源栏 ============ */
export function ResourceBar({ s, d }: { s: GameState; d: DP }) {
  const era = eraOf(s.turn);
  const rep = quarterReport(s);
  const chip = 'flex items-center gap-1.5 bevel-in bg-white px-2 py-1';
  return (
    <div className="bevel-out px-2 py-1.5 flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 pr-3 border-r border-[#8a867a]">
        <span className="text-[var(--portal)]">{Icons.globe(20)}</span>
        <div className="leading-none">
          <div className="font-disp text-lg leading-none">网事<span className="font-term text-base">1999</span></div>
          <div className="text-[10px] text-[#5a5750] tracking-widest">中国互联网编年史</div>
        </div>
      </div>
      <div className={chip} title="当前时代">
        <span className="text-[var(--navy-1)]">{Icons.flag(13)}</span>
        <div className="leading-tight">
          <div className="font-bold text-xs text-[var(--navy-1)]">{era.name}</div>
          <div className="font-term text-sm leading-none">{turnLabel(s.turn)} · 第{s.turn + 1}/{TOTAL_TURNS}回合</div>
        </div>
      </div>
      <div className={chip} title="资金（万元）· 每季净收支">
        <span className="text-[var(--money)]">{Icons.coin(14)}</span>
        <div className="leading-tight">
          <span className="font-term text-xl leading-none" style={{ color: s.funds < 0 ? 'var(--alert)' : 'var(--ink)' }}>¥{fmtW(s.funds)}</span>
          <span className={`block text-[10px] leading-none font-bold ${rep.net >= 0 ? 'text-[var(--money)]' : 'text-[var(--alert)]'}`}>{rep.net >= 0 ? '+' : ''}{rep.net.toFixed(1)}/季</span>
        </div>
      </div>
      <div className={chip} title="用户（万人）· 每季自然增长">
        <span className="text-[var(--oicq)]">{Icons.users(14)}</span>
        <div className="leading-tight">
          <span className="font-term text-xl leading-none">{fmtW(s.users, '万人')}</span>
          <span className="block text-[10px] leading-none text-[#5a5750]">+{organicGrowth(s).toFixed(1)}/季</span>
        </div>
      </div>
      <div className={chip} title="声望（0-100）">
        <span className="text-[#e8a400]">{Icons.star(14)}</span>
        <span className="font-term text-xl leading-none">{Math.round(s.fame)}</span>
      </div>
      <div className={chip} title={s.cur ? '当前主攻研发方向（点科技树可更换）' : '下一个可研发课题（点科技树设为主攻）'}>
        <span className="text-[var(--navy-1)]">{Icons.flask(14)}</span>
        <div className="leading-tight">
          {(() => {
            const curId = s.cur;
            const cur = curId ? techDef(curId) : null;
            const sug = nextResearchable(s);
            if (cur && curId) {
              const prog = Math.min(Math.round(s.prog[curId] || 0), cur.cost);
              return (
                <>
                  <span className="text-xs font-bold">{cur.name}</span>
                  <span className="block font-term text-sm leading-none">{prog}/{cur.cost}</span>
                </>
              );
            }
            return sug ? (
              <>
                <span className="text-xs font-bold text-[#b34a00]">待立项 · {sug.name}</span>
                <span className="block text-[10px] leading-none text-[#8a5a20]">点科技树设主攻</span>
              </>
            ) : (
              <span className="text-xs font-bold text-[var(--money)]">科技全满 ✓</span>
            );
          })()}
        </div>
      </div>
      <div className={chip} title="估值（万元）">
        <span className="text-[var(--portal)]">{Icons.bag(14)}</span>
        <div className="leading-tight">
          <span className="font-term text-xl leading-none">{fmtVal(valuation(s))}</span>
          <span className="block text-[10px] leading-none text-[#5a5750]">估值 · 持股{s.equity}%</span>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1" title="行动点（每季度重置）">
          <span className="text-[var(--portal)]">{Icons.bolt(14)}</span>
          {Array.from({ length: s.apMax }).map((_, i) => (
            <i key={i} className={`block w-4 h-4 border ${i < s.ap ? 'bg-[var(--portal)] border-[#8a3a00] shadow-[inset_1px_1px_0_rgba(255,255,255,0.5)]' : 'bg-[#efece2] border-[#8a867a]'}`} />
          ))}
        </div>
        <MuteBtn />
        <Btn small onClick={() => d({ type: 'RESTART' })} title="回到创业选择界面（当前进度不会自动保存）">重开</Btn>
      </div>
    </div>
  );
}

/* 静音开关（偏好写入 localStorage） */
function MuteBtn() {
  const [m, setM] = useState(isMuted());
  return (
    <button
      className="btn98 px-1.5 py-1 grid place-items-center"
      title={m ? '音效已关闭 · 点击打开' : '音效已开启 · 点击静音'}
      onClick={() => {
        const next = !m;
        setMuted(next);
        setM(next);
        if (!next) sfx.ding();
      }}
    >
      <span className={m ? 'text-[#8a867a]' : 'text-[var(--navy-1)]'}>{m ? Icons.mute(15) : Icons.sound(15)}</span>
    </button>
  );
}

/* ============ 时代编年史 ============ */
export function Chronicle({ s }: { s: GameState }) {
  return (
    <Win title="时代编年史 · Chronicle" icon={Icons.scroll()} className="h-full">
      <div className="scroll-98 overflow-y-auto p-2 space-y-1.5 flex-1 min-h-0 bg-[#efece2]">
        {s.log.map((e) => (
          <div key={e.id} className={`log-in border-l-4 px-2 py-1 text-[12.5px] leading-snug ${KIND_STYLE[e.kind]}`}>
            <span className="font-term text-[#8a5a20] mr-1.5">[{turnLabel(e.turn)}]</span>
            {e.text}
          </div>
        ))}
        <div className="text-center text-[11px] text-[#8a867a] py-2 font-term">—— 1999.01 · 你的故事从这里开始 ——</div>
      </div>
    </Win>
  );
}

/* ============ 公司面板 ============ */
export function CompanyPanel({ s, d }: { s: GameState; d: DP }) {
  const rep = quarterReport(s);
  return (
    <Win title={`我的公司 · ${s.name}`} icon={Icons.globe()} className="h-full">
      <div className="scroll-98 overflow-y-auto p-2.5 space-y-2.5 text-xs flex-1 min-h-0">
        <div className="bevel-in bg-white p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-[var(--navy-1)]">估值走势（万元）</span>
            <span className="font-term text-base text-[var(--portal)]">{fmtVal(valuation(s))}</span>
          </div>
          <Spark data={s.history} w={230} h={40} />
          <div className="mt-1.5 text-[11px] space-y-0.5">
            {rep.rows.length === 0 && <div className="text-[#8a867a]">尚无产品收入 —— 先立项一款产品吧</div>}
            {rep.rows.map((r) => (
              <div key={r.name} className="flex justify-between">
                <span>{r.name}{r.level > 1 && <b className="text-[#b34a00]"> Lv.{r.level}</b>}</span>
                <b className="text-[var(--money)]">+{r.val.toFixed(1)}</b>
              </div>
            ))}
            <div className="flex justify-between border-t border-[#d8d4c6] pt-0.5 mt-0.5"><span>人力成本（{s.team} 人）</span><b className="text-[var(--alert)]">−{rep.salary.toFixed(1)}</b></div>
            <div className="flex justify-between"><span>服务器 / 带宽运维</span><b className="text-[var(--alert)]">−{rep.upkeep.toFixed(1)}</b></div>
            <div className="flex justify-between border-t border-[#d8d4c6] pt-0.5 mt-0.5 font-bold"><span>净现金流</span><b style={{ color: rep.net >= 0 ? 'var(--money)' : 'var(--alert)' }}>{rep.net >= 0 ? '+' : ''}{rep.net.toFixed(1)} 万</b></div>
            <div className="flex justify-between"><span>创始人持股</span><b>{s.equity}%</b></div>
          </div>
        </div>

        <div className="bevel-in bg-white p-2">
          <div className="flex justify-between items-baseline mb-1">
            <span className="font-bold text-[var(--navy-1)] text-[11px]">机房 · {SERVER_TIERS[s.servers].name}</span>
            <span className={`font-term text-sm ${rep.overloaded ? 'text-[var(--alert)]' : 'text-[#5a5750]'}`}>{fmtW(s.users)} / {rep.capacity}万</span>
          </div>
          <div className="progress98">
            <i style={{ width: `${Math.min(100, (s.users / rep.capacity) * 100)}%`, background: rep.overloaded ? 'repeating-linear-gradient(90deg,#c8322b 0 8px,#e0705e 8px 16px)' : undefined }} />
          </div>
          {rep.overloaded && <div className="text-[10px] text-[var(--alert)] font-bold mt-1">服务器过载！收入 −25%、增长减半，快去「行动」升级机房</div>}
          {s.loanTurns > 0 && <div className="text-[10px] text-[#b34a00] mt-1">过桥贷款还款中：每季 −7 万，剩余 {s.loanTurns} 期</div>}
        </div>

        <div>
          <div className="font-bold text-[var(--navy-1)] mb-1 flex items-center gap-1">{Icons.hammer(12)} 产品线</div>
          {s.products.length === 0 && <div className="bevel-in bg-white p-2 text-[#8a867a]">还没有产品。去「行动中心」立项开发吧！</div>}
          <div className="space-y-1.5">
            {s.products.map((p) => {
              const def = productDef(p.def);
              const effW = s.policies.includes('p_fast') ? def.work * 0.7 : def.work;
              return (
                <div key={p.uid} className="bevel-in bg-white p-1.5">
                  <div className="flex justify-between items-baseline">
                    <b>{def.name}</b>
                    {p.launched
                      ? <span className="font-term text-[var(--money)]">+{(rep.rows.find((r) => r.name === def.name)?.val ?? 0).toFixed(1)}/季{p.level > 1 && <b className="text-[#b34a00] text-[10px]"> Lv.{p.level}</b>}</span>
                      : <span className="text-[10px] text-[#8a5a20]">开发中 {Math.floor(p.progress * 10) / 10}/{Math.round(effW * 10) / 10}</span>}
                  </div>
                  {!p.launched && <div className="progress98 mt-1"><i style={{ width: `${Math.min(100, (p.progress / effW) * 100)}%` }} /></div>}
                  {p.launched && (() => {
                    const heat = p.heat || 0;
                    const isHit = heat >= 80;
                    const busy = s.ap <= 0 || s.queue.length > 0;
                    return (
                      <div className="mt-1.5 space-y-1.5">
                        {/* 运营热度 */}
                        <div>
                          <div className="flex justify-between items-baseline text-[10px] mb-0.5">
                            <span className={`font-bold flex items-center gap-1 ${isHit ? 'text-[var(--alert)]' : 'text-[#5a5750]'}`}>
                              <span className={isHit ? 'animate-pulse' : ''}>🔥</span> 热度 {heat}
                              {isHit && <b className="text-[var(--portal)]">爆款!</b>}
                            </span>
                            <span className="text-[#8a867a]">{priceMode(p).name}定价 · 收入×{priceMode(p).incomeMult} 拉新×{priceMode(p).pullMult}</span>
                          </div>
                          <div className="progress98 !h-2.5">
                            <i style={{ width: `${heat}%`, background: isHit ? 'repeating-linear-gradient(90deg,#ff6a00 0 8px,#ffb347 8px 16px)' : heat >= 40 ? 'repeating-linear-gradient(90deg,#e8a400 0 8px,#f5c76a 8px 16px)' : undefined }} />
                          </div>
                        </div>
                        {/* 定价策略 */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[#8a867a] shrink-0">定价</span>
                          {PRICE_MODES.map((m) => (
                            <button key={m.id} title={m.desc} onClick={() => d({ type: 'SET_PRICE', uid: p.uid, price: m.id })}
                              className={`flex-1 text-[10px] font-bold py-0.5 border transition-all ${p.price === m.id ? 'bg-[var(--navy-1)] text-white border-[var(--navy-1)]' : 'btn98'}`}>
                              {m.name}
                            </button>
                          ))}
                        </div>
                        {/* 运营动作 */}
                        <div className="flex items-center gap-1">
                          {OPS_ACTIONS.map((op) => (
                            <button key={op.kind} title={`${op.desc}（耗 1 行动点）`}
                              disabled={busy || s.funds < op.cost}
                              onClick={() => d({ type: 'OPS', uid: p.uid, kind: op.kind })}
                              className="btn98 flex-1 text-[10px] font-bold py-0.5 disabled:opacity-40">
                              {op.name} ·{op.cost}万
                            </button>
                          ))}
                          {p.level < 3 ? (
                            <button title="版本迭代，季度收入 +30%（耗 1 行动点）"
                              disabled={busy || s.funds < productUpgradeCost(p.level)}
                              onClick={() => d({ type: 'UPGRADE_PRODUCT', uid: p.uid })}
                              className="btn98 flex-1 text-[10px] font-bold py-0.5 disabled:opacity-40">
                              迭代 ·{productUpgradeCost(p.level)}万
                            </button>
                          ) : (
                            <span className="flex-1 text-center text-[10px] font-bold text-[#b34a00] py-0.5">满级</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="font-bold text-[var(--navy-1)] mb-1 flex items-center gap-1">{Icons.person(12)} 战略顾问（{s.advisors.length}/2）</div>
          {s.advisors.length === 0
            ? <div className="bevel-in bg-white p-2 text-[#8a867a]">暂无顾问。与时代人物把关系刷到 3 点以上即可聘请。</div>
            : <div className="space-y-1">{s.advisors.map((id) => {
              const p = personDef(id);
              return (
                <div key={id} className="bevel-in bg-white p-1.5 flex items-center gap-2">
                  <span className="font-disp w-7 h-7 grid place-items-center text-white text-base shrink-0" style={{ background: p.color }}>{p.name[0]}</span>
                  <div className="leading-tight"><b>{p.name}</b><div className="text-[10px] text-[#5a5750]">{p.buffName}：{p.buffDesc}</div></div>
                </div>
              );
            })}</div>}
        </div>
      </div>
    </Win>
  );
}

/* ============ 科技树 ============ */
export function TechPanel({ s, d }: { s: GameState; d: DP }) {
  return (
    <Win title="研发实验室 · Tech" icon={Icons.flask()} className="h-full" tone="orange">
      <div className="scroll-98 overflow-y-auto p-2 space-y-2 flex-1 min-h-0 text-xs">
        <div className="bevel-in bg-white px-2 py-1.5 flex items-center justify-between">
          <span className="font-bold text-[var(--navy-1)]">已研发 <b className="font-term text-base text-[var(--portal)]">{s.researched.length}</b>/{TECHS.length} 项技术</span>
          <span className="text-[10px] text-[#8a867a]">{s.cur ? `主攻：${techDef(s.cur).name}` : '点下方技术设主攻'}</span>
        </div>
        {ERAS.map((era) => (
          <div key={era.id}>
            <div className="font-disp text-[13px] text-[var(--navy-1)] border-b border-[#c9c5b8] mb-1 flex justify-between">
              <span>{era.name}</span><span className="font-term text-[#8a867a]">×{era.mult}</span>
            </div>
            <div className="space-y-1">
              {TECHS.filter((t) => t.era === era.id).map((t) => {
                const done = s.researched.includes(t.id);
                const isCur = s.cur === t.id;
                const reqOk = (!t.req || t.req.every((r) => s.researched.includes(r))) && (!t.reqAny || t.reqAny.some((r) => s.researched.includes(r)));
                const prog = Math.min(s.prog[t.id] || 0, t.cost);
                return (
                  <button
                    key={t.id}
                    disabled={done || !reqOk}
                    onClick={() => d({ type: 'SET_RESEARCH', id: t.id })}
                    title={done ? '已完成' : reqOk ? `${t.desc}（点击设为主攻方向）` : `需要前置：${[...(t.req || []), ...(t.reqAny ? [`任一：${t.reqAny.map((r) => techDef(r).name)}`] : [])].map((r) => (t.reqAny ? r : techDef(r).name)).join('、')}`}
                    className={`w-full text-left bevel-in p-1.5 transition-transform hover:-translate-y-px ${done ? 'bg-[#eaf6ee] border-[var(--money)]' : isCur ? 'bg-[#e8f1fd] border-[var(--navy-1)] shadow-[2px_2px_0_rgba(20,60,120,0.25)]' : reqOk ? 'bg-white cursor-pointer' : 'bg-[#e5e2d6] opacity-55'}`}
                  >
                    <div className="flex justify-between items-baseline">
                      <b className={done ? 'text-[var(--money)]' : isCur ? 'text-[var(--navy-1)]' : ''}>
                        {done ? '✓ ' : isCur ? '▸ ' : ''}{t.name}
                        {isCur && !done && <span className="text-[9px] font-normal text-[var(--navy-1)] ml-1">主攻中</span>}
                      </b>
                      <span className={`font-term ${done ? 'text-[var(--money)]' : 'text-[#5a5750]'}`}>{done ? 'DONE' : `${Math.round(prog)}/${t.cost}`}</span>
                    </div>
                    {isCur && !done && <div className="progress98 mt-1"><i style={{ width: `${(prog / t.cost) * 100}%` }} /></div>}
                    <div className="text-[10px] text-[#5a5750] leading-tight mt-0.5">
                      {t.desc}
                      {t.unlocks && (
                        <span className={done ? 'text-[var(--money)] font-bold' : 'text-[var(--portal)]'}>
                          {done ? ' · 已解锁' : ' → 解锁'}「{productDef(t.unlocks).name}」
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="bevel-in bg-[#fdf1e4] p-1.5 text-[10.5px] leading-snug">
          研发速度：每季自动 +{researchSpeed(s).toFixed(1)}；「研发推进」行动一次 +{(3 * researchSpeed(s)).toFixed(1)}。
        </div>
      </div>
    </Win>
  );
}

/* ============ 风云人物 ============ */
export function PersonsPanel({ s, d }: { s: GameState; d: DP }) {
  return (
    <Win title="风云人物 · Great People" icon={Icons.person()} className="h-full">
      <div className="scroll-98 overflow-y-auto p-2 grid grid-cols-1 gap-1.5 flex-1 min-h-0 text-xs">
        {PERSONS.map((p) => {
          const met = s.met.includes(p.id);
          const rel = s.rel[p.id] || 0;
          const isAdv = s.advisors.includes(p.id);
          const canHire = met && !isAdv && rel >= 3 && s.advisors.length < 2 && s.funds >= p.hireCost;
          return (
            <div key={p.id} className={`bevel-in p-1.5 flex items-center gap-2 ${met ? 'bg-white' : 'bg-[#e5e2d6]'}`}>
              <span className="font-disp w-9 h-9 grid place-items-center text-white text-lg shrink-0 shadow-[2px_2px_0_rgba(0,0,0,0.2)]" style={{ background: met ? p.color : '#8a867a' }}>
                {met ? p.name[0] : '？'}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex items-baseline gap-1">
                  <b>{met ? p.name : '神秘人物'}</b>
                  {isAdv && <span className="text-[9px] bg-[var(--navy-1)] text-white px-1">顾问</span>}
                </div>
                <div className="text-[10px] text-[#5a5750] truncate">{met ? `${p.title} · ${p.co}` : '尚未结识'}</div>
                {met && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[var(--alert)]">{Icons.heart(11)}</span>
                    {[1, 2, 3, 4, 5].map((i) => <i key={i} className={`w-2 h-2 ${i <= Math.min(rel, 5) ? 'bg-[var(--portal)]' : 'bg-[#d8d4c6] border border-[#b8b4a6]'}`} />)}
                    <button
                      disabled={!canHire}
                      onClick={() => d({ type: 'HIRE_ADVISOR', person: p.id })}
                      title={met ? (rel >= 3 ? `聘请为战略顾问（${p.hireCost} 万/年）：${p.buffDesc}` : '好感达到 3 点后可聘请') : ''}
                      className="ml-auto text-[10px] font-bold px-1.5 py-0.5 btn98 disabled:opacity-40"
                    >
                      聘为顾问 ¥{p.hireCost}万
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Win>
  );
}

/* ============ 政策卡 ============ */
export function PolicyPanel({ s, d }: { s: GameState; d: DP }) {
  return (
    <Win title="公司战略 · Policies（双槽位）" icon={Icons.doc()} className="h-full" tone="gray">
      <div className="scroll-98 overflow-y-auto p-2 grid grid-cols-2 gap-1.5 flex-1 min-h-0 text-xs">
        {POLICIES.map((p) => {
          const on = s.policies.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => d({ type: 'TOGGLE_POLICY', id: p.id })}
              className={`text-left p-1.5 border-2 transition-all hover:-translate-y-px ${on ? 'border-[var(--portal)] bg-[#fdf1e4] shadow-[2px_2px_0_rgba(180,70,0,0.35)]' : 'border-[#b8b4a6] bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <b className={on ? 'text-[#b34a00]' : ''}>{p.name}</b>
                <span className="text-[9px] px-1 bg-[var(--navy-1)] text-white">{p.tag}</span>
              </div>
              <div className="text-[10px] text-[#5a5750] leading-tight mt-0.5">{p.desc}</div>
            </button>
          );
        })}
      </div>
    </Win>
  );
}

/* ============ 行动中心 ============ */
export function ActionsPanel({ s, d }: { s: GameState; d: DP }) {
  const [mode, setMode] = useState<'none' | 'build' | 'raise' | 'coffee'>('none');
  const busy = s.queue.length > 0 || s.phase !== 'play';
  const noAp = s.ap <= 0;
  const buildable = PRODUCTS.filter((p) => s.researched.includes(p.tech) && !s.products.some((x) => x.def === p.id));
  const inDev = s.products.filter((p) => !p.launched).length;
  const offer = useMemo(() => (mode === 'raise' ? raiseOffer(s) : null), [mode, s]);

  const ABtn = ({ children, onClick, disabled, title }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title: string }) => (
    <button onClick={onClick} disabled={disabled} title={title}
      className="btn98 p-2 text-left flex flex-col gap-0.5 disabled:opacity-40 hover:brightness-105 transition-all hover:-translate-y-px">
      <span className="text-[12.5px] font-bold">{children}</span>
    </button>
  );

  return (
    <Win title="行动中心 · Actions" icon={Icons.bolt()} className="h-full" tone="orange">
      <div className="p-2 flex-1 min-h-0 flex flex-col gap-2">
        {mode === 'none' && (
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <ABtn title={s.loanTurns > 0 ? `还款中，剩余 ${s.loanTurns} 期` : '资金低于 30 万可借 30 万过桥贷款续命，此后 6 个季度每季自动还 7 万'} disabled={busy || noAp || s.funds >= 30 || s.loanTurns > 0} onClick={() => d({ type: 'TAKE_LOAN' })}>
              {Icons.coin(15)} <span className={s.funds < 0 ? 'text-[var(--alert)]' : ''}>紧急融资</span> <i className="not-italic text-[10px] text-[#5a5750]">{s.loanTurns > 0 ? `还款中 · 剩${s.loanTurns}期` : '1 点 · 借 30 万'}</i>
            </ABtn>
            <ABtn title={s.cur ? '加速当前研发 +3 点进度' : '先在「研发实验室」点击一项技术设为主攻方向'} disabled={busy || noAp || !s.cur} onClick={() => d({ type: 'ACT', kind: 'research' })}>
              {Icons.flask(15)} 研发推进 <i className="not-italic text-[10px] text-[#5a5750]">1 行动点</i>
            </ABtn>
            <ABtn title="投入 12 万做市场推广" disabled={busy || noAp || s.funds < 12} onClick={() => d({ type: 'ACT', kind: 'marketing' })}>
              {Icons.star(15)} 市场推广 <i className="not-italic text-[10px] text-[#5a5750]">1 点 + ¥12万</i>
            </ABtn>
            <ABtn title="招聘一名员工（提升研发与开发速度，增加行动点上限）" disabled={busy || noAp || s.funds < 8 || s.team >= 30} onClick={() => d({ type: 'ACT', kind: 'hire' })}>
              {Icons.users(15)} 招兵买马 <i className="not-italic text-[10px] text-[#5a5750]">1 点 + ¥8万</i>
            </ABtn>
            <ABtn title={`当前机房：${SERVER_TIERS[s.servers].name}（容量 ${SERVER_TIERS[s.servers].cap} 万用户）。用户超容量时收入 −25%、增长减半`} disabled={busy || noAp || !serverUpgradeCost(s) || s.funds < serverUpgradeCost(s)} onClick={() => d({ type: 'UPGRADE_SERVERS' })}>
              {Icons.chip(15)} 机房扩容 <i className="not-italic text-[10px] text-[#5a5750]">{serverUpgradeCost(s) ? `1 点 + ¥${serverUpgradeCost(s)}万` : '已是顶配'}</i>
            </ABtn>
            <ABtn title="用已掌握的技术立项新产品（同时在研最多 2 个）" disabled={busy || noAp || buildable.length === 0 || inDev >= 2 || s.funds < Math.min(...buildable.map((b) => b.devCost), 999)} onClick={() => setMode('build')}>
              {Icons.hammer(15)} 立项开发 <i className="not-italic text-[10px] text-[#5a5750]">1 点 + 开发费</i>
            </ABtn>
            <ABtn title="向 VC  pitching，稀释股权换取资金" disabled={busy || noAp} onClick={() => setMode('raise')}>
              {Icons.bag(15)} 融资路演 <i className="not-italic text-[10px] text-[#5a5750]">1 行动点</i>
            </ABtn>
            <ABtn title="请已结识的大佬喝咖啡，好感 +1（满 3 点可聘为顾问）" disabled={busy || noAp || s.met.length === 0 || s.funds < 1} onClick={() => setMode('coffee')}>
              {Icons.coffee(15)} 大佬咖啡 <i className="not-italic text-[10px] text-[#5a5750]">1 点 + ¥1万</i>
            </ABtn>
          </div>
        )}

        {mode === 'build' && (
          <div className="text-xs space-y-1.5">
            <div className="font-bold text-[#b34a00]">选择立项产品（在研 {inDev}/2）</div>
            <div className="scroll-98 overflow-y-auto max-h-40 space-y-1">
              {buildable.map((p) => (
                <button key={p.id} disabled={s.funds < p.devCost} onClick={() => { d({ type: 'BUILD', def: p.id }); setMode('none'); }}
                  className="w-full text-left bevel-in bg-white p-1.5 disabled:opacity-45 hover:bg-[#fdf1e4]">
                  <div className="flex justify-between"><b>{p.name}</b><span className="font-term text-[var(--portal)]">¥{p.devCost}万</span></div>
                  <div className="text-[10px] text-[#5a5750]">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'raise' && offer && (
          <div className="text-xs space-y-2">
            <div className="font-bold text-[#b34a00]">投资意向书 Term Sheet</div>
            <div className="bevel-in bg-white p-2 space-y-1">
              <div><b>{offer.investor}</b> 有意领投本轮</div>
              <div className="font-term text-lg">出资 ¥{offer.amount}万 · 占股 {offer.share}%</div>
              <div className="text-[10px] text-[#5a5750]">投后创始人持股 {s.equity - offer.share}%（低于 34% 将被董事会否决）</div>
            </div>
            <div className="flex gap-2">
              <Btn primary onClick={() => { d({ type: 'LOAD_GAME', state: acceptRaise(s) }); setMode('none'); }}>签字拿钱</Btn>
              <Btn onClick={() => setMode('none')}>再想想</Btn>
              <span className="text-[10px] text-[#5a5750] self-center">（本轮行动点已消耗）</span>
            </div>
          </div>
        )}

        {mode === 'coffee' && (
          <div className="text-xs space-y-1.5">
            <div className="font-bold text-[#b34a00]">请谁喝咖啡？（好感 +1）</div>
            <div className="scroll-98 overflow-y-auto max-h-40 space-y-1">
              {s.met.map((id) => {
                const p = personDef(id);
                return (
                  <button key={id} onClick={() => { d({ type: 'ACT', kind: 'coffee', person: id }); setMode('none'); }}
                    className="w-full text-left bevel-in bg-white p-1.5 hover:bg-[#fdf1e4] flex items-center gap-2">
                    <span className="font-disp w-7 h-7 grid place-items-center text-white" style={{ background: p.color }}>{p.name[0]}</span>
                    <span><b>{p.name}</b> <span className="text-[10px] text-[#5a5750]">好感 {s.rel[id] || 0}</span></span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode !== 'none' && <Btn small onClick={() => setMode('none')} className="self-start">← 返回</Btn>}

        <div className="mt-auto bevel-in bg-white p-1.5 text-[10.5px] text-[#5a5750] leading-snug">
          提示：行动点每季度重置，团队 12/24 人时上限 +1/+2。剩余行动点不累计，该花就花！
        </div>
      </div>
    </Win>
  );
}

/* ============ 事件对话框 ============ */
export function EventDialog({ s, d }: { s: GameState; d: DP }) {
  const ev = s.queue.length ? findEvent(s.queue[0]) : undefined;
  /* 自愈：队列头部是无法识别的事件 id 时自动跳过，绝不假死 */
  useEffect(() => {
    if (s.queue.length && !findEvent(s.queue[0])) d({ type: 'SKIP_EVENT' });
  }, [s.queue, d]);
  if (!ev) return null;
  const person = ev.person ? personDef(ev.person) : null;
  const tone = ev.kind === 'payout' ? 'orange' : ev.kind === 'person' ? 'navy' : 'gray';
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(6,30,32,0.55)' }}>
      <div className="dialog-pop bevel-out w-full max-w-xl">
        <Win title={`${ev.kind === 'payout' ? '投资回报' : ev.kind === 'person' ? '时代人物' : '时代事件'} · ${turnLabel(s.turn)}`} tone={tone as 'navy' | 'gray' | 'orange'} icon={ev.kind === 'person' ? Icons.person() : Icons.scroll()}>
          <div className="p-3.5 space-y-3 text-sm max-h-[70vh] overflow-y-auto scroll-98">
            <h3 className="font-disp text-2xl leading-tight text-[var(--navy-1)]">{ev.title}</h3>
            {person && (
              <div className="flex items-center gap-2.5 bevel-in bg-white p-2">
                <span className="font-disp w-12 h-12 grid place-items-center text-white text-2xl shrink-0 shadow-[3px_3px_0_rgba(0,0,0,0.25)]" style={{ background: person.color }}>{person.name[0]}</span>
                <div>
                  <div className="font-bold text-base">{person.name} <span className="text-[11px] font-normal text-[#5a5750]">{person.title}</span></div>
                  <div className="text-xs text-[#5a5750] italic">「{person.quote}」</div>
                </div>
              </div>
            )}
            <p className="leading-relaxed">{ev.body}</p>
            {ev.footnote && (
              <div className="text-[11px] text-[#8a5a20] bg-[#fdf1e4] border-l-4 border-[var(--portal)] px-2 py-1.5 leading-snug">
                <b>史料</b> · {ev.footnote}
              </div>
            )}
            <div className="space-y-1.5 pt-1">
              {ev.choices.map((c, i) => {
                const pay = choiceCost(c);
                const cant = pay > 0 && pay > s.funds;
                return (
                  <button key={i} disabled={cant} onClick={() => d({ type: 'RESOLVE_EVENT', idx: i })}
                    className="btn98 w-full text-left px-3 py-2 text-sm disabled:opacity-40 hover:brightness-105 transition-all hover:-translate-y-px">
                    <span className="font-bold">{c.label}</span>
                    {pay > 0 && <span className="ml-2 font-term text-[var(--portal)]">−{pay}万</span>}
                    {c.hint && <span className="ml-2 text-[11px] text-[#5a5750]">{c.hint}</span>}
                    {cant && <span className="ml-2 text-[11px] font-bold text-[var(--alert)]">（资金不足）</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </Win>
      </div>
    </div>
  );
}

/* ============ 底部任务栏 ============ */
export function Taskbar({ s, d, onHelp }: { s: GameState; d: DP; onHelp: () => void }) {
  const waiting = s.queue.length > 0;
  const stuck = waiting && !findEvent(s.queue[0]);
  return (
    <div className="bevel-out px-2 py-1.5 flex items-center gap-2">
      <Btn onClick={onHelp} className="font-disp text-sm flex items-center gap-1.5">
        <span className="text-[var(--portal)]">{Icons.globe(16)}</span> 开始
      </Btn>
      {stuck && (
        <Btn onClick={() => d({ type: 'SKIP_EVENT' })} className="font-bold text-[var(--alert)] flex items-center gap-1" title="队列里有无法读取的事件，点击手动跳过">
          {Icons.warn(13)} 跳过异常事件
        </Btn>
      )}
      <div className="bevel-in bg-white px-2 py-1 text-[11px] hidden md:block text-[#5a5750]">
        {stuck ? '检测到异常事件记录，已提供跳过按钮（通常会自动修复）' : waiting ? '有时代事件待处理…' : s.ap > 0 ? `剩余 ${s.ap} 点行动点，花完再结束回合更划算` : '行动点用完了，进入下一季度吧'}
      </div>
      <div className="flex-1 min-w-0 hidden sm:flex items-center gap-2 bg-[#101418] px-2 py-1 overflow-hidden" title="对手估值行情（百万元）">
        <span className="font-disp text-[11px] shrink-0 text-[#e8c15a]">对手观察</span>
        <div className="relative flex-1 overflow-hidden">
          <div className="marquee-track flex w-max whitespace-nowrap font-term text-sm text-[#9fb4a8]">
            {[0, 1].map((k) => (
              <span key={k} className="flex gap-6 pr-6">
                {RIVAL_CURVES.map((rv) => {
                  const v = rivalVal(rv, s.turn);
                  const up = v >= rivalVal(rv, Math.max(0, s.turn - 1));
                  return (
                    <span key={rv.name} className="flex items-center gap-1.5">
                      <i className="w-2 h-2 inline-block" style={{ background: rv.color }} />
                      {rv.name} {fmtVal(v)}
                      <span style={{ color: up ? '#5ec98a' : '#e0705e' }}>{up ? '▲' : '▼'}</span>
                    </span>
                  );
                })}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <div className="bevel-in bg-white px-2 py-1 flex items-center gap-1.5 text-[11px]">
          <span className="text-[var(--navy-1)]">{Icons.clock(12)}</span>
          <span className="font-term text-sm">{turnLabel(s.turn)}</span>
        </div>
        <button
          onClick={() => d({ type: 'END_TURN' })}
          disabled={waiting || s.phase !== 'play'}
          className={`btn98 btn-primary font-disp text-lg px-5 py-1.5 tracking-wider ${!waiting && s.phase === 'play' ? 'pulse-glow' : ''}`}
        >
          下一回合 ▸▸
        </button>
      </div>
    </div>
  );
}

/* ============ 时代横幅 & 通知 ============ */
export function EraBanner({ s, d }: { s: GameState; d: DP }) {
  if (!s.eraBanner) return null;
  return (
    <div className="fixed inset-x-0 top-1/3 z-40 pointer-events-none flex justify-center">
      <div className="era-sweep bevel-out px-10 py-4 text-center">
        <div className="font-term text-[var(--portal)] tracking-[0.4em] text-sm">NEW ERA</div>
        <div className="font-disp text-4xl text-[var(--navy-1)] my-1">{s.eraBanner.name}</div>
        <div className="text-xs text-[#5a5750]">{s.eraBanner.sub}</div>
        <div className="pixel-divider mt-2" />
      </div>
    </div>
  );
}

export function Toasts({ s, d }: { s: GameState; d: DP }) {
  const color = { info: '#1c63c9', good: '#1f7a48', bad: '#c8322b', era: '#b34a00', ach: '#7a4fd0' };
  return (
    <div className="fixed right-3 bottom-16 z-[70] space-y-1.5 w-72">
      {s.toasts.map((t) => (
        <button key={t.id} onClick={() => d({ type: 'TOAST_GONE', id: t.id })}
          className="toast-in bevel-out w-full text-left px-2.5 py-1.5 text-xs font-bold flex items-center gap-2"
          style={{ color: color[t.kind] }}>
          {t.kind === 'ach' && <span>{Icons.star(14)}</span>}
          {t.text}
          <span className="ml-auto text-[#8a867a] font-normal">×</span>
        </button>
      ))}
    </div>
  );
}

/* ============ 帮助手册 ============ */
export function HelpDialog({ onClose }: { onClose: () => void }) {
  const rows = [
    ['目标', '从 1999 Q1 活到 2010 Q4（48 回合）。期末按估值与腾讯、百度等历史巨头同台排名；现金流连负即破产。'],
    ['回合', '1 回合 = 1 个季度。每回合用「行动点」做事，然后点「下一回合」结算收支、推进历史。'],
    ['科技', '在研发实验室把技术设为「主攻」，每季自动推进；也可花行动点「研发推进」。技术解锁产品。'],
    ['产品', '立项后进入开发队列（最多 2 个在研），上线后按「基础 + 用户规模」每季产收。'],
    ['人物', '历史事件会遇到马云、马化腾等 11 位风云人物。投资他们的公司，等历史兑现回报（BAT 种子轮了解一下）。'],
    ['顾问', '好感刷到 3 点可聘为战略顾问（最多 2 位），提供永久 buff。'],
    ['政策', '双槽位公司战略，随时切换：烧钱推广、免费战略、资本运作……'],
    ['融资', '行动点换钱：稀释股权拿 VC 的钱。创始人持股低于 34% 会被董事会否决。'],
    ['机房', '用户超过机房容量会「服务器过载」：收入 −25%、增长减半。在行动中心花 1 点 + 钱扩容。'],
    ['升级', '已上线产品可迭代到 Lv.3，每级收入 +30%。老产品别放着吃灰。'],
    ['急救', '资金 < 30 万时可借过桥贷款 +30 万（6 期内每期自动还 7 万）。人物事件付不起钱会自动改期，绝不会卡死。'],
    ['难度', '开局三档：休闲 / 标准 / 硬核，另有一件「穿越物资」五选一。主题界面会随四个时代自动演化。'],
    ['结局', '2010 年终估值 ≥ 22 亿即 S 级「互联网传奇」；中途还可能收到巨头收购要约——卖，也是一种胜利。'],
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(6,30,32,0.55)' }} onClick={onClose}>
      <div className="dialog-pop bevel-out w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <Win title="帮助 · 穿越者生存手册" icon={Icons.doc()}>
          <div className="p-3 text-xs space-y-1.5 max-h-[65vh] overflow-y-auto scroll-98">
            {rows.map(([k, v]) => (
              <div key={k} className="bevel-in bg-white p-2"><b className="text-[var(--navy-1)] mr-1.5">▸ {k}</b>{v}</div>
            ))}
            <Btn primary onClick={onClose} className="w-full mt-1">明白了，开干</Btn>
          </div>
        </Win>
      </div>
    </div>
  );
}
