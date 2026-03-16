import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { University, UserProfile } from '../types'
import { getProfile, saveProfile, getFriends, removeFriend, getMealStatus, setMealStatus, clearMealStatus, getMockFriendStatuses, MealStatus } from '../services/profile'
import { universities, restaurants } from '../data/restaurants'
import {
  getRandomHistory, RandomHistoryItem,
  getGroupOrderHistory, GroupOrderHistoryItem,
  getFlipHistory, FlipHistoryItem,
  getVisitHistory, VisitHistoryItem,
} from '../services/history'

interface Props {
  university: University | 'all'
}

const avatarOptions = ['😎', '😊', '🤓', '😋', '🥳', '🤗', '😺', '🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐸', '🦁', '🐯', '🐷', '🐮', '🐵', '🦄', '👦', '👧', '🧑', '👩', '🧔', '👱‍♀️', '🧑‍💻', '📷', '🎮', '⚽', '🎵', '🌟']

const yearOptions = ['大一', '大二', '大三', '大四', '研一', '研二', '研三']

// 干饭人设标签
const diningTagOptions = [
  { group: '辣度', tags: ['不吃辣星人', '微辣选手', '无辣不欢', '变态辣挑战者'] },
  { group: '预算', tags: ['穷鬼套餐专业户', '性价比之王', '偶尔奢侈', '顿顿不亏嘴'] },
  { group: '风格', tags: ['一人食达人', '社交型干饭', '外卖依赖症', '食堂钉子户', '奶茶续命', '深夜放毒'] },
  { group: '偏好', tags: ['中餐永远的神', '日料寿司控', '火锅一周三次', '甜品不能停', '减脂餐选手', '来者不拒'] },
]

const bioPlaceholders = [
  '没有什么事是一顿火锅解决不了的',
  '今天的快乐是奶茶给的',
  '学废了就去干饭，干完饭继续学废',
  '人生苦短，先吃为敬',
]

// 雷达图五个轴的角度（从正上方开始，顺时针）
const RADAR_ANGLES = Array.from({ length: 5 }, (_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / 5)
const radarPt = (angle: number, value: number, r = 80) => ({
  x: 100 + r * (value / 100) * Math.cos(angle),
  y: 100 + r * (value / 100) * Math.sin(angle),
})

export default function ProfilePage({ university }: Props) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isSetup, setIsSetup] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [friends, setFriends] = useState(getFriends())

  // 工具箱历史数据
  const [randomHistory, setRandomHistory] = useState<RandomHistoryItem[]>([])
  const [groupHistory, setGroupHistory] = useState<GroupOrderHistoryItem[]>([])
  const [flipHistory, setFlipHistory] = useState<FlipHistoryItem[]>([])
  const [visitHistory, setVisitHistory] = useState<VisitHistoryItem[]>([])
  const [expandedTool, setExpandedTool] = useState<string | null>(null)

  // 干饭状态
  const [mealStatus, setMealStatusState] = useState<MealStatus | null>(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusRestaurantId, setStatusRestaurantId] = useState('')
  const [statusText, setStatusText] = useState('')
  const [statusMood, setStatusMood] = useState('😋')
  const [friendStatuses, setFriendStatuses] = useState<Map<string, MealStatus>>(new Map())

  // 美团生态状态
  const [meituanBound, setMeituanBound] = useState(() => localStorage.getItem('campus_food_meituan_bound') === 'true')
  const [importedCount, setImportedCount] = useState(() => {
    const v = localStorage.getItem('campus_food_imported_count')
    return v ? Number(v) : 0
  })
  const [showImportToast, setShowImportToast] = useState(false)
  const [showBindSuccess, setShowBindSuccess] = useState(false)

  // 表单状态
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('😎')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('大三')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [selectedUni, setSelectedUni] = useState<University>(university === 'all' ? '北京大学' : university)
  const [diningTags, setDiningTags] = useState<Set<string>>(new Set())
  const [bio, setBio] = useState('')

  useEffect(() => {
    const saved = getProfile()
    if (saved) {
      setProfile(saved)
      setNickname(saved.nickname)
      setAvatar(saved.avatar)
      setMajor(saved.major)
      setYear(saved.year)
      setGender(saved.gender)
      setSelectedUni(saved.university)
      setDiningTags(new Set(saved.diningTags || []))
      setBio(saved.bio || '')
    } else {
      setIsSetup(true)
    }
  }, [])

  useEffect(() => {
    setFriends(getFriends())
  }, [])

  // 加载工具箱历史数据
  useEffect(() => {
    setRandomHistory(getRandomHistory())
    setGroupHistory(getGroupOrderHistory())
    setFlipHistory(getFlipHistory())
    setVisitHistory(getVisitHistory())
  }, [])

  // 加载干饭状态
  useEffect(() => {
    setMealStatusState(getMealStatus())
    const mockStatuses = getMockFriendStatuses()
    const map = new Map<string, MealStatus>()
    mockStatuses.forEach(s => map.set(s.friendId, s.status))
    setFriendStatuses(map)
  }, [])

  // ===== AI 口味 DNA 分析 =====
  const tasteDNA = useMemo(() => {
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

    const dimensions = [
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
  }, [randomHistory, visitHistory, groupHistory, flipHistory, friends, profile])

  const handleDiningTagToggle = (tag: string) => {
    setDiningTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
      return next
    })
  }

  const handleSave = () => {
    if (!nickname.trim()) return
    const p: UserProfile = {
      id: `user-${Date.now()}`,
      nickname: nickname.trim(),
      avatar,
      university: selectedUni,
      major: major.trim() || '未填写',
      year,
      gender,
      diningTags: Array.from(diningTags),
      bio: bio.trim(),
    }
    if (profile) p.id = profile.id
    saveProfile(p)
    setProfile(p)
    setIsSetup(false)
    setIsEditing(false)
  }

  const handleRemoveFriend = (id: string) => {
    removeFriend(id)
    setFriends(getFriends())
  }

  const handleEdit = () => {
    if (profile) {
      setNickname(profile.nickname)
      setAvatar(profile.avatar)
      setMajor(profile.major)
      setYear(profile.year)
      setGender(profile.gender)
      setSelectedUni(profile.university)
      setDiningTags(new Set(profile.diningTags || []))
      setBio(profile.bio || '')
    }
    setIsEditing(true)
  }

  const getYearLabel = (y: string) => {
    if (y.startsWith('研')) return '研究生'
    return '本科生'
  }

  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts
    const min = Math.floor(diff / 60000)
    if (min < 1) return '刚刚'
    if (min < 60) return `${min}分钟前`
    const hour = Math.floor(min / 60)
    if (hour < 24) return `${hour}小时前`
    const day = Math.floor(hour / 24)
    if (day < 7) return `${day}天前`
    return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const toggleTool = (key: string) => {
    setExpandedTool(prev => prev === key ? null : key)
  }

  const moodOptions = ['😋', '😊', '🤤', '👍', '❤️', '🔥', '😴', '😭', '🌙', '☕', '🎉', '💪']

  const handlePublishStatus = () => {
    if (!statusRestaurantId) return
    const r = restaurants.find(r => r.id === statusRestaurantId)
    if (!r) return
    const status: MealStatus = {
      restaurantId: r.id,
      restaurantName: r.name,
      restaurantImage: r.images[0],
      text: statusText.trim() || '在吃好吃的~',
      mood: statusMood,
      timestamp: Date.now(),
    }
    setMealStatus(status)
    setMealStatusState(status)
    setShowStatusModal(false)
    setStatusRestaurantId('')
    setStatusText('')
    setStatusMood('😋')
  }

  const handleClearStatus = () => {
    clearMealStatus()
    setMealStatusState(null)
  }

  const statusTimeAgo = (ts: number) => {
    const min = Math.floor((Date.now() - ts) / 60000)
    if (min < 1) return '刚刚'
    if (min < 60) return `${min}分钟前`
    const hour = Math.floor(min / 60)
    if (hour < 24) return `${hour}小时前`
    return '1天前'
  }

  const handleBindMeituan = () => {
    if (meituanBound) return
    setMeituanBound(true)
    localStorage.setItem('campus_food_meituan_bound', 'true')
    setShowBindSuccess(true)
    setTimeout(() => setShowBindSuccess(false), 2500)
  }

  const handleImportFromMeituan = () => {
    if (importedCount > 0) return
    const count = Math.floor(Math.random() * 8) + 6 // 6-13家
    setImportedCount(count)
    localStorage.setItem('campus_food_imported_count', String(count))
    setShowImportToast(true)
    setTimeout(() => setShowImportToast(false), 2500)
  }

  // 设置/编辑卡片
  if (isSetup || isEditing) {
    return (
      <div className="page profile-page">
        <div className="profile-setup-card">
          <h2 className="profile-setup-title">{isEditing ? '编辑干饭档案' : '建立你的干饭档案'}</h2>
          <p className="profile-setup-subtitle">{isEditing ? '更新一下你的干饭人设' : '填完就能愉快地找饭搭子啦'}</p>

          {/* 头像选择 */}
          <div className="profile-field">
            <label className="profile-label">你的专属表情</label>
            <div className="profile-avatar-grid">
              {avatarOptions.map(e => (
                <span
                  key={e}
                  className={`profile-avatar-option ${avatar === e ? 'selected' : ''}`}
                  onClick={() => setAvatar(e)}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>

          {/* 昵称 */}
          <div className="profile-field">
            <label className="profile-label">江湖称号</label>
            <input
              type="text"
              className="profile-input"
              placeholder="如：干饭王小李、奶茶续命人"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={12}
            />
          </div>

          {/* 学校 */}
          <div className="profile-field">
            <label className="profile-label">所在学校</label>
            <select
              className="profile-select"
              value={selectedUni}
              onChange={e => setSelectedUni(e.target.value as University)}
            >
              {universities.map(uni => (
                <option key={uni.id} value={uni.name}>{uni.name}</option>
              ))}
            </select>
          </div>

          {/* 专业 */}
          <div className="profile-field">
            <label className="profile-label">专业</label>
            <input
              type="text"
              className="profile-input"
              placeholder="如：计算机科学与技术"
              value={major}
              onChange={e => setMajor(e.target.value)}
              maxLength={20}
            />
          </div>

          {/* 年级 */}
          <div className="profile-field">
            <label className="profile-label">年级</label>
            <div className="profile-year-options">
              {yearOptions.map(y => (
                <span
                  key={y}
                  className={`profile-year-option ${year === y ? 'selected' : ''}`}
                  onClick={() => setYear(y)}
                >
                  {y}
                </span>
              ))}
            </div>
          </div>

          {/* 性别 */}
          <div className="profile-field">
            <label className="profile-label">性别</label>
            <div className="profile-gender-options">
              <span
                className={`profile-gender-option ${gender === 'male' ? 'selected' : ''}`}
                onClick={() => setGender('male')}
              >
                男
              </span>
              <span
                className={`profile-gender-option ${gender === 'female' ? 'selected' : ''}`}
                onClick={() => setGender('female')}
              >
                女
              </span>
            </div>
          </div>

          {/* 干饭人设标签 */}
          <div className="profile-field">
            <label className="profile-label">干饭人设（选出你的标签）</label>
            {diningTagOptions.map(group => (
              <div key={group.group} className="profile-dining-group">
                <span className="profile-dining-group-label">{group.group}</span>
                <div className="profile-dining-tags">
                  {group.tags.map(tag => (
                    <span
                      key={tag}
                      className={`profile-dining-tag ${diningTags.has(tag) ? 'selected' : ''}`}
                      onClick={() => handleDiningTagToggle(tag)}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 干饭语录 */}
          <div className="profile-field">
            <label className="profile-label">干饭语录（你的美食座右铭）</label>
            <input
              type="text"
              className="profile-input"
              placeholder={bioPlaceholders[Math.floor(Math.random() * bioPlaceholders.length)]}
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="profile-setup-actions">
            {isEditing && (
              <button className="profile-cancel-btn" onClick={() => setIsEditing(false)}>算了</button>
            )}
            <button
              className={`profile-save-btn ${!nickname.trim() ? 'disabled' : ''}`}
              onClick={handleSave}
              disabled={!nickname.trim()}
            >
              {isEditing ? '更新人设' : '开始干饭之旅'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 个人主页展示
  return (
    <div className="page profile-page">
      {/* 用户信息卡 + 校园认证 */}
      {profile && (
        <div className="profile-info-card">
          <div className="profile-info-main">
            <span className="profile-info-avatar">{profile.avatar}</span>
            <div className="profile-info-text">
              <span className="profile-info-name">{profile.nickname}</span>
              <span className="profile-campus-badge">
                <span className="profile-campus-badge-icon">🎓</span>
                已认证 {profile.university} {getYearLabel(profile.year)}
              </span>
              <span className="profile-info-detail">
                {profile.major} · {profile.year}
              </span>
            </div>
          </div>
          <button className="profile-edit-btn" onClick={handleEdit}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            编辑
          </button>
        </div>
      )}

      {/* 干饭语录 */}
      {profile?.bio && (
        <div className="profile-bio-card">
          <span className="profile-bio-quote">"</span>
          <span className="profile-bio-text">{profile.bio}</span>
          <span className="profile-bio-quote">"</span>
        </div>
      )}

      {/* 干饭状态 */}
      <div className="profile-status-card" onClick={() => !mealStatus && setShowStatusModal(true)}>
        {mealStatus ? (
          <div className="profile-status-content">
            <div className="profile-status-header">
              <span className="profile-status-mood">{mealStatus.mood}</span>
              <span className="profile-status-time">{statusTimeAgo(mealStatus.timestamp)}</span>
              <span className="profile-status-clear" onClick={(e) => { e.stopPropagation(); handleClearStatus() }}>清除</span>
            </div>
            <div className="profile-status-body" onClick={() => navigate(`/restaurant/${mealStatus.restaurantId}`)}>
              {mealStatus.restaurantImage && (
                <img className="profile-status-img" src={mealStatus.restaurantImage} alt="" />
              )}
              <div className="profile-status-info">
                <span className="profile-status-text">{mealStatus.text}</span>
                <span className="profile-status-restaurant">{mealStatus.restaurantName}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="profile-status-empty">
            <span className="profile-status-empty-icon">📸</span>
            <span className="profile-status-empty-text">分享你的干饭日常</span>
            <span className="profile-status-empty-btn">发状态</span>
          </div>
        )}
      </div>

      {/* 发状态弹窗 */}
      {showStatusModal && (
        <div className="group-order-create-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="group-order-create-modal" onClick={e => e.stopPropagation()}>
            <div className="group-order-create-top">
              <h3>发干饭状态</h3>
              <span className="group-order-create-close" onClick={() => setShowStatusModal(false)}>✕</span>
            </div>
            <p className="group-order-create-hint">让饭搭子看看你在吃什么</p>
            <div className="group-order-create-fields">
              <div className="group-order-create-field">
                <label>今天吃的哪家？</label>
                <select value={statusRestaurantId} onChange={e => setStatusRestaurantId(e.target.value)}>
                  <option value="">选择一家餐厅...</option>
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name} · ¥{r.avgPrice}/人</option>
                  ))}
                </select>
              </div>
              <div className="group-order-create-field">
                <label>配一句话</label>
                <input
                  type="text"
                  placeholder="今天的心情是..."
                  value={statusText}
                  onChange={e => setStatusText(e.target.value)}
                  maxLength={30}
                />
              </div>
              <div className="group-order-create-field">
                <label>此刻心情</label>
                <div className="profile-mood-grid">
                  {moodOptions.map(m => (
                    <span
                      key={m}
                      className={`profile-mood-option ${statusMood === m ? 'selected' : ''}`}
                      onClick={() => setStatusMood(m)}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {statusRestaurantId && (() => {
              const previewR = restaurants.find(r => r.id === statusRestaurantId)
              return previewR ? (
                <div className="profile-status-preview">
                  <img className="profile-status-preview-img" src={previewR.images[0]} alt="" />
                  <div className="profile-status-preview-info">
                    <span className="profile-status-preview-name">{previewR.name}</span>
                    <span className="profile-status-preview-text">{statusMood} {statusText || '在吃好吃的~'}</span>
                  </div>
                </div>
              ) : null
            })()}
            <button
              className={`group-order-create-btn ${!statusRestaurantId ? 'btn-disabled' : ''}`}
              disabled={!statusRestaurantId}
              onClick={handlePublishStatus}
            >
              发布状态
            </button>
          </div>
        </div>
      )}

      {/* 干饭人设 */}
      {profile && (profile.diningTags?.length ?? 0) > 0 && (
        <div className="profile-section">
          <div className="profile-section-header">
            <h3 className="profile-section-title">干饭人设</h3>
          </div>
          <div className="profile-persona-tags">
            {profile.diningTags.map(tag => (
              <span key={tag} className="profile-persona-tag">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* ===== AI 口味 DNA ===== */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3 className="profile-section-title">AI 口味 DNA</h3>
          <span className="profile-ai-badge">AI 分析</span>
        </div>

        {tasteDNA ? (
          <div className="profile-taste-dna">
            {/* 雷达图 */}
            <div className="profile-radar-wrap">
              <svg viewBox="0 0 200 210" className="profile-radar-svg">
                {/* 背景网格 */}
                {[20, 40, 60, 80, 100].map(level => (
                  <polygon
                    key={level}
                    points={RADAR_ANGLES.map(a => `${radarPt(a, level).x},${radarPt(a, level).y}`).join(' ')}
                    fill="none"
                    stroke={level === 100 ? '#E2E8F0' : '#EDF2F7'}
                    strokeWidth={level === 100 ? '1' : '0.5'}
                  />
                ))}
                {/* 轴线 */}
                {RADAR_ANGLES.map((a, i) => (
                  <line key={i} x1="100" y1="100" x2={radarPt(a, 100).x} y2={radarPt(a, 100).y} stroke="#E2E8F0" strokeWidth="0.5" />
                ))}
                {/* 数据区域 */}
                <polygon
                  points={tasteDNA.dimensions.map((d, i) => {
                    const p = radarPt(RADAR_ANGLES[i], d.score)
                    return `${p.x},${p.y}`
                  }).join(' ')}
                  fill="rgba(255, 209, 0, 0.25)"
                  stroke="#FFD100"
                  strokeWidth="2"
                />
                {/* 数据点 */}
                {tasteDNA.dimensions.map((d, i) => {
                  const p = radarPt(RADAR_ANGLES[i], d.score)
                  return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#FFD100" stroke="#fff" strokeWidth="1.5" />
                })}
                {/* 轴标签 */}
                {tasteDNA.dimensions.map((d, i) => {
                  const p = radarPt(RADAR_ANGLES[i], 118, 80)
                  return (
                    <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="11" fill="#4A5568" fontWeight="500">
                      {d.icon}{d.label}
                    </text>
                  )
                })}
                {/* 分数 */}
                {tasteDNA.dimensions.map((d, i) => {
                  const p = radarPt(RADAR_ANGLES[i], 118, 80)
                  return (
                    <text key={`s-${i}`} x={p.x} y={p.y + 13} textAnchor="middle" fontSize="9" fill="#A0AEC0">
                      {d.score}
                    </text>
                  )
                })}
              </svg>
            </div>

            {/* AI 标签 */}
            <div className="profile-taste-labels">
              {tasteDNA.labels.map(label => (
                <span key={label} className="profile-taste-label">{label}</span>
              ))}
            </div>

            {/* AI 总结 */}
            <div className="profile-taste-summary">
              <span className="profile-taste-ai-icon">AI</span>
              <span className="profile-taste-summary-text">{tasteDNA.summary}</span>
            </div>
          </div>
        ) : (
          <div className="profile-taste-empty">
            <div className="profile-taste-empty-radar">
              <svg viewBox="0 0 120 120" className="profile-radar-svg-mini">
                <polygon
                  points={RADAR_ANGLES.map(a => `${60 + 45 * Math.cos(a)},${60 + 45 * Math.sin(a)}`).join(' ')}
                  fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 2"
                />
                <circle cx="60" cy="60" r="4" fill="#E2E8F0" />
              </svg>
            </div>
            <p className="profile-taste-empty-title">口味 DNA 待解锁</p>
            <p className="profile-taste-empty-hint">多逛逛店、转转轮盘、拼拼单，AI 就能分析出你的口味基因</p>
          </div>
        )}
      </div>

      {/* AI 干饭顾问入口 */}
      <div className="profile-ai-advisor" onClick={() => navigate('/ai', { state: { initialMessage: tasteDNA
        ? `我是${profile?.nickname || '同学'}，口味偏好：${tasteDNA.labels.join('、')}，帮我推荐今天吃什么`
        : '帮我推荐今天吃什么'
      }})}>
        <div className="profile-ai-advisor-left">
          <img className="profile-ai-advisor-icon" src="/tuanzi.png" alt="团子" />
          <div className="profile-ai-advisor-text">
            <span className="profile-ai-advisor-title">AI 干饭顾问 · 团子</span>
            <span className="profile-ai-advisor-desc">
              {tasteDNA
                ? `基于你的口味DNA，输入场景一句话出推荐`
                : '告诉我预算、人数、口味，秒出推荐方案'}
            </span>
          </div>
        </div>
        <span className="profile-ai-advisor-action">问问 ›</span>
      </div>

      {/* ===== 美团生态模块 ===== */}

      {/* 美团账号绑定 + 学生数据面板 */}
      <div className="profile-meituan-card">
        <div className="profile-meituan-header">
          <div className="profile-meituan-logo">
            <span className="profile-meituan-logo-icon">美</span>
            <span className="profile-meituan-logo-text">美团学生版</span>
          </div>
          {meituanBound ? (
            <span className="profile-meituan-bound">已绑定</span>
          ) : (
            <button className="profile-meituan-bind-btn" onClick={handleBindMeituan}>一键绑定</button>
          )}
        </div>

        {meituanBound ? (
          <>
            {/* 绑定后：学生数据面板 */}
            <div className="profile-meituan-stats">
              <div className="profile-meituan-stat">
                <span className="profile-meituan-stat-value">¥{Math.floor(Math.random() * 80) + 40}</span>
                <span className="profile-meituan-stat-label">本月已省</span>
              </div>
              <div className="profile-meituan-stat">
                <span className="profile-meituan-stat-value">{Math.floor(Math.random() * 20) + 8}</span>
                <span className="profile-meituan-stat-label">外卖订单</span>
              </div>
              <div className="profile-meituan-stat">
                <span className="profile-meituan-stat-value">{Math.floor(Math.random() * 5) + 2}</span>
                <span className="profile-meituan-stat-label">待用券</span>
              </div>
              <div className="profile-meituan-stat">
                <span className="profile-meituan-stat-value">{Math.floor(Math.random() * 300) + 100}</span>
                <span className="profile-meituan-stat-label">积分</span>
              </div>
            </div>
          </>
        ) : (
          <p className="profile-meituan-hint">绑定美团账号，同步外卖数据、解锁学生专享福利</p>
        )}
      </div>

      {/* 学生专享券包 */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3 className="profile-section-title">学生专享福利</h3>
          {!meituanBound && <span className="profile-section-lock">绑定解锁</span>}
        </div>
        <div className={`profile-coupon-list ${!meituanBound ? 'locked' : ''}`}>
          <div className="profile-coupon">
            <div className="profile-coupon-left">
              <span className="profile-coupon-amount">5<small>元</small></span>
            </div>
            <div className="profile-coupon-right">
              <span className="profile-coupon-title">新人到店红包</span>
              <span className="profile-coupon-rule">满20可用 · 限堂食</span>
              <span className="profile-coupon-expire">3天后过期</span>
            </div>
            <button className="profile-coupon-btn" disabled={!meituanBound}>领取</button>
          </div>
          <div className="profile-coupon">
            <div className="profile-coupon-left monthly">
              <span className="profile-coupon-amount">9.9<small>/月</small></span>
            </div>
            <div className="profile-coupon-right">
              <span className="profile-coupon-title">学生免配送月卡</span>
              <span className="profile-coupon-rule">每单免配送费 · 限学生认证</span>
              <span className="profile-coupon-expire">长期有效</span>
            </div>
            <button className="profile-coupon-btn" disabled={!meituanBound}>开通</button>
          </div>
          <div className="profile-coupon">
            <div className="profile-coupon-left group">
              <span className="profile-coupon-amount">7<small>折</small></span>
            </div>
            <div className="profile-coupon-right">
              <span className="profile-coupon-title">校园拼团特惠</span>
              <span className="profile-coupon-rule">3人成团享7折 · 指定商户</span>
              <span className="profile-coupon-expire">本周有效</span>
            </div>
            <button className="profile-coupon-btn" disabled={!meituanBound}>去拼团</button>
          </div>
        </div>
      </div>

      {/* 从美团/大众点评导入 */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3 className="profile-section-title">快速导入</h3>
        </div>
        <div className="profile-import-card" onClick={handleImportFromMeituan}>
          <div className="profile-import-icons">
            <span className="profile-import-icon meituan">美</span>
            <span className="profile-import-icon dianping">点</span>
          </div>
          <div className="profile-import-text">
            <span className="profile-import-title">
              {importedCount > 0 ? `已导入 ${importedCount} 家收藏的店` : '从美团/大众点评导入想吃清单'}
            </span>
            <span className="profile-import-desc">
              {importedCount > 0 ? '收藏数据已同步到本地' : '一键同步你收藏过的餐厅，无需重新发现'}
            </span>
          </div>
          {importedCount === 0 && <span className="profile-import-arrow">导入 ›</span>}
          {importedCount > 0 && <span className="profile-import-done">已同步</span>}
        </div>
      </div>

      {/* 饭搭子列表 */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3 className="profile-section-title">我的饭搭子</h3>
          <span className="profile-section-count">{friends.length}人</span>
        </div>
        {friends.length === 0 ? (
          <div className="profile-empty">
            <span className="profile-empty-icon">🍜</span>
            <p>还没有饭搭子</p>
            <p className="profile-empty-hint">去拼单广场勾搭一下同学吧</p>
            <button className="profile-go-btn" onClick={() => navigate('/group')}>去拼单广场</button>
          </div>
        ) : (
          <div className="profile-friend-list">
            {friends.map(f => {
              const fStatus = friendStatuses.get(f.id)
              return (
                <div key={f.id} className="profile-friend-item">
                  <span className="profile-friend-avatar">{f.avatar}</span>
                  <div className="profile-friend-info">
                    <span className="profile-friend-name">{f.name}</span>
                    <span className="profile-friend-detail">
                      {f.university.replace('北京', '').replace('大学', '')} · {f.major} · {f.year}
                    </span>
                    {fStatus && (
                      <span className="profile-friend-status">
                        {fStatus.mood} {fStatus.text} · {fStatus.restaurantName}
                      </span>
                    )}
                  </div>
                  <button className="profile-friend-remove" onClick={() => handleRemoveFriend(f.id)}>不搭了</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 干饭工具箱 */}
      <div className="profile-section">
        <h3 className="profile-section-title">干饭工具箱</h3>
        <div className="profile-toolbox">

          {/* 今天吃什么 — 随机吃历史 */}
          <div className="profile-tool-item">
            <div className="profile-tool-header" onClick={() => toggleTool('random')}>
              <span className="profile-tool-icon">🎲</span>
              <span className="profile-tool-label">今天吃什么</span>
              <span className="profile-tool-count">{randomHistory.length}次</span>
              <span className={`profile-tool-arrow ${expandedTool === 'random' ? 'expanded' : ''}`}>›</span>
            </div>
            {expandedTool === 'random' && (
              <div className="profile-tool-content">
                {randomHistory.length === 0 ? (
                  <div className="profile-tool-empty">
                    <p>还没转过命运转盘</p>
                    <button className="profile-tool-go" onClick={() => navigate('/random')}>去试试手气</button>
                  </div>
                ) : (
                  <div className="profile-tool-list">
                    {randomHistory.slice(0, 10).map((item, i) => (
                      <div key={i} className="profile-tool-record" onClick={() => navigate(`/restaurant/${item.restaurantId}`)}>
                        <img className="profile-tool-record-img" src={item.image} alt={item.restaurantName} />
                        <div className="profile-tool-record-info">
                          <span className="profile-tool-record-name">{item.restaurantName}</span>
                          <span className="profile-tool-record-meta">{item.category} · ¥{item.avgPrice}/人 · {item.rating}分</span>
                        </div>
                        <span className="profile-tool-record-time">{formatTimeAgo(item.timestamp)}</span>
                      </div>
                    ))}
                    {randomHistory.length > 10 && (
                      <div className="profile-tool-more">还有 {randomHistory.length - 10} 条记录</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 我的拼单 — 拼单历史 */}
          <div className="profile-tool-item">
            <div className="profile-tool-header" onClick={() => toggleTool('group')}>
              <span className="profile-tool-icon">🤝</span>
              <span className="profile-tool-label">我的拼单</span>
              <span className="profile-tool-count">{groupHistory.length}次</span>
              <span className={`profile-tool-arrow ${expandedTool === 'group' ? 'expanded' : ''}`}>›</span>
            </div>
            {expandedTool === 'group' && (
              <div className="profile-tool-content">
                {groupHistory.length === 0 ? (
                  <div className="profile-tool-empty">
                    <p>还没发起过拼单</p>
                    <button className="profile-tool-go" onClick={() => navigate('/group')}>去拼单广场</button>
                  </div>
                ) : (
                  <div className="profile-tool-list">
                    {groupHistory.slice(0, 10).map((item, i) => (
                      <div key={i} className="profile-tool-record" onClick={() => navigate(`/restaurant/${item.restaurantId}`)}>
                        <span className={`profile-tool-record-mode ${item.mode}`}>
                          {item.mode === 'offline' ? '线下' : '线上'}
                        </span>
                        <div className="profile-tool-record-info">
                          <span className="profile-tool-record-name">{item.restaurantName}</span>
                          <span className="profile-tool-record-meta">{item.targetPeople}人拼 · {item.message.slice(0, 20)}{item.message.length > 20 ? '...' : ''}</span>
                        </div>
                        <span className="profile-tool-record-time">{formatTimeAgo(item.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 我的翻牌 — 翻牌历史 */}
          <div className="profile-tool-item">
            <div className="profile-tool-header" onClick={() => toggleTool('flip')}>
              <span className="profile-tool-icon">🃏</span>
              <span className="profile-tool-label">我的翻牌</span>
              <span className="profile-tool-count">{flipHistory.length}次</span>
              <span className={`profile-tool-arrow ${expandedTool === 'flip' ? 'expanded' : ''}`}>›</span>
            </div>
            {expandedTool === 'flip' && (
              <div className="profile-tool-content">
                {flipHistory.length === 0 ? (
                  <div className="profile-tool-empty">
                    <p>还没参与过翻牌活动</p>
                    <button className="profile-tool-go" onClick={() => navigate('/')}>去首页翻牌</button>
                  </div>
                ) : (
                  <div className="profile-tool-list">
                    {flipHistory.slice(0, 10).map((item, i) => (
                      <div key={i} className="profile-tool-record" onClick={() => navigate(`/restaurant/${item.restaurantId}`)}>
                        <span className={`profile-tool-record-action ${item.action}`}>
                          {item.action === 'join' ? '参与' : item.action === 'vote' ? '投票' : '提名'}
                        </span>
                        <div className="profile-tool-record-info">
                          <span className="profile-tool-record-name">{item.restaurantName}</span>
                          <span className="profile-tool-record-meta">{item.detail}</span>
                        </div>
                        <span className="profile-tool-record-time">{formatTimeAgo(item.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 我逛过的店 — 浏览足迹 */}
          <div className="profile-tool-item">
            <div className="profile-tool-header" onClick={() => toggleTool('visit')}>
              <span className="profile-tool-icon">👣</span>
              <span className="profile-tool-label">我逛过的店</span>
              <span className="profile-tool-count">{visitHistory.length}家</span>
              <span className={`profile-tool-arrow ${expandedTool === 'visit' ? 'expanded' : ''}`}>›</span>
            </div>
            {expandedTool === 'visit' && (
              <div className="profile-tool-content">
                {visitHistory.length === 0 ? (
                  <div className="profile-tool-empty">
                    <p>还没逛过任何店铺</p>
                    <button className="profile-tool-go" onClick={() => navigate('/list')}>去发现好店</button>
                  </div>
                ) : (
                  <div className="profile-tool-list">
                    {visitHistory.slice(0, 10).map((item, i) => (
                      <div key={i} className="profile-tool-record" onClick={() => navigate(`/restaurant/${item.restaurantId}`)}>
                        <img className="profile-tool-record-img" src={item.image} alt={item.restaurantName} />
                        <div className="profile-tool-record-info">
                          <span className="profile-tool-record-name">{item.restaurantName}</span>
                          <span className="profile-tool-record-meta">{item.category} · ¥{item.avgPrice}/人</span>
                        </div>
                        <span className="profile-tool-record-time">{formatTimeAgo(item.timestamp)}</span>
                      </div>
                    ))}
                    {visitHistory.length > 10 && (
                      <div className="profile-tool-more">还有 {visitHistory.length - 10} 家店</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Toast 提示 */}
      {showBindSuccess && (
        <div className="toast">绑定成功！已解锁学生专享福利</div>
      )}
      {showImportToast && (
        <div className="toast">已从美团/大众点评导入 {importedCount} 家收藏的店</div>
      )}
    </div>
  )
}
