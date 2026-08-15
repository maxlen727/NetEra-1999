# AGENTS.md - 开发者指南

## 📋 项目概述

本项目是一个**1999 年中文互联网创业模拟游戏**，采用 React + TypeScript + Vite 构建。玩家扮演穿越回 1999 年的创业者，在 48 个回合（1999 Q1 - 2010 Q4）中经营互联网公司，体验中国互联网从门户时代到移动互联网时代的完整历程。

### 核心设计理念

- **历史沉浸感**：所有事件、人物、产品均基于真实历史
- **策略深度**：类似《文明 6》的回合制策略玩法
- **数值平衡**：精心调校的经济系统，确保挑战性与可玩性
- **多结局**：上市、收购、破产等多种结局路径

---

## 🏗️ 架构说明

### 目录结构

```
src/
├── game/                    # 游戏核心逻辑（纯函数，无 UI 依赖）
│   ├── types.ts            # TypeScript 类型定义
│   ├── data.ts             # 游戏数据配置（事件、人物、产品、科技树）
│   ├── engine.ts           # 游戏引擎（回合推进、数值计算、状态更新）
│   └── sfx.ts              # 音效处理
├── components/              # React 组件
│   ├── screens.tsx         # 主界面（开始菜单、游戏主界面、结算画面）
│   ├── panels.tsx          # 功能面板（研发、产品、财务、人物等）
│   └── ui.tsx              # 基础 UI 组件（按钮、卡片、进度条等）
├── App.tsx                 # 应用入口（状态管理、路由）
├── main.tsx                # React 渲染入口
└── index.css               # 全局样式
```

### 数据流

```
用户操作 → Action → reducer (engine.ts) → GameState 更新 → React 重渲染
```

**关键设计**：游戏核心逻辑（`game/` 目录）是纯函数式的，不依赖任何 UI 框架，便于测试和复用。

---

## 📊 核心数据结构

### GameState（游戏状态）

定义于 `src/game/types.ts`，包含所有游戏状态：

```typescript
interface GameState {
  phase: 'boot' | 'setup' | 'play' | 'over';  // 游戏阶段
  turn: number;        // 当前回合 (0-47)
  name: string;        // 公司名称
  track: string;       // 创业赛道
  difficulty: Difficulty;  // 难度
  
  // 核心资源
  funds: number;       // 资金（万元）
  users: number;       // 用户数（万）
  fame: number;        // 声望 (0-100)
  team: number;        // 团队人数
  ap: number;          // 行动力
  
  // 公司资产
  policies: string[];      // 已选政策
  researched: string[];    // 已研发技术
  products: ProductInst[]; // 产品实例
  advisors: string[];      // 顾问（历史人物）
  
  // 关系网
  rel: Record<string, number>;  // 与历史人物的关系
  met: string[];                // 已结识人物
  
  // 标志位
  flags: Record<string, boolean>;  // 成就、投资事件等
  
  // 结局信息
  outcome: Outcome | null;
}
```

### GameEvent（游戏事件）

定义历史事件的结构：

```typescript
interface GameEvent {
  id: string;
  turn: number;           // 触发回合（对齐真实历史时间）
  kind: 'history' | 'person' | 'random' | 'payout' | 'special';
  title: string;
  body: string;           // 事件描述
  footnote?: string;      // 史实注释
  person?: string;        // 关联人物 ID
  choices: Choice[];      // 玩家选择
  impact?: {...};         // 行业冲击效果
  variant?: {...};        // 先驱者变体（若玩家抢先做出产品）
}
```

### ProductDef（产品定义）

```typescript
interface ProductDef {
  id: string;
  name: string;
  tech: string;           // 所需技术
  devCost: number;        // 研发成本
  work: number;           // 开发工作量（回合数）
  upkeep: number;         // 每季运维成本
  base: number;           // 基础收入
  ucoef: number;          // 用户收入系数
  pull: number;           // 拉新能力
  fame: number;           // 声望加成
  desc: string;
}
```

---

## ⚙️ 核心引擎逻辑

### 回合推进流程 (`engine.ts:endTurn`)

每回合执行以下步骤：

1. **产品开发**：增加进度，完成则上线
2. **运营衰减**：产品热度自然下降
3. **行业冲击倒计时**：临时效果过期
4. **研发推进**：自动增加研究进度
5. **财务结算**：收入 − 运维 − 工资
6. **用户增长**：有机增长 + 产品拉新
7. **声望变化**：产品加成 + 衰减
8. **里程碑检查**：先驱者、用户数等
9. **服务器检查**：过载惩罚
10. **结局判定**：破产、上市、时间到

### 数值计算公式

#### 产品收入
```typescript
收入 = (base + 用户数 × ucoef) 
     × 时代倍率 × 难度倍率 
     × 定价策略 × 热度加成 
     × 行业冲击 × 老化惩罚 
     × 品牌溢价 × Buff 加成
```

#### 用户增长
```typescript
增长 = (0.15 + 声望×0.04 + Σ产品 pull 值) 
     × 时代倍率^0.8 × 难度倍率
     × 政策 Buff × 顾问 Buff
```

#### 估值计算
```typescript
估值 = 现金×0.6 
     + 用户×1.2 + 声望×1.5 + 技术点×2
     + 已研发技术×12
     + 产品价值（研发成本×0.5 + 基础×2 + ...）
     + 机房等级×25
     + 时代红利
     + 季度营收×5（P/S 倍数）
     + 投资布局加分
```

---

## 📝 添加新内容指南

### 添加历史事件

在 `src/game/data.ts` 的 `EVENTS` 数组中添加：

```typescript
{
  id: 'ev_your_event',
  turn: 20,  // 对应 2004 年 Q1
  kind: 'history',
  title: '事件标题',
  body: '事件描述，尽量还原历史氛围...',
  footnote: '史实：xxxx 年 xx 月，真实历史背景...',
  choices: [
    { 
      label: '选项文案', 
      hint: '效果提示', 
      fx: { funds: 10, fame: 2 }  // 效果
    },
  ],
}
```

**回合对照表**：
- turn 0-9: 1999-2001（门户时代）
- turn 10-21: 2001-2004（SP/网游）
- turn 22-33: 2004-2007（Web 2.0）
- turn 34-47: 2007-2010（移动互联）

### 添加历史人物

在 `PERSONS` 数组中添加：

```typescript
{
  id: 'your_id',
  name: '人物姓名',
  title: '头衔 / 职位',
  co: '所属公司',
  quote: '名人名言',
  windowTurn: 5,  // 首次登场回合
  color: '#hex 颜色',
  hireCost: 40,   // 聘请费用
  buffName: 'Buff 名称',
  buffDesc: 'Buff 效果描述',
}
```

然后在 `engine.ts` 的 `adv()` 函数中实现 Buff 逻辑。

### 添加新产品

在 `PRODUCTS` 数组中添加：

```typescript
{
  id: 'p_your_product',
  name: '产品名称',
  tech: 't_required_tech',  // 前置技术
  devCost: 35,    // 研发成本（万元）
  work: 4,        // 开发工作量（回合）
  upkeep: 1.2,    // 每季运维（万元）
  base: 5.0,      // 基础收入（万元/季）
  ucoef: 0.06,    // 每万用户贡献（万元）
  pull: 0.3,      // 拉新能力
  fame: 0.2,      // 声望加成
  desc: '产品描述',
}
```

同时需要在 `TECHS` 中添加对应技术解锁。

### 添加新技术

在 `TECHS` 数组中添加：

```typescript
{
  id: 't_your_tech',
  name: '技术名称',
  era: 2,         // 所属时代 (0-3)
  cost: 7,        // 研发点数需求
  req: ['t_bbs'], // 前置技术（必须全部满足）
  reqAny: [],     // 可选前置（满足其一即可）
  desc: '技术描述',
  unlocks: 'p_your_product',  // 解锁的产品
}
```

---

## 🎨 UI 开发指南

### 组件分类

1. **Screens** (`screens.tsx`)：全屏界面
   - `BootScreen`：加载动画
   - `SetupScreen`：开局设置（赛道、难度、穿越物资）
   - `GameScreen`：游戏主界面
   - `OutcomeScreen`：结局画面

2. **Panels** (`panels.tsx`)：功能面板
   - `ResearchPanel`：科技树
   - `ProductPanel`：产品管理
   - `FinancePanel`：财务报表
   - `PersonPanel`：人物互动
   - `MarketPanel`：市场营销

3. **UI** (`ui.tsx`)：原子组件
   - `Card`、`Button`、`ProgressBar`、`Toast` 等

### 状态管理

使用 React 的 `useReducer` 管理全局状态：

```typescript
const [state, dispatch] = useReducer(reducer, initialState);

// 触发动作
dispatch({ type: 'END_TURN' });
dispatch({ type: 'BUILD', def: 'p_bbs' });
dispatch({ type: 'SET_RESEARCH', id: 't_portal' });
```

Reducer 实现在 `engine.ts` 的 `reducer()` 函数。

---

## 🔧 开发命令

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint
```

---

## 🧪 测试建议

### 单元测试重点

1. **数值计算**：`productIncome()`、`organicGrowth()`、`valuation()`
2. **回合逻辑**：`endTurn()` 的各步骤
3. **事件触发**：`queueEvents()` 的条件判断
4. **结局判定**：破产线、上市条件

### 手动测试清单

- [ ] 所有难度通关验证
- [ ] 所有赛道特色验证
- [ ] 所有历史事件触发
- [ ] 所有人物 Buff 生效
- [ ] 先驱者里程碑达成
- [ ] 各种结局路径（上市/收购/破产）

---

## 📚 参考资料

### 真实历史事件时间线

| 年份 | 事件 |
|------|------|
| 1999.02 | OICQ 上线 |
| 1999.09 | 阿里巴巴创立 |
| 2000.01 | 百度成立 |
| 2000.04 | 纳斯达克崩盘 |
| 2001.07 | 网易停牌 |
| 2001.09 | 《传奇》运营 |
| 2004.06 | 腾讯上市 |
| 2005.08 | 百度上市 |
| 2007.01 | iPhone 发布 |
| 2009.01 | 3G 牌照发放 |

### 数据来源

- CNNIC 中国互联网络发展状况统计报告
- 各公司招股书、年报
- 《沸腾十五年》《浪潮之巅》等书籍

---

## 🤝 协作规范

### Git Commit 规范

```
feat: 添加新功能（如：添加新历史事件）
fix: 修复 bug
balance: 数值调整
docs: 文档更新
refactor: 代码重构
ui: 界面优化
```

### 代码风格

- 使用 TypeScript 严格模式
- 函数式编程优先（纯函数、不可变数据）
- 组件拆分粒度适中（单文件不超过 300 行）
- 注释关键算法和历史考据

---

## 💡 设计哲学

> **「让历史自己说话」**

本项目的核心设计理念是：**尽可能还原真实历史**，让玩家在决策中感受那个时代的机遇与挑战。每一个事件、每一句台词、每一个数值，都应有历史依据。

- 事件文案引用真实人物的名言或采访
- 数值设计参考当时的市场规模和增长率
- 产品特性反映当时的技术水平和商业模式

**目标**：不仅是一个游戏，更是一部可交互的中国互联网史。

---

## 📞 联系与维护

如有问题或建议，请提交 Issue 或 Pull Request。

**记住**：我们不是在写代码，而是在重现一个伟大的时代。

---

*最后更新：2024 年*
