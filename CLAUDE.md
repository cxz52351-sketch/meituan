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

## Tech Stack

- React 19 + TypeScript (strict mode)
- Vite 5 + @vitejs/plugin-react
- React Router DOM 7 (BrowserRouter)
- 纯CSS样式，无UI框架，单文件 `src/styles/index.css`

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

底部导航栏5个tab：首页、拼单、随机吃、AI、榜单。

### 数据层

所有数据静态存储在 `src/data/` 下，各页面直接 import 并在组件内过滤/排序，无数据请求层：

- `restaurants.ts` — 唯一餐厅数据源，导出 `restaurants: Restaurant[]`（~20条）、`universities`（5所大学）、`rankLists`（榜单元数据）
- `reviews.ts` — 学生评论数据，导出按餐厅/时间/热度的查询函数（`getReviewsByRestaurant`, `getLatestReviews`, `getHotReviews`）
- `deals.ts` — 省钱方案（优惠券、拼单优惠、自取优惠）+ 今日翻牌特价活动。导出 `getSavingsPlan()`, `getTodayFlip()`, `getTomorrowCandidates()`
- `groupOrders.ts` — 拼单广场数据，分线上（凑满减）和线下（社交约饭）两种模式。导出 `getGroupOrders()` 函数

榜单的筛选/排序逻辑在 `RankPage.tsx` 的 `getRankRestaurants()` 函数中，通过 switch-case 按 `rankId` 分别实现。注意：`RankList` 类型定义了 `filterFn`/`sortFn`，但实际数据未使用这些字段。

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
