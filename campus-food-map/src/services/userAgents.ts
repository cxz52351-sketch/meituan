// 用户画像分析 — 多Agent架构（Demo版本）
// 架构思路：专门的子agent对不同维度数据进行去重、提炼、总结，减少主agent上下文占用

import { getRandomHistory, getVisitHistory, getGiftHistory, getGroupOrderHistory, getFlipHistory } from './history'
import { getProfile } from './profile'
import { computeTasteDNA } from './tasteDNA'

// ============ 子Agent接口定义 ============

export interface TasteInsight {
  topCategories: string[]        // Top3 品类
  spiceLevel: '清淡' | '适中' | '重口'
  summary: string                 // 一句话总结
}

export interface BudgetInsight {
  avgPrice: number                // 平均消费
  priceRange: string              // 价格带描述
  budgetConscious: boolean        // 是否价格敏感
}

export interface SocialInsight {
  personality: '社牛' | '社恐' | '中性'
  groupDiningFreq: number         // 拼单频率
  summary: string
}

export interface BrowsingInsight {
  recentFavorites: string[]       // 最近常去的店
  explorationLevel: '保守' | '适中' | '探索型'
  lastVisitPattern: string        // 访问模式描述
}

export interface UserInsights {
  taste: TasteInsight
  budget: BudgetInsight
  social: SocialInsight
  browsing: BrowsingInsight
  overallSummary: string          // 综合画像
}

// ============ 子Agent 1: 口味分析 ============

/**
 * 口味分析Agent
 * 职责：分析用户的品类偏好、辣度偏好、口味标签
 * 输入：浏览历史、随机吃历史、礼物历史、用户Profile
 * 输出：结构化的口味画像
 */
function analyzeTastePreference(): TasteInsight {
  const history = [
    ...getVisitHistory().map(h => ({ category: h.category })),
    ...getRandomHistory().map(h => ({ category: h.category })),
    ...getGiftHistory().map(h => ({ category: '' })), // 礼物历史没有category，忽略
  ].filter(h => h.category)

  // 统计品类频率
  const categoryFreq: Record<string, number> = {}
  for (const h of history) {
    categoryFreq[h.category] = (categoryFreq[h.category] || 0) + 1
  }

  const topCategories = Object.entries(categoryFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(e => e[0])

  // 辣度判断：火锅/烧烤/中餐占比
  const spicyCount = history.filter(h => ['火锅', '烧烤', '中餐'].includes(h.category)).length
  const spiceLevel = spicyCount / history.length > 0.5 ? '重口' : spicyCount / history.length > 0.2 ? '适中' : '清淡'

  // 结合用户标签
  const profile = getProfile()
  const hasSpicyTag = profile?.diningTags?.some(t => t.includes('辣'))
  const finalSpiceLevel = hasSpicyTag ? '重口' : spiceLevel

  // 生成总结
  let summary = ''
  if (topCategories.length === 0) {
    summary = '新用户，口味偏好待探索'
  } else if (finalSpiceLevel === '重口') {
    summary = `无辣不欢的${topCategories[0]}爱好者`
  } else if (topCategories[0] === '饮品' || topCategories[0] === '甜点') {
    summary = '奶茶续命体质，甜食爱好者'
  } else {
    summary = `偏爱${topCategories.slice(0, 2).join('和')}的美食探索者`
  }

  return {
    topCategories: topCategories.length > 0 ? topCategories : ['暂无偏好'],
    spiceLevel: finalSpiceLevel,
    summary,
  }
}

// ============ 子Agent 2: 消费分析 ============

/**
 * 消费分析Agent
 * 职责：分析用户的价格敏感度、消费能力、价格带偏好
 * 输入：所有涉及价格的历史记录
 * 输出：结构化的消费画像
 */
function analyzeBudget(): BudgetInsight {
  const history = [
    ...getVisitHistory().map(h => h.avgPrice),
    ...getRandomHistory().map(h => h.avgPrice),
  ].filter(p => p > 0)

  if (history.length === 0) {
    return {
      avgPrice: 0,
      priceRange: '暂无数据',
      budgetConscious: false,
    }
  }

  const avgPrice = Math.round(history.reduce((a, b) => a + b, 0) / history.length)

  // 价格带判断
  let priceRange = ''
  if (avgPrice <= 20) priceRange = '穷鬼友好价位（¥20以下）'
  else if (avgPrice <= 35) priceRange = '学生日常价位（¥20-35）'
  else if (avgPrice <= 50) priceRange = '小资品质价位（¥35-50）'
  else priceRange = '高端犒劳价位（¥50+）'

  // 价格敏感度：标准差小 = 价格稳定 = 敏感
  const variance = history.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / history.length
  const stdDev = Math.sqrt(variance)
  const budgetConscious = stdDev < 10 || avgPrice <= 25

  // 结合用户标签
  const profile = getProfile()
  const hasBudgetTag = profile?.diningTags?.some(t => t.includes('穷鬼') || t.includes('性价比'))
  const finalBudgetConscious = hasBudgetTag || budgetConscious

  return {
    avgPrice,
    priceRange,
    budgetConscious: finalBudgetConscious,
  }
}

// ============ 子Agent 3: 社交分析 ============

/**
 * 社交分析Agent
 * 职责：分析用户的社交属性、拼单习惯、群体用餐偏好
 * 输入：拼单历史、翻牌历史、好友数
 * 输出：结构化的社交画像
 */
function analyzeSocial(): SocialInsight {
  const groupHistory = getGroupOrderHistory()
  const flipHistory = getFlipHistory()
  const totalSocialActions = groupHistory.length + flipHistory.length

  let personality: '社牛' | '社恐' | '中性' = '中性'
  if (totalSocialActions >= 5) personality = '社牛'
  else if (totalSocialActions === 0) personality = '社恐'

  const groupDiningFreq = groupHistory.length

  let summary = ''
  if (personality === '社牛') {
    summary = '天生的饭搭子体质，喜欢呼朋唤友一起干饭'
  } else if (personality === '社恐') {
    summary = '独立干饭人，享受一个人的美食时光'
  } else {
    summary = '偶尔拼单，灵活的干饭策略'
  }

  return {
    personality,
    groupDiningFreq,
    summary,
  }
}

// ============ 子Agent 4: 浏览行为分析 ============

/**
 * 浏览行为分析Agent
 * 职责：分析用户的探店习惯、访问模式、新鲜度偏好
 * 输入：浏览历史、随机吃历史
 * 输出：结构化的行为画像
 */
function analyzeBrowsing(): BrowsingInsight {
  const visitHistory = getVisitHistory()
  const randomHistory = getRandomHistory()

  // 最近常去的店（去重）
  const recentRestaurants = [...visitHistory, ...randomHistory]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)
  const restaurantFreq: Record<string, number> = {}
  for (const r of recentRestaurants) {
    restaurantFreq[r.restaurantName] = (restaurantFreq[r.restaurantName] || 0) + 1
  }
  const recentFavorites = Object.entries(restaurantFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(e => e[0])

  // 探索度：独立餐厅数 / 总访问数
  const uniqueRestaurants = new Set(recentRestaurants.map(r => r.restaurantId))
  const explorationRate = uniqueRestaurants.size / recentRestaurants.length
  let explorationLevel: '保守' | '适中' | '探索型' = '适中'
  if (explorationRate > 0.7) explorationLevel = '探索型'
  else if (explorationRate < 0.4) explorationLevel = '保守'

  // 访问模式
  let lastVisitPattern = ''
  if (explorationLevel === '探索型') {
    lastVisitPattern = '喜欢尝试新店，不爱重复'
  } else if (explorationLevel === '保守') {
    lastVisitPattern = `忠实粉丝，常去${recentFavorites[0] || '熟悉的店'}`
  } else {
    lastVisitPattern = '新店老店都吃，平衡型选手'
  }

  return {
    recentFavorites: recentFavorites.length > 0 ? recentFavorites : ['暂无记录'],
    explorationLevel,
    lastVisitPattern,
  }
}

// ============ 主Agent：综合画像生成 ============

/**
 * 主Agent入口
 * 职责：调度所有子agent，汇总结果，生成综合画像
 *
 * 架构优势：
 * 1. 上下文精简：子agent各自处理原始数据，只返回结构化结论
 * 2. 职责清晰：每个子agent专注单一维度，易维护易扩展
 * 3. 并行计算：所有子agent可并行执行（当前demo为同步，生产环境可改为Promise.all）
 */
export function getUserInsights(): UserInsights {
  // 调度所有子agent（demo版本同步执行，生产环境可并行）
  const taste = analyzeTastePreference()
  const budget = analyzeBudget()
  const social = analyzeSocial()
  const browsing = analyzeBrowsing()

  // 生成综合画像
  const dna = computeTasteDNA(getProfile())
  const dnaLabels = dna?.labels.join('、') || '干饭新手'

  let overallSummary = `${taste.summary}，${budget.priceRange}，${social.summary}。`
  if (dnaLabels) {
    overallSummary += ` 口味DNA：${dnaLabels}。`
  }

  return {
    taste,
    budget,
    social,
    browsing,
    overallSummary,
  }
}

// ============ 工具函数：生成精简文本（供AI调用） ============

/**
 * 将结构化画像转为精简文本，供主AI（团子）调用
 * 目标：将原始数据（可能几百行）压缩到100字以内
 */
export function getUserInsightsSummary(): string {
  const insights = getUserInsights()

  return `【用户画像】
口味：${insights.taste.summary}（偏好${insights.taste.topCategories.join('、')}，${insights.taste.spiceLevel}）
消费：${insights.budget.priceRange}，日均¥${insights.budget.avgPrice}${insights.budget.budgetConscious ? '，价格敏感' : ''}
社交：${insights.social.summary}（拼单${insights.social.groupDiningFreq}次）
行为：${insights.browsing.lastVisitPattern}（最近常去${insights.browsing.recentFavorites.slice(0, 2).join('、')}）

综合：${insights.overallSummary}`
}
