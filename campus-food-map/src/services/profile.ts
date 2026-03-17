import { UserProfile, Friend, University } from '../types'
import { GroupOrderUser } from '../data/groupOrders'

const PROFILE_KEY = 'campus_food_profile'
const FRIENDS_KEY = 'campus_food_friends'

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

