import { UserProfile } from '../types'
import { getRandomHistory, getGroupOrderHistory, getFlipHistory, getVisitHistory } from './history'
import { getFriends } from './profile'

export interface TasteDNADimension {
  label: string
  score: number
  icon: string
}

export interface TasteDNAResult {
  dimensions: TasteDNADimension[]
  labels: string[]
  summary: string
}

export function computeTasteDNA(profile: UserProfile | null): TasteDNAResult | null {
  const randomHistory = getRandomHistory()
  const groupHistory = getGroupOrderHistory()
  const flipHistory = getFlipHistory()
  const visitHistory = getVisitHistory()
  const friends = getFriends()

  const allDining = [...randomHistory, ...visitHistory]
  const totalActions = randomHistory.length + groupHistory.length + flipHistory.length + visitHistory.length
  if (totalActions < 1) return null

  // 1. 辣味指数：火锅/烧烤/中餐占比 + 用户标签加成
  const spicyCats = new Set(['火锅', '烧烤'])
  const mildSpicyCats = new Set(['中餐', '小吃'])
  const spicyCount = allDining.filter(r => spicyCats.has(r.category)).length
  const mildCount = allDining.filter(r => mildSpicyCats.has(r.category)).length
  const hasSpicyTag = profile?.diningTags?.some(t => t.includes('辣'))
  let spice = allDining.length > 0
    ? Math.round((spicyCount * 2 + mildCount * 0.5) / allDining.length * 50) + 15
    : 15
  if (hasSpicyTag) spice += 20
  spice = Math.min(spice, 100)

  // 2. 省钱力：平均价格越低分越高
  const prices = allDining.map(r => r.avgPrice).filter(p => p > 0)
  const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 35
  const hasBudgetTag = profile?.diningTags?.some(t => t.includes('穷鬼') || t.includes('性价比'))
  let budget = Math.round(Math.max(110 - avg * 2, 10))
  if (hasBudgetTag) budget += 15
  budget = Math.min(budget, 100)

  // 3. 社牛值：拼单次数 + 好友数
  const social = Math.min(groupHistory.length * 18 + friends.length * 12 + 10, 100)

  // 4. 探店力：独立餐厅数 + 品类多样性
  const uniqueRests = new Set(allDining.map(r => r.restaurantId))
  const uniqueCats = new Set(allDining.map(r => r.category))
  const explore = Math.min(uniqueRests.size * 10 + uniqueCats.size * 8, 100)

  // 5. 活跃度：总操作数
  const activity = Math.min(totalActions * 7 + 10, 100)

  const dimensions: TasteDNADimension[] = [
    { label: '辣味', score: spice, icon: '🌶️' },
    { label: '省钱', score: budget, icon: '💰' },
    { label: '社牛', score: social, icon: '🤝' },
    { label: '探店', score: explore, icon: '🔍' },
    { label: '活跃', score: activity, icon: '⚡' },
  ]

  // 生成 AI 口味标签
  const labels: string[] = []
  if (spice >= 60) labels.push('无辣不欢')
  else if (spice < 30) labels.push('清淡养生派')
  if (budget >= 65) labels.push('省钱小天才')
  if (avg >= 40) labels.push('品质美食家')
  if (social >= 50) labels.push('社交干饭王')
  if (explore >= 50) labels.push('探店达人')
  if (activity >= 60) labels.push('干饭积极分子')
  const drinkCount = allDining.filter(r => r.category === '饮品' || r.category === '甜点').length
  if (drinkCount >= 2) labels.push('奶茶续命体质')
  if (labels.length === 0) labels.push('干饭新手上路')

  // AI 总结
  const top = dimensions.reduce((a, b) => a.score > b.score ? a : b)
  const summaries: Record<string, string> = {
    '辣味': '你的味蕾被辣椒征服了，火锅烧烤是你的快乐源泉',
    '省钱': '精打细算的干饭高手，用最少的钱吃最香的饭',
    '社牛': '天生的饭搭子体质，一个人吃饭是不存在的',
    '探店': '永远在探索新味道，你的美食版图在不断扩张',
    '活跃': '干饭频率拉满，你可能是全校最努力的干饭人',
  }

  return { dimensions, labels: labels.slice(0, 4), summary: summaries[top.label] }
}
