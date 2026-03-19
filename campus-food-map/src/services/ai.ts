import { restaurants } from '../data/restaurants'
import { Restaurant, University, PriceRange, Category, UserProfile } from '../types'
import { APIMessage, ToolCall, StreamDelta } from '../types/chat'
import { getSavingsPlan } from '../data/deals'
import { TasteDNAResult } from './tasteDNA'
import { getRandomHistory, getVisitHistory } from './history'
import { getFeedbackStats } from './feedback'

// ========== Time Awareness ==========

export function getMealPeriod(): { period: string; greeting: string } {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 10) return { period: '早餐', greeting: '早上好！该吃早餐啦 🌅' }
  if (hour >= 10 && hour < 14) return { period: '午餐', greeting: '中午好！午饭时间到 🍱' }
  if (hour >= 14 && hour < 17) return { period: '下午茶', greeting: '下午好！来点下午茶？ ☕' }
  if (hour >= 17 && hour < 21) return { period: '晚餐', greeting: '晚上好！晚饭吃什么？ 🌙' }
  return { period: '宵夜', greeting: '夜猫子！来份宵夜？ 🦉' }
}

export function getTimeSuggestions(): string[] {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 10) return ['早餐吃啥？', '快速出餐的', '来杯咖啡', '便宜管饱的']
  if (hour >= 10 && hour < 14) return ['午饭吃啥？', '一个人随便吃', '便宜好吃的', '帮我随机选']
  if (hour >= 14 && hour < 17) return ['下午茶推荐', '想喝奶茶', '适合约会的', '甜点推荐']
  if (hour >= 17 && hour < 21) return ['晚饭吃啥？', '想吃火锅', '适合聚餐的', '帮我随机选']
  return ['宵夜吃啥？', '深夜还开的', '来份烧烤', '帮我随机选']
}

// ========== System Prompt ==========

function buildSystemPrompt(university: University | 'all'): string {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
  const uniContext = university === 'all' ? '全部学校' : university
  const { period } = getMealPeriod()

  return `你是「团子」，美团大学城的 AI 美食助手，帮大学生解决"今天吃啥"这个千古难题。你是美团内部的校园美食频道，拥有美团的真实交易数据。

## 身份
- 热情接地气的美食达人，像大学生的朋友一样聊天
- 你的核心价值不是搜索引擎，而是**帮用户快速做决定**——减少选择困难
- 你的推荐基于美团真实交易数据（复购率、订单量、实付价格），而非仅靠评分

## 当前上下文
- 时间：${timeStr}（${dayOfWeek}），现在是**${period}**时段
- 用户选择的学校：${uniContext}
- 你能调用工具查询当前营业的餐厅、按条件搜索、智能随机推荐
- **重要**：你可以调用 get_user_insights 获取用户画像（已由专门的子agent分析提炼），包含口味偏好、消费习惯、社交属性等

## 对话策略

### 个性化推荐（核心能力）
- 在推荐前，**优先调用 get_user_insights** 了解用户偏好
- 根据用户画像调整推荐策略：
  * 如果用户常吃火锅，优先推火锅类
  * 如果用户平均消费¥25，避免推¥60+的店
  * 提到用户的口味标签（"无辣不欢"/"省钱小天才"）拉近距离
  * 如果用户是探索型，推荐新店；如果是保守型，推荐熟悉的品类
- 新用户（无历史数据）则正常推荐，不强求个性化

### 冷启动（首次/模糊需求）
用户说"吃啥"、"推荐"等模糊需求时，**用一句话快速收集关键信息**，并附上快捷回复选项让用户点选：
- 如果用户说"随便"、"都行"，就果断用 smart_random 工具帮他选，不要再追问

### 推荐策略
1. 调用工具搜索后，**精选2-3家**，直接输出工具返回的推荐理由（已包含结构化格式）
2. 工具返回的理由格式为：
   📍 **餐厅名**
   💡 个性化理由（如果有）
   📊 数据亮点
   💰 省钱信息
3. 不要修改工具返回的格式，直接展示即可
4. 当前是${period}时段，工具已自动优先推荐营业中的餐厅
5. 推荐后可以追问："就去这家？还是你有别的想法？"

### 决策辅助
- 用户犹豫时用排除法，给出选项让用户点选
- 用户说"都行"就果断推一家："那我直接帮你选——"
- 说完推荐后可以追问："就去这家？还是你有别的想法？"

### 省钱助手（重要！）
- 推荐餐厅时**主动提及省钱方案**，如"有满25减8的券，实付只要17元"
- 用户说"便宜的"、"省钱"时，优先推荐有大额满减券或拼单优惠的餐厅
- 提到优惠信息时用自然语言，如"记得先领券再下单"、"拉个室友一起拼单更划算"
- 这是美团的核心价值——帮学生在平台内省到最多，而不是比价

## 快捷回复（重要！）
当你需要向用户**提问或让用户做选择**时，必须在回复末尾添加快捷回复标记，格式为：
[快捷回复:选项1|选项2|选项3|选项4]

示例：
- 追问偏好时："几个人吃呀？预算啥范围？[快捷回复:一个人随便吃|和朋友2-3人|约会|请客聚餐]"
- 追问口味时："想吃啥类型的？[快捷回复:来杯奶茶|甜点蛋糕|简餐轻食|都行随便]"
- 推荐后追问："就去这家？[快捷回复:就这家吧|换一家看看|有没有更便宜的|有没有更近的]"

规则：
- 选项2-4个，每个选项不超过8个字
- 选项要覆盖用户最可能的回答
- 如果不需要用户选择（如纯推荐结束），可以不加快捷回复
- 最后一个选项可以是"随便/都行"这类兜底选项

## 回复风格
- 简洁活泼，像朋友聊天
- 适度用emoji（1-2个）
- 回复控制在80-120字
- 用"你"称呼，价格用"人均xx元"

## 重要规则
- 只推荐数据库中存在的餐厅，绝不编造
- 必须调用工具获取数据后再推荐
- 没有匹配结果时诚实说明，建议放宽条件
- 推荐时提到餐厅名字，方便用户在下方卡片中找到`
}

// ========== Tool Definitions ==========

const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'search_restaurants',
      description: '按条件搜索餐厅。可按品类、价格、场景、距离、特色筛选和排序。当用户表达了明确偏好时使用。',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: '美食品类',
            enum: ['中餐', '西餐', '日料', '韩餐', '火锅', '烧烤', '小吃', '快餐', '饮品', '甜点', '面食', '粥店', '东南亚', '其他']
          },
          priceRange: {
            type: 'string',
            description: '价格区间：budget(人均20以下), affordable(20-40), moderate(40-70), premium(70+)',
            enum: ['budget', 'affordable', 'moderate', 'premium']
          },
          scene: {
            type: 'string',
            description: '用餐场景',
            enum: ['一个人', '和室友', '约会', '聚餐', '请客', '深夜', '快速']
          },
          maxWalkTime: {
            type: 'number',
            description: '最大步行时间（分钟）'
          },
          feature: {
            type: 'string',
            description: '餐厅特色',
            enum: ['穷鬼友好', '快速出餐', '环境好', '分量足', '有包间', '可外带', '有wifi']
          },
          sortBy: {
            type: 'string',
            description: '排序方式',
            enum: ['rating', 'distance', 'price'],
            default: 'rating'
          },
          limit: {
            type: 'number',
            description: '返回数量限制，默认3',
            default: 3
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_restaurant_detail',
      description: '获取单个餐厅的详细信息，包括推荐菜、小贴士、营业时间等。当用户询问某家具体餐厅时使用。',
      parameters: {
        type: 'object',
        properties: {
          restaurantId: {
            type: 'string',
            description: '餐厅ID'
          },
          restaurantName: {
            type: 'string',
            description: '餐厅名称（模糊匹配）'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_open_now',
      description: '获取当前时间正在营业的餐厅列表。当用户关心"现在能吃到什么"或需要考虑营业时间时使用。',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: '可选品类筛选',
            enum: ['中餐', '西餐', '日料', '韩餐', '火锅', '烧烤', '小吃', '快餐', '饮品', '甜点', '面食', '粥店', '东南亚', '其他']
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'smart_random',
      description: '智能随机推荐。不是纯随机，而是基于当前时间段（早餐/午餐/下午茶/晚餐/宵夜）、是否营业、评分等综合权重随机选择。当用户说"随便"、"都行"、"帮我选"、"不知道吃啥"时使用。',
      parameters: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: '推荐数量，默认1',
            default: 1
          },
          excludeIds: {
            type: 'array',
            items: { type: 'string' },
            description: '排除的餐厅ID列表（避免重复推荐）'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_user_insights',
      description: '获取用户画像（由多个专门的子agent分析提炼）。包含口味偏好、消费习惯、社交属性、浏览行为等维度。当需要个性化推荐或了解用户偏好时调用。注意：这是已经提炼好的结构化画像，不是原始数据。',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
]

// ========== Tool Execution ==========

function getFilteredRestaurants(university: University | 'all'): Restaurant[] {
  if (university === 'all') return restaurants
  return restaurants.filter(r => r.university === university)
}

function isOpenNow(r: Restaurant): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [openH, openM] = r.openTime.split(':').map(Number)
  const [closeH, closeM] = r.closeTime.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes
  }
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes
}

function formatRestaurant(r: Restaurant): string {
  const openStatus = isOpenNow(r) ? '✅营业中' : '❌已打烊'
  const discount = r.studentDiscount ? ` | 学生优惠：${r.studentDiscount}` : ''
  const plan = getSavingsPlan(r.id)
  let savingsInfo = ''
  if (plan) {
    const couponStr = plan.coupons.map(c => c.title).join('、')
    const groupStr = plan.groupOrder ? `拼单${plan.groupOrder.discountDesc}` : ''
    const pickupStr = plan.selfPickupSave > 0 ? `到店自取省${plan.selfPickupSave}元` : ''
    savingsInfo = ` | 省钱方案：${[couponStr, groupStr, pickupStr].filter(Boolean).join('；')}`
  }
  return `【${r.name}】(ID:${r.id}) ${r.category} | 标价人均${r.avgPrice}元，实付均价${r.actualPayPrice}元 | ${r.rating}分(${r.reviewCount}条) | 同学复购率${Math.round(r.repurchaseRate * 100)}% | 本周${r.weeklyStudentOrders}位同学下单 | ${r.distance}m/步行${r.walkTime}分钟 | 平均${r.avgDeliveryMinutes}分钟出餐 | ${r.address} | ${openStatus} ${r.openTime}-${r.closeTime} | 推荐菜：${r.recommendDishes.join('、')} | 特色：${r.features.join('、')} | 场景：${r.scenes.join('、')}${discount}${savingsInfo} | 贴士：${r.tips.join('；')}`
}

interface SearchParams {
  category?: string
  priceRange?: string
  scene?: string
  maxWalkTime?: number
  feature?: string
  sortBy?: string
  limit?: number
}

function executeSearchRestaurants(params: SearchParams, university: University | 'all'): { text: string; restaurants: Restaurant[] } {
  let results = getFilteredRestaurants(university)

  if (params.category) {
    results = results.filter(r => r.category === params.category)
  }
  if (params.priceRange) {
    results = results.filter(r => r.priceRange === params.priceRange)
  }
  if (params.scene) {
    results = results.filter(r => r.scenes.includes(params.scene as Restaurant['scenes'][number]))
  }
  if (params.maxWalkTime) {
    results = results.filter(r => r.walkTime <= params.maxWalkTime!)
  }
  if (params.feature) {
    results = results.filter(r => r.features.includes(params.feature as Restaurant['features'][number]))
  }

  const sortBy = params.sortBy || 'rating'
  if (sortBy === 'rating') {
    results.sort((a, b) => b.rating - a.rating)
  } else if (sortBy === 'distance') {
    results.sort((a, b) => a.distance - b.distance)
  } else if (sortBy === 'price') {
    results.sort((a, b) => a.avgPrice - b.avgPrice)
  }

  const limit = params.limit || 3
  results = results.slice(0, limit)

  if (results.length === 0) {
    return { text: '没有找到符合条件的餐厅。建议放宽筛选条件。', restaurants: [] }
  }

  const text = `找到${results.length}家餐厅：\n${results.map(formatRestaurant).join('\n')}`
  return { text, restaurants: results }
}

function executeGetDetail(params: { restaurantId?: string; restaurantName?: string }): { text: string; restaurants: Restaurant[] } {
  let r: Restaurant | undefined
  if (params.restaurantId) {
    r = restaurants.find(rest => rest.id === params.restaurantId)
  } else if (params.restaurantName) {
    r = restaurants.find(rest => rest.name.includes(params.restaurantName!))
  }
  if (!r) return { text: '未找到该餐厅。', restaurants: [] }
  return { text: formatRestaurant(r), restaurants: [r] }
}

function executeGetOpenNow(params: { category?: string }, university: University | 'all'): { text: string; restaurants: Restaurant[] } {
  let results = getFilteredRestaurants(university).filter(isOpenNow)
  if (params.category) {
    results = results.filter(r => r.category === params.category)
  }
  results.sort((a, b) => b.rating - a.rating)
  if (results.length === 0) {
    return { text: '当前时间没有营业的餐厅。', restaurants: [] }
  }
  const text = `当前营业中（${results.length}家）：\n${results.map(formatRestaurant).join('\n')}`
  return { text, restaurants: results }
}

function executeSmartRandom(params: { count?: number; excludeIds?: string[] }, university: University | 'all'): { text: string; restaurants: Restaurant[] } {
  let candidates = getFilteredRestaurants(university).filter(isOpenNow)
  if (params.excludeIds?.length) {
    candidates = candidates.filter(r => !params.excludeIds!.includes(r.id))
  }
  // 如果当前没有营业的，回退到全部
  if (candidates.length === 0) {
    candidates = getFilteredRestaurants(university)
    if (params.excludeIds?.length) {
      candidates = candidates.filter(r => !params.excludeIds!.includes(r.id))
    }
  }

  const count = Math.min(params.count || 1, candidates.length)
  const selected: Restaurant[] = []
  const pool = [...candidates]

  for (let i = 0; i < count && pool.length > 0; i++) {
    // 评分加权随机：rating^2 作为权重
    const weights = pool.map(r => r.rating * r.rating)
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let random = Math.random() * totalWeight
    let idx = 0
    for (let j = 0; j < weights.length; j++) {
      random -= weights[j]
      if (random <= 0) { idx = j; break }
    }
    selected.push(pool[idx])
    pool.splice(idx, 1)
  }

  const { period } = getMealPeriod()
  const text = `基于当前${period}时段、营业状态和评分智能随机推荐${selected.length}家：\n${selected.map(formatRestaurant).join('\n')}`
  return { text, restaurants: selected }
}

import { getUserInsightsSummary } from './userAgents'

function executeTool(toolCall: ToolCall, university: University | 'all'): { text: string; restaurants: Restaurant[] } {
  const args = JSON.parse(toolCall.function.arguments)
  switch (toolCall.function.name) {
    case 'search_restaurants':
      return executeSearchRestaurants(args, university)
    case 'get_restaurant_detail':
      return executeGetDetail(args)
    case 'get_open_now':
      return executeGetOpenNow(args, university)
    case 'smart_random':
      return executeSmartRandom(args, university)
    case 'get_user_insights':
      return { text: getUserInsightsSummary(), restaurants: [] }
    default:
      return { text: '未知工具', restaurants: [] }
  }
}

function getToolDisplayName(name: string): string {
  switch (name) {
    case 'search_restaurants': return '正在搜索餐厅...'
    case 'get_restaurant_detail': return '正在查看详情...'
    case 'get_open_now': return '正在查看营业状态...'
    case 'smart_random': return '正在为你智能推荐...'
    case 'get_user_insights': return '正在分析你的口味偏好...'
    default: return '正在处理...'
  }
}

// ========== Guide Decision Flow ==========

export type DiningMode = 'delivery' | 'dinein' | 'pickup'

export interface PersonalContext {
  profile?: UserProfile | null
  tasteDNA?: TasteDNAResult | null
}

export interface GuideFilters {
  mode?: DiningMode
  mealTime?: string
  scene?: string
  priceRange?: PriceRange | PriceRange[]
  category?: Category
  university: University | 'all'
  excludeIds?: string[]
  personal?: PersonalContext
}

// 判断餐厅在指定时段是否营业
function isOpenDuringPeriod(r: Restaurant, mealTime: string): boolean {
  const periods: Record<string, [number, number]> = {
    breakfast:  [360, 570],   // 6:00-9:30
    brunch:     [570, 690],   // 9:30-11:30
    lunch:      [660, 840],   // 11:00-14:00
    afternoon:  [840, 1020],  // 14:00-17:00
    dinner:     [1020, 1260], // 17:00-21:00
    latenight:  [1260, 1560], // 21:00-26:00 (次日2:00)
  }
  const range = periods[mealTime]
  if (!range) return true

  const [openH, openM] = r.openTime.split(':').map(Number)
  const [closeH, closeM] = r.closeTime.split(':').map(Number)
  let openMin = openH * 60 + openM
  let closeMin = closeH * 60 + closeM
  // 跨午夜情况：closeTime 在 openTime 之前
  if (closeMin < openMin) closeMin += 1440

  const [periodStart, periodEnd] = range
  // 餐厅营业区间与时段有交集即可
  return openMin < periodEnd && closeMin > periodStart
}

export interface GuideRecommendation {
  restaurants: Restaurant[]
  reason: string
}

export function getGuideRecommendation(filters: GuideFilters): GuideRecommendation {
  let candidates = getFilteredRestaurants(filters.university)

  // 按时段筛选
  if (filters.mealTime) {
    const timeFiltered = candidates.filter(r => isOpenDuringPeriod(r, filters.mealTime!))
    if (timeFiltered.length > 0) candidates = timeFiltered
  } else {
    // 没有指定时段时，优先在营业的
    const openCandidates = candidates.filter(isOpenNow)
    if (openCandidates.length > 0) candidates = openCandidates
  }

  // 按用餐方式筛选/加权
  if (filters.mode === 'delivery' || filters.mode === 'pickup') {
    const takeaway = candidates.filter(r => r.features.includes('可外带'))
    if (takeaway.length > 0) candidates = takeaway
  }
  if (filters.mode === 'dinein') {
    const nice = candidates.filter(r => r.features.includes('环境好'))
    if (nice.length > 0) candidates = nice
  }

  // 下午茶时段优先饮品/甜点
  if (filters.mealTime === 'afternoon') {
    const teaFiltered = candidates.filter(r => r.category === '饮品' || r.category === '甜点')
    if (teaFiltered.length > 0) candidates = teaFiltered
  }

  // 按场景筛选
  if (filters.scene) {
    const sceneFiltered = candidates.filter(r => r.scenes.includes(filters.scene as Restaurant['scenes'][number]))
    if (sceneFiltered.length > 0) candidates = sceneFiltered
  }

  // 按预算筛选
  if (filters.priceRange) {
    const ranges = Array.isArray(filters.priceRange) ? filters.priceRange : [filters.priceRange]
    const priceFiltered = candidates.filter(r => ranges.includes(r.priceRange))
    if (priceFiltered.length > 0) candidates = priceFiltered
  }

  // 按品类筛选
  if (filters.category) {
    const catFiltered = candidates.filter(r => r.category === filters.category)
    if (catFiltered.length > 0) candidates = catFiltered
  }

  // 排除已推荐的
  if (filters.excludeIds?.length) {
    const excluded = candidates.filter(r => !filters.excludeIds!.includes(r.id))
    if (excluded.length > 0) candidates = excluded
  }

  // 按 mode 排序加权
  if (filters.mode === 'delivery') {
    candidates.sort((a, b) => a.avgDeliveryMinutes - b.avgDeliveryMinutes)
  } else if (filters.mode === 'dinein') {
    candidates.sort((a, b) => a.walkTime - b.walkTime)
  } else if (filters.mode === 'pickup') {
    candidates.sort((a, b) => a.distance - b.distance)
  }

  // 加权随机选 2 家（排序靠前的权重更高）+ 反馈调权
  const count = Math.min(2, candidates.length)
  const selected: Restaurant[] = []
  const pool = [...candidates]
  const fbStats = getFeedbackStats()

  for (let i = 0; i < count && pool.length > 0; i++) {
    const weights = pool.map((r, idx) => {
      let w = r.rating * r.rating * (1 + r.repurchaseRate)
      // mode 排序后，位置靠前的额外加权
      if (filters.mode) w *= (1 + 0.5 / (idx + 1))
      // 反馈调权：被拒餐厅降权
      if (fbStats.rejectedRestaurantIds.has(r.id)) w *= 0.3
      // 被拒品类降权
      if (fbStats.rejectedCategories[r.category]) {
        w *= Math.max(0.4, 1 - fbStats.rejectedCategories[r.category] * 0.15)
      }
      // 被采纳品类加权
      if (fbStats.acceptedCategories[r.category]) {
        w *= Math.min(1.5, 1 + fbStats.acceptedCategories[r.category] * 0.1)
      }
      return w
    })
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let random = Math.random() * totalWeight
    let idx = 0
    for (let j = 0; j < weights.length; j++) {
      random -= weights[j]
      if (random <= 0) { idx = j; break }
    }
    selected.push(pool[idx])
    pool.splice(idx, 1)
  }

  if (selected.length === 0) {
    return { restaurants: [], reason: '没有找到符合条件的餐厅，试试放宽条件？' }
  }

  // 获取用户近期历史
  const recentHistory = [...getRandomHistory(), ...getVisitHistory()]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20)
  const recentRestIds = new Set(recentHistory.map(h => h.restaurantId))
  const recentCats = recentHistory.map(h => h.category)

  const profile = filters.personal?.profile
  const dna = filters.personal?.tasteDNA

  // 生成个性化推荐理由，每家餐厅独立一段
  const reasons = selected.map(r => {
    const lines: string[] = []

    // 个性化理由（基于用户画像）— 放在最前面突出显示
    const personalPart = buildPersonalReason(r, profile, dna, recentRestIds, recentCats)

    // 数据亮点（取最有说服力的1-2条）
    const dataPoints: string[] = []
    if (r.repurchaseRate > 0.5) dataPoints.push(`同学复购率${Math.round(r.repurchaseRate * 100)}%`)
    if (r.weeklyStudentOrders > 200) dataPoints.push(`本周${r.weeklyStudentOrders}人下单`)
    if (dataPoints.length === 0) dataPoints.push(`${r.rating}分好评`)

    // 省钱信息
    const plan = getSavingsPlan(r.id)
    let savingPart = ''
    if (plan && plan.coupons.length > 0) {
      savingPart = `${plan.coupons[0].title}，实付人均${r.actualPayPrice}元`
    } else if (r.studentDiscount) {
      savingPart = `${r.studentDiscount}，实付人均${r.actualPayPrice}元`
    } else {
      savingPart = `人均${r.actualPayPrice}元`
    }

    // 组装：餐厅名 + 个性化 + 数据 + 省钱
    lines.push(`📍 **${r.name}**`)
    if (personalPart) lines.push(`💡 ${personalPart}`)
    lines.push(`📊 ${dataPoints.join('，')}`)
    lines.push(`💰 ${savingPart}`)

    return lines.join('\n')
  })

  return { restaurants: selected, reason: reasons.join('\n\n') }
}

// AI 增强推荐理由：结合用户画像 + 引导选择，生成个性化推荐文案
export async function generateAIRecommendReason(
  filters: GuideFilters,
  selected: Restaurant[],
  userInsights: {
    taste?: { topCategories: string[]; spiceLevel: string }
    consumption?: { avgSpending: number; priceSensitivity: string }
    social?: { socialType: string; groupOrderCount: number }
    explore?: { exploreType: string; exploreRate: number }
  } | null,
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
  if (!apiKey || apiKey === 'your_key_here') return null

  const restaurantInfo = selected.map(r =>
    `${r.name}（${r.category}，人均¥${r.avgPrice}，评分${r.rating}，复购率${Math.round(r.repurchaseRate * 100)}%）`
  ).join('\n')

  const selectionParts: string[] = []
  if (filters.mode) selectionParts.push(`用餐方式：${filters.mode}`)
  if (filters.mealTime) selectionParts.push(`时段：${filters.mealTime}`)
  if (filters.scene) selectionParts.push(`场景：${filters.scene}`)
  if (filters.priceRange) selectionParts.push(`预算：${JSON.stringify(filters.priceRange)}`)
  if (filters.category) selectionParts.push(`口味：${filters.category}`)

  let profilePart = '暂无画像数据'
  if (userInsights) {
    const parts: string[] = []
    if (userInsights.taste) {
      parts.push(`口味偏好：最爱${userInsights.taste.topCategories.join('、')}，辣度${userInsights.taste.spiceLevel}`)
    }
    if (userInsights.consumption) {
      parts.push(`消费习惯：日均¥${userInsights.consumption.avgSpending}，价格敏感度${userInsights.consumption.priceSensitivity}`)
    }
    if (userInsights.social) {
      parts.push(`社交属性：${userInsights.social.socialType}，拼单${userInsights.social.groupOrderCount}次`)
    }
    if (userInsights.explore) {
      parts.push(`探店行为：${userInsights.explore.exploreType}，探索率${userInsights.explore.exploreRate}%`)
    }
    if (parts.length > 0) profilePart = parts.join('；')
  }

  const prompt = `你是"团子"，大学城美食地图的AI干饭顾问。请根据以下信息，为用户生成个性化的推荐理由。

## 用户本次选择
${selectionParts.join('，')}

## 用户画像
${profilePart}

## 推荐的餐厅
${restaurantInfo}

## 要求
1. 每家餐厅写1-2句推荐理由，要结合用户画像解释"为什么推荐这家给TA"
2. 格式：📍 **餐厅名** + 换行 + 💡 个性化理由 + 换行 + 💰 价格信息
3. 语气亲切接地气，像朋友推荐，可以用emoji
4. 如果用户画像显示某些偏好与推荐餐厅匹配，要点出来
5. 控制在每家餐厅3行以内，简洁有力
6. 不要加开头语和结尾语，直接输出每家餐厅的推荐段落，餐厅之间用空行分隔`

  try {
    const response = await fetch('/api/deepseek/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch {
    return null
  }
}

function buildPersonalReason(
  r: Restaurant,
  profile: UserProfile | null | undefined,
  dna: TasteDNAResult | null | undefined,
  recentRestIds: Set<string>,
  recentCats: string[],
): string | null {
  const hints: string[] = []

  // 1. 学校匹配
  if (profile?.university && r.university === profile.university) {
    hints.push(`就在${profile.university.replace('大学', '').replace('北京', '')}附近`)
  }

  // 2. 基于干饭人设标签
  if (profile?.diningTags?.length) {
    const tags = profile.diningTags
    if (tags.some(t => t.includes('辣')) && (r.category === '火锅' || r.category === '烧烤' || r.tags.some(t => t.includes('辣')))) {
      hints.push('适合你"无辣不欢"的口味')
    }
    if (tags.some(t => t.includes('穷鬼') || t.includes('性价比')) && r.features.includes('穷鬼友好')) {
      hints.push('穷鬼友好，符合你的省钱人设')
    }
    if (tags.some(t => t.includes('一人食')) && r.scenes.includes('一个人')) {
      hints.push('一人食也很舒适')
    }
    if (tags.some(t => t.includes('深夜')) && r.scenes.includes('深夜')) {
      hints.push('深夜放毒专属')
    }
    if (tags.some(t => t.includes('奶茶')) && (r.category === '饮品' || r.category === '甜点')) {
      hints.push('奶茶续命安排上')
    }
    if (tags.some(t => t.includes('火锅')) && r.category === '火锅') {
      hints.push('火锅狂热者必冲')
    }
  }

  // 3. 基于团子DNA标签
  if (dna?.labels?.length) {
    const labels = dna.labels
    if (labels.includes('省钱小天才') && r.actualPayPrice <= 15 && hints.every(h => !h.includes('省钱'))) {
      hints.push('省钱小天才的心水之选')
    }
    if (labels.includes('探店达人') && !recentRestIds.has(r.id)) {
      hints.push('探店达人解锁新店')
    }
    if (labels.includes('品质美食家') && r.rating >= 4.5) {
      hints.push('品质美食家认证好店')
    }
  }

  // 4. 基于近期历史
  if (recentRestIds.has(r.id)) {
    hints.push('你之前吃过觉得不错')
  } else if (recentCats.length >= 3) {
    // 统计近期最常吃的品类
    const catCount: Record<string, number> = {}
    recentCats.forEach(c => { catCount[c] = (catCount[c] || 0) + 1 })
    const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]
    if (topCat && topCat[1] >= 3 && r.category !== topCat[0]) {
      hints.push(`最近${topCat[0]}吃多了，换个口味`)
    }
  }

  // 最多取1条个性化理由，避免太长
  return hints.length > 0 ? hints[0] : null
}

export function getAvailableCategories(filters: Omit<GuideFilters, 'category'>): Category[] {
  let candidates = getFilteredRestaurants(filters.university)

  // 按时段筛选
  if (filters.mealTime) {
    const timeFiltered = candidates.filter(r => isOpenDuringPeriod(r, filters.mealTime!))
    if (timeFiltered.length > 0) candidates = timeFiltered
  } else {
    const openCandidates = candidates.filter(isOpenNow)
    if (openCandidates.length > 0) candidates = openCandidates
  }

  // 按用餐方式筛选
  if (filters.mode === 'delivery' || filters.mode === 'pickup') {
    const takeaway = candidates.filter(r => r.features.includes('可外带'))
    if (takeaway.length > 0) candidates = takeaway
  }
  if (filters.mode === 'dinein') {
    const nice = candidates.filter(r => r.features.includes('环境好'))
    if (nice.length > 0) candidates = nice
  }

  if (filters.scene) {
    const sceneFiltered = candidates.filter(r => r.scenes.includes(filters.scene as Restaurant['scenes'][number]))
    if (sceneFiltered.length > 0) candidates = sceneFiltered
  }
  if (filters.priceRange) {
    const ranges = Array.isArray(filters.priceRange) ? filters.priceRange : [filters.priceRange]
    const priceFiltered = candidates.filter(r => ranges.includes(r.priceRange))
    if (priceFiltered.length > 0) candidates = priceFiltered
  }

  // 统计每个品类的餐厅数量和平均评分
  const categoryStats: Record<string, { count: number; avgRating: number; restaurants: Restaurant[] }> = {}
  candidates.forEach(r => {
    if (!categoryStats[r.category]) {
      categoryStats[r.category] = { count: 0, avgRating: 0, restaurants: [] }
    }
    categoryStats[r.category].count++
    categoryStats[r.category].restaurants.push(r)
  })

  // 计算平均评分
  Object.keys(categoryStats).forEach(cat => {
    const rests = categoryStats[cat].restaurants
    categoryStats[cat].avgRating = rests.reduce((sum, r) => sum + r.rating, 0) / rests.length
  })

  // 获取用户近期历史，用于排序
  const recentHistory = [...getRandomHistory(), ...getVisitHistory()]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)
  const recentCats = recentHistory.map(h => h.category)
  const recentCatCount: Record<string, number> = {}
  recentCats.forEach(c => { recentCatCount[c] = (recentCatCount[c] || 0) + 1 })

  // 排序：用户常吃的 > 餐厅数量多的 > 评分高的
  const categories = Object.keys(categoryStats).sort((a, b) => {
    const aRecent = recentCatCount[a] || 0
    const bRecent = recentCatCount[b] || 0
    if (aRecent !== bRecent) return bRecent - aRecent

    const aCount = categoryStats[a].count
    const bCount = categoryStats[b].count
    if (aCount !== bCount) return bCount - aCount

    return categoryStats[b].avgRating - categoryStats[a].avgRating
  }) as Category[]

  return categories
}

// ========== SSE Stream Parser ==========

async function* parseSSE(response: Response) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') return
        try { yield JSON.parse(data) } catch { /* skip */ }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ========== Streaming API Call ==========

export async function sendMessageStream(
  conversationHistory: APIMessage[],
  userMessage: string,
  university: University | 'all',
  onDelta: (delta: StreamDelta) => void
): Promise<void> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
  if (!apiKey || apiKey === 'your_key_here') {
    onDelta({ type: 'error', message: '请在 .env.local 中配置 VITE_DEEPSEEK_API_KEY' })
    return
  }

  const messages: APIMessage[] = [
    { role: 'system', content: buildSystemPrompt(university) },
    ...conversationHistory.slice(-20),
    { role: 'user', content: userMessage }
  ]

  let allRestaurants: Restaurant[] = []
  let maxIterations = 5

  while (maxIterations-- > 0) {
    const response = await fetch('/api/deepseek/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        tools,
        temperature: 0.7,
        stream: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      onDelta({ type: 'error', message: `API 请求失败 (${response.status}): ${errorText}` })
      return
    }

    let assistantContent = ''
    const toolCallMap = new Map<number, ToolCall>()
    let hasToolCalls = false

    for await (const chunk of parseSSE(response)) {
      const delta = chunk.choices?.[0]?.delta
      const finishReason = chunk.choices?.[0]?.finish_reason

      // 内容流
      if (delta?.content) {
        assistantContent += delta.content
        onDelta({ type: 'content', text: delta.content })
      }

      // 工具调用流
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const index: number = tc.index ?? 0
          if (tc.id) {
            toolCallMap.set(index, {
              id: tc.id,
              type: 'function',
              function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' }
            })
          } else {
            const existing = toolCallMap.get(index)
            if (existing) {
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments
              if (tc.function?.name) existing.function.name = tc.function.name
            }
          }
        }
      }

      if (finishReason === 'tool_calls') hasToolCalls = true
      if (finishReason === 'stop') {
        onDelta({ type: 'done', content: assistantContent, restaurants: allRestaurants })
        return
      }
    }

    // 执行工具调用
    if (hasToolCalls && toolCallMap.size > 0) {
      const toolCallArray = Array.from(toolCallMap.values())
      messages.push({
        role: 'assistant',
        content: assistantContent || null,
        tool_calls: toolCallArray
      })

      for (const tc of toolCallArray) {
        onDelta({ type: 'tool_start', toolName: getToolDisplayName(tc.function.name) })
        const result = executeTool(tc, university)
        allRestaurants = [...allRestaurants, ...result.restaurants]
        onDelta({ type: 'tool_result', restaurants: result.restaurants })
        messages.push({ role: 'tool', content: result.text, tool_call_id: tc.id })
      }
      continue
    }

    // 流结束但没有明确的 stop/tool_calls
    onDelta({ type: 'done', content: assistantContent || '抱歉，我没有生成回复。', restaurants: allRestaurants })
    return
  }

  onDelta({ type: 'done', content: '处理超时，请重试。', restaurants: allRestaurants })
}
