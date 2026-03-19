// 推荐反馈闭环 — 数据层

export interface RecommendFeedback {
  restaurantId: string
  restaurantName: string
  category: string
  avgPrice: number
  source: 'home_smart_pick' | 'guide_result' | 'chat'
  action: 'go' | 'reject_price' | 'reject_distance' | 'reject_taste' | 'reject_other'
  timestamp: number
}

const STORAGE_KEY = 'campus_food_feedback'
const MAX_ITEMS = 100

export function addFeedback(item: RecommendFeedback): void {
  const history = getFeedbackHistory()
  history.push(item)
  // 超过上限时丢弃最早的
  if (history.length > MAX_ITEMS) {
    history.splice(0, history.length - MAX_ITEMS)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

export function getFeedbackHistory(): RecommendFeedback[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export interface FeedbackStats {
  rejectedCategories: Record<string, number>
  rejectedPriceThreshold: number
  rejectedRestaurantIds: Set<string>
  acceptedCategories: Record<string, number>
  acceptRate: number
}

export function getFeedbackStats(): FeedbackStats {
  const history = getFeedbackHistory()
  const rejectedCategories: Record<string, number> = {}
  const acceptedCategories: Record<string, number> = {}
  const rejectedPrices: number[] = []
  const rejectedRestaurantIds = new Set<string>()
  let goCount = 0

  // 只看近30天的反馈
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recent = history.filter(f => f.timestamp > cutoff)

  for (const f of recent) {
    if (f.action === 'go') {
      goCount++
      acceptedCategories[f.category] = (acceptedCategories[f.category] || 0) + 1
    } else {
      rejectedCategories[f.category] = (rejectedCategories[f.category] || 0) + 1
      rejectedRestaurantIds.add(f.restaurantId)
      if (f.action === 'reject_price') {
        rejectedPrices.push(f.avgPrice)
      }
    }
  }

  const rejectedPriceThreshold = rejectedPrices.length > 0
    ? rejectedPrices.reduce((a, b) => a + b, 0) / rejectedPrices.length
    : 0

  const acceptRate = recent.length > 0 ? goCount / recent.length : 0

  return {
    rejectedCategories,
    rejectedPriceThreshold,
    rejectedRestaurantIds,
    acceptedCategories,
    acceptRate,
  }
}
