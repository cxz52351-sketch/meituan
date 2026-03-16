import { UserProfile, Friend, University } from '../types'
import { GroupOrderUser } from '../data/groupOrders'

const PROFILE_KEY = 'campus_food_profile'
const FRIENDS_KEY = 'campus_food_friends'
const MEAL_STATUS_KEY = 'campus_food_meal_status'

// ---- 用户资料 ----

export function getProfile(): UserProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

// ---- 好友列表 ----

export function getFriends(): Friend[] {
  const raw = localStorage.getItem(FRIENDS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Friend[]
  } catch {
    return []
  }
}

export function saveFriends(friends: Friend[]): void {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends))
}

export function makeFriendId(user: { name: string; university: string; major: string }): string {
  return `${user.name}-${user.university}-${user.major}`
}

export function addFriend(user: GroupOrderUser): Friend {
  const friends = getFriends()
  const id = makeFriendId(user)
  const existing = friends.find(f => f.id === id)
  if (existing) return existing
  const friend: Friend = {
    id,
    name: user.name,
    avatar: user.avatar,
    university: user.university,
    major: user.major,
    year: user.year,
    gender: user.gender,
  }
  friends.push(friend)
  saveFriends(friends)
  return friend
}

export function removeFriend(id: string): void {
  const friends = getFriends().filter(f => f.id !== id)
  saveFriends(friends)
}

export function isFriend(user: { name: string; university: string; major: string }): boolean {
  const id = makeFriendId(user)
  return getFriends().some(f => f.id === id)
}

// ---- 类型转换 ----

export function profileToGroupOrderUser(profile: UserProfile): GroupOrderUser {
  return {
    name: profile.nickname,
    avatar: profile.avatar,
    university: profile.university,
    major: profile.major,
    year: profile.year,
    gender: profile.gender,
  }
}

export function getDefaultInitiator(university: University | 'all'): GroupOrderUser {
  const profile = getProfile()
  if (profile) return profileToGroupOrderUser(profile)
  return {
    name: '我',
    avatar: '😎',
    university: university === 'all' ? '北京大学' : university,
    major: '未填写',
    year: '大三',
    gender: 'male',
  }
}

// ---- 干饭状态（类似微信状态） ----

export interface MealStatus {
  restaurantId: string
  restaurantName: string
  restaurantImage: string
  text: string             // 用户配的话
  mood: string             // 心情 emoji
  timestamp: number
}

export function getMealStatus(): MealStatus | null {
  const raw = localStorage.getItem(MEAL_STATUS_KEY)
  if (!raw) return null
  try {
    const status = JSON.parse(raw) as MealStatus
    // 状态 24 小时过期
    if (Date.now() - status.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(MEAL_STATUS_KEY)
      return null
    }
    return status
  } catch {
    return null
  }
}

export function setMealStatus(status: MealStatus): void {
  localStorage.setItem(MEAL_STATUS_KEY, JSON.stringify(status))
}

export function clearMealStatus(): void {
  localStorage.removeItem(MEAL_STATUS_KEY)
}

// 模拟好友的干饭状态
export function getMockFriendStatuses(): Array<{ friendId: string; status: MealStatus }> {
  const friends = getFriends()
  if (friends.length === 0) return []

  const mockStatuses: Array<{ text: string; mood: string; restaurantName: string; restaurantId: string }> = [
    { text: '今天的拉面绝了', mood: '😋', restaurantName: '一兰拉面·学府店', restaurantId: '3' },
    { text: '和闺蜜下午茶', mood: '☕', restaurantName: '喜茶·五道口店', restaurantId: '5' },
    { text: '食堂yyds', mood: '👍', restaurantName: '人大食堂风味馆', restaurantId: '6' },
    { text: '深夜放毒', mood: '🌙', restaurantName: '深夜食堂·居酒屋', restaurantId: '8' },
    { text: '减肥从明天开始', mood: '😭', restaurantName: '老王麻辣烫', restaurantId: '1' },
  ]

  // 随机给部分好友分配状态（约一半）
  return friends
    .filter((_, i) => i % 2 === 0)
    .slice(0, 3)
    .map((f, i) => {
      const mock = mockStatuses[i % mockStatuses.length]
      return {
        friendId: f.id,
        status: {
          restaurantId: mock.restaurantId,
          restaurantName: mock.restaurantName,
          restaurantImage: '',
          text: mock.text,
          mood: mock.mood,
          timestamp: Date.now() - (i + 1) * 3600000 * (1 + Math.random() * 3),
        }
      }
    })
}
