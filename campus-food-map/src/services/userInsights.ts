// 用户画像深度分析服务
import { getRandomHistory, getGroupOrderHistory, getFlipHistory, getVisitHistory } from './history'
import { getFriends } from './profile'

// 口味偏好分析
export interface TastePreference {
  topCategories: Array<{ category: string; count: number; percentage: number }>
  spiceLevel: 'light' | 'mild' | 'medium' | 'heavy'
  spiceLevelText: string
  aiSummary: string
}

// 消费习惯分析
export interface ConsumptionHabit {
  avgSpending: number
  priceRange: { min: number; max: number }
  priceSensitivity: 'high' | 'medium' | 'low'
  priceSensitivityText: string
  topRestaurants: Array<{ name: string; count: number; id: string }>
  aiSummary: string
}

// 社交属性分析
export interface SocialAttribute {
  groupOrderCount: number
  flipCount: number
  friendCount: number
  socialType: 'introvert' | 'balanced' | 'extrovert'
  socialTypeText: string
  aiSummary: string
}

// 探店行为分析
export interface ExplorePattern {
  uniqueRestaurantCount: number
  uniqueCategoryCount: number
  exploreRate: number
  exploreType: 'conservative' | 'balanced' | 'adventurous'
  exploreTypeText: string
  recentVisits: Array<{ name: string; category: string; price: number; id: string; timestamp: number }>
  aiSummary: string
}

export interface UserInsights {
  taste: TastePreference
  consumption: ConsumptionHabit
  social: SocialAttribute
  explore: ExplorePattern
  overallSummary: string
}

export function getUserInsights(): UserInsights | null {
  const randomHistory = getRandomHistory()
  const groupHistory = getGroupOrderHistory()
  const flipHistory = getFlipHistory()
  const visitHistory = getVisitHistory()
  const friends = getFriends()

  const allDining = [...randomHistory, ...visitHistory]
  const totalActions = randomHistory.length + groupHistory.length + flipHistory.length + visitHistory.length

  if (totalActions < 1) return null

  // ===== 1. 口味偏好分析 =====
  const categoryCount = new Map<string, number>()
  allDining.forEach(item => {
    categoryCount.set(item.category, (categoryCount.get(item.category) || 0) + 1)
  })

  const topCategories = Array.from(categoryCount.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / allDining.length) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const spicyCats = new Set(['火锅', '烧烤'])
  const mildSpicyCats = new Set(['中餐', '小吃'])
  const spicyCount = allDining.filter(r => spicyCats.has(r.category)).length
  const mildCount = allDining.filter(r => mildSpicyCats.has(r.category)).length
  const spiceRatio = (spicyCount * 2 + mildCount) / allDining.length

  let spiceLevel: 'light' | 'mild' | 'medium' | 'heavy'
  let spiceLevelText: string
  let tasteSummary: string

  if (spiceRatio >= 1.5) {
    spiceLevel = 'heavy'
    spiceLevelText = '重口味（火锅/烧烤占比高）'
    tasteSummary = `无辣不欢的火锅狂热者，${topCategories[0]?.category || '火锅'}是你的灵魂伴侣`
  } else if (spiceRatio >= 0.8) {
    spiceLevel = 'medium'
    spiceLevelText = '中等辣度（偏爱重口）'
    tasteSummary = `口味偏重的干饭人，${topCategories[0]?.category || '中餐'}和${topCategories[1]?.category || '火锅'}都是你的菜`
  } else if (spiceRatio >= 0.3) {
    spiceLevel = 'mild'
    spiceLevelText = '微辣选手（适度尝鲜）'
    tasteSummary = `口味均衡的美食家，${topCategories[0]?.category || '中餐'}是你的最爱`
  } else {
    spiceLevel = 'light'
    spiceLevelText = '清淡养生派'
    tasteSummary = `清淡饮食爱好者，${topCategories[0]?.category || '日料'}等精致美食是你的首选`
  }

  // ===== 2. 消费习惯分析 =====
  const prices = allDining.map(r => r.avgPrice).filter(p => p > 0)
  const avgSpending = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0
  const priceStdDev = prices.length > 1
    ? Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - avgSpending, 2), 0) / prices.length)
    : 0

  let priceSensitivity: 'high' | 'medium' | 'low'
  let priceSensitivityText: string
  let consumptionSummary: string

  if (avgSpending <= 25 && priceStdDev <= 10) {
    priceSensitivity = 'high'
    priceSensitivityText = '高（标准差仅¥' + Math.round(priceStdDev) + '）'
    consumptionSummary = `精打细算的省钱高手，日均¥${avgSpending}就能吃得很满足`
  } else if (avgSpending <= 35) {
    priceSensitivity = 'medium'
    priceSensitivityText = '中等（学生日常价位）'
    consumptionSummary = `标准的学生消费水平，日均¥${avgSpending}，偶尔也会奢侈一把`
  } else {
    priceSensitivity = 'low'
    priceSensitivityText = '低（追求品质）'
    consumptionSummary = `品质美食家，日均¥${avgSpending}，愿意为好吃的多花钱`
  }

  // 统计最常去的餐厅
  const restaurantCount = new Map<string, { name: string; count: number; id: string }>()
  allDining.forEach(item => {
    const existing = restaurantCount.get(item.restaurantId)
    if (existing) {
      existing.count++
    } else {
      restaurantCount.set(item.restaurantId, {
        name: item.restaurantName,
        count: 1,
        id: item.restaurantId
      })
    }
  })

  const topRestaurants = Array.from(restaurantCount.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  // ===== 3. 社交属性分析 =====
  const groupOrderCount = groupHistory.length
  const flipCount = flipHistory.length
  const friendCount = friends.length
  const socialScore = groupOrderCount * 3 + flipCount + friendCount * 2

  let socialType: 'introvert' | 'balanced' | 'extrovert'
  let socialTypeText: string
  let socialSummary: string

  if (socialScore >= 15) {
    socialType = 'extrovert'
    socialTypeText = '社牛倾向'
    socialSummary = `天生的饭搭子体质，拼单${groupOrderCount}次，好友${friendCount}人，一个人吃饭是不存在的`
  } else if (socialScore >= 5) {
    socialType = 'balanced'
    socialTypeText = '平衡型'
    socialSummary = `社交干饭两不误，偶尔拼单凑热闹，也享受一个人的美食时光`
  } else {
    socialType = 'introvert'
    socialTypeText = '独食者'
    socialSummary = `一人食达人，享受独自干饭的自由，不需要迁就别人的口味`
  }

  // ===== 4. 探店行为分析 =====
  const uniqueRestaurants = new Set(allDining.map(r => r.restaurantId))
  const uniqueCategories = new Set(allDining.map(r => r.category))
  const exploreRate = allDining.length > 0 ? uniqueRestaurants.size / allDining.length : 0

  let exploreType: 'conservative' | 'balanced' | 'adventurous'
  let exploreTypeText: string
  let exploreSummary: string

  if (exploreRate >= 0.7) {
    exploreType = 'adventurous'
    exploreTypeText = '冒险型探店家'
    exploreSummary = `永远在探索新味道，${uniqueRestaurants.size}家店${uniqueCategories.size}种品类，你的美食版图在不断扩张`
  } else if (exploreRate >= 0.4) {
    exploreType = 'balanced'
    exploreTypeText = '平衡型选手'
    exploreSummary = `新店老店都吃，既有心头好也爱尝鲜，探索度适中的稳健派`
  } else {
    exploreType = 'conservative'
    exploreTypeText = '忠诚型食客'
    exploreSummary = `认准几家店反复吃，${topRestaurants[0]?.name || '老店'}是你的食堂，稳定的快乐最重要`
  }

  const recentVisits = visitHistory.slice(0, 5).map(v => ({
    name: v.restaurantName,
    category: v.category,
    price: v.avgPrice,
    id: v.restaurantId,
    timestamp: v.timestamp
  }))

  // ===== 整体总结 =====
  const personalityLabels: string[] = []
  if (spiceLevel === 'heavy') personalityLabels.push('无辣不欢')
  if (priceSensitivity === 'high') personalityLabels.push('省钱小天才')
  if (socialType === 'extrovert') personalityLabels.push('社交干饭王')
  if (exploreType === 'adventurous') personalityLabels.push('探店达人')

  const overallSummary = personalityLabels.length > 0
    ? `你是传说中的"${personalityLabels.join(' · ')}"，${tasteSummary.split('，')[0]}的硬核干饭人`
    : `你是一位${exploreTypeText}的干饭人，正在探索属于自己的美食之路`

  return {
    taste: {
      topCategories,
      spiceLevel,
      spiceLevelText,
      aiSummary: tasteSummary
    },
    consumption: {
      avgSpending,
      priceRange: { min: minPrice, max: maxPrice },
      priceSensitivity,
      priceSensitivityText,
      topRestaurants,
      aiSummary: consumptionSummary
    },
    social: {
      groupOrderCount,
      flipCount,
      friendCount,
      socialType,
      socialTypeText,
      aiSummary: socialSummary
    },
    explore: {
      uniqueRestaurantCount: uniqueRestaurants.size,
      uniqueCategoryCount: uniqueCategories.size,
      exploreRate: Math.round(exploreRate * 100),
      exploreType,
      exploreTypeText,
      recentVisits,
      aiSummary: exploreSummary
    },
    overallSummary
  }
}
