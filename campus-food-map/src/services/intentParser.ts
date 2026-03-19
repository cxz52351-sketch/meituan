import { Category, PriceRange } from '../types'
import { DiningMode } from './ai'

type GuideStep = 'mode' | 'mealTime' | 'scene' | 'budget' | 'taste' | 'result'

export interface GuideFiltersPartial {
  mode?: DiningMode
  mealTime?: string
  scene?: string
  priceRange?: PriceRange | PriceRange[]
  category?: Category
}

export type IntentResult =
  | { type: 'guide_option'; step: GuideStep; optionId: string }
  | { type: 'filter_inject'; filters: GuideFiltersPartial; summary: string }
  | { type: 'need_llm' }

// 关键词 → 选项ID 的映射表
const modeKeywords: Record<string, string[]> = {
  delivery: ['外卖', '送到', '配送', '送来', '送上来', '宿舍送'],
  dinein: ['堂食', '去店里', '到店', '去吃', '坐着吃', '店里吃'],
  pickup: ['自取', '带走', '打包', '顺路'],
  any: ['无所谓', '都行', '都可以', '随便'],
}

const mealTimeKeywords: Record<string, string[]> = {
  breakfast: ['早餐', '早饭', '早上吃', '早点'],
  brunch: ['早午餐', 'brunch'],
  lunch: ['午餐', '午饭', '中午吃', '中饭'],
  afternoon: ['下午茶', '下午吃', '茶歇'],
  dinner: ['晚餐', '晚饭', '晚上吃'],
  latenight: ['宵夜', '夜宵', '深夜', '半夜吃'],
}

const sceneKeywords: Record<string, string[]> = {
  alone: ['一个人', '自己吃', '独食', '单独'],
  friends: ['朋友', '室友', '同学', '两三个人', '几个人'],
  date: ['约会', '女朋友', '男朋友', '两个人', '情侣', '对象'],
  party: ['聚餐', '请客', '聚会', '一群人', '很多人'],
  random: ['随便', '都行', '不挑', '啥都行'],
}

const budgetKeywords: Record<string, string[]> = {
  budget: ['便宜', '穷', '省钱', '穷鬼', '最便宜', '不想花钱'],
  affordable: ['正常', '普通', '一般'],
  splurge: ['奢侈', '贵的', '好的', '高端', '不差钱'],
  any: ['无所谓', '都行', '都可以'],
}

const categoryKeywords: Record<Category, string[]> = {
  '中餐': ['中餐', '中式', '家常菜', '炒菜'],
  '西餐': ['西餐', '牛排', '意面', '汉堡', '披萨'],
  '日料': ['日料', '日本料理', '寿司', '刺身', '拉面'],
  '韩餐': ['韩餐', '韩式', '韩国料理', '石锅拌饭', '部队锅', '年糕'],
  '火锅': ['火锅', '涮锅', '麻辣烫', '冒菜'],
  '烧烤': ['烧烤', '撸串', '烤肉', '串串'],
  '小吃': ['小吃', '零食', '点心', '煎饼'],
  '快餐': ['快餐', '简餐', '盒饭', '黄焖鸡', '麻辣香锅'],
  '饮品': ['饮品', '奶茶', '咖啡', '果汁', '喝点'],
  '甜点': ['甜点', '蛋糕', '面包', '甜品'],
  '面食': ['面食', '面条', '拉面', '刀削面', '米粉', '米线', '螺蛳粉'],
  '粥店': ['粥', '粥店', '稀饭', '皮蛋瘦肉粥'],
  '东南亚': ['东南亚', '泰餐', '越南', '咖喱'],
  '其他': [],
}

// 价格数字提取：匹配 "30块以内" / "20元左右" / "人均50"
const priceRegex = /(?:人均|大概|差不多)?(\d+)\s*(?:块|元|rmb|¥)?(?:以[内下]|左右|上下)?/i

function matchKeywords(text: string, keywords: Record<string, string[]>): string | null {
  for (const [id, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (text.includes(word)) return id
    }
  }
  return null
}

function extractCategory(text: string): Category | undefined {
  for (const [cat, words] of Object.entries(categoryKeywords)) {
    if (cat === '其他') continue
    for (const word of words) {
      if (text.includes(word)) return cat as Category
    }
  }
  return undefined
}

function extractPriceRange(text: string): PriceRange | PriceRange[] | undefined {
  // 先查关键词
  const kw = matchKeywords(text, budgetKeywords)
  if (kw === 'budget') return 'budget'
  if (kw === 'affordable') return 'affordable'
  if (kw === 'splurge') return ['moderate', 'premium']

  // 再查数字
  const match = text.match(priceRegex)
  if (match) {
    const price = parseInt(match[1], 10)
    if (price <= 15) return 'budget'
    if (price <= 35) return 'affordable'
    if (price <= 60) return 'moderate'
    return 'premium'
  }
  return undefined
}

function extractMode(text: string): DiningMode | undefined {
  const id = matchKeywords(text, modeKeywords)
  if (id && id !== 'any') return id as DiningMode
  return undefined
}

function extractScene(text: string): string | undefined {
  const sceneMapping: Record<string, string> = {
    alone: '一个人',
    friends: '和室友',
    date: '约会',
    party: '聚餐',
  }
  const id = matchKeywords(text, sceneKeywords)
  if (id && id !== 'random') return sceneMapping[id]
  return undefined
}

function extractMealTime(text: string): string | undefined {
  return matchKeywords(text, mealTimeKeywords) || undefined
}

/**
 * 解析用户输入，尝试匹配到引导流选项或提取筛选条件
 */
export function parseIntent(text: string, currentStep: GuideStep): IntentResult {
  const trimmed = text.trim()

  // 1. 当前步骤的直接选项匹配
  if (currentStep !== 'result') {
    const stepMatch = matchCurrentStep(trimmed, currentStep)
    if (stepMatch) return stepMatch
  }

  // 2. 尝试提取复合筛选条件（任何步骤都可以触发）
  {
    const filters = extractAllFilters(trimmed)
    const filterCount = Object.keys(filters).length
    if (filterCount >= 2) {
      // 多个条件 → 直接跳到结果
      const summary = buildFilterSummary(filters)
      return { type: 'filter_inject', filters, summary }
    }
    // 单个条件且匹配当前步骤 → 当作选项处理（上面已处理）
    // 单个条件但不匹配当前步骤 → 也注入筛选
    if (filterCount === 1) {
      const summary = buildFilterSummary(filters)
      return { type: 'filter_inject', filters, summary }
    }
  }

  // 3. 兜底：需要 LLM
  return { type: 'need_llm' }
}

function matchCurrentStep(text: string, step: GuideStep): IntentResult | null {
  let keywords: Record<string, string[]>
  switch (step) {
    case 'mode': keywords = modeKeywords; break
    case 'mealTime': keywords = mealTimeKeywords; break
    case 'scene': keywords = sceneKeywords; break
    case 'budget': keywords = budgetKeywords; break
    case 'taste':
      // taste 步骤匹配品类关键词
      const cat = extractCategory(text)
      if (cat) return { type: 'guide_option', step: 'taste', optionId: cat }
      if (/随便|都行|都可以|啥都行/.test(text)) {
        return { type: 'guide_option', step: 'taste', optionId: 'any' }
      }
      return null
    default: return null
  }
  const matched = matchKeywords(text, keywords)
  if (matched) return { type: 'guide_option', step, optionId: matched }
  return null
}

function extractAllFilters(text: string): GuideFiltersPartial {
  const filters: GuideFiltersPartial = {}
  const mode = extractMode(text)
  if (mode) filters.mode = mode
  const mealTime = extractMealTime(text)
  if (mealTime) filters.mealTime = mealTime
  const scene = extractScene(text)
  if (scene) filters.scene = scene
  const price = extractPriceRange(text)
  if (price) filters.priceRange = price
  const cat = extractCategory(text)
  if (cat) filters.category = cat
  return filters
}

function buildFilterSummary(filters: GuideFiltersPartial): string {
  const parts: string[] = []
  if (filters.mode) {
    const modeLabel: Record<string, string> = { delivery: '外卖', dinein: '堂食', pickup: '自取' }
    parts.push(modeLabel[filters.mode] || filters.mode)
  }
  if (filters.mealTime) parts.push(filters.mealTime)
  if (filters.scene) parts.push(filters.scene)
  if (filters.category) parts.push(filters.category)
  if (filters.priceRange) {
    if (Array.isArray(filters.priceRange)) {
      parts.push('高消费')
    } else {
      const priceLabel: Record<string, string> = { budget: '便宜', affordable: '正常价位', moderate: '中等', premium: '高端' }
      parts.push(priceLabel[filters.priceRange] || '')
    }
  }
  return parts.join(' · ')
}
