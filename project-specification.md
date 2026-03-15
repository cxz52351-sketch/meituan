# 大学城美食地图 — 完整项目规格说明书

> 本文档详尽描述项目的每一个细节，供 AI 编程助手从零完美复刻此项目。

---

## 一、项目概述

### 1.1 产品定位
「美团·大学城美食」是一个**移动端Web应用**，帮助北京高校大学生快速决策"今天吃什么"。设计风格模仿美团App，核心是用美团交易数据（复购率、学生订单量、实付均价）来辅助决策，而非仅靠评分。

### 1.2 核心特色
- **纯前端项目**：所有餐厅/评论/优惠数据静态存储在代码中，无后端数据库
- **唯一的外部API**：AI聊天功能调用 DeepSeek API（OpenAI兼容格式），通过 Vite dev proxy 转发
- **美团品牌风格**：主色调为美团黄 `#FFD100` + 黑色 `#111111`，绿色 `#06C167` 作为强调色
- **移动端优先**：max-width 1200px 居中，底部固定导航栏，safe-area-inset-bottom 适配

### 1.3 技术栈
- **React 19** + **TypeScript**（严格模式：noUnusedLocals, noUnusedParameters）
- **Vite 5** + `@vitejs/plugin-react`
- **React Router DOM 7**（BrowserRouter）
- **纯CSS**：单文件 `src/styles/index.css`（约3300行），无UI框架，使用CSS变量
- 无状态管理库、无测试框架、无lint工具

---

## 二、项目结构

```
campus-food-map/
├── index.html                 # 入口HTML，lang="zh-CN"，引入Noto Sans SC字体
├── package.json
├── tsconfig.json              # target ES2020, strict: true
├── tsconfig.node.json
├── vite.config.ts             # port:3000, open:true, DeepSeek proxy
├── src/
│   ├── main.tsx               # 入口：React.StrictMode + BrowserRouter + App
│   ├── App.tsx                # 全局布局：header + routes + nav
│   ├── vite-env.d.ts
│   ├── types/
│   │   ├── index.ts           # 核心类型定义
│   │   └── chat.ts            # AI聊天相关类型
│   ├── data/
│   │   ├── restaurants.ts     # 餐厅数据(20条) + 大学列表 + 榜单元数据
│   │   ├── reviews.ts         # 学生评论数据(22条) + 查询函数
│   │   ├── deals.ts           # 优惠券/拼单优惠/自取优惠 + 今日翻牌
│   │   └── groupOrders.ts     # 拼单广场数据(14条) + 查询函数
│   ├── services/
│   │   └── ai.ts              # AI服务：系统提示词 + 工具定义 + SSE流式调用
│   ├── components/
│   │   ├── RestaurantCard.tsx  # 横向滚动卡片
│   │   ├── RestaurantListItem.tsx  # 纵向列表项
│   │   ├── FilterModal.tsx    # 筛选弹窗
│   │   └── ChatAgent.tsx      # AI聊天组件/页面
│   ├── pages/
│   │   ├── HomePage.tsx       # 首页
│   │   ├── MapPage.tsx        # 地图页
│   │   ├── ListPage.tsx       # 列表页
│   │   ├── RandomPage.tsx     # 随机选择页
│   │   ├── RankPage.tsx       # 榜单页
│   │   ├── GroupOrderPage.tsx  # 拼单广场页
│   │   └── DetailPage.tsx     # 餐厅详情页
│   └── styles/
│       └── index.css          # 全局样式（约3300行）
```

---

## 三、配置文件详情

### 3.1 package.json
```json
{
  "name": "campus-food-map",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.13.1"
  },
  "devDependencies": {
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.9.3",
    "vite": "^5.4.0"
  }
}
```

### 3.2 vite.config.ts
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepseek/, '')
      }
    }
  }
})
```

### 3.3 index.html
- `lang="zh-CN"`
- 引入 Google Fonts: `Noto Sans SC`（weights: 400, 500, 600, 700）
- favicon 为 `/favicon.svg`
- title: `大学城美食地图 - 3分钟决定今天吃什么`

### 3.4 tsconfig.json
- target: ES2020
- lib: ES2020, DOM, DOM.Iterable
- jsx: react-jsx
- strict: true
- noUnusedLocals: true, noUnusedParameters: true, noFallthroughCasesInSwitch: true
- moduleResolution: bundler

---

## 四、类型系统

### 4.1 核心类型 (`src/types/index.ts`)

```ts
// 餐厅类型
interface Restaurant {
  id: string;
  name: string;
  category: Category;
  tags: string[];
  rating: number;           // 如 4.5
  reviewCount: number;
  priceRange: PriceRange;
  avgPrice: number;          // 人均价格（元）
  distance: number;          // 距离（米）
  walkTime: number;          // 步行时间（分钟）
  address: string;
  phone: string;
  openTime: string;          // "HH:MM" 格式
  closeTime: string;         // "HH:MM" 格式
  images: string[];          // Unsplash 图片 URL 数组
  description: string;
  recommendDishes: string[];
  tips: string[];
  coordinates: { lat: number; lng: number };
  university: University;
  scenes: Scene[];
  features: Feature[];
  // 美团交易数据（核心差异化字段）
  repurchaseRate: number;       // 学生复购率 (0-1)
  weeklyStudentOrders: number;  // 本周学生订单量
  actualPayPrice: number;       // 学生实付均价（含满减/红包后）
  studentDiscount?: string;     // 学生专属优惠描述
  avgDeliveryMinutes: number;   // 平均出餐时间（分钟）
}

type Category = '中餐' | '西餐' | '日料' | '韩餐' | '火锅' | '烧烤' | '小吃' | '快餐' | '饮品' | '甜点' | '面食' | '粥店' | '东南亚' | '其他';

type PriceRange = 'budget' | 'affordable' | 'moderate' | 'premium';

type University = '北京大学' | '清华大学' | '中国人民大学' | '北京师范大学' | '北京航空航天大学';

type Scene = '一个人' | '和室友' | '约会' | '聚餐' | '请客' | '深夜' | '快速';

type Feature = '穷鬼友好' | '快速出餐' | '环境好' | '分量足' | '有包间' | '可外带' | '有wifi';

interface FilterOptions {
  university: University | 'all';
  priceRange: PriceRange | 'all';
  category: Category | 'all';
  maxWalkTime: number;
  scene: Scene | 'all';
  sortBy: 'rating' | 'distance' | 'price';
}

interface RankList {
  id: string;
  title: string;
  icon: string;
  description: string;
  filterFn: (r: Restaurant) => boolean;   // 类型中定义了但实际数据未使用
  sortFn: (a: Restaurant, b: Restaurant) => number;  // 同上
}
```

### 4.2 聊天类型 (`src/types/chat.ts`)

```ts
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  restaurantResults?: Restaurant[];
  status?: 'streaming' | 'tool_calling' | 'done';
  toolInfo?: string;
}

interface APIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

type StreamDelta =
  | { type: 'content'; text: string }
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_result'; restaurants: Restaurant[] }
  | { type: 'done'; content: string; restaurants: Restaurant[] }
  | { type: 'error'; message: string }
```

---

## 五、数据层详情

### 5.1 餐厅数据 (`src/data/restaurants.ts`)

导出三个常量：

#### `restaurants: Restaurant[]`（20条数据）
每家餐厅包含完整的 Restaurant 字段。以下是20家餐厅的关键信息：

| ID | 名称 | 品类 | 大学 | 均价 | 实付 | 评分 | 营业时间 | priceRange |
|---|---|---|---|---|---|---|---|---|
| 1 | 老王麻辣烫 | 小吃 | 北京大学 | 18 | 14 | 4.5 | 10:00-22:00 | budget |
| 2 | 清华园小厨 | 中餐 | 清华大学 | 25 | 19 | 4.3 | 11:00-21:30 | affordable |
| 3 | 一兰拉面·学府店 | 日料 | 清华大学 | 48 | 42 | 4.7 | 11:00-23:00 | moderate |
| 4 | 大学生烤肉 | 烧烤 | 北京大学 | 35 | 28 | 4.4 | 17:00-02:00 | affordable |
| 5 | 喜茶·五道口店 | 饮品 | 清华大学 | 28 | 22 | 4.6 | 10:00-22:00 | moderate |
| 6 | 人大食堂风味馆 | 中餐 | 中国人民大学 | 15 | 11 | 4.2 | 07:00-20:30 | budget |
| 7 | 湘里人家 | 中餐 | 北京师范大学 | 32 | 26 | 4.5 | 11:00-22:00 | affordable |
| 8 | 深夜食堂·居酒屋 | 日料 | 北京航空航天大学 | 55 | 46 | 4.6 | 18:00-03:00 | moderate |
| 9 | 沙县小吃·学府路店 | 快餐 | 北京大学 | 12 | 9 | 4.0 | 06:30-23:00 | budget |
| 10 | 韩宫宴烤肉 | 韩餐 | 中国人民大学 | 88 | 72 | 4.4 | 11:30-22:00 | premium |
| 11 | 师大炸鸡 | 小吃 | 北京师范大学 | 25 | 20 | 4.3 | 11:00-23:00 | affordable |
| 12 | 觅唐·茶餐厅 | 西餐 | 清华大学 | 42 | 35 | 4.5 | 08:00-22:00 | moderate |
| 13 | 北航小炒王 | 中餐 | 北京航空航天大学 | 22 | 17 | 4.2 | 10:30-21:00 | affordable |
| 14 | 海底捞·学府路店 | 火锅 | 北京大学 | 95 | 59 | 4.7 | 10:00-07:00 | premium |
| 15 | 兰州正宗牛肉面 | 面食 | 清华大学 | 16 | 12 | 4.4 | 06:00-21:00 | budget |
| 16 | 泰香米·泰式料理 | 东南亚 | 清华大学 | 52 | 42 | 4.5 | 11:00-21:30 | moderate |
| 17 | 杨国福麻辣烫 | 小吃 | 中国人民大学 | 20 | 15 | 4.1 | 10:00-22:30 | budget |
| 18 | 老北京铜锅涮肉 | 火锅 | 北京大学 | 68 | 55 | 4.6 | 11:00-23:00 | moderate |
| 19 | 瑞幸咖啡·北师大店 | 饮品 | 北京师范大学 | 15 | 9 | 4.2 | 07:30-21:00 | budget |
| 20 | 小龙坎火锅 | 火锅 | 北京航空航天大学 | 78 | 62 | 4.5 | 11:00-02:00 | moderate |

每家餐厅都有 `images` 数组，使用 Unsplash 的 `?w=400` 尺寸图片URL。

#### `universities`（5所大学）
```ts
[
  { id: 'pku', name: '北京大学', shortName: '北大', coordinates: { lat: 39.9929, lng: 116.3060 } },
  { id: 'thu', name: '清华大学', shortName: '清华', coordinates: { lat: 40.0000, lng: 116.3267 } },
  { id: 'ruc', name: '中国人民大学', shortName: '人大', coordinates: { lat: 39.9700, lng: 116.3100 } },
  { id: 'bnu', name: '北京师范大学', shortName: '北师大', coordinates: { lat: 39.9650, lng: 116.3200 } },
  { id: 'buaa', name: '北京航空航天大学', shortName: '北航', coordinates: { lat: 39.9780, lng: 116.3470 } },
]
```

#### `rankLists`（7个榜单）
```ts
[
  { id: 'repurchase', title: '复购王榜', icon: '🔄', description: '同学们用脚投票，复购率最高的店', color: '#FF6B35' },
  { id: 'budget', title: '穷鬼套餐榜', icon: '省', description: '实付金额最低，含满减后的真实价格', color: '#10B981' },
  { id: 'fast', title: '快速出餐榜', icon: '快', description: '真实出餐数据，最快几分钟送达', color: '#F59E0B' },
  { id: 'late', title: '深夜食堂榜', icon: '夜', description: '22点后还营业，夜猫子福音', color: '#6366F1' },
  { id: 'date', title: '约会圣地榜', icon: '约', description: '环境好有氛围，两人世界', color: '#EC4899' },
  { id: 'group', title: '聚餐推荐榜', icon: '聚', description: '适合多人聚会，有包间更好', color: '#8B5CF6' },
  { id: 'rating', title: '口碑好评榜', icon: '赞', description: '评分最高的店，不踩雷', color: '#EF4444' },
]
```
注意：icon 字段有的是 emoji（🔄），有的是汉字（省、快、夜、约、聚、赞）。RankList 类型定义了 filterFn/sortFn 但实际 rankLists 数据中没有这两个字段，排序逻辑硬编码在 RankPage.tsx 的 `getRankRestaurants()` 函数中。

### 5.2 评论数据 (`src/data/reviews.ts`)

定义 `Review` 接口：
```ts
interface Review {
  id: string;
  restaurantId: string;
  userName: string;
  university: University;
  major: string;
  avatar: string;       // emoji
  rating: number;       // 1-5
  content: string;
  images?: string[];
  likes: number;
  timestamp: number;    // unix ms，由 daysAgo() 函数生成
  tags?: string[];
}
```

共22条评论数据，覆盖大部分餐厅。用 `daysAgo(n)` 函数生成 n 天前的时间戳。

导出的工具函数：
- `getReviewsByRestaurant(restaurantId)` — 按时间倒序
- `getLatestReviews(count, university?)` — 最新评论，可按大学过滤
- `getHotReviews(count)` — 按点赞数排序
- `formatTimeAgo(timestamp)` — 返回"刚刚"/"X分钟前"/"X小时前"/"X天前"/"X个月前"

### 5.3 优惠数据 (`src/data/deals.ts`)

**省钱方案 (SavingsPlan)**：每家餐厅一条，共20条。包含：
- `coupons: Coupon[]` — 优惠券数组，每张有 id, title（如"满25减8"）, threshold, discount, expireDay, isNew?
- `groupOrder?: GroupOrderInfo` — 拼单优惠：peopleNeeded, totalPeople, discountDesc, savings
- `selfPickupSave: number` — 到店自取节省金额
- `deliveryFee: number` — 配送费

导出函数：
- `getSavingsPlan(restaurantId)` — 获取某餐厅的省钱方案
- `getMaxSavings(plan)` — 计算最大省钱金额

**今日翻牌 (DailyFlip)**：校园版"疯狂星期四"
- `flipPool: DailyFlip[]` — 7个翻牌候选（基于星期几轮换），每个包含 restaurantId, restaurantName, dealDish, originalPrice, flipPrice, participantBase, icon
- `candidatePool: FlipCandidate[]` — 4个明日投票候选，每个有 votes 字段

导出函数：
- `getTodayFlip()` — 根据 `new Date().getDay()` 取模选择
- `getTomorrowCandidates()` — 按票数排序返回

### 5.4 拼单数据 (`src/data/groupOrders.ts`)

定义了线上/线下两种拼单模式：
```ts
type GroupOrderMode = 'online' | 'offline'

interface GroupOrderPost {
  id: string;
  mode: GroupOrderMode;
  initiator: GroupOrderUser;      // 发起者信息（name, avatar, university, major, year, gender）
  participants: GroupOrderUser[];  // 已加入的人
  restaurantId: string;
  restaurantName: string;
  targetPeople: number;
  dealDesc: string;
  savingsPerPerson: number;
  pickupLocation?: string;        // 线下专属
  pickupTime?: string;            // 线下专属
  deliveryAddress?: string;       // 线上专属
  deliveryTime?: string;          // 线上专属
  message: string;                // 发起者留言
  tags: string[];
  createdMinutesAgo: number;
}
```

共14条拼单数据（8条线下 + 6条线上）。

标签常量：
- `onlineTags = ['凑满减', '拼配送费', '宿舍外卖', '奶茶拼单', '深夜外卖']`
- `offlineTags = ['找饭搭子', '欢迎新朋友', '深夜局', '长期搭子', '拍照打卡']`

导出函数：
- `getGroupOrders({ university?, mode?, tag? })` — 按 createdMinutesAgo 升序排序

---

## 六、全局布局 (`App.tsx`)

### 6.1 状态
唯一的全局状态：`selectedUniversity: University | 'all'`，初始值 `'all'`，通过 prop 向下传递给所有页面。

### 6.2 结构
```
┌──────────────────────────────┐
│  Header（粘性顶部，60px）      │  ← DetailPage 时隐藏
│  logo + 大学选择器             │
├──────────────────────────────┤
│                              │
│  <Routes> 页面内容            │  ← main-content, padding-bottom:80px
│                              │
├──────────────────────────────┤
│  Nav（固定底部，5个tab）       │  ← DetailPage 时隐藏
└──────────────────────────────┘
```

### 6.3 Header
- 半透明毛玻璃效果：`background: rgba(255,255,255,0.85); backdrop-filter: blur(12px)`
- 左侧 logo：黄色方块"美"字 + 文字"美团·大学城美食" + 副标题"同学都在吃什么"
- 右侧：大学选择器（`<select>`），药丸形圆角，选项包括"全部学校"和5所大学的 shortName

### 6.4 底部导航栏（5个tab）
每个tab使用 `NavLink`，active 状态下底部有黄色小横条指示器：

| Tab | 路由 | 图标（SVG内联） | 标签 |
|---|---|---|---|
| 首页 | `/` (end) | 房子 | 首页 |
| 拼单 | `/group` | 人群 | 拼单 |
| 随机吃 | `/random` | 骰子 | 随机吃 |
| AI | `/ai` | 消息气泡 | AI |
| 榜单 | `/rank` | 柱状图 | 榜单 |

导航栏 CSS：`position: fixed; bottom: 0`，有 `safe-area-inset-bottom` 适配。

### 6.5 路由表
```
/                    → HomePage (university)
/map                 → MapPage (university)
/group               → GroupOrderPage (university)
/random              → RandomPage (university)
/ai                  → ChatAgent (university)
/rank                → RankPage (university)
/rank/:rankId        → RankPage (university)
/list                → ListPage (university)
/restaurant/:id      → DetailPage (无university prop)
```

DetailPage 通过 `location.pathname.startsWith('/restaurant/')` 判断，隐藏 header 和 nav。

---

## 七、各页面详细说明

### 7.1 首页 (HomePage.tsx)

接收 `university: University | 'all'` prop。是内容最丰富的页面，包含以下区块（自上而下）：

#### (1) 今日翻牌 Hero（flip-card-hero）
- 全宽大图卡片，背景为餐厅图片 + 渐变遮罩（`linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.65))`）
- 左上角"今日翻牌"徽章 + 右上角"XX人参与"
- 底部显示餐厅名、特价菜名、原价（删除线）和翻牌价
- 底部操作栏：头像列表 + "我也去"按钮 + "分享"按钮
- 参与人数每8秒随机增长1-2人（`setInterval`模拟）
- 点击整个卡片跳转到餐厅详情；"我也去"和"分享"按钮 `stopPropagation` 阻止冒泡
- "分享"点击后显示 toast "已复制分享链接，快去宿舍群粘贴吧！"（2秒后消失）

#### (2) 明天翻牌投票（flip-vote）
- 标题"明天翻牌哪家？投票选出来"
- 4个候选项，每个显示：餐厅名、特价菜+价格、进度条（宽度= votes/2.5 %）、票数
- 可以投票（单选），投票后该项 votes+1，样式变为 voted

#### (3) AI 决策区域（ai-hero）
- 显示时段问候语（由 `getMealPeriod()` 返回）
- 模拟搜索框样式，左侧 emoji 🍜，文字"想吃什么？问我就对了…"，右侧箭头
- 点击跳转到 `/ai`

#### (4) 同学在点（live-order-feed）
- 实时滚动条，每3秒切换一条
- 格式："XX大学XX系同学 下单了 **餐厅名** 的 菜品名"
- 左侧有绿色脉动圆点，右侧显示"X分钟前"
- 数据来自 `filteredRestaurants`，随机选 major 和 recommendDish

#### (5) 猜你想要（smart-picks）
- section 标题 + 右侧标签显示当前时段（如"午餐推荐"）
- 3张智能推荐卡片，基于时间段/营业状态/评分加权算法：
  - 当前营业 +20分
  - 早餐时段 + 快速出餐 +15
  - 午餐时段 + 非premium +10
  - 下午茶时段 + 饮品/甜点 +20
  - 深夜时段 + 有深夜场景 +25
  - 再加 0-10 随机分
- 每张卡片展示：图片、名称、价格、评分、推荐理由（基于数据生成的文案）
- 推荐理由优先级：复购率≥65% → 周订单≥400 → 实付≤15 → 距离≤200m → 评分≥4.5 → 有学生优惠 → tags[0]

#### (6) 快捷决策（quick-decisions）
4个按钮：
- 🎲 随机帮我选 → `/random`
- 💰 穷鬼榜 → `/rank/budget`
- 🌙 深夜觅食 → `/ai` (state: { initialMessage: '深夜还有什么吃的' })
- 💕 约会推荐 → `/ai` (state: { initialMessage: '适合约会的餐厅' })

#### (7) 特色榜单（rank-list-grid）
- 显示前4个榜单（2x2 网格），每个榜单卡片有彩色图标圆 + 标题 + 描述
- 右上角"查看全部 >"跳转到 `/rank`

#### (8) 同学说（ugc-feed）
- 最新5条评论，按时间倒序
- 每条展示：用户头像(emoji) + 用户名 + 大学·专业 + 时间 + 内容 + 标签 + 餐厅名 + 点赞数
- 点击跳转到对应餐厅详情

#### (9) 附近好店（scroll-x）
- 横向滚动的 RestaurantCard 列表
- 按距离排序，取前6家
- 右上角"更多 >"跳转到 `/list`

### 7.2 地图页 (MapPage.tsx)

**模拟地图**（无真实地图API）：
- 全屏容器 `padding: 0`
- 背景：渐变色（绿→蓝→橙）+ SVG 网格线 + 模拟道路（白色线条）
- 中央放置大学标记（黄色圆 + "校" 字 + 大学名）
- 餐厅以圆形 marker 散布在地图上，颜色 `#FF6B35`（选中时 `#E85A2A`）
- marker 内显示品类缩写（中/西/日/韩/锅/烤/吃/快/饮/甜/面/粥/东）
- marker 位置由数学公式伪随机分布：`baseX = 30 + (index % 5) * 15` + `sin/cos` 偏移
- 点击 marker 底部弹出餐厅信息卡（使用 RestaurantListItem 样式），点击卡片跳转详情
- 未选中时底部显示"点击地图上的标记查看餐厅详情"

### 7.3 列表页 (ListPage.tsx)

完整的餐厅列表，支持搜索和筛选：
- 顶部搜索框（SVG 搜索图标 + input），支持按名称/品类/标签搜索
- 筛选栏：4个按钮
  - "筛选 (N)" — 打开 FilterModal
  - "评分最高" / "距离最近" / "价格最低" — 直接切换排序
- 结果数量提示"共找到 X 家餐厅"
- 餐厅列表使用 RestaurantListItem 组件
- 空状态：显示"没有找到符合条件的餐厅" + "重置筛选条件"按钮
- 底部浮动引导："😋 纠结了？让 AI 帮你选"，点击跳转 `/ai`（仅结果>2时显示）

### 7.4 随机选择页 (RandomPage.tsx)

核心交互：转盘 + 加权随机选择：
- 标题"今天吃什么？" + 副标题"让命运来决定！"
- **转盘**：圆形容器，通过 CSS `transform: rotate(Xdeg)` + `transition: 2s cubic-bezier(0.17, 0.67, 0.12, 0.99)` 实现旋转动画
  - 中心文字：未选时"点击下方按钮"，旋转中"转动中..."，选完后"命运之选" + 餐厅名
- **随机按钮**：旋转中显示"选择中..."并禁用
- **加权随机算法**：rating^2 作为权重，当前营业的餐厅权重 × 1.5
- **结果卡片**：
  - AI 推荐理由（基于本地逻辑生成，考虑营业状态/距离/价格/评分/时段/优惠）
  - RestaurantListItem 展示
  - 两个按钮："换一家"（重新 spin）+ "就它了！"（跳转详情）
- **筛选区域**（底部）：
  - 品类选择（9个选项：不限/中餐/日料/韩餐/火锅/烧烤/小吃/快餐/饮品）
  - 预算选择（5档）
  - 显示当前可选餐厅数
- 最底部："🍜 有更具体的想法？和 AI 聊聊"

### 7.5 榜单页 (RankPage.tsx)

- 横向滚动的 Tab 栏，7个榜单标签（icon + title），点击切换 URL `/rank/:rankId`
- 榜单头部：彩色背景（color + 10% 透明度）+ icon + title + description
- 榜单列表：按排名显示，每条包含：
  - 排名数字（1/2/3/...）
  - 餐厅图片 + 名称 + 评分 + 价格 + 步行时间
  - 特定榜单额外显示特色数据（复购率、实付价、出餐时间、学生优惠等）
- 最多显示前10名

**各榜单的筛选/排序逻辑** (`getRankRestaurants` switch-case)：
- `repurchase`：按 repurchaseRate 降序
- `budget`：actualPayPrice ≤ 25 的餐厅，按 actualPayPrice 升序
- `fast`：avgDeliveryMinutes ≤ 10 或有"快速出餐"特色，按 avgDeliveryMinutes 升序
- `late`：closeTime 的小时 ≥ 23 或 ≤ 3，或有"深夜"场景，按评分降序
- `date`：有"约会"场景或"环境好"特色，按评分降序
- `group`：有"聚餐"场景或"有包间"特色，按评分降序
- `rating`（默认）：按评分降序

### 7.6 拼单广场页 (GroupOrderPage.tsx)

最复杂的页面之一，支持浏览和发起拼单：

#### 页面结构
1. **Hero区**：标题"拼单广场" + 副标题"一起拼单省更多，顺便认识新朋友"
2. **模式切换**（group-mode-tabs）：
   - 🍽️ 线下拼单："约着一起吃，认识新朋友"
   - 📦 线上拼单："凑满减拼配送，宿舍省钱"
3. **标签筛选栏**：动态显示 onlineTags 或 offlineTags，支持单选切换
4. **拼单列表**：每条拼单卡片包含：
   - 模式徽章（"线下"/"线上"）
   - 发起人头像/名称/大学·专业·年级 + 时间
   - 留言内容
   - 标签
   - 餐厅信息区（点击跳转详情）：餐厅名 + 优惠 + 碰面/配送信息
   - 底部：参与人头像 + 空位占位符(?)" + "X/Y人" + 加入按钮
   - 已满员的卡片有特殊样式 `class="full"`
5. **浮动按钮 (FAB)**："+ 发起拼单"
6. **发起拼单弹窗**：完整表单
   - 模式选择（线下/线上）
   - 餐厅选择（下拉框，显示名称+均价）
   - 人数（2-6人）
   - 时间（文本输入）
   - 地点/地址（文本输入）
   - 标签选择（多选）
   - 留言（textarea）
   - "发布拼单"按钮（需填餐厅和留言才可点）

#### 交互细节
- 加入拼单：joinedIds 状态管理，已加入显示"已加入 ✓"，已满员显示"已满员"并禁用
- 用户发布的拼单添加到列表顶部，自动加入，显示"我发起的"标签
- 发布成功后 toast"拼单发布成功！同校同学已收到通知"

### 7.7 餐厅详情页 (DetailPage.tsx)

**独占整个屏幕**（隐藏 header 和 nav），不接收 university prop。

结构：
1. **顶部大图** + 返回按钮（← 符号，`navigate(-1)`）
2. **餐厅名 + 品类标签**
3. **3个核心统计**：评分(X分/X条评价) | 人均(¥X) | 距离(X分钟/Xm)
4. **美团交易数据区**（detail-transaction）：
   - 4列：同学复购率(highlight) | 本周学生单量 | 实付均价 | 平均出餐
   - 有学生优惠时显示 banner："🎫 学生专属：XXX"
5. **省钱方案区**（如果有 savingsPlan）：
   - 标题"💰 省钱方案" + "最多省¥X"
   - 优惠券卡片列表（每张：省X元 + 标题 + 过期时间 + "领取"按钮）
   - 新人券有特殊样式 `class="new"`
   - 拼单优惠卡片（`class="group"`）
   - 自取优惠卡片（`class="pickup"`）
6. **基本信息**：地址、营业时间、电话、位置（大学附近）
7. **餐厅特色**：features + scenes（"适合XXX"）标签
8. **推荐菜品**：tag 样式，橙色底色
9. **学长学姐Tips**：圆点列表
10. **同学说 UGC 评论**：
    - 标题含评论数
    - 每条：头像+用户名+大学·专业 | 星星评分+时间
    - 内容 + 标签 + "👍 X人觉得有用"
11. **餐厅简介**
12. **标签**（tags 数组）

**底部操作栏**（固定在底部）：
- "电话"按钮（secondary）
- "导航前往"按钮（primary）— 点击 `alert()` 提示地址

### 7.8 AI 聊天页 (ChatAgent.tsx)

#### 欢迎界面（消息为空时）
- 大 emoji 头像 🍜
- 时段问候语
- 描述"我是你的美食决策助手..."
- 4个推荐提问按钮（由 `getTimeSuggestions()` 根据时段返回）

#### 对话界面
- 用户消息：右对齐，蓝色气泡
- AI消息：左对齐，灰色气泡，带 🍜 头像
- 状态指示：
  - streaming：加载中3点动画
  - tool_calling：显示旋转 spinner + 工具名（如"正在搜索餐厅..."）
  - done：正常展示内容

#### 快捷回复
AI 回复中如果末尾包含 `[快捷回复:选项1|选项2|选项3]` 标记，会解析为可点击的按钮。只在最后一条 AI 消息上显示。

#### 餐厅结果卡片
AI 工具调用返回的餐厅数据，以 RestaurantListItem 列表展示在对话气泡下方。

#### 输入区域
- input + "发送"按钮
- Enter 发送，Shift+Enter 不发送
- 加载中禁用输入

#### 来自首页的初始消息
通过 `location.state.initialMessage` 接收，自动发送一次（使用 `useRef` 防重复）。

---

## 八、AI 服务层 (`src/services/ai.ts`)

### 8.1 时间感知函数
- `getMealPeriod()` — 返回 `{ period, greeting }`：
  - 5-10点：早餐/"早上好！该吃早餐啦 🌅"
  - 10-14点：午餐/"中午好！午饭时间到 🍱"
  - 14-17点：下午茶/"下午好！来点下午茶？ ☕"
  - 17-21点：晚餐/"晚上好！晚饭吃什么？ 🌙"
  - 其他：宵夜/"夜猫子！来份宵夜？ 🦉"

- `getTimeSuggestions()` — 返回4个推荐问题，按时段不同

### 8.2 系统提示词
非常详细的中文 system prompt，定义 AI 的身份、上下文、对话策略、推荐策略、决策辅助、省钱助手、快捷回复格式、回复风格等。动态注入当前时间、星期几、用户选择的大学。

### 8.3 工具定义（4个）
采用 OpenAI function calling 格式定义：

1. **search_restaurants** — 按品类/价格/场景/距离/特色筛选排序，limit 默认 3
2. **get_restaurant_detail** — 按 ID 或名称模糊匹配查询单个餐厅
3. **get_open_now** — 获取当前营业中的餐厅，可选品类筛选
4. **smart_random** — 智能随机推荐（rating^2 加权），可排除 ID

### 8.4 工具执行
所有工具在**前端本地执行**（查询静态数据），不走后端。返回格式化的文本（包含美团交易数据、省钱方案等）和 Restaurant 数组。

### 8.5 SSE 流式调用
- 请求 `/api/deepseek/v1/chat/completions`（通过 Vite proxy 转发到 DeepSeek）
- API Key 从 `import.meta.env.VITE_DEEPSEEK_API_KEY` 读取
- 模型：`deepseek-chat`，temperature: 0.7，stream: true
- 支持多轮工具调用（最多5轮迭代）
- 自定义 SSE parser（`parseSSE` 异步生成器函数）
- 对话历史保留最近20条消息

---

## 九、复用组件

### 9.1 RestaurantCard
横向滚动中使用的紧凑卡片：
- 图片（lazy loading）
- 名称 + 品类标签
- 评分 + 均价 + 步行时间
- 前2个 features 标签
- 点击跳转详情

### 9.2 RestaurantListItem
纵向列表中使用的列表项：
- 左侧图片
- 右侧：名称 + 均价 | 评分 + 距离m + 步行时间 + 品类 | 前3个features + 前1个scene
- 点击跳转详情

### 9.3 FilterModal
全屏弹窗（overlay + 内容区）：
- 品类选择（13种 + 不限）
- 价格选择（5档）
- 场景选择（8种 + 不限）
- 步行时间（5/10/15/20/30分钟）
- 底部：重置 + 确定按钮
- 点击 overlay 关闭

---

## 十、CSS 设计系统

### 10.1 设计变量
```css
:root {
  /* 美团品牌色 */
  --meituan-yellow: #FFD100;
  --meituan-yellow-dark: #F5C400;
  --meituan-yellow-light: #FFF8DC;
  --meituan-black: #111111;
  --meituan-green: #06C167;

  /* 语义色 */
  --primary: #FFD100;
  --secondary: #111111;
  --accent: #06C167;
  --warning: #FF6633;
  --danger: #FF4D4F;
  --star-color: #FF6633;

  /* 灰度 */
  --gray-50 ~ --gray-900（10级）

  /* 圆角 */
  --radius-sm: 4px;  --radius-md: 8px;  --radius-lg: 12px;  --radius-xl: 16px;  --radius-full: 9999px;

  /* 阴影 */
  --shadow-sm/md/lg/xl

  /* 字体 */
  --font-sans: 'PingFang SC', 'Microsoft YaHei UI', ...;
}
```

### 10.2 重要的 accent 颜色
在各处出现的辅助色：
- 价格/高亮橙色：`#FF6B35`
- 评分星：`#FF6633`
- 绿色成功/省钱：`#10B981` / `#06C167`
- 预算榜：`#10B981`
- 快速榜：`#F59E0B`
- 深夜榜：`#6366F1`
- 约会榜：`#EC4899`
- 聚餐榜：`#8B5CF6`
- 口碑榜：`#EF4444`

### 10.3 关键样式模式
- **移动端布局**：max-width 1200px 居中，padding 20px
- **粘性 header**：position: sticky; top: 0; z-index: 100; backdrop-filter
- **固定底部 nav**：position: fixed; bottom: 0; z-index: 100; safe-area-inset-bottom
- **横向滚动**：`.scroll-x` — `display: flex; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch`；隐藏滚动条
- **卡片悬停**：`transform: translateY(-2px); box-shadow 变深`
- **脉动动画**：`.live-dot` 使用 `@keyframes pulse`（绿色圆点放大缩小）
- **loading 三点动画**：`.chat-loading-dots span` 使用 `@keyframes dotBounce`
- **工具调用 spinner**：`.chat-tool-spinner` 使用 `@keyframes spin` 旋转动画
- **Toast**：固定在底部居中，`@keyframes slideUpFade` 上滑淡入
- **转盘动画**：通过 JS 控制 `transform: rotate(Xdeg)` + CSS transition

### 10.4 CSS 文件结构（按顺序）
1. CSS Variables
2. Reset
3. App Layout (header, nav)
4. Page Container
5. Quick Actions / Categories
6. Restaurant Card / List Item
7. Section headers
8. Filter Modal
9. Search
10. Filter Bar
11. Rank Page (tabs, header, list)
12. Random Page (wheel, result)
13. Detail Page (full layout)
14. Map Page
15. AI Chat Page
16. Empty State
17. Buttons
18. Toast
19. 今日翻牌 (flip-card)
20. 投票 (flip-vote)
21. AI Hero
22. Live Order Feed
23. Smart Picks
24. Quick Decisions
25. UGC Feed
26. 省钱方案 (savings)
27. Group Order Page (全部样式)

---

## 十一、关键交互逻辑汇总

### 11.1 isOpenNow() 函数
在多个文件中重复定义（HomePage, RandomPage, ai.ts），逻辑一致：
```ts
function isOpenNow(r: Restaurant): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const openMinutes = parseTime(r.openTime)
  const closeMinutes = parseTime(r.closeTime)
  // 跨午夜：如 18:00-03:00
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes
  }
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes
}
```

### 11.2 加权随机算法
在 RandomPage 和 ai.ts 的 smart_random 工具中使用：
```
weights = restaurants.map(r => r.rating * r.rating)  // rating^2 加权
// 可选：营业中的 ×1.5
totalWeight = sum(weights)
random = Math.random() * totalWeight
遍历 weights 递减，找到落入的区间
```

### 11.3 数据流向
```
restaurants.ts (静态数据)
     │
     ├──→ 各页面直接 import，在组件内做 filter/sort
     ├──→ ai.ts 的工具函数查询（search/detail/openNow/random）
     └──→ deals.ts / reviews.ts / groupOrders.ts 通过 restaurantId 关联
```

---

## 十二、环境变量

需要一个 `.env.local` 文件（不提交到 git）：
```
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

如果没有配置或值为 `your_key_here`，AI 聊天页面会提示"请在 .env.local 中配置 VITE_DEEPSEEK_API_KEY"。

---

## 十三、注意事项

1. **RankList 类型的 filterFn/sortFn 字段**：类型中定义了，但实际 rankLists 数据中没有这两个字段。筛选排序逻辑硬编码在 RankPage.tsx 中。复刻时可以去掉类型中的这两个字段，或保留但不使用。

2. **图片来源**：所有餐厅图片使用 Unsplash URL（`?w=400` 参数），复刻时可以替换为其他占位图或本地图片。

3. **所有数据都是静态模拟的**：评论时间戳用 `daysAgo(n)` 函数相对于当前时间生成；拼单的"X分钟前"是固定的 `createdMinutesAgo` 字段；参与人数增长是客户端 setInterval 模拟。

4. **AI 功能依赖外部 API**：DeepSeek API 需要有效的 API Key 才能工作。Vite proxy 只在开发环境生效，生产环境部署需要额外处理。

5. **CSS 约3300行**：这是一个大文件，包含所有页面和组件的样式。CSS 命名采用 BEM-like 风格但不严格。大量使用 CSS 变量实现主题一致性。

6. **大学名称在显示时常做简化**：如 `university.replace('北京', '').replace('大学', '')` 用于在有限空间显示（如拼单卡片中显示"人民"而非"中国人民大学"）。

7. **路由 `/map` 和 `/list`**：存在于路由表中但不在底部导航栏上。可以从首页的"附近好店"区块的"更多 >"链接进入列表页。地图页目前没有直接入口（除了手动输入 URL）。
