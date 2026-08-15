import type { GameEvent, GameState, PersonDef, PolicyDef, PriceMode, ProductDef, TechDef } from './types';

export const TOTAL_TURNS = 48; // 1999Q1 → 2010Q4

export function turnLabel(t: number) {
  return `${1999 + Math.floor(t / 4)} 年 Q${(t % 4) + 1}`;
}
export function turnShort(t: number) {
  return `${String(1999 + Math.floor(t / 4)).slice(2)}Q${(t % 4) + 1}`;
}

export const ERAS = [
  { id: 0, name: '门户时代', sub: '1999–2001 · 三大门户叱咤风云', range: [0, 9] as const, mult: 1 },
  { id: 1, name: 'SP与网游时代', sub: '2001–2004 · 短信淘金，传奇燎原', range: [10, 21] as const, mult: 1.5 },
  { id: 2, name: 'Web 2.0 时代', sub: '2004–2007 · 百度上市，全民博客', range: [22, 33] as const, mult: 2.2 },
  { id: 3, name: '移动互联网时代', sub: '2007–2010 · iPhone 来了，3G 来了', range: [34, 47] as const, mult: 4.0 },
];

export function eraOf(t: number) {
  return ERAS.find((e) => t >= e.range[0] && t <= e.range[1]) ?? ERAS[0];
}

export const TRACKS = [
  {
    id: 'tr_portal', name: '门户青年', icon: 'portal',
    desc: '崇拜王志东与张朝阳，梦想做一个「中国人的网上家园」。',
    bonus: '开局声望 +8 · 门户技术已有积累', funds: 60, fame: 13, users: 0, techBoost: ['t_portal', 2] as [string, number],
  },
  {
    id: 'tr_im', name: '企鹅信徒', icon: 'im',
    desc: '你坚信聊天工具将连接一切，电脑右下角注定属于你。',
    bonus: '开局用户 +3 万 · IM 技术已有积累', funds: 58, fame: 5, users: 3, techBoost: ['t_im', 2] as [string, number],
  },
  {
    id: 'tr_search', name: '技术极客', icon: 'search',
    desc: '硅谷归来派，相信「技术改变世界」，键盘是你唯一的武器。',
    bonus: '开局声望 +4 · 研究进度领先', funds: 58, fame: 9, users: 0, techBoost: ['t_search', 3] as [string, number],
  },
  {
    id: 'tr_ec', name: '下海商人', icon: 'ec',
    desc: '在义乌和广州跑过货源，你断定「网上买卖」是下一个金矿。',
    bonus: '开局资金 +25 万', funds: 85, fame: 5, users: 0, techBoost: ['t_pay', 2] as [string, number],
  },
  {
    id: 'tr_tel', name: '电信老兵', icon: 'chip',
    desc: '在省邮电局干了八年，移动梦网的每一条规则你都门儿清。',
    bonus: '资金略高 · WAP 手机站技术有积累', funds: 68, fame: 6, users: 0, techBoost: ['t_wap', 2] as [string, number],
  },
  {
    id: 'tr_hack', name: '车库黑客', icon: 'bolt',
    desc: '和两个兄弟在车库写代码，你的小工具已经悄悄圈了一票粉丝。',
    bonus: '开局用户 +2 万 · IM 技术有积累', funds: 50, fame: 4, users: 2, techBoost: ['t_im', 2] as [string, number],
  },
];

/* ================= 难度 ================= */
export const DIFFICULTIES = [
  {
    id: 'easy' as const, name: '休闲模式', tag: '顺风局',
    desc: '启动资金 ×1.5 · 工资开销 −20% · 收入 +15% · 用户增长 +20% · 破产线更宽容。适合想轻松看剧情的人。',
    fundsMult: 1.5, salaryMult: 0.8, revMult: 1.15, growthMult: 1.2, bankruptAt: -50, techPts: 1,
  },
  {
    id: 'normal' as const, name: '标准模式', tag: '原汁原味',
    desc: '1999 年的真实体感：钱永远不够花，冬天说来就来，每一步都得掂量。',
    fundsMult: 1, salaryMult: 1, revMult: 1, growthMult: 1, bankruptAt: -30, techPts: 0,
  },
  {
    id: 'hard' as const, name: '硬核模式', tag: '地狱开局',
    desc: '启动资金 ×0.75 · 工资开销 +25% · 收入 −15% · 增长 −25% · 资金 −20 万即破产。泡沫会教你做人。',
    fundsMult: 0.75, salaryMult: 1.25, revMult: 0.85, growthMult: 0.75, bankruptAt: -20, techPts: 0,
  },
];

/* ================= 穿越物资（开局五选一） ================= */
export const PERKS = [
  { id: 'perk_angel', name: '天使汇款', desc: '一位海外亲戚汇来 25 万启动资金，代价是让出 5% 股权。', tag: '资金 +25 · 股权 −5' },
  { id: 'perk_veteran', name: '老销售入伙', desc: '跑过十年渠道的老销售带着客户名单入伙。', tag: '团队 +1 · 声望 +2' },
  { id: 'perk_media', name: '媒体关系', desc: '你表舅是晚报主编，开业报道直接上头版。', tag: '声望 +6' },
  { id: 'perk_server', name: '机房渠道', desc: '你提前托人搞定了电信机房，跳过共享主机阶段。', tag: '机房直升「自建机房」' },
  { id: 'perk_code', name: '技术手稿', desc: '你带来一摞写满架构设计的手稿，研发快人一步。', tag: '技术储备 +2' },
];

/* ================= 机房层级（决定用户容量） ================= */
export const SERVER_TIERS = [
  { name: '共享主机托管', cap: 20, cost: 0 },
  { name: '自建机房', cap: 80, cost: 20 },
  { name: 'IDC 托管机柜', cap: 200, cost: 50 },
  { name: '自有数据中心', cap: 600, cost: 130 },
  { name: '国家级数据中心', cap: 1500, cost: 300 },
];

/* ================= 产品定价策略 ================= */
export const PRICE_MODES: { id: PriceMode; name: string; incomeMult: number; pullMult: number; desc: string }[] = [
  { id: 'free', name: '免费', incomeMult: 0.55, pullMult: 1.6, desc: '收入 ×0.55，拉新 ×1.6。用免费换装机量。' },
  { id: 'std', name: '标准', incomeMult: 1, pullMult: 1, desc: '常规收费，收入与拉新均衡。' },
  { id: 'high', name: '高价', incomeMult: 1.45, pullMult: 0.5, desc: '收入 ×1.45，拉新 ×0.5。做高 ARPU 的精品。' },
];

/* ================= 产品运营动作 ================= */
export const OPS_ACTIONS: { kind: 'ad' | 'content'; name: string; cost: number; heat: number; desc: string }[] = [
  { kind: 'ad', name: '推广活动', cost: 6, heat: 35, desc: '热度 +35 · 用户 +1.5万。买量冲榜。' },
  { kind: 'content', name: '内容运营', cost: 2, heat: 18, desc: '热度 +18 · 声望 +1.5。用心做内容攒口碑。' },
];

/* ================= 对手估值行情（转折点 [回合, 估值]，线性插值） ================= */
export const RIVAL_CURVES: { name: string; color: string; pts: [number, number][] }[] = [
  { name: '腾讯', color: '#1fa9e6', pts: [[0, 4], [5, 15], [9, 40], [13, 150], [21, 520], [26, 1200], [33, 2200], [40, 3200], [47, 4200]] },
  { name: '百度', color: '#3155c9', pts: [[0, 0], [4, 2], [13, 80], [21, 300], [26, 2400], [33, 3000], [47, 3200]] },
  { name: '阿里巴巴', color: '#ff8a00', pts: [[0, 0], [2, 1], [8, 30], [21, 400], [26, 800], [34, 1300], [47, 1300]] },
  { name: '盛大', color: '#7a4fd0', pts: [[0, 0], [11, 30], [15, 640], [24, 600], [33, 480], [47, 300]] },
  { name: '网易', color: '#c93a5e', pts: [[0, 2], [5, 1], [10, 3], [18, 520], [33, 500], [47, 540]] },
];

/* ================= 时代主题（UI 随年代演化） ================= */
export const ERA_THEMES: { id: number; label: string; bg: string; vars: Record<string, string> }[] = [
  {
    id: 0, label: '1999',
    bg: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.035) 0 1px, transparent 1px 3px), radial-gradient(ellipse 120% 80% at 50% 0%, rgba(150,235,225,0.28), transparent 62%), linear-gradient(160deg, #0e8d84 0%, #0a6e68 100%)',
    vars: { '--navy-1': '#00007b', '--navy-2': '#1084d0', '--portal': '#ff6a00' },
  },
  {
    id: 1, label: '2002',
    bg: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 3px), radial-gradient(ellipse 120% 80% at 50% 0%, rgba(220,250,170,0.22), transparent 62%), linear-gradient(160deg, #3c7d46 0%, #24582f 100%)',
    vars: { '--navy-1': '#1b5e3a', '--navy-2': '#4fae62', '--portal': '#e8a400' },
  },
  {
    id: 2, label: '2006',
    bg: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.035) 0 1px, transparent 1px 3px), radial-gradient(ellipse 120% 80% at 50% 0%, rgba(190,230,255,0.35), transparent 62%), linear-gradient(160deg, #2f7cc4 0%, #155a9e 100%)',
    vars: { '--navy-1': '#0a3d91', '--navy-2': '#3aa0ff', '--portal': '#ff5a1f' },
  },
  {
    id: 3, label: '2009',
    bg: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 3px), radial-gradient(ellipse 120% 80% at 50% 0%, rgba(120,225,255,0.16), transparent 62%), linear-gradient(160deg, #2b3542 0%, #161d26 100%)',
    vars: { '--navy-1': '#101820', '--navy-2': '#3d5a75', '--portal': '#22c1dc' },
  },
];

/* ================= 先驱者里程碑 =================
   若玩家在某个历史事件发生前就做出同类产品，会被写入史册并获得声望奖励。
   product: 玩家需已上线的产品；beforeTurn: 须在该回合前上线。 */
export const MILESTONES: { flag: string; product: string; beforeTurn: number; fame: number; text: string }[] = [
  { flag: 'ms_im', product: 'p_im', beforeTurn: 1, fame: 6, text: '先驱者：你的即时通讯产品比 OICQ 还早！业界称你为「中国 IM 第一人」。' },
  { flag: 'ms_ec', product: 'p_ec', beforeTurn: 17, fame: 7, text: '先驱者：在淘宝网诞生之前，你已经把电商交易平台做起来了，媒体称你为「电商拓荒者」。' },
  { flag: 'ms_pay', product: 'p_mpay', beforeTurn: 23, fame: 8, text: '先驱者：你比支付宝早三年做出移动支付/在线支付，行业媒体惊呼「第三方支付的先行者竟是你」。' },
  { flag: 'ms_search', product: 'p_search', beforeTurn: 26, fame: 6, text: '先驱者：百度上市前你已做出搜索引擎，资本市场称你为「被低估的搜索玩家」。' },
  { flag: 'ms_client', product: 'p_client', beforeTurn: 32, fame: 7, text: '先驱者：iPhone 发布之前你已布局手机客户端，媒体称你「提前五年看到移动互联网」。' },
];

/* ================= 创始人股权状态 ================= */
export function equityStatus(eq: number): { label: string; desc: string; tone: 'good' | 'warn' | 'bad' } {
  if (eq >= 67) return { label: '绝对控股', desc: '持股≥67%，你拥有绝对控制权，任何决议都无法绕过你。', tone: 'good' };
  if (eq >= 51) return { label: '相对控股', desc: '持股≥51%，重大决策仍由你拍板，但要开始留意董事会。', tone: 'good' };
  if (eq >= 34) return { label: '一票否决', desc: '持股≥34%，你保有一票否决权，但融资时话语权已明显下降。', tone: 'warn' };
  if (eq >= 20) return { label: '重要股东', desc: '持股<34%，你失去了否决权，董事会随时可能干预公司方向。', tone: 'warn' };
  return { label: '职业经理人', desc: '持股<20%，公司更多属于资本而非你，控制权岌岌可危。', tone: 'bad' };
}

export const TECHS: TechDef[] = [
  { id: 't_bbs', name: 'BBS 建站', era: 0, cost: 3, desc: '论坛是中文互联网的第一声啼哭。', unlocks: 'p_bbs' },
  { id: 't_portal', name: '门户架构', era: 0, cost: 5, req: ['t_bbs'], desc: '新闻+邮箱+搜索框，一个首页包打天下。', unlocks: 'p_portal' },
  { id: 't_mail', name: '免费邮箱', era: 0, cost: 4, req: ['t_bbs'], desc: '用 263 和 163 的方式圈住用户。', unlocks: 'p_mail' },
  { id: 't_wap', name: 'WAP 手机站', era: 0, cost: 5, req: ['t_portal'], desc: '在诺基亚上上网，前卫得像科幻片。', unlocks: 'p_wap' },
  { id: 't_sp', name: '短信代收费 SP', era: 1, cost: 5, req: ['t_portal'], desc: '移动梦网一响，黄金万两。', unlocks: 'p_sp' },
  { id: 't_game', name: '网游运营', era: 1, cost: 6, req: ['t_portal'], desc: '点卡、网吧、通宵练级——印钞机。', unlocks: 'p_game' },
  { id: 't_im', name: 'IM 通讯协议', era: 1, cost: 6, req: ['t_bbs'], desc: '和那只企鹅抢右下角的战争。', unlocks: 'p_im' },
  { id: 't_pay', name: '在线支付', era: 1, cost: 6, req: ['t_sp'], desc: '没有支付，电商只是橱窗。' },
  { id: 't_search', name: '中文分词搜索', era: 2, cost: 7, req: ['t_portal'], desc: '让中文网页可以被「找到」。', unlocks: 'p_search' },
  { id: 't_sns', name: 'SNS 社区', era: 2, cost: 6, req: ['t_bbs'], desc: '博客、空间、实名交友——人人都在晒。', unlocks: 'p_sns' },
  { id: 't_video', name: '视频流媒体', era: 2, cost: 8, req: ['t_sns'], desc: '带宽很贵，但年轻人停不下来。', unlocks: 'p_video' },
  { id: 't_ec', name: '电商交易平台', era: 2, cost: 7, req: ['t_pay'], desc: '从「看不见摸不着」到「真香」。', unlocks: 'p_ec' },
  { id: 't_client', name: '手机客户端', era: 3, cost: 7, reqAny: ['t_im', 't_sns'], desc: '把产品装进每个人的口袋。', unlocks: 'p_client' },
  { id: 't_app', name: '开放平台', era: 3, cost: 9, req: ['t_client'], desc: '让别人在你的地基上盖楼。', unlocks: 'p_app' },
  { id: 't_mpay', name: '移动支付', era: 3, cost: 8, req: ['t_pay', 't_client'], desc: '钱包消失的前夜。', unlocks: 'p_mpay' },
];

/* 数值平衡（v2 重算）：
   每个产品上线即净正（base×时代倍率 − 运维 > 0），2~4 季收回 devCost；
   ucoef 按「每万用户每季贡献万元」标定（SP/网游/支付是高 ARPU 印钞机）；
   devCost 普遍下调 35%~45%，确保前期投得起、中后期敢扩张。 */
export const PRODUCTS: ProductDef[] = [
  { id: 'p_bbs', name: 'BBS 论坛', tech: 't_bbs', devCost: 10, work: 2, upkeep: 0.3, base: 2.0, ucoef: 0.03, pull: 0.2, fame: 0.1, desc: '灌水、盖楼、抢沙发，第一代网民的精神家园。' },
  { id: 'p_mail', name: '免费邮箱', tech: 't_mail', devCost: 12, work: 2, upkeep: 0.4, base: 1.8, ucoef: 0.02, pull: 0.5, fame: 0.35, desc: '送邮箱就是送户口，用户从此有了网上身份。' },
  { id: 'p_portal', name: '门户网站', tech: 't_portal', devCost: 28, work: 4, upkeep: 1.2, base: 5.0, ucoef: 0.06, pull: 0.3, fame: 0.2, desc: '首页广告位一版难求，这就是那个时代的流量。' },
  { id: 'p_wap', name: 'WAP 手机站', tech: 't_wap', devCost: 16, work: 3, upkeep: 0.5, base: 2.4, ucoef: 0.03, pull: 0.1, fame: 0, desc: '彩屏手机上的蓝色链接，移动互联网的胚胎。' },
  { id: 'p_sp', name: '移动增值 SP', tech: 't_sp', devCost: 22, work: 3, upkeep: 0.9, base: 5.0, ucoef: 0.12, pull: 0.05, fame: -0.05, desc: '短信订阅、彩铃下载，和运营商七三分成的暴利生意。' },
  { id: 'p_game', name: '网游运营', tech: 't_game', devCost: 40, work: 5, upkeep: 1.6, base: 7.0, ucoef: 0.15, pull: 0.2, fame: 0.1, desc: '一张点卡 35 元，网吧里全是你的「城主」。' },
  { id: 'p_im', name: 'IM 即时通讯', tech: 't_im', devCost: 30, work: 5, upkeep: 1.4, base: 2.0, ucoef: 0.02, pull: 0.9, fame: 0.1, desc: '用户增长引擎，但你要面对史上最可怕的对手。' },
  { id: 'p_search', name: '搜索引擎', tech: 't_search', devCost: 45, work: 5, upkeep: 1.6, base: 8.0, ucoef: 0.08, pull: 0.35, fame: 0.15, desc: '竞价排名一开，搜索框就是印钞机。' },
  { id: 'p_sns', name: 'SNS 社区', tech: 't_sns', devCost: 30, work: 4, upkeep: 1.0, base: 4.0, ucoef: 0.05, pull: 0.7, fame: 0.25, desc: '偷菜、抢车位、写博客，全民社交狂欢。' },
  { id: 'p_video', name: '视频网站', tech: 't_video', devCost: 50, work: 6, upkeep: 2.4, base: 6.0, ucoef: 0.04, pull: 0.5, fame: 0.4, desc: '一个馒头引发的血案，让所有人看见视频的力量。' },
  { id: 'p_ec', name: '电商交易平台', tech: 't_ec', devCost: 45, work: 5, upkeep: 1.8, base: 7.0, ucoef: 0.07, pull: 0.3, fame: 0.15, desc: '让买家卖家隔着网线互相「亲，包邮吗」。' },
  { id: 'p_client', name: '手机客户端', tech: 't_client', devCost: 40, work: 4, upkeep: 1.2, base: 6.0, ucoef: 0.06, pull: 0.8, fame: 0.2, desc: '抢下用户掌心的那一英寸屏幕。' },
  { id: 'p_app', name: '开放平台', tech: 't_app', devCost: 70, work: 6, upkeep: 2.0, base: 9.0, ucoef: 0.08, pull: 0.4, fame: 0.25, desc: '从做产品到做生态，格局打开。' },
  { id: 'p_mpay', name: '移动支付', tech: 't_mpay', devCost: 60, work: 5, upkeep: 1.6, base: 8.0, ucoef: 0.10, pull: 0.2, fame: 0.2, desc: '下一个十年的船票，你提前拿到了。' },
];

export const POLICIES: PolicyDef[] = [
  { id: 'p_frugal', name: '勤俭持家', tag: '财务', desc: '人力成本 −30%。中关村的盒饭也能吃出梦想。' },
  { id: 'p_burn', name: '烧钱推广', tag: '市场', desc: '营销效率 +60%。报纸中缝、网吧桌面、公交车身，全是你的广告。' },
  { id: 'p_tech', name: '技术立身', tag: '研发', desc: '每季度研发自动 +1。程序员的格子衫是公司战袍。' },
  { id: 'p_user', name: '用户为王', tag: '增长', desc: '自然用户增长 +40%。得网民者得天下。' },
  { id: 'p_cap', name: '资本运作', tag: '资本', desc: '估值 +25%，融资少稀释 3%。学会和 VC 喝下午茶。' },
  { id: 'p_free', name: '免费战略', tag: '增长', desc: '自然增长 +25%，但全部收入 −10%。免费是最贵的商业模式。' },
  { id: 'p_sp2', name: '运营商关系', tag: '营收', desc: 'SP 与网游收入 +35%。移动梦网的金牌合作伙伴。' },
  { id: 'p_fast', name: '快速跟随', tag: '研发', desc: '产品开发所需工作量 −30%。「一直模仿，从未超越」也是一种战术。' },
];

export const PERSONS: PersonDef[] = [
  { id: 'pony', name: '马化腾', title: '腾讯创始人 / CEO', co: 'Tencent 腾讯', quote: '巨人也会害怕每一天，怕看不懂年轻人喜欢什么。', windowTurn: 1, color: '#1fa9e6', hireCost: 50, buffName: '产品经理直觉', buffDesc: '用户自然增长 +15%' },
  { id: 'mayun', name: '马云', title: '阿里巴巴创始人', co: 'Alibaba 阿里巴巴', quote: '今天很残酷，明天更残酷，后天很美好。', windowTurn: 2, color: '#ff8a00', hireCost: 60, buffName: '战略眼光', buffDesc: '全部收入 +10%' },
  { id: 'wangzhidong', name: '王志东', title: '新浪 CEO', co: 'SINA 新浪', quote: '创业者要先学会给自己定价。', windowTurn: 1, color: '#e04f2e', hireCost: 40, buffName: '门户心法', buffDesc: '门户与邮箱收入 +25%' },
  { id: 'xiong', name: '熊晓鸽', title: 'IDG 资本合伙人', co: 'IDG Capital', quote: '我投项目，先看人，再看赛道，最后看数字。', windowTurn: 2, color: '#2a6db5', hireCost: 45, buffName: '资本人脉', buffDesc: '估值 +10%，融资少稀释 5%' },
  { id: 'robin', name: '李彦宏', title: '百度创始人', co: 'Baidu 百度', quote: '世界很复杂，百度一下就好。', windowTurn: 4, color: '#3155c9', hireCost: 55, buffName: '技术宅之魂', buffDesc: '研发速度 +30%' },
  { id: 'dinglei', name: '丁磊', title: '网易创始人', co: 'NetEase 网易', quote: '做企业像跑马拉松，不必抢跑。', windowTurn: 10, color: '#c93a5e', hireCost: 45, buffName: '闷声发财', buffDesc: '人力成本 −15%' },
  { id: 'zhang', name: '张朝阳', title: '搜狐 CEO', co: 'Sohu 搜狐', quote: '互联网寒冬里，也要有人跳舞。', windowTurn: 5, color: '#f2a300', hireCost: 35, buffName: '品牌作秀', buffDesc: '声望收益 +30%' },
  { id: 'chen', name: '陈天桥', title: '盛大网络 CEO', co: 'Shanda 盛大', quote: '互动娱乐，是互联网的现金奶牛。', windowTurn: 11, color: '#7a4fd0', hireCost: 50, buffName: '娱乐帝国', buffDesc: '网游收入 +30%' },
  { id: 'zhou', name: '周鸿祎', title: '3721 / 奇虎创始人', co: '360 奇虎', quote: '我是周鸿祎，不是周鸿「yi」。', windowTurn: 18, color: '#28a860', hireCost: 45, buffName: '免费打法', buffDesc: '用户自然增长 +20%' },
  { id: 'lei', name: '雷军', title: '金山软件 CEO', co: 'Kingsoft 金山', quote: '不要用战术上的勤奋，掩盖战略上的懒惰。', windowTurn: 8, color: '#e8641b', hireCost: 40, buffName: '劳模文化', buffDesc: '产品开发速度 +25%' },
  { id: 'wang', name: '王兴', title: '校内 / 美团创始人', co: 'Meituan 美团', quote: '总有人更年轻，更快，更不怕输。', windowTurn: 44, color: '#0f9d8f', hireCost: 30, buffName: '长期主义', buffDesc: '估值 +15%' },
];

/* ================= 事件（turn 对齐真实历史） ================= */

/* 处境评估局部辅助（避免 engine↔data 循环依赖） */
const ownsP = (s: GameState, def: string) => s.products.some((p) => p.def === def && p.launched && !p.shut);
const beforeP = (s: GameState, def: string, turn: number) => s.products.some((p) => p.def === def && p.launched && (p.launchedTurn ?? 99) < turn);
const fw = (v: number) => (Math.abs(v) >= 10000 ? `${(v / 10000).toFixed(1)}亿` : `${Math.round(v * 10) / 10}万`);
const vsUsers = (s: GameState, theirs: number, label: string) =>
  s.users >= theirs
    ? `你的 ${fw(s.users)} 用户已压过${label}的 ${fw(theirs)}——这一局你领先。`
    : `你的 ${fw(s.users)} 用户对比${label}的 ${fw(theirs)} 还有差距，但窗口期未关。`;

export const EVENTS: GameEvent[] = [
  {
    id: 'ev_dialup', turn: 0, kind: 'history',
    title: '56K 猫的时代',
    body: '调制解调器发出令人安心的电流嘶叫，你盯着屏幕右下角的小电脑图标闪烁。1999 年，中国网民 890 万，中关村的写字楼里到处是「.com」的名片。属于你的回合开始了——先定个小目标：活过今年。',
    footnote: '史实：1999 年 1 月，中国网民仅 890 万；同年 CNNIC 开始发布统计报告。',
    choices: [
      { label: '订阅《计算机世界》，研究同行', hint: '研发 +1', fx: { tech: [null, 1] } },
      { label: '先去中关村攒一台服务器', hint: '稳扎稳打', fx: { log: '你用攒机的钱换来了踏实的开局。' } },
    ],
  },
  {
    id: 'ev_oicq', turn: 1, kind: 'person', person: 'pony',
    title: '一只胖企鹅诞生了',
    impact: { label: '即时通讯风潮', incomeMult: 1.12, turns: 3, users: 1 },
    competes: { product: 'p_im', label: '企鹅冲击', mult: 0.75, turns: 6, heat: 20, users: 1, note: 'OICQ 凭免费策略和关系链迅速裂变，你的 IM 用户正在被这只胖企鹅吸走。' },
    assess: (s) =>
      beforeP(s, 'p_im', 1)
        ? '【你的处境】你的 IM 比 OICQ 更早上线——你才是先行者，马化腾才是追赶者。'
        : ownsP(s, 'p_im')
          ? `【你的处境】你已有 IM 产品，OICQ 是直接对手。${vsUsers(s, 20, 'OICQ')}`
          : '【你的处境】你还在 BBS/门户赛道。IM 的浪潮正在酝酿，现在入局还来得及。',
    variant: {
      when: (s) => s.products.some((p) => p.def === 'p_im' && p.launched && !p.shut),
      note: '业界注意到：你的 IM 产品与 OICQ 正面交锋，媒体开始讨论「谁才是中国 IM 之王」。',
      bonus: { fame: 3 },
    },
    body: '深圳赛格科技园，一个叫马化腾的年轻人把 OICQ 挂上了网。没人知道这个「网络寻呼机」会掀起多大的浪——据说他正为服务器费用发愁，四处找人聊天。你在华强北的电子市场偶遇了他。',
    footnote: '史实：1999 年 2 月 10 日，OICQ（QQ 前身）上线，五个月内注册用户突破百万。',
    choices: [
      { label: '和他彻夜长谈产品', hint: '马化腾好感 +2 · 声望 +1', fx: { rel: [['pony', 2]], fame: 1 } },
      { label: '「聊天工具能赚钱？」嗤之以鼻', hint: '声望 +2 · 马化腾好感 −1', fx: { fame: 2, rel: [['pony', -1]] } },
      { label: '请教即时通讯的技术细节', hint: '研发 +2', fx: { tech: [null, 2] } },
    ],
  },
  {
    id: 'ev_idg', turn: 2, kind: 'person', person: 'xiong',
    title: 'IDG 来敲门',
    body: '一位操着港普的投资人递来名片：IDG 熊晓鸽。他已经投了搜狐，正在满北京城找下一个「.com」。「年轻人，你的商业计划书我看了十分钟，」他端起茶杯，「现在说说，你凭什么赢？」',
    footnote: '史实：IDG 是最早进入中国的美元基金，先后投资了搜狐、腾讯、百度等上百家互联网公司。',
    choices: [
      { label: '接受 15 万美元天使投资', hint: '资金 +15 · 熊晓鸽好感 +1', fx: { funds: 15, rel: [['xiong', 1]], flags: ['idg_early'] } },
      { label: '只要建议，不要钱', hint: '好感 +1 · 研发 +1', fx: { rel: [['xiong', 1]], tech: [null, 1] } },
      { label: '「等我做出成绩再谈估值」', hint: '声望 +2', fx: { fame: 2 } },
    ],
  },
  {
    id: 'ev_alibaba', turn: 2, kind: 'person', person: 'mayun',
    title: '湖畔花园的十八个人',
    body: '杭州，湖畔花园小区一套 150 平的民居里挤着十八个人。为首那位英语老师模样的瘦高个正在白板前挥斥方遒：「我们要做一个让天下没有难做的生意的网站！」他叫马云，正在凑 50 万创业资金。',
    footnote: '史实：1999 年 9 月 10 日，马云与「十八罗汉」在湖畔花园创立阿里巴巴；次年孙正义 6 分钟决定投资 2000 万美元。',
    choices: [
      { label: '掏出 10 万元入股', hint: '资金 −10 · 获得「阿里种子投资」', cost: 10, fx: { funds: -10, invest: 'inv_alibaba', rel: [['mayun', 1]] } },
      { label: '留下来听他讲到天亮', hint: '马云好感 +2 · 声望 +1', fx: { rel: [['mayun', 2]], fame: 1 } },
      { label: '礼貌告辞：画饼谁不会', hint: '无', fx: { log: '你错过了中国互联网最贵的一张船票。' } },
    ],
  },
  {
    id: 'ev_wzd', turn: 3, kind: 'person', person: 'wangzhidong',
    title: '王志东的橄榄枝',
    body: '「四通利方的老王」如今是新浪 CEO，刚刚完成轰动业界的「王志东模式」——用期权加现金把自己「卖」给了新浪。他约你在亚运村喝茶：「小兄弟，你的站做得有意思。来新浪吧，我保你三年财务自由。」',
    footnote: '史实：1998 年 12 月王志东出任新浪 CEO；2000 年 4 月新浪登陆纳斯达克——上市当月恰逢泡沫破裂。',
    choices: [
      { label: '携团队并入新浪', hint: '资金 +30 · 声望 +4 · 失去独立公司身份', fx: { funds: 30, fame: 4, flags: ['sina_merge'] } },
      { label: '婉拒：我想自己上市', hint: '声望 +2 · 好感 −1', fx: { fame: 2, rel: [['wangzhidong', -1]] } },
      { label: '做朋友，常来喝茶', hint: '好感 +1', fx: { rel: [['wangzhidong', 1]] } },
    ],
  },
  {
    id: 'ev_baidu', turn: 4, kind: 'person', person: 'robin',
    title: '北大资源宾馆的两个房间',
    body: '2000 年 1 月，北大资源宾馆 1414 和 1417 房间，李彦宏和徐勇挂出了百度的招牌。这位从 Infoseek 归国的工程师打算做中文搜索的「卖水人」——给门户们提供搜索技术。他邀请你来参观那台还发着热气的服务器。',
    footnote: '史实：2000 年 1 月百度创立于北大资源宾馆；2005 年 8 月 5 日登陆纳斯达克，首日暴涨 354%。',
    choices: [
      { label: '出资 10 万成为早期股东', hint: '资金 −10 · 获得「百度种子投资」', cost: 10, fx: { funds: -10, invest: 'inv_baidu', rel: [['robin', 1]] } },
      { label: '签技术合作意向', hint: '好感 +2 · 研发 +1', fx: { rel: [['robin', 2]], tech: [null, 1] } },
      { label: '只是路过打个招呼', fx: { rel: [['robin', 1]] } },
    ],
  },
  {
    id: 'ev_crash', turn: 5, kind: 'history',
    title: '纳斯达克崩盘 · 互联网寒冬',
    impact: { label: '资本寒冬', incomeMult: 0.8, turns: 4, fame: -1 },
    body: '2000 年 4 月 14 日，纳斯达克单日暴跌 355 点，.com 泡沫破了。新浪上市一个月股价腰斩，搜狐跌到 1 美元徘徊在退市边缘，网易上市即破发。投资人的电话再也打不通，账上的钱每个月都在变少。董事会问你：怎么过冬？',
    footnote: '史实：2000 年 4 月纳斯达克崩盘，全球互联网进入长达两年的寒冬；大量 .com 公司倒闭。',
    choices: [
      { label: '断臂求生：裁员一人', hint: '团队 −1 · 声望 −2 · 现金压力骤减', fx: { team: -1, fame: -2, flags: ['winter_ok'], log: '你咬牙送别了第一位伙伴。活下去才有未来。' } },
      { label: '一个都不裁，我养大家', hint: '资金 −8 · 声望 +3', fx: { funds: -8, fame: 3, flags: ['winter_loyal'], log: '全员降薪 30%，没有一个人离开。' } },
      { label: '抄底收购：低价买技术团队', hint: '资金 −15 · 研发 +3 · 团队 +1', fx: { funds: -15, tech: [null, 3], team: 1, flags: ['winter_buy'], log: '你用白菜价收编了一支失业的工程师团队。' } },
    ],
  },
  {
    id: 'ev_qq_sale', turn: 5, kind: 'person', person: 'pony',
    title: '马化腾想卖掉 OICQ',
    body: '寒冬里最先冻僵的是聊天工具——OICQ 用户暴涨却没有一分钱收入，服务器账单像雪片。马化腾开价 60 万想把 OICQ 卖掉，谈了一圈，没人接盘。深夜他找你喝酒：「你说，这东西到底值不值钱？」',
    footnote: '史实：2000 年腾讯濒临资金断裂，马化腾曾作价 60 万出售 OICQ 未果；次年 IDG 与盈科注资 220 万美元救命。',
    choices: [
      { label: '出资 6 万买下 10% 股份', hint: '资金 −6 · 获得「腾讯种子投资」', cost: 6, fx: { funds: -6, invest: 'inv_tencent', rel: [['pony', 2]] } },
      { label: '帮他引荐 IDG 熊晓鸽', hint: '马化腾好感 +3 · 熊晓鸽好感 +1', fx: { rel: [['pony', 3], ['xiong', 1]], log: '这通电话，后来救了一家千亿公司。' } },
      { label: '「我也泥菩萨过江」', hint: '无', fx: { log: '你拍了拍他的肩膀，谁都没说话。' } },
    ],
  },
  {
    id: 'ev_jinshan', turn: 8, kind: 'person', person: 'lei',
    title: '金山的孤勇者',
    body: '中关村，金山软件 CEO 雷军正在和微软 Office 死磕 WPS。白天谈渠道，晚上写代码，他被业内称作「中关村劳模」。顺带一提，他最近捣鼓了个网上卖书的站，叫卓越网。「书这个东西，标准品，适合网上卖！」他眼睛发亮。',
    footnote: '史实：2000 年 4 月卓越网上线；2004 年 8 月亚马逊以 7500 万美元全资收购卓越网。',
    choices: [
      { label: '出资 8 万投资卓越网', hint: '资金 −8 · 获得「卓越天使投资」', cost: 8, fx: { funds: -8, invest: 'inv_joyo', rel: [['lei', 1]] } },
      { label: '约他通宵聊管理', hint: '好感 +2 · 研发 +1', fx: { rel: [['lei', 2]], tech: [null, 1] } },
      { label: '「网上卖书？不靠谱」', fx: { log: '雷军笑了笑：四年后见分晓。' } },
    ],
  },
  {
    id: 'ev_wy', turn: 10, kind: 'person', person: 'dinglei',
    title: '网易停牌危机',
    impact: { label: 'SP 淘金信号', incomeMult: 1.15, turns: 4 },
    body: '2001 年 7 月，网易因财报问题被纳斯达克停牌，股价跌到 0.6 美元。丁磊一度想把网易卖掉，却没人敢接。这个 30 岁的宁波人顶着黑眼圈对你说：「所有人都说我完了。但我觉得，互联网这才刚开始。」',
    footnote: '史实：2001 年 7 月网易被停牌；靠短信 SP 业务翻身，2003 年股价上涨近 50 倍，丁磊成为中国首富。',
    choices: [
      { label: '梭哈 15 万抄底网易股票', hint: '资金 −15 · 获得「网易抄底投资」', cost: 15, fx: { funds: -15, invest: 'inv_netease', rel: [['dinglei', 1]] } },
      { label: '借他 8 万过渡', hint: '资金 −8 · 好感 +2 · 声望 +2', cost: 8, fx: { funds: -8, rel: [['dinglei', 2]], fame: 2 } },
      { label: '口头鼓励两句', hint: '好感 +1', fx: { rel: [['dinglei', 1]] } },
    ],
  },
  {
    id: 'ev_cq', turn: 11, kind: 'person', person: 'chen',
    title: '《传奇》燎原',
    impact: { label: '网游市场爆发', incomeMult: 1.2, turns: 4 },
    competes: { product: 'p_game', label: '传奇风暴', mult: 0.8, turns: 5, heat: 15, note: '《传奇》横扫网吧，沙巴克攻城战抢走了你的玩家——点卡生意不好做了。' },
    assess: (s) =>
      beforeP(s, 'p_game', 11)
        ? '【你的处境】你的网游比《传奇》更早上线——你比陈天桥更早嗅到了点卡的铜臭味。'
        : ownsP(s, 'p_game')
          ? '【你的处境】你有网游产品，《传奇》把整个市场做大了——水涨船高，你的点卡也会更好卖。'
          : '【你的处境】网游是现金奶牛。陈天桥押上了全部身家，你敢不敢跟？',
    body: '2001 年 9 月，陈天桥押上全部身家——30 万美元代理费——签下韩国网游《传奇》。两个月后，全国网吧的屏幕一半都是沙巴克攻城战。点卡卖到断货，盛大的服务器每天进账以百万计。陈天桥请你在上海金茂喝咖啡：「跟着干，一起分蛋糕？」',
    footnote: '史实：2001 年 9 月盛大运营《传奇》，次年即占中国网游市场 60%；2004 年陈天桥以 88 亿身家成为最年轻首富。',
    choices: [
      { label: '取经：进军网游行业', hint: '网游研发 +3 · 好感 +1', fx: { tech: ['t_game', 3], rel: [['chen', 1]] } },
      { label: '做他的点卡分销商', hint: '资金 +10 · 好感 +1', fx: { funds: 10, rel: [['chen', 1]] } },
      { label: '「游戏误国，我不碰」', hint: '声望 +2 · 好感 −1', fx: { fame: 2, rel: [['chen', -1]] } },
    ],
  },
  {
    id: 'ev_lanjisu', turn: 13, kind: 'history',
    title: '蓝极速的烈火',
    impact: { label: '网吧整顿', incomeMult: 0.85, turns: 3 },
    body: '2002 年 6 月 16 日凌晨，北京海淀「蓝极速」网吧燃起大火，25 个年轻生命定格在那个夜晚。全国网吧开始停业整顿，你的用户里有三成来自网吧。痛定思痛，整个行业被迫回答一个问题：互联网该往哪里去？',
    footnote: '史实：2002 年蓝极速网吧纵火案直接催生全国网吧行业大整顿，家庭宽带接入自此加速。',
    choices: [
      { label: '投入家庭用户市场', hint: '资金 −6 · 用户 +3 · 声望 +2', cost: 6, fx: { funds: -6, users: 3, fame: 2, flags: ['home_net'], log: '你把推广从网吧转向了家庭拨号用户。' } },
      { label: '发布未成年人保护承诺', hint: '声望 +3', fx: { fame: 3 } },
    ],
  },
  {
    id: 'ev_blog', turn: 14, kind: 'history',
    title: '博客来了',
    body: '方兴东把「Blog」翻译成「博客」，木子美的文章让整个服务器瘫痪。人人都在谈论：Web 2.0 来了，用户不再只是看客，他们要自己写、自己晒、自己红。',
    footnote: '史实：2002 年博客中国上线，「Web 2.0」概念开始席卷中国互联网。',
    choices: [
      { label: '研究 SNS 技术方向', hint: 'SNS 研发 +2 · 声望 +1', fx: { tech: ['t_sns', 2], fame: 1 } },
      { label: '先看看再说', fx: { log: '你选择观望这场喧嚣。' } },
    ],
  },
  {
    id: 'ev_sars', turn: 17, kind: 'history',
    title: '非典 · 与淘宝的诞生',
    impact: { label: '线上需求井喷', incomeMult: 1.25, turns: 4, users: 3 },
    variant: {
      when: (s) => s.products.some((p) => p.def === 'p_ec' && p.launched && !p.shut),
      note: '你的电商平台订单暴增，非典让你的平台一夜之间被全国网民知道——你和马云站在了同一条起跑线上。',
      bonus: { fame: 4, users: 2 },
    },
    body: '2003 年春天，非典席卷全国。人们闭门不出，拨号上网的提示音成了最熟悉的声音——QQ 同时在线冲破 300 万，电商订单暴增。而在杭州湖畔花园，马云的七人小组被隔离在家，正秘密开发一个叫「淘宝」的网站。危机，永远是勇敢者的入场券。',
    footnote: '史实：2003 年 5 月淘宝网上线；非典客观上成为中国电商与即时通讯的超级催化剂。',
    choices: [
      { label: '全员居家办公，加码线上推广', hint: '资金 −4 · 用户 +4 · 声望 +1', cost: 4, fx: { funds: -4, users: 4, fame: 1, flags: ['sars_push'] } },
      { label: '给疫区捐一批物资', hint: '资金 −6 · 声望 +4', cost: 6, fx: { funds: -6, fame: 4, log: '你的公司名字登上了晚报头版。' } },
      { label: '缩在办公室等风头过去', fx: { log: '风平浪静之后，你发现赛道上多了很多新面孔。' } },
    ],
  },
  {
    id: 'ev_3721', turn: 19, kind: 'person', person: 'zhou',
    title: '3721 与 CNNIC 的战争',
    body: '「流氓软件」还是「民族创新」？周鸿祎的 3721 网络实名正和 CNNIC、百度打得天昏地暗，浏览器插件大战让网民的电脑不堪重负。红衣教主约你撸串：「兄弟，站个队呗？」',
    footnote: '史实：2003 年 12 月 CNNIC 停止 3721 通用网址合作；2005 年雅虎以 10 亿美元收购 3721。',
    choices: [
      { label: '公开力挺周鸿祎', hint: '好感 +2 · 声望 −1', fx: { rel: [['zhou', 2]], fame: -1 } },
      { label: '两边说和', hint: '好感 +1 · 声望 +1', fx: { rel: [['zhou', 1]], fame: 1 } },
      { label: '「我不掺和这种事」', hint: '声望 +1 · 好感 −1', fx: { fame: 1, rel: [['zhou', -1]] } },
    ],
  },
  {
    id: 'pay_netease', turn: 18, kind: 'payout',
    title: '网易奇迹：50 倍',
    cond: (s) => !!s.flags.inv_netease,
    body: '靠着短信 SP 和游戏《大话西游》，网易起死回生。股价从 0.6 美元一路飙到 30 多美元，丁磊登上 2003 胡润首富——你当年 15 万的抄底，如今值 165 万。丁磊打来电话：「兄弟，当年那笔钱，我一辈子记得。」',
    footnote: '史实：2003 年网易股价年内上涨近 50 倍，丁磊以 75 亿身家成为中国首富。',
    choices: [{ label: '落袋为安（资金 +150 · 声望 +2）', fx: { funds: 150, fame: 2, flags: ['payoff_netease'], log: '网易股票清仓，落袋 150 万。' } }],
  },
  {
    id: 'ev_sp_crack', turn: 21, kind: 'history',
    title: 'SP 大整顿',
    impact: { label: 'SP 整顿', incomeMult: 0.85, turns: 4 },
    competes: { product: 'p_sp', label: '梦网清算', mult: 0.7, turns: 4, heat: 25, note: '运营商清退乱扣费 SP，大批同行一夜归零——你的短信增值业务也进入寒冬。' },
    body: '2004 年，运营商启动 SP 业务大检查：乱扣费、陷阱订阅被点名清退，大批 SP 公司一夜归零。短信淘金热的野蛮时代，到头了。你的移动增值业务怎么办？',
    footnote: '史实：2004 年 5 月起中国移动开展 SP 治理，上千家 SP 被处罚，行业收入断崖下跌。',
    cond: (s) => s.products.some((p) => p.def === 'p_sp'),
    choices: [
      { label: '主动合规，退订费照退', hint: '资金 −5 · 声望 +2', cost: 5, fx: { funds: -5, fame: 2, flags: ['sp_clean'] } },
      { label: '能捞一笔是一笔', hint: '资金 +10 · 声望 −4', fx: { funds: 10, fame: -4, flags: ['sp_black'] } },
    ],
  },
  {
    id: 'pay_tencent', turn: 21, kind: 'payout',
    title: '企鹅上市：你的第一桶金',
    cond: (s) => !!s.flags.inv_tencent,
    body: '2004 年 6 月 16 日，腾讯控股在港交所敲锣，发行价 3.7 港元，马化腾身家一夜过亿。你 2000 年寒冬里那 6 万块的「友情入股」，连本带利翻了 15 倍。庆功宴上，马化腾端起酒杯：「没有你当年那笔钱，就没有今天的企鹅。」',
    footnote: '史实：2004 年 6 月 16 日腾讯于港交所主板上市，如今市值超 3 万亿港元。',
    choices: [{ label: '举杯庆祝（资金 +90 · 声望 +2）', fx: { funds: 90, fame: 2, flags: ['payoff_tencent'], log: '腾讯股票套现，落袋 90 万。' } }],
  },
  {
    id: 'pay_joyo', turn: 21, kind: 'payout',
    title: '亚马逊买下卓越',
    cond: (s) => !!s.flags.inv_joyo,
    body: '2004 年 8 月，亚马逊宣布以 7500 万美元全资收购卓越网。雷军在微博还没诞生的年代给你发了条短信：「你当年那 8 万，现在值 60 万。下次创业，还叫你。」',
    footnote: '史实：2004 年 8 月 19 日亚马逊收购卓越网，后更名为亚马逊中国。',
    choices: [{ label: '笑纳（资金 +60）', fx: { funds: 60, flags: ['payoff_joyo'], log: '卓越网股权变现 60 万。' } }],
  },
  {
    id: 'ev_alipay', turn: 23, kind: 'person', person: 'mayun',
    title: '支付宝：担保交易破局',
    impact: { label: '电商基建爆发', incomeMult: 1.15, turns: 4 },
    competes: { product: 'p_mpay', label: '支付宝之争', mult: 0.7, turns: 6, heat: 25, users: 3, note: '支付宝用「担保交易」定义了行业标准，你的支付用户正被淘宝生态虹吸。' },
    assess: (s) =>
      beforeP(s, 'p_mpay', 23)
        ? '【你的处境】你的移动支付比支付宝更早上线——你抢先定义了在线支付的玩法，马云在追赶你。'
        : ownsP(s, 'p_mpay')
          ? '【你的处境】你已有移动支付产品，与支付宝同场竞争。支付入口之争刚刚开始。'
          : ownsP(s, 'p_ec')
            ? '【你的处境】你有电商但缺支付——支付宝补上的正是你最薄弱的一环，要么合作，要么自建。'
            : '【你的处境】支付是电商的命门。谁掌握支付，谁就掌握下一个十年。',
    variant: {
      when: (s) =>
        s.products.some((p) => (p.def === 'p_mpay') && p.launched && !p.shut) || s.researched.includes('t_pay'),
      note: '有意思的是：你比支付宝更早布局了在线支付/移动支付。马云在发布会上被记者问及你时大方承认：「这条路，是先行者趟出来的。」',
      bonus: { fame: 5, users: 3 },
    },
    body: '2004 年 12 月，马云力推「支付宝」独立运营，用「担保交易」解决了电商最大的信任死结——买家怕付了钱收不到货，卖家怕发了货收不到钱。这个最初只是淘宝一个功能的小团队，即将长成金融巨兽。支付，成为电商的任督二脉。',
    footnote: '史实：2004 年 12 月支付宝从淘宝分拆独立，担保交易模式奠定中国电商信任基础。',
    choices: [
      { label: '研究支付与电商的结合', hint: '在线支付研发 +3', fx: { tech: ['t_pay', 3], rel: [['mayun', 1]] } },
      { label: '与支付宝谈接口合作', hint: '马云好感 +2 · 用户 +2', fx: { rel: [['mayun', 2]], users: 2 } },
      { label: '「支付是银行的生意，不碰」', hint: '声望 +1', fx: { fame: 1 } },
    ],
  },
  {
    id: 'ev_sd_sina', turn: 24, kind: 'history',
    title: '盛大突袭新浪',
    competes: { product: 'p_portal', label: '门户黄昏', mult: 0.85, turns: 6, heat: 10, note: '门户之王被恶意收购，宣告门户模式见顶——你的门户广告生意开始走下坡路。' },
    assess: (s) =>
      ownsP(s, 'p_portal')
        ? '【你的处境】你有门户网站。盛大的突袭说明：门户的黄金时代结束了，转型搜索、社交或电商才是出路。'
        : '【你的处境】门户争霸与你无关，但「资本运作」这门课，每个创业者都该补上。',
    body: '2005 年 2 月 19 日，陈天桥在二级市场 stealth 扫货，盛大宣布持有新浪 19.9% 股份，震动整个互联网。门户之王被人从背后捅了一刀，「收购与被收购」成了行业新主题。你的公司，要不要也学着资本运作？',
    footnote: '史实：2005 年 2 月 19 日盛大宣布收购新浪 19.9% 股份，上演中国互联网第一场恶意收购大戏。',
    choices: [
      { label: '学着做一笔小收购', hint: '资金 −20 · 用户 +4', cost: 20, fx: { funds: -20, users: 4, flags: ['acq_try'], log: '你收购了一家小而美的同行，用户并入你的平台。' } },
      { label: '围观学习资本运作', hint: '声望 +1', fx: { fame: 1 } },
    ],
  },
  {
    id: 'ev_aug2005', turn: 26, kind: 'history',
    title: '2005 年 8 月 · 百度的疯狂',
    competes: { product: 'p_search', label: '百度冲击', mult: 0.75, turns: 5, heat: 20, users: 2, note: '百度上市首日暴涨 354%，「百度一下」成为国民习惯，你的搜索流量被品牌效应吸走。' },
    assess: (s) =>
      beforeP(s, 'p_search', 26)
        ? '【你的处境】你的搜索引擎比百度更早上线——百度的暴涨证明了你押注的赛道，资本开始找你。'
        : ownsP(s, 'p_search')
          ? '【你的处境】你与百度同场竞技。百度首日 +354%，整个搜索赛道估值水涨船高。'
          : '【你的处境】你还在门户时代打法。搜索是下一个入口，百度已经抢先卡位。',
    variant: {
      when: (s) => s.products.some((p) => p.def === 'p_search' && p.launched && !p.shut),
      note: '你的搜索引擎与百度同场竞技，百度的暴涨让整个搜索赛道被资本重新定价——你的产品也跟着水涨船高。',
      bonus: { fame: 3 },
    },
    body: '这个 8 月信息量大得吓人：雅虎掏出 10 亿美元收购周鸿祎的 3721；8 月 5 日百度登陆纳斯达克，发行价 27 美元，收盘 122.54 美元——首日暴涨 354%，创美国股市 213 年来海外 IPO 首日涨幅纪录。华尔街第一次记住了「Chinese Internet」。',
    footnote: '史实：2005 年 8 月雅虎 10 亿美元收购雅虎中国（含 3721）；同月百度上市首日涨 354%。',
    choices: [
      { label: '研究中概股的玩法', hint: '研发 +2 · 声望 +1', fx: { tech: [null, 2], fame: 1 } },
      { label: '给百度团队发贺电', hint: '李彦宏好感 +2', fx: { rel: [['robin', 2]] } },
    ],
  },
  {
    id: 'pay_baidu', turn: 26, kind: 'payout',
    title: '百度一夜暴富神话',
    cond: (s) => !!s.flags.inv_baidu,
    body: '百度上市当天，你的股票账户数字跳得让你手抖：10 万变 130 万。更魔幻的是百度内部——一夜之间诞生了 8 个亿万富翁、50 多个千万富翁。李彦宏在庆功宴上找到你：「当年那 10 万，百度记得。」',
    choices: [{ label: '套现离场（资金 +120 · 声望 +2）', fx: { funds: 120, fame: 2, flags: ['payoff_baidu'], log: '百度股票套现 120 万。' } }],
  },
  {
    id: 'ev_360', turn: 29, kind: 'history',
    title: '360 安全卫士 · 免费革命',
    body: '离开雅虎的周鸿祎卷土重来，360 安全卫士宣布「永久免费」，把杀毒软件行业搅了个底朝天。「免费是最贵的」——这句话开始被所有创业者挂在嘴边。红衣教主喊话全行业：要么免费，要么去死。',
    footnote: '史实：2006 年 360 安全卫士上线，凭借免费策略三年内拿下 3 亿用户。',
    cond: (s) => s.turn >= 29,
    choices: [
      { label: '向他学习免费打法', hint: '研发 +2', fx: { tech: [null, 2] } },
      { label: '坚持收费是尊严', hint: '声望 +1', fx: { fame: 1 } },
    ],
  },
  {
    id: 'ev_iphone', turn: 32, kind: 'history',
    title: 'iPhone 时刻',
    impact: { label: '移动互联网前夜', incomeMult: 1.15, turns: 4 },
    competes: { product: 'p_wap', label: '智能机革命', mult: 0.6, turns: 6, heat: 20, note: 'iPhone 宣告 WAP 浏览时代终结——触屏 App 才是未来，你的手机站正在过时。' },
    assess: (s) =>
      beforeP(s, 'p_client', 32)
        ? '【你的处境】你的手机客户端比 iPhone 更早布局——当所有人还在观望时，你已经站在掌心入口上。'
        : ownsP(s, 'p_client')
          ? '【你的处境】你已有手机客户端。iPhone 会引爆整个移动端，你的布局即将兑现。'
          : '【你的处境】你还在 PC 端。入口正在从书桌移向掌心——留给桌面端的时间不多了。',
    body: '2007 年 1 月 9 日，乔布斯穿着黑色高领衫走上旧金山的台：「今天，苹果重新发明了手机。」没有键盘，一块玻璃，手指划过之处，世界变了。中关村的水货柜台前排起长队，嗅觉灵敏的人已经意识到：互联网的入口，正在从书桌移到掌心。',
    footnote: '史实：2007 年 1 月 9 日初代 iPhone 发布；2008 年 App Store 上线，开启移动应用大爆炸。',
    choices: [
      { label: 'All in 手机客户端', hint: '客户端研发 +3', fx: { tech: ['t_client', 3], flags: ['mobile_bet'] } },
      { label: '买一台水货回来拆', hint: '资金 −1 · 研发 +1', cost: 1, fx: { funds: -1, tech: [null, 1] } },
      { label: '「不就是个手机吗」', fx: { log: '三年后你会为这句话后悔。' } },
    ],
  },
  {
    id: 'pay_alibaba', turn: 34, kind: 'payout',
    title: '阿里巴巴 B2B 上市',
    cond: (s) => !!s.flags.inv_alibaba,
    body: '2007 年 11 月 6 日，阿里巴巴 B2B 业务在港交所上市，首日股价较发行价翻了三倍。你 1999 年在湖畔花园塞给马云的那 10 万块，如今值 190 万。马云发来短信只有八个字：「后天很美好，对吧？」',
    footnote: '史实：2007 年 11 月 6 日阿里巴巴 B2B 港股上市，市值一度超 200 亿美元。',
    choices: [{ label: '落袋（资金 +180 · 声望 +3）', fx: { funds: 180, fame: 3, flags: ['payoff_alibaba'], log: '阿里股权变现 180 万。' } }],
  },
  {
    id: 'ev_olympics', turn: 38, kind: 'history',
    title: '奥运流量洪峰',
    body: '2008 年 8 月 8 日，鸟巢的焰火点亮北京的夜空，也点亮了所有网站的流量曲线。央视网、新浪、搜狐的服务器被挤爆，全民上网看奥运——这是中国互联网的成人礼。你的运营团队连夜扩容，痛并快乐着。',
    footnote: '史实：2008 北京奥运会期间，中国网络视频直播首次成为主流观赛方式，网民数突破 2.5 亿。',
    choices: [
      { label: '连夜扩容服务器冲刺', hint: '资金 −6 · 用户 +5', cost: 6, fx: { funds: -6, users: 5 } },
      { label: '做奥运专题内容', hint: '资金 −3 · 声望 +3', cost: 3, fx: { funds: -3, fame: 3 } },
    ],
  },
  {
    id: 'ev_crisis', turn: 39, kind: 'history',
    title: '全球金融危机',
    impact: { label: '金融海啸', incomeMult: 0.8, turns: 5, fame: -1 },
    body: '雷曼兄弟倒了，全球股市绿得发黑（美股是绿的，但你的心是灰的）。VC 们集体消失，无数创业公司的融资协议一夜作废。2008 年冬天，马云那句「跪着过冬」在圈子里疯传。你的董事会再次把问题抛给你：怎么过这个冬天？',
    footnote: '史实：2008 年 9 月雷曼破产引发全球金融危机，中国互联网公司股价普遍腰斩。',
    choices: [
      { label: '现金为王：囤粮过冬', hint: '声望 +1', fx: { fame: 1, flags: ['cash_king'] } },
      { label: '裁员两人保现金流', hint: '团队 −2 · 资金 +6 · 声望 −3', fx: { team: -2, funds: 6, fame: -3 } },
      { label: '逆向扩招：抄底人才', hint: '资金 −12 · 团队 +2 · 研发 +2', cost: 12, fx: { funds: -12, team: 2, tech: [null, 2], flags: ['brave_hire'], log: '别人恐惧时你贪婪，工程师们排着队来面试。' } },
    ],
  },
  {
    id: 'ev_3g', turn: 40, kind: 'history',
    title: '3G 牌照发放',
    impact: { label: '3G 时代', incomeMult: 1.18, turns: 5, users: 2 },
    competes: { product: 'p_wap', label: '3G 替代潮', mult: 0.5, turns: 8, heat: 20, note: '3G 网速让原生 App 体验碾压 WAP 页面——手机站流量断崖式下跌。' },
    body: '2009 年 1 月 7 日，工信部发出三张 3G 牌照，中国移动、联通、电信三大运营商同台竞技。「上网本」「3G 手机」的广告铺满地铁通道，网速从 KB 跳到 MB——移动互联网的大门，真的开了。',
    footnote: '史实：2009 年 1 月 7 日中国发放 3G 牌照；同年 App Store 中国开发者生态开始爆发。',
    choices: [
      { label: '全力冲刺移动化', hint: '客户端研发 +3', fx: { tech: ['t_client', 3], flags: ['3g_rush'] } },
      { label: '先升级 WAP 站过渡', hint: '用户 +3', fx: { users: 3 } },
    ],
  },
  {
    id: 'ev_weibo', turn: 42, kind: 'history',
    title: '微博元年',
    impact: { label: '微博风潮', incomeMult: 1.15, turns: 4, users: 3 },
    competes: { product: 'p_sns', label: '微博冲击', mult: 0.7, turns: 6, heat: 25, users: 3, note: '微博重新定义了社交——140 字的全民围观，让你的传统 SNS 社区迅速失色。' },
    assess: (s) =>
      beforeP(s, 'p_sns', 42)
        ? '【你的处境】你的 SNS 社区比微博更早布局——微博的爆发验证了社交赛道，你的先发用户是护城河。'
        : ownsP(s, 'p_sns')
          ? `【你的处境】你有 SNS 社区，微博是直接竞争者。${vsUsers(s, 500, '微博')}`
          : '【你的处境】140 字的内容黑洞正在吸走流量。没有社交产品的你，正被边缘化。',
    body: '2009 年 8 月，新浪微博内测上线，140 个字改变了中文互联网的表达方式。明星入驻、全民围观、热搜诞生——「今天你织围脖了吗」成了见面问候语。又一次，一个新的流量黑洞正在形成。',
    footnote: '史实：2009 年 8 月 14 日新浪微博上线，一年内用户突破 5000 万。',
    choices: [
      { label: '火速开通官方微博', hint: '声望 +4 · 用户 +2', fx: { fame: 4, users: 2 } },
      { label: '研究类似产品', hint: '研发 +2', fx: { tech: [null, 2] } },
    ],
  },
  {
    id: 'ev_meituan', turn: 44, kind: 'person', person: 'wang',
    title: '王兴的千团大战',
    body: '2010 年 3 月，连续创业者王兴上线了美团网。此时全国已有上千家团购网站厮杀成一片红海，广告从电梯贴到公交车。这个从龙岩走出来的男人异常冷静：「大多数人高估了两年的变化，低估了十年的变化。」他在找钱，也在找人。',
    footnote: '史实：2010 年 3 月美团上线；「千团大战」次年烧掉数十亿，最终只剩美团等寥寥数家。',
    choices: [
      { label: '出资 10 万投资美团', hint: '资金 −10 · 获得「美团天使投资」', cost: 10, fx: { funds: -10, invest: 'inv_meituan', rel: [['wang', 1]] } },
      { label: '和他聊「无限游戏」', hint: '好感 +2 · 声望 +1', fx: { rel: [['wang', 2]], fame: 1 } },
      { label: '「团购就是烧钱游戏」', fx: { log: '王兴不置可否地笑了。' } },
    ],
  },
  {
    id: 'ev_xiaomi', turn: 45, kind: 'person', person: 'lei',
    title: '小米加步枪',
    body: '2010 年 4 月 6 日，中关村银谷大厦，雷军和十三个合伙人喝了碗小米粥，小米科技低调开张。「我要做一款像 iPhone 一样的国产手机，」他对你说，「硬件不赚钱，靠互联网服务赚钱——你觉得我疯了吗？」',
    footnote: '史实：2010 年 4 月 6 日小米成立；2011 年小米手机 1 发布，1999 元价格颠覆行业。',
    choices: [
      { label: '出资 15 万成为天使股东', hint: '资金 −15 · 获得「小米天使投资」', cost: 15, fx: { funds: -15, invest: 'inv_xiaomi', rel: [['lei', 2]] } },
      { label: '「不疯，我看好你」', hint: '好感 +2', fx: { rel: [['lei', 2]] } },
      { label: '「硬件哪有软件性感」', fx: { rel: [['lei', -1]] } },
    ],
  },
  {
    id: 'pay_meituan', turn: 47, kind: 'payout',
    title: '千团大战的幸存者',
    cond: (s) => !!s.flags.inv_meituan,
    body: '千团大战尸横遍野，美团却活着，而且越活越好。王兴回购了部分老股，你那 10 万块变成了 70 万。「下一站是外卖，」他在电话里说，「十年后再看这一局。」',
    choices: [{ label: '收下回购款（资金 +60）', fx: { funds: 60, flags: ['payoff_meituan'], log: '美团股权回购变现 60 万。' } }],
  },
  {
    id: 'pay_xiaomi', turn: 47, kind: 'payout',
    title: '小米估值起飞',
    cond: (s) => !!s.flags.inv_xiaomi,
    body: 'MIUI 的论坛用户突破百万，小米手机还没发布，估值已经翻着跟头往上涨。你的 15 万天使投资按最新一轮估值套现，变成 115 万。雷军发来短信：「风口上，猪都会飞——但我们是长了翅膀的猪。」',
    choices: [{ label: '部分套现（资金 +100）', fx: { funds: 100, flags: ['payoff_xiaomi'], log: '小米股权套现 100 万。' } }],
  },
  {
    id: 'ev_3q', turn: 47, kind: 'history',
    title: '3Q 大战 · 你的站队',
    impact: { label: '行业大洗牌', incomeMult: 1.1, turns: 2, users: 4, fame: 2 },
    competes: { product: 'p_im', label: '二选一风波', mult: 0.9, turns: 3, heat: 15, note: '「一个艰难的决定」让整个 IM 行业震荡，用户被迫站队，你的即时通讯也被卷入乱局。' },
    assess: (s) =>
      ownsP(s, 'p_im')
        ? `【你的处境】你是 IM 玩家，两强相争让你的产品成为「第三选择」。${vsUsers(s, 3000, 'QQ')}`
        : '【你的处境】你没有 IM，这场大战与你无关——但战后「开放平台」的新规则会重塑所有人。',
    variant: {
      when: (s) => s.products.some((p) => p.def === 'p_im' && p.launched && !p.shut),
      note: '作为 IM 厂商，你被卷入这场大战的舆论漩涡——大量不满 3Q 二选一的用户涌向你的产品。',
      bonus: { users: 3, fame: 2 },
    },
    body: '2010 年 11 月 3 日晚，腾讯发布公开信：装有 360 的电脑将停止运行 QQ。全国网民被迫在两个图标之间做选择，史称「一个艰难的决定」。工信部连夜约谈，央视轮番报道。作为中国互联网的一员，全网都在问：你站谁？这是你在这个时代的最后一个回合。',
    footnote: '史实：2010 年 11 月 3Q 大战爆发，直接推动中国互联网走向开放与平台化；2014 年最高法判腾讯胜诉。',
    choices: [
      { label: '站腾讯：生态和用户最重要', hint: '用户 +6 · 马化腾好感 +2', fx: { users: 6, rel: [['pony', 2]], log: '你公开支持腾讯的开放平台战略。' } },
      { label: '站 360：用户有选择的权利', hint: '用户 +5 · 声望 +2 · 周鸿祎好感 +2', fx: { users: 5, fame: 2, rel: [['zhou', 2]], log: '你声援了 360 的「用户选择权」。' } },
      { label: '中立：呼吁行业自律', hint: '声望 +4', fx: { fame: 4, log: '你联合三十家企业发布《互联网行业自律宣言》。' } },
    ],
  },
];

/* ================= 随机事件池 ================= */
export const RANDOMS: GameEvent[] = [
  {
    id: 'r_cnnic', turn: -1, kind: 'random', title: 'CNNIC 报告：网民又涨了',
    body: 'CNNIC 最新统计报告显示，中国网民数量再创新高。你的运营邮箱里涌进来一堆新注册用户，前台小妹说客服电话被打爆了。',
    choices: [
      { label: '加班加点扩容接待', hint: '用户 +2', fx: { users: 2 } },
      { label: '发一封全员感谢邮件', hint: '声望 +1 · 用户 +1', fx: { fame: 1, users: 1 } },
    ],
  },
  {
    id: 'r_hack', turn: -1, kind: 'random', title: '黑客深夜来访', neg: true,
    body: '凌晨三点，运维冲进你家：「数据库被拖了！」屏幕上留着一行字：「贵站漏洞已修复，请加强安全意识——一个路过的红客」。这年头的黑客，还挺讲武德。',
    choices: [
      { label: '花钱请安全顾问 + 赔偿用户', hint: '资金 −9', cost: 9, fx: { funds: -9, fame: 1, log: '你补上了安全短板，还赔了受影响用户一笔钱。' } },
      { label: '连夜自己打补丁', hint: '研发 +1 · 用户 −2', fx: { tech: [null, 1], users: -2, log: '补丁打上了，但流失的用户回不来了。' } },
    ],
  },
  {
    id: 'r_media', turn: -1, kind: 'random', title: '《互联网周刊》想采访你',
    body: '记者打来电话：「我们下一期封面是『中国互联网新生代』，想聊聊你的创业故事。」上封面，还是低调发育？',
    choices: [
      { label: '上封面！讲个好故事', hint: '声望 +3', fx: { fame: 3 } },
      { label: '婉拒：产品还没做好', hint: '研发 +1', fx: { tech: [null, 1] } },
    ],
  },
  {
    id: 'r_poach', turn: -1, kind: 'random', title: '核心程序员被挖角', neg: true,
    body: '你手下的技术骨干收到了一家门户的 offer：工资翻倍，还配 BP 机。他站在你办公室门口，欲言又止。',
    choices: [
      { label: '加薪留人', hint: '资金 −4', cost: 4, fx: { funds: -4, log: '骨干留下来了，干劲更足。' } },
      { label: '祝他前程似锦', hint: '团队 −1 · 声望 −1', fx: { team: -1, fame: -1 } },
    ],
  },
  {
    id: 'r_netbar', turn: -1, kind: 'random', title: '网吧包夜经济',
    body: '全国网吧生意火爆，包夜五块钱。网管们发现，客人们最爱上的网站里，有你的。',
    choices: [
      { label: '给网吧送定制主页', hint: '用户 +2', fx: { users: 2 } },
    ],
  },
  {
    id: 'r_y2k', turn: 3, kind: 'random', title: '千年虫恐慌',
    body: '1999 年末，「千年虫」传说让全国企业疯狂采购 IT 改造服务。连你家楼下小卖部都在问：「电脑会不会在零点爆炸？」外包订单接到手软。',
    choices: [
      { label: '接几单千年虫改造工程', hint: '资金 +5', fx: { funds: 5 } },
      { label: '专心写自己的代码', hint: '研发 +1', fx: { tech: [null, 1] } },
    ],
  },
  {
    id: 'r_worldcup', turn: 13, kind: 'random', title: '世界杯 + 足球彩票',
    body: '2002 年韩日世界杯，中国队历史性出线！全民熬夜看球，门户网站的体育频道流量翻了三倍，你的服务器风扇呼呼作响。',
    cond: (s) => s.turn === 13,
    choices: [
      { label: '上线世界杯竞猜专题', hint: '资金 +6 · 声望 +1', fx: { funds: 6, fame: 1 } },
      { label: '稳一点，只加带宽', hint: '资金 +3', fx: { funds: 3 } },
    ],
  },
  {
    id: 'r_shenzhou', turn: 18, kind: 'random', title: '神舟五号飞天',
    body: '2003 年 10 月 15 日，杨利伟进入太空。全网直播，流量暴涨，爱国情绪刷屏——「为中华之崛起而上网」成了签名档热句。',
    cond: (s) => s.turn === 18,
    choices: [
      { label: '推出航天纪念皮肤', hint: '用户 +2 · 声望 +2', fx: { users: 2, fame: 2 } },
    ],
  },
  {
    id: 'r_snow', turn: 36, kind: 'random', title: '南方大雪灾',
    body: '2008 年 1 月，暴雪压境，京广线瘫痪，数百万人滞留车站。人们裹着棉被刷网页等消息，线上流量创冬季新高。',
    cond: (s) => s.turn === 36,
    choices: [
      { label: '上线春运互助信息平台', hint: '用户 +3 · 声望 +2', fx: { users: 3, fame: 2 } },
      { label: '捐款捐物', hint: '资金 −3 · 声望 +2', cost: 3, fx: { funds: -3, fame: 2 } },
    ],
  },
  {
    id: 'r_domain', turn: -1, kind: 'random', title: '域名保卫战', neg: true,
    body: '有黄牛抢注了你的品牌拼音域名，开价两万。前台小妹愤愤不平：「这不是敲诈吗！」',
    choices: [
      { label: '掏钱赎回', hint: '资金 −2 · 声望 +1', cost: 2, fx: { funds: -2, fame: 1 } },
      { label: '换个域名，硬刚到底', hint: '用户 −1 · 声望 +1', fx: { users: -1, fame: 1 } },
    ],
  },
  {
    id: 'r_board', turn: -1, kind: 'special', title: '董事会摊牌',
    cond: (s) => s.equity < 50 && !s.ipo,
    body: '你的持股已经低于 50%，几位投资人股东在董事会发难：「公司烧钱太快，必须换 CFO、砍业务线。」会议室里剑拔弩张，这是控制权之战的前哨。',
    choices: [
      { label: '增发股份安抚股东', hint: '股权 −8 · 资金 +30', fx: { funds: 30, flags: ['dilute_more'], log: '你增发 8% 股份换取 30 万，暂时稳住了董事会。' } },
      { label: '自掏腰包回购股份', hint: '资金 −15 · 股权 +5 · 声望 +1', cost: 15, fx: { funds: -15, flags: ['buyback'], fame: 1, log: '你拿出 15 万回购股份，持股回升，腰杆硬了。' } },
      { label: '强硬对抗', hint: '声望 +2 · 随机冲击', fx: { fame: 2, flags: ['board_fight'], log: '你在董事会上拍了桌子。股东们记下了这一笔。' } },
    ],
  },
  {
    id: 'r_subsidy', turn: -1, kind: 'random', title: '政府信息化专项补贴',
    cond: (s) => s.fame >= 20,
    body: '市里搞「企业上网工程」，你的公司因为有名气，被推荐申报信息化专项补贴。材料要跑三趟，但钱是实打实的。',
    choices: [
      { label: '申报补贴', hint: '资金 +8 · 声望 +1', fx: { funds: 8, fame: 1 } },
      { label: '嫌麻烦不报', fx: { log: '你懒得跑流程，把机会让给了同行。' } },
    ],
  },
  {
    id: 'r_talent', turn: -1, kind: 'random', title: '竞争对手挖角', neg: true,
    cond: (s) => s.team >= 5,
    body: '一家财大气粗的同行开出双倍工资挖你的技术骨干，还附带解决户口。HR 拿着辞职信在门口等你定夺。',
    choices: [
      { label: '加薪 + 期权留人', hint: '资金 −6 · 研发 +2', cost: 6, fx: { funds: -6, tech: [null, 2] } },
      { label: '放手让他走', hint: '团队 −1 · 研发 −2', fx: { team: -1, tech: [null, -2] } },
    ],
  },
  {
    id: 'r_pricewar', turn: -1, kind: 'random', title: '行业价格战', neg: true,
    cond: (s) => s.products.filter((p) => p.launched && !p.shut).length >= 2,
    body: '同行发起疯狂价格战，你的客户天天拿着对手的报价单来压价。跟，伤利润；不跟，丢市场。',
    choices: [
      { label: '跟进降价保份额', hint: '资金 −8 · 用户 +3', cost: 8, fx: { funds: -8, users: 3 } },
      { label: '坚持品质不打折', hint: '用户 −2 · 声望 +2', fx: { users: -2, fame: 2 } },
    ],
  },
  {
    id: 'r_opensource', turn: -1, kind: 'random', title: '开源社区的馈赠',
    body: '你的工程师在开源社区发现了几个宝藏项目，用它们重构后，服务器成本直接砍半。开源，是这个时代最浪漫的礼物。',
    choices: [
      { label: '拥抱开源', hint: '研发 +2 · 资金 +3', fx: { tech: [null, 2], funds: 3 } },
    ],
  },
  {
    id: 'r_stockcrash', turn: -1, kind: 'special', title: '股价惊魂一日', neg: true,
    cond: (s) => !!s.ipo,
    body: '一份做空报告突袭你的公司，股价单日跳水。交易员电话被打爆，董秘问你要不要发澄清公告。',
    choices: [
      { label: '火速澄清 + 回购', hint: '资金 −15 · 稳住市值', cost: 15, fx: { funds: -15, flags: ['stock_defend'], fame: 2, log: '你连夜发布澄清公告并启动回购，股价止住了跌势。' } },
      { label: '冷处理', hint: '市值大跌 · 声望 −3', fx: { fame: -3, users: -3, flags: ['stock_ignore'], log: '你选择沉默，股价在流言中继续下探，用户也开始流失。' } },
    ],
  },
  {
    id: 'r_analyst', turn: -1, kind: 'special', title: '分析师集体唱多',
    cond: (s) => !!s.ipo,
    body: '多家券商分析师发布研报，一致上调你的目标价，称你是「最被低估的中国互联网资产」。机构资金闻风而动。',
    choices: [
      { label: '顺势路演', hint: '市值大涨 · 声望 +2', fx: { fame: 2, flags: ['analyst_bull'], log: '你趁热打铁全球路演，市值一路走高。' } },
    ],
  },
  {
    id: 'r_festival', turn: -1, kind: 'random', title: '春节流量洪峰',
    body: '春运开启，返乡人潮在网吧和家里的电脑上刷起了你的网站。除夕夜服务器负载创新高，这是甜蜜的负担。',
    choices: [
      { label: '全力保障', hint: '资金 −3 · 用户 +2', cost: 3, fx: { funds: -3, users: 2 } },
      { label: '听天由命', hint: '用户 +1 · 声望 −1', fx: { users: 1, fame: -1 } },
    ],
  },
];

/* ================= 投资人 / 融资 ================= */
export const INVESTORS = [
  { name: 'IDG 资本 · 熊晓鸽', style: '看人下菜，出手果断' },
  { name: '软银 · 孙先生', style: '六分钟做完决定的男人' },
  { name: '今日资本 · 徐女士', style: '「你的增长，值这个价」' },
  { name: '红杉 · 沈先生', style: '赛道、选手、赛车，缺一不可' },
  { name: '经纬 · 邵先生', style: '只投自己看得懂的' },
];

export const RANKS = [
  { min: 2200, rank: 'S', title: 'BAT 级 · 互联网传奇', desc: '你的公司名字和腾讯、百度写进了同一本教科书。十年后的教科书里，有一章专门讲你。' },
  { min: 1000, rank: 'A', title: '一线巨头', desc: '你成了行业规则的制定者之一，发布会门票一票难求。' },
  { min: 450, rank: 'B', title: '上市公司', desc: '敲钟那天，你想起了 1999 年那台二手服务器。' },
  { min: 200, rank: 'C', title: '垂直领域之王', desc: '在自己的赛道上，没人敢小看你。' },
  { min: 80, rank: 'D', title: '穿越泡沫的幸存者', desc: '活下来，就已经赢了 90% 的同行。' },
  { min: 0, rank: 'E', title: '互联网的一页注脚', desc: '你的网站成了 internet archive 里的一枚标本。但你来过，这就够了。' },
];

export const HISTORICAL_BOARD = [
  { name: '腾讯', val: 4200 },
  { name: '百度', val: 3200 },
  { name: '阿里巴巴', val: 1300 },
  { name: '盛大网络', val: 640 },
  { name: '网易', val: 520 },
  { name: '搜狐', val: 380 },
  { name: '新浪', val: 340 },
];

export const ACHIEVEMENTS: { id: string; name: string; desc: string; check: (s: GameState, final: boolean) => boolean }[] = [
  { id: 'ach_first', name: '抢滩登陆', desc: '前两年内上线第一个产品', check: (s) => s.products.some((p) => p.launched && (p.launchedTurn ?? 99) <= 7) },
  { id: 'ach_winter', name: '泡沫幸存者', desc: '在互联网寒冬（2001年）中资金为正', check: (s) => s.turn >= 10 && s.funds > 0 },
  { id: 'ach_bat', name: 'BAT 见证人', desc: '结识马云、马化腾、李彦宏', check: (s) => ['mayun', 'pony', 'robin'].every((p) => s.met.includes(p)) },
  { id: 'ach_investor', name: '幕后金主', desc: '任意一笔投资成功套现', check: (s) => Object.keys(s.flags).some((f) => f.startsWith('payoff_')) },
  { id: 'ach_prophet', name: '先知先觉', desc: '2008 年前上线手机客户端', check: (s) => s.products.some((p) => p.def === 'p_client' && (p.launchedTurn ?? 99) <= 35) },
  { id: 'ach_unicorn', name: '独角兽俱乐部', desc: '公司估值突破 1000 万（A 级门槛）', check: (s) => s.history.some((v) => v >= 1000) },
  { id: 'ach_social', name: '社交达人', desc: '结识 8 位以上时代人物', check: (s) => s.met.length >= 8 },
  { id: 'ach_tycoon', name: '大厂长', desc: '团队规模达到 20 人', check: (s) => s.team >= 20 },
  { id: 'ach_sina', name: '王志东的门徒', desc: '并入新浪体系', check: (s) => !!s.flags.sina_merge },
  { id: 'ach_legend', name: '互联网传奇', desc: '终局估值进入 S 级', check: (s, final) => final && (s.outcome?.valuation ?? 0) >= 2200 },
];

export const BOOT_LINES = [
  'AWARD BIOS v4.51PG (C) 1999 Award Software',
  'CPU : Pentium III 500MHz ... OK',
  'Memory Test : 65536 KB ... OK',
  'Detecting IDE drives ... Quantum 火球 10.2GB',
  'Modem : Hayes 56K 内置猫 ... 拨号中',
  '嘟——嘟嘟——哔哔哔——沙沙沙沙',
  'Connected at 52000 bps · 中国电信 163',
  'C:\\> cd internet',
  'C:\\internet> run 1999.exe',
  '正在载入：中国互联网 · 1999 ...',
];
