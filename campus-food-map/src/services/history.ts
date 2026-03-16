// 干饭工具箱 — 历史数据 localStorage 存储

const RANDOM_HISTORY_KEY = 'campus_food_random_history'
const GROUP_ORDER_HISTORY_KEY = 'campus_food_group_history'
const FLIP_HISTORY_KEY = 'campus_food_flip_history'
const VISIT_HISTORY_KEY = 'campus_food_visit_history'

// ---- 随机吃历史（今天吃什么） ----

export interface RandomHistoryItem {
  restaurantId: string
  restaurantName: string
  category: string
  avgPrice: number
  rating: number
  image: string
  timestamp: number
}

export function getRandomHistory(): RandomHistoryItem[] {
  const raw = localStorage.getItem(RANDOM_HISTORY_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as RandomHistoryItem[]
  } catch {
    return []
  }
}

export function addRandomHistory(item: RandomHistoryItem): void {
  const list = getRandomHistory()
  list.unshift(item)
  // 最多保留 50 条
  localStorage.setItem(RANDOM_HISTORY_KEY, JSON.stringify(list.slice(0, 50)))
}

// ---- 拼单历史（我的拼单） ----

export interface GroupOrderHistoryItem {
  id: string
  mode: 'online' | 'offline'
  restaurantName: string
  restaurantId: string
  targetPeople: number
  message: string
  tags: string[]
  timestamp: number
}

export function getGroupOrderHistory(): GroupOrderHistoryItem[] {
  const raw = localStorage.getItem(GROUP_ORDER_HISTORY_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as GroupOrderHistoryItem[]
  } catch {
    return []
  }
}

export function addGroupOrderHistory(item: GroupOrderHistoryItem): void {
  const list = getGroupOrderHistory()
  list.unshift(item)
  localStorage.setItem(GROUP_ORDER_HISTORY_KEY, JSON.stringify(list.slice(0, 30)))
}

// ---- 翻牌历史（我的翻牌） ----

export type FlipActionType = 'join' | 'vote' | 'nominate'

export interface FlipHistoryItem {
  action: FlipActionType
  restaurantId: string
  restaurantName: string
  detail: string           // "参与了今日翻牌" / "投票给 XX" / "提名了 XX"
  timestamp: number
}

export function getFlipHistory(): FlipHistoryItem[] {
  const raw = localStorage.getItem(FLIP_HISTORY_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as FlipHistoryItem[]
  } catch {
    return []
  }
}

export function addFlipHistory(item: FlipHistoryItem): void {
  const list = getFlipHistory()
  list.unshift(item)
  localStorage.setItem(FLIP_HISTORY_KEY, JSON.stringify(list.slice(0, 50)))
}

// ---- 浏览足迹（我逛过的店） ----

export interface VisitHistoryItem {
  restaurantId: string
  restaurantName: string
  category: string
  avgPrice: number
  image: string
  timestamp: number
}

export function getVisitHistory(): VisitHistoryItem[] {
  const raw = localStorage.getItem(VISIT_HISTORY_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as VisitHistoryItem[]
  } catch {
    return []
  }
}

export function addVisitHistory(item: VisitHistoryItem): void {
  const list = getVisitHistory()
  // 同一餐厅去重，只保留最新
  const filtered = list.filter(v => v.restaurantId !== item.restaurantId)
  filtered.unshift(item)
  localStorage.setItem(VISIT_HISTORY_KEY, JSON.stringify(filtered.slice(0, 50)))
}

// ---- 请Ta吃历史（虚拟礼物） ----

const GIFT_HISTORY_KEY = 'campus_food_gift_history'

export interface GiftHistoryItem {
  restaurantId: string
  restaurantName: string
  dish: string
  friendName: string
  friendAvatar: string
  timestamp: number
}

export function getGiftHistory(): GiftHistoryItem[] {
  const raw = localStorage.getItem(GIFT_HISTORY_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as GiftHistoryItem[]
  } catch {
    return []
  }
}

export function addGiftHistory(item: GiftHistoryItem): void {
  const list = getGiftHistory()
  list.unshift(item)
  localStorage.setItem(GIFT_HISTORY_KEY, JSON.stringify(list.slice(0, 30)))
}
