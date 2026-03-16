// 校友圈社交动态数据
// 三种动态类型：用餐打卡、请Ta吃、转盘结果

import { restaurants } from './restaurants'
import { getLatestReviews } from './reviews'

export type FeedType = 'checkin' | 'gift' | 'spin'

export interface FeedItem {
  id: string
  type: FeedType
  user: {
    name: string
    avatar: string
    university: string
    major: string
  }
  restaurantId: string
  restaurantName: string
  restaurantImage: string
  // checkin 专属
  dish?: string
  rating?: number
  comment?: string
  // gift 专属
  giftTo?: string
  giftToAvatar?: string
  giftDish?: string
  // 通用
  minutesAgo: number
  likes: number
}

// 模拟好友动态池
const feedPool: FeedItem[] = [
  {
    id: 'f1',
    type: 'checkin',
    user: { name: '张小花', avatar: '🌸', university: '清华大学', major: '设计学' },
    restaurantId: '12',
    restaurantName: '觅唐·茶餐厅',
    restaurantImage: restaurants.find(r => r.id === '12')?.images[0] || '',
    dish: '菠萝油+丝袜奶茶',
    rating: 5,
    comment: '港风装修太出片了，奶茶巨好喝',
    minutesAgo: 12,
    likes: 8,
  },
  {
    id: 'f2',
    type: 'gift',
    user: { name: '李同学', avatar: '😎', university: '北京大学', major: '计算机' },
    restaurantId: '5',
    restaurantName: '喜茶·五道口店',
    restaurantImage: restaurants.find(r => r.id === '5')?.images[0] || '',
    giftTo: '王小明',
    giftToAvatar: '🤓',
    giftDish: '多肉葡萄',
    minutesAgo: 25,
    likes: 15,
  },
  {
    id: 'f3',
    type: 'checkin',
    user: { name: '赵学姐', avatar: '👩', university: '中国人民大学', major: '经济学' },
    restaurantId: '6',
    restaurantName: '人大食堂风味馆',
    restaurantImage: restaurants.find(r => r.id === '6')?.images[0] || '',
    dish: '麻辣香锅',
    rating: 4,
    comment: '二楼小炒真的绝，才11块',
    minutesAgo: 38,
    likes: 6,
  },
  {
    id: 'f4',
    type: 'spin',
    user: { name: '陈大力', avatar: '💪', university: '北京航空航天大学', major: '航空工程' },
    restaurantId: '13',
    restaurantName: '北航小炒王',
    restaurantImage: restaurants.find(r => r.id === '13')?.images[0] || '',
    comment: '转盘选中了，冲！',
    minutesAgo: 45,
    likes: 4,
  },
  {
    id: 'f5',
    type: 'gift',
    user: { name: '林小雨', avatar: '🌧️', university: '北京师范大学', major: '心理学' },
    restaurantId: '19',
    restaurantName: '瑞幸咖啡·北师大店',
    restaurantImage: restaurants.find(r => r.id === '19')?.images[0] || '',
    giftTo: '周同学',
    giftToAvatar: '📷',
    giftDish: '生椰拿铁',
    minutesAgo: 52,
    likes: 22,
  },
  {
    id: 'f6',
    type: 'checkin',
    user: { name: '吴学长', avatar: '🧑‍💻', university: '清华大学', major: '电子工程' },
    restaurantId: '3',
    restaurantName: '一兰拉面·学府店',
    restaurantImage: restaurants.find(r => r.id === '3')?.images[0] || '',
    dish: '招牌豚骨拉面+溏心蛋',
    rating: 5,
    comment: '一个人的深夜拉面，治愈一整天的疲惫',
    minutesAgo: 68,
    likes: 12,
  },
  {
    id: 'f7',
    type: 'checkin',
    user: { name: '杨同学', avatar: '🎮', university: '北京大学', major: '数学' },
    restaurantId: '1',
    restaurantName: '老王麻辣烫',
    restaurantImage: restaurants.find(r => r.id === '1')?.images[0] || '',
    dish: '麻酱碗+宽粉',
    rating: 4,
    comment: '麻酱真的可以无限加，爽',
    minutesAgo: 85,
    likes: 5,
  },
  {
    id: 'f8',
    type: 'spin',
    user: { name: '孙小美', avatar: '🌟', university: '中国人民大学', major: '新闻学' },
    restaurantId: '7',
    restaurantName: '湘里人家',
    restaurantImage: restaurants.find(r => r.id === '7')?.images[0] || '',
    comment: '盲盒开出了湘菜！正好想吃辣',
    minutesAgo: 96,
    likes: 7,
  },
  {
    id: 'f9',
    type: 'gift',
    user: { name: '刘学弟', avatar: '⚽', university: '北京航空航天大学', major: '材料学' },
    restaurantId: '11',
    restaurantName: '师大炸鸡',
    restaurantImage: restaurants.find(r => r.id === '11')?.images[0] || '',
    giftTo: '室友们',
    giftToAvatar: '🏠',
    giftDish: '原味炸鸡3块装',
    minutesAgo: 120,
    likes: 18,
  },
  {
    id: 'f10',
    type: 'checkin',
    user: { name: '何学姐', avatar: '🎵', university: '北京师范大学', major: '音乐学' },
    restaurantId: '8',
    restaurantName: '深夜食堂·居酒屋',
    restaurantImage: restaurants.find(r => r.id === '8')?.images[0] || '',
    dish: '烤鸡串+茶泡饭',
    rating: 5,
    comment: '凌晨1点的居酒屋，和闺蜜聊了3小时',
    minutesAgo: 180,
    likes: 14,
  },
]

// 格式化时间
export function formatFeedTime(minutesAgo: number): string {
  if (minutesAgo < 1) return '刚刚'
  if (minutesAgo < 60) return `${minutesAgo}分钟前`
  const hours = Math.floor(minutesAgo / 60)
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

// 获取动态列表（可按学校筛选）
export function getSocialFeed(university?: string, limit = 10): FeedItem[] {
  let feed = [...feedPool]
  if (university && university !== 'all') {
    // 优先展示同校的，但也混入其他学校
    const sameUni = feed.filter(f => f.user.university === university)
    const otherUni = feed.filter(f => f.user.university !== university)
    feed = [...sameUni, ...otherUni]
  }
  return feed.slice(0, limit)
}

// 获取指定餐厅的动态
export function getRestaurantFeed(restaurantId: string): FeedItem[] {
  return feedPool.filter(f => f.restaurantId === restaurantId)
}

// 统一动态类型（合并社交动态 + UGC 评论）
export interface UnifiedFeedItem {
  id: string
  source: 'social' | 'review'
  user: { name: string; avatar: string; university: string; major: string }
  restaurantId: string
  restaurantName: string
  restaurantImage: string
  minutesAgo: number
  likes: number
  // social 字段
  feedType?: FeedType
  dish?: string
  rating?: number
  comment?: string
  giftTo?: string
  giftToAvatar?: string
  giftDish?: string
  // review 字段
  reviewContent?: string
  reviewTags?: string[]
}

// 合并社交动态和 UGC 评论，按时间排序
export function getUnifiedFeed(university?: string, limit = 6): UnifiedFeedItem[] {
  // 社交动态 → 统一格式
  const socialItems: UnifiedFeedItem[] = getSocialFeed(university, 10).map(f => ({
    id: f.id,
    source: 'social' as const,
    user: f.user,
    restaurantId: f.restaurantId,
    restaurantName: f.restaurantName,
    restaurantImage: f.restaurantImage,
    minutesAgo: f.minutesAgo,
    likes: f.likes,
    feedType: f.type,
    dish: f.dish,
    rating: f.rating,
    comment: f.comment,
    giftTo: f.giftTo,
    giftToAvatar: f.giftToAvatar,
    giftDish: f.giftDish,
  }))

  // UGC 评论 → 统一格式
  const reviews = getLatestReviews(10, university)

  const reviewItems: UnifiedFeedItem[] = reviews.map(r => {
    const rest = restaurants.find(x => x.id === r.restaurantId)
    const minutesAgo = Math.floor((Date.now() - r.timestamp) / 60000)
    return {
      id: `review-${r.id}`,
      source: 'review' as const,
      user: { name: r.userName, avatar: r.avatar, university: r.university, major: r.major },
      restaurantId: r.restaurantId,
      restaurantName: rest?.name || '',
      restaurantImage: rest?.images[0] || '',
      minutesAgo,
      likes: r.likes,
      rating: r.rating,
      reviewContent: r.content,
      reviewTags: r.tags,
    }
  })

  // 混合并按时间排序
  const all = [...socialItems, ...reviewItems]
  all.sort((a, b) => a.minutesAgo - b.minutesAgo)
  return all.slice(0, limit)
}
