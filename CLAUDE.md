# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

大学城美食地图 (Campus Food Map) - 移动端Web应用，帮助大学生快速决策吃什么。纯前端项目，所有餐厅/评论/优惠数据静态存储。唯一的外部API调用是AI聊天功能（DeepSeek）。

## Commands

```bash
cd campus-food-map
npm run dev        # 启动开发服务器 (localhost:3000，自动打开浏览器)
npm run build      # TypeScript编译 + Vite生产构建
npm run preview    # 预览生产构建
```

无lint/test/format命令。TypeScript严格模式开启（`noUnusedLocals`, `noUnusedParameters`），构建时会检查类型错误。

## Setup

AI聊天功能需要 DeepSeek API Key。参考 `.env.example`，创建 `.env.local`：
```
VITE_DEEPSEEK_API_KEY=your_actual_key
```
Vite dev proxy 仅开发环境生效，生产部署需额外处理 `/api/deepseek` 代理。

## Tech Stack

- React 19 + TypeScript (strict mode)
- Vite 5 + @vitejs/plugin-react
- React Router DOM 7 (BrowserRouter)
- Leaflet 1.9.4 (地图组件，用于 MapPage)
- 纯CSS样式，无UI框架，单文件 `src/styles/index.css`（~3300行）
- 品牌色：美团黄 `#FFD100`、黑 `#111111`、绿 `#06C167`；CSS变量定义在 `:root`

## Architecture

### 状态管理

无全局状态管理库。`App.tsx` 持有 `selectedUniversity` 状态（`useState`），通过 `university` prop 向下传递给所有页面组件。这是全应用唯一的跨页面共享状态。

### 路由结构

`main.tsx` 中 `BrowserRouter` 包裹 `App`。`App.tsx` 定义所有路由：
- `/` → HomePage, `/map` → MapPage, `/list` → ListPage, `/random` → RandomPage
- `/group` → GroupOrderPage（拼单广场）
- `/ai` → ChatAgent（AI美食助手）
- `/rank` 和 `/rank/:rankId` → RankPage
- `/restaurant/:id` → DetailPage（无 `university` prop，无底部导航和顶部header）
- `/profile` → ProfilePage（个人中心/我的）
- `/insights` → InsightsPage（用户口味洞察）
- `/tuanzi-insights` → TuanziInsightsPage（团子AI洞察）

底部导航栏6个tab：首页、拼单、随机吃、团子（AI）、榜单、我的。

### 数据层

所有数据静态存储在 `src/data/` 下，各页面直接 import 并在组件内过滤/排序，无数据请求层：

- `restaurants.ts` — 唯一餐厅数据源，导出 `restaurants: Restaurant[]`（~20条）、`universities`（5所大学）、`rankLists`（榜单元数据）
- `reviews.ts` — 学生评论数据，导出按餐厅/时间/热度的查询函数（`getReviewsByRestaurant`, `getLatestReviews`, `getHotReviews`）
- `deals.ts` — 省钱方案（优惠券、拼单优惠、自取优惠）+ 今日翻牌特价活动。导出 `getSavingsPlan()`, `getTodayFlip()`, `getTomorrowCandidates()`
- `groupOrders.ts` — 拼单广场数据，分线上（凑满减）和线下（社交约饭）两种模式。导出 `getGroupOrders()` 函数

榜单的筛选/排序逻辑在 `RankPage.tsx` 的 `getRankRestaurants()` 函数中，通过 switch-case 按 `rankId` 分别实现。注意：`RankList` 类型定义了 `filterFn`/`sortFn`，但实际数据未使用这些字段。

### 本地持久化（localStorage）

- `src/services/history.ts` — 干饭工具箱历史记录：随机吃历史、拼单参与记录、翻牌记录、到店打卡记录。各自独立 localStorage key，提供增删查函数
- `src/services/profile.ts` — 用户资料、好友列表、干饭状态（"想吃"/"在吃"/"吃饱了"）。数据存 localStorage，导出 `getProfile`/`saveProfile`/`getFriends` 等函数
- `src/services/tasteDNA.ts` — 用户口味DNA分析，基于用餐历史生成个性化口味标签和推荐
- `src/services/userInsights.ts` — 用户行为洞察分析（消费习惯、时间偏好、社交特征等）
- `src/services/userAgents.ts` — 用户代理人（User Agent）系统，AI驱动的个性化助手
- `src/data/socialFeed.ts` — 校友圈社交动态（用餐打卡、请Ta吃、转盘结果），静态 mock 数据

### AI聊天功能

`src/services/ai.ts` 实现AI美食助手，调用 DeepSeek API（OpenAI兼容格式）：
- 通过 Vite dev proxy `/api/deepseek` → `https://api.deepseek.com`（见 `vite.config.ts`）
- API Key 从环境变量 `VITE_DEEPSEEK_API_KEY` 读取（需要 `.env.local` 文件）
- 采用SSE流式响应 + function calling（工具调用）模式
- 4个本地工具函数：`search_restaurants`、`get_restaurant_detail`、`get_open_now`、`smart_random`，工具调用在前端本地执行（查询静态数据），不走后端
- `ChatAgent.tsx` 组件消费 `sendMessageStream()` 的流式回调
- 类型定义在 `src/types/chat.ts`（`ChatMessage`, `APIMessage`, `ToolCall`, `StreamDelta`）

### 类型系统

`src/types/index.ts` 定义核心类型。关键联合类型：`Category`（14种美食分类）、`University`（5所大学）、`Scene`（7种用餐场景）、`Feature`（7种餐厅特色标签）。`PriceRange` 为 `'budget' | 'affordable' | 'moderate' | 'premium'`。

### 布局模式

`App.tsx` 控制全局布局：顶部header（含大学选择器）+ 底部5-tab导航栏。DetailPage（`/restaurant/:id`）隐藏header和导航栏，通过 `location.pathname.startsWith('/restaurant/')` 判断。

### 组件复用

- `RestaurantCard` — 横向滚动场景中的卡片展示
- `RestaurantListItem` — 纵向列表场景中的列表项
- `FilterModal` — 筛选弹窗，多个页面共用
- `ChatAgent` — AI聊天组件，也作为 `/ai` 路由的页面

### 已知重复代码

`isOpenNow()` 函数在 `HomePage.tsx`、`RandomPage.tsx`、`ai.ts` 三处重复定义，逻辑一致（解析 openTime/closeTime，处理跨午夜情况）。修改营业判断逻辑时需同步更新。

## 参考文档

`project-specification.md` 包含完整的项目规格说明（页面交互细节、CSS设计系统、数据结构等），适合需要了解具体实现细节时查阅。
