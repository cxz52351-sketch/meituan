# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

大学城美食地图 (Campus Food Map) - 移动端Web应用，帮助大学生快速决策吃什么。纯前端项目，无后端/API，所有数据静态存储。

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
- `/rank` 和 `/rank/:rankId` → RankPage
- `/restaurant/:id` → DetailPage（无 `university` prop，无底部导航和顶部header）

### 数据层

`src/data/restaurants.ts` 是唯一数据源，导出三个常量：
- `restaurants: Restaurant[]` — 所有餐厅数据（~20条）
- `universities` — 支持的大学列表（北大/清华/人大/北师大/北航）
- `rankLists` — 榜单元数据（`id`, `title`, `icon`, `description`, `color`），不含逻辑

榜单的筛选/排序逻辑在 `RankPage.tsx` 的 `getRankRestaurants()` 函数中，通过 switch-case 按 `rankId` 分别实现。各页面直接 import 这些数据并在组件内做过滤/排序，无数据请求层。

### 类型系统

`src/types/index.ts` 定义所有类型。关键联合类型：`Category`（14种美食分类）、`University`、`Scene`（用餐场景）、`Feature`（餐厅特色标签）。`PriceRange` 为 `'budget' | 'affordable' | 'moderate' | 'premium'`。注意：`RankList` 类型定义了 `filterFn`/`sortFn`，但实际数据未使用这些字段，排序逻辑硬编码在 `RankPage.tsx` 中。

### 布局模式

`App.tsx` 控制全局布局：顶部header（含大学选择器）+ 底部5-tab导航栏。DetailPage（`/restaurant/:id`）隐藏header和导航栏，通过 `location.pathname.startsWith('/restaurant/')` 判断。

### 组件复用

- `RestaurantCard` — 横向滚动场景中的卡片展示
- `RestaurantListItem` — 纵向列表场景中的列表项
- `FilterModal` — 筛选弹窗，多个页面共用
