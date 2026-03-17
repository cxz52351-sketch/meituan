import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { University, Category, PriceRange, Restaurant } from '../types'
import { restaurants } from '../data/restaurants'
import { getMealPeriod } from '../services/ai'
import { addRandomHistory } from '../services/history'
import { getSavingsPlan } from '../data/deals'

interface Props {
  university: University | 'all'
}

type SpinMode = 'blind' | 'custom' | 'group'

const categories: (Category | 'all')[] = ['all', '中餐', '日料', '韩餐', '火锅', '烧烤', '小吃', '快餐', '饮品']
const priceRanges: { value: PriceRange | 'all'; label: string }[] = [
  { value: 'all', label: '不限' },
  { value: 'budget', label: '15元以下' },
  { value: 'affordable', label: '15-35元' },
  { value: 'moderate', label: '35-60元' },
  { value: 'premium', label: '60元以上' }
]

// 扇区颜色（美团风格）
const SECTOR_COLORS = [
  '#FFD100', '#333333', '#06C167', '#FF6B35',
  '#4A90D9', '#E74C3C', '#9B59B6', '#1ABC9C'
]

// 虚拟室友数据
const virtualRoommates = [
  { name: '小李', avatar: '😎', university: '北京大学', major: '计算机', year: '大三', picks: ['3', '14', '5'] },
  { name: '阿花', avatar: '🌸', university: '清华大学', major: '设计', year: '大二', picks: ['12', '8', '16'] },
  { name: '老王', avatar: '🤓', university: '北京大学', major: '数学', year: '大四', picks: ['1', '9', '7'] },
]

// 优惠券彩蛋池
const couponEggs = [
  { title: '学生专属5元券', desc: '满25可用', color: '#FF6B35', icon: '🎫' },
  { title: '免配送费券', desc: '任意订单可用', color: '#06C167', icon: '🚀' },
  { title: '新品尝鲜3折', desc: '限指定商品', color: '#E74C3C', icon: '🔥' },
  { title: '下午茶立减8元', desc: '14:00-17:00可用', color: '#9B59B6', icon: '🧋' },
  { title: '周末双人套餐减15', desc: '限堂食', color: '#4A90D9', icon: '💕' },
]

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

// AI 推荐理由生成（本地，无需 LLM）
function getSmartReason(r: Restaurant): string {
  const reasons: string[] = []
  const { period } = getMealPeriod()

  if (isOpenNow(r)) {
    reasons.push('现在正在营业')
  }
  if (r.walkTime <= 5) {
    reasons.push(`走路${r.walkTime}分钟就到`)
  }
  if (r.priceRange === 'budget') {
    reasons.push('超级省钱')
  }
  if (r.rating >= 4.5) {
    reasons.push(`${r.rating}分好评`)
  }

  const hour = new Date().getHours()
  if (hour >= 17 && hour < 21 && r.scenes.includes('聚餐')) {
    reasons.push('晚餐聚餐好选择')
  }
  if ((hour >= 21 || hour < 5) && r.scenes.includes('深夜')) {
    reasons.push('深夜营业')
  }
  if (hour >= 14 && hour < 17 && (r.category === '饮品' || r.category === '甜点')) {
    reasons.push(`${period}时段正合适`)
  }

  const discountTip = r.tips.find(t => t.includes('折') || t.includes('优惠') || t.includes('半价') || t.includes('免费'))
  if (discountTip) {
    reasons.push(discountTip)
  }

  return reasons.length > 0
    ? reasons.slice(0, 3).join('，')
    : `${r.features[0]}，${r.tags[0]}`
}

// 盲盒模式：AI 自动选出转盘候选餐厅
function getBlindBoxPicks(allRestaurants: Restaurant[]): Restaurant[] {
  const hour = new Date().getHours()

  // 按时段+评分+营业状态计算权重
  const scored = allRestaurants.map(r => {
    let score = r.rating * 10
    if (isOpenNow(r)) score += 30
    if (r.walkTime <= 5) score += 10
    if (r.repurchaseRate > 0.5) score += 15

    // 时段匹配加分
    if (hour < 10 && (r.category === '面食' || r.category === '快餐')) score += 20
    if (hour >= 11 && hour < 14) score += 10 // 午餐时段所有都加分
    if (hour >= 14 && hour < 17 && (r.category === '饮品' || r.category === '甜点')) score += 25
    if (hour >= 17 && hour < 21 && r.scenes.includes('聚餐')) score += 15
    if ((hour >= 21 || hour < 5) && r.scenes.includes('深夜')) score += 20

    return { restaurant: r, score }
  })

  // 排序后取前6-8家，再随机打乱
  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, 8).map(s => s.restaurant)

  // Fisher-Yates 打乱
  for (let i = top.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [top[i], top[j]] = [top[j], top[i]]
  }

  return top.slice(0, 6)
}

// 生成纸屑粒子
function createConfetti(): { id: number; x: number; color: string; delay: number; size: number; rotation: number }[] {
  const colors = ['#FFD100', '#06C167', '#FF6B35', '#E74C3C', '#4A90D9', '#9B59B6', '#F39C12', '#1ABC9C']
  return Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.5,
    size: Math.random() * 8 + 4,
    rotation: Math.random() * 360,
  }))
}

// ========== 扇形转盘组件 ==========
interface WheelProps {
  items: { label: string; color: string; icon?: string }[]
  isSpinning: boolean
  rotation: number
  revealed: boolean  // 盲盒模式：是否揭晓
  mode: SpinMode
}

function SpinWheel({ items, isSpinning, rotation, revealed, mode }: WheelProps) {
  const size = 280
  const center = size / 2
  const radius = size / 2 - 4

  if (items.length === 0) {
    return (
      <div className="spin-wheel-container">
        <div className="spin-wheel-empty">
          <span>暂无餐厅</span>
        </div>
      </div>
    )
  }

  const anglePerItem = 360 / items.length

  // 生成扇形路径
  const getSectorPath = (index: number) => {
    const startAngle = (index * anglePerItem - 90) * (Math.PI / 180)
    const endAngle = ((index + 1) * anglePerItem - 90) * (Math.PI / 180)
    const x1 = center + radius * Math.cos(startAngle)
    const y1 = center + radius * Math.sin(startAngle)
    const x2 = center + radius * Math.cos(endAngle)
    const y2 = center + radius * Math.sin(endAngle)
    const largeArc = anglePerItem > 180 ? 1 : 0
    return `M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`
  }

  // 文字位置（扇区中间）
  const getTextPosition = (index: number) => {
    const midAngle = ((index + 0.5) * anglePerItem - 90) * (Math.PI / 180)
    const textRadius = radius * 0.62
    return {
      x: center + textRadius * Math.cos(midAngle),
      y: center + textRadius * Math.sin(midAngle),
      rotation: (index + 0.5) * anglePerItem,
    }
  }

  return (
    <div className="spin-wheel-container">
      {/* 顶部指针 */}
      <div className="spin-wheel-pointer">▼</div>
      <svg
        width={size}
        height={size}
        className="spin-wheel-svg"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
        }}
      >
        {items.map((item, i) => {
          const textPos = getTextPosition(i)
          const isBlindHidden = mode === 'blind' && !revealed && !isSpinning
          const displayLabel = isBlindHidden ? '?' : item.label
          const displayIcon = isBlindHidden ? '?' : (item.icon || '')

          return (
            <g key={i}>
              <path
                d={getSectorPath(i)}
                fill={isBlindHidden ? (i % 2 === 0 ? '#FFD100' : '#333') : item.color}
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${textPos.rotation}, ${textPos.x}, ${textPos.y})`}
                fill={isBlindHidden ? (i % 2 === 0 ? '#333' : '#FFD100') : (
                  ['#333333', '#4A90D9', '#9B59B6', '#E74C3C'].includes(item.color) ? '#fff' : '#333'
                )}
                fontSize={items.length > 6 ? 11 : 13}
                fontWeight="600"
              >
                {displayIcon && (
                  <tspan x={textPos.x} dy="-8" fontSize="16">{displayIcon}</tspan>
                )}
                <tspan x={textPos.x} dy={displayIcon ? '16' : '0'} fontSize={items.length > 6 ? 10 : 12}>
                  {displayLabel.length > 5 ? displayLabel.slice(0, 5) + '..' : displayLabel}
                </tspan>
              </text>
            </g>
          )
        })}
        {/* 中心圆 */}
        <circle cx={center} cy={center} r="28" fill="#fff" stroke="#eee" strokeWidth="2" />
        <text x={center} y={center} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="700" fill="#333">
          {isSpinning ? '...' : 'GO'}
        </text>
      </svg>
    </div>
  )
}

// ========== 纸屑动画组件 ==========
function ConfettiAnimation({ active }: { active: boolean }) {
  const [particles] = useState(() => createConfetti())

  if (!active) return null

  return (
    <div className="confetti-container">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            width: `${p.size}px`,
            height: `${p.size * 1.5}px`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}

// ========== 优惠券弹窗组件 ==========
interface CouponModalProps {
  coupon: typeof couponEggs[0] | null
  restaurantCoupon: string | null
  onClose: () => void
}

function CouponModal({ coupon, restaurantCoupon, onClose }: CouponModalProps) {
  if (!coupon) return null

  return (
    <div className="coupon-modal-overlay" onClick={onClose}>
      <div className="coupon-modal" onClick={e => e.stopPropagation()}>
        <div className="coupon-modal-header">
          <span className="coupon-modal-icon">{coupon.icon}</span>
          <span className="coupon-modal-title">恭喜获得彩蛋奖励！</span>
        </div>
        <div className="coupon-card-egg" style={{ borderColor: coupon.color }}>
          <div className="coupon-card-egg-left" style={{ backgroundColor: coupon.color }}>
            <span className="coupon-card-egg-icon">{coupon.icon}</span>
          </div>
          <div className="coupon-card-egg-right">
            <div className="coupon-card-egg-title">{coupon.title}</div>
            <div className="coupon-card-egg-desc">{coupon.desc}</div>
          </div>
        </div>
        {restaurantCoupon && (
          <div className="coupon-restaurant-tip">
            <span>该餐厅还有优惠：{restaurantCoupon}</span>
          </div>
        )}
        <button className="coupon-modal-btn" style={{ backgroundColor: coupon.color }} onClick={onClose}>
          开心收下
        </button>
      </div>
    </div>
  )
}

// ========== 聚餐模式：室友选择组件 ==========
interface GroupSetupProps {
  groupPicks: { name: string; avatar: string; restaurantId: string; restaurantName: string }[]
  onAddPick: (roommateIndex: number) => void
  currentStep: number
  allDone: boolean
}

function GroupSetup({ groupPicks, onAddPick, currentStep, allDone }: GroupSetupProps) {
  return (
    <div className="group-setup">
      <div className="group-setup-title">每人选一家心仪的店，转盘来决定！</div>
      <div className="group-setup-list">
        {virtualRoommates.map((mate, i) => {
          const pick = groupPicks.find((_, idx) => idx === i)
          const isActive = i === currentStep && !allDone
          return (
            <div key={mate.name} className={`group-mate-row ${isActive ? 'active' : ''} ${pick ? 'done' : ''}`}>
              <div className="group-mate-avatar">{mate.avatar}</div>
              <div className="group-mate-info">
                <div className="group-mate-name">{mate.name}</div>
                <div className="group-mate-desc">{mate.major} · {mate.year}</div>
              </div>
              {pick ? (
                <div className="group-mate-pick">
                  <span>✅</span>
                  <span>{pick.restaurantName}</span>
                </div>
              ) : isActive ? (
                <button className="group-mate-btn" onClick={() => onAddPick(i)}>
                  选一家
                </button>
              ) : (
                <div className="group-mate-waiting">等待中...</div>
              )}
            </div>
          )
        })}
        {/* 我的选择（第4位） */}
        <div className={`group-mate-row ${currentStep === 3 && !allDone ? 'active' : ''} ${groupPicks.length > 3 ? 'done' : ''}`}>
          <div className="group-mate-avatar">🙋</div>
          <div className="group-mate-info">
            <div className="group-mate-name">我</div>
            <div className="group-mate-desc">由你来选！</div>
          </div>
          {groupPicks.length > 3 ? (
            <div className="group-mate-pick">
              <span>✅</span>
              <span>{groupPicks[3].restaurantName}</span>
            </div>
          ) : currentStep === 3 && !allDone ? (
            <div className="group-mate-waiting" style={{ color: '#FF6B35' }}>轮到你了！</div>
          ) : (
            <div className="group-mate-waiting">等待中...</div>
          )}
        </div>
      </div>
    </div>
  )
}


// ========== 主组件 ==========
export default function RandomPage({ university }: Props) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<SpinMode>('blind')
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')
  const [selectedPrice, setSelectedPrice] = useState<PriceRange | 'all'>('all')
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<Restaurant | null>(null)
  const [aiReason, setAiReason] = useState('')
  const [wheelRotation, setWheelRotation] = useState(0)
  const [revealed, setRevealed] = useState(false)

  // 纸屑 & 优惠券
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCoupon, setShowCoupon] = useState(false)
  const [currentCoupon, setCurrentCoupon] = useState<typeof couponEggs[0] | null>(null)
  const [restaurantCouponText, setRestaurantCouponText] = useState<string | null>(null)

  // 聚餐模式
  const [groupStep, setGroupStep] = useState(0)
  const [groupPicks, setGroupPicks] = useState<{ name: string; avatar: string; restaurantId: string; restaurantName: string }[]>([])
  const groupAllDone = groupPicks.length >= 4

  // 盲盒候选
  const [blindPicks, setBlindPicks] = useState<Restaurant[]>([])

  const confettiTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const baseRestaurants = useMemo(() => {
    return university === 'all'
      ? restaurants
      : restaurants.filter((r) => r.university === university)
  }, [university])

  // 自选模式的筛选
  const customFiltered = useMemo(() => {
    let filtered = baseRestaurants
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((r) => r.category === selectedCategory)
    }
    if (selectedPrice !== 'all') {
      filtered = filtered.filter((r) => r.priceRange === selectedPrice)
    }
    return filtered
  }, [baseRestaurants, selectedCategory, selectedPrice])

  // 初始化盲盒候选
  useEffect(() => {
    if (mode === 'blind') {
      setBlindPicks(getBlindBoxPicks(baseRestaurants))
    }
  }, [mode, baseRestaurants])

  // 切换模式时重置
  const switchMode = useCallback((newMode: SpinMode) => {
    setMode(newMode)
    setResult(null)
    setAiReason('')
    setRevealed(false)
    setShowConfetti(false)
    setShowCoupon(false)
    setGroupStep(0)
    setGroupPicks([])
    if (confettiTimeout.current) clearTimeout(confettiTimeout.current)
  }, [])

  // 获取当前转盘的items
  const wheelItems = useMemo(() => {
    if (mode === 'blind') {
      return blindPicks.map((r, i) => ({
        label: r.name,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
        icon: undefined,
      }))
    }
    if (mode === 'custom') {
      return customFiltered.slice(0, 8).map((r, i) => ({
        label: r.name,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
        icon: undefined,
      }))
    }
    // 聚餐模式
    return groupPicks.map((p, i) => ({
      label: p.restaurantName,
      color: SECTOR_COLORS[i % SECTOR_COLORS.length],
      icon: p.avatar,
    }))
  }, [mode, blindPicks, customFiltered, groupPicks])

  // 当前可用的餐厅池（用于加权随机抽取结果）
  const currentPool = useMemo(() => {
    if (mode === 'blind') return blindPicks
    if (mode === 'custom') return customFiltered.slice(0, 8)
    return groupPicks.map(p => restaurants.find(r => r.id === p.restaurantId)!).filter(Boolean)
  }, [mode, blindPicks, customFiltered, groupPicks])

  // 触发纸屑和优惠券
  const triggerCelebration = useCallback((picked: Restaurant) => {
    setShowConfetti(true)

    // 2秒后显示优惠券
    confettiTimeout.current = setTimeout(() => {
      // 随机彩蛋优惠券
      const egg = couponEggs[Math.floor(Math.random() * couponEggs.length)]
      setCurrentCoupon(egg)

      // 尝试获取该餐厅真实优惠
      const plan = getSavingsPlan(picked.id)
      if (plan && plan.coupons.length > 0) {
        setRestaurantCouponText(plan.coupons[0].title)
      } else {
        setRestaurantCouponText(null)
      }

      setShowCoupon(true)
    }, 1500)

    // 4秒后清除纸屑
    setTimeout(() => setShowConfetti(false), 4000)
  }, [])

  // 转盘抽奖
  const spin = useCallback(() => {
    if (currentPool.length === 0 || isSpinning) return

    setIsSpinning(true)
    setResult(null)
    setAiReason('')
    setRevealed(false)
    setShowConfetti(false)
    setShowCoupon(false)

    // 加权随机选中索引
    const weights = currentPool.map(r => {
      let w = r.rating * r.rating
      if (isOpenNow(r)) w *= 1.5
      return w
    })
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let random = Math.random() * totalWeight
    let idx = 0
    for (let j = 0; j < weights.length; j++) {
      random -= weights[j]
      if (random <= 0) { idx = j; break }
    }

    // 计算转盘旋转角度，使指针指向选中的扇区
    const anglePerItem = 360 / currentPool.length
    // 指针在顶部（0度），扇区从右侧顺时针排列，需要旋转到指针位置
    const targetAngle = 360 - (idx * anglePerItem + anglePerItem / 2)
    const fullSpins = 1440 + Math.random() * 360 // 4-5圈
    const finalRotation = fullSpins + targetAngle

    setWheelRotation(prev => prev + finalRotation)

    setTimeout(() => {
      const picked = currentPool[idx]
      setResult(picked)
      setAiReason(getSmartReason(picked))
      setRevealed(true)
      setIsSpinning(false)

      // 触发庆祝动画
      triggerCelebration(picked)

      // 保存历史
      addRandomHistory({
        restaurantId: picked.id,
        restaurantName: picked.name,
        category: picked.category,
        avgPrice: picked.avgPrice,
        rating: picked.rating,
        image: picked.images[0],
        timestamp: Date.now(),
      })
    }, 3000)
  }, [currentPool, isSpinning, triggerCelebration])

  // 聚餐模式：室友自动选择
  const handleGroupPick = useCallback((roommateIndex: number) => {
    const mate = virtualRoommates[roommateIndex]
    // 从该室友偏好中随机选一个（排除已选）
    const usedIds = groupPicks.map(p => p.restaurantId)
    const availablePicks = mate.picks.filter(id => !usedIds.includes(id))
    const pickId = availablePicks.length > 0
      ? availablePicks[Math.floor(Math.random() * availablePicks.length)]
      : baseRestaurants.filter(r => !usedIds.includes(r.id))[0]?.id

    if (!pickId) return

    const restaurant = restaurants.find(r => r.id === pickId)
    if (!restaurant) return

    // 模拟思考延迟
    setTimeout(() => {
      setGroupPicks(prev => [...prev, {
        name: mate.name,
        avatar: mate.avatar,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
      }])
      setGroupStep(prev => prev + 1)
    }, 800)
  }, [groupPicks, baseRestaurants])

  // 聚餐模式：我的选择
  const handleMyGroupPick = useCallback((restaurantId: string) => {
    const restaurant = restaurants.find(r => r.id === restaurantId)
    if (!restaurant) return
    setGroupPicks(prev => [...prev, {
      name: '我',
      avatar: '🙋',
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    }])
    setGroupStep(4)
  }, [])

  // 刷新盲盒
  const refreshBlindBox = useCallback(() => {
    setBlindPicks(getBlindBoxPicks(baseRestaurants))
    setResult(null)
    setRevealed(false)
  }, [baseRestaurants])

  const { greeting } = getMealPeriod()

  return (
    <div className="random-page">
      {/* 纸屑动画 */}
      <ConfettiAnimation active={showConfetti} />

      {/* 优惠券弹窗 */}
      <CouponModal
        coupon={showCoupon ? currentCoupon : null}
        restaurantCoupon={restaurantCouponText}
        onClose={() => setShowCoupon(false)}
      />

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px', color: '#2D3748' }}>
        {mode === 'blind' ? '盲盒开箱' : mode === 'group' ? '聚餐决策' : '今天吃什么？'}
      </h1>
      <p style={{ color: '#718096', marginBottom: '20px', fontSize: '0.9rem' }}>
        {mode === 'blind' ? `${greeting}，团子已为你精选，转一下试试运气！`
          : mode === 'group' ? '每人选一家，让转盘公平裁决！'
          : '让命运来决定！'}
      </p>

      {/* 三模式 Tab */}
      <div className="spin-mode-tabs">
        <button
          className={`spin-mode-tab ${mode === 'blind' ? 'active' : ''}`}
          onClick={() => switchMode('blind')}
        >
          <span className="spin-mode-tab-icon">盲</span>
          <span>盲盒模式</span>
        </button>
        <button
          className={`spin-mode-tab ${mode === 'custom' ? 'active' : ''}`}
          onClick={() => switchMode('custom')}
        >
          <span className="spin-mode-tab-icon">选</span>
          <span>自选模式</span>
        </button>
        <button
          className={`spin-mode-tab ${mode === 'group' ? 'active' : ''}`}
          onClick={() => switchMode('group')}
        >
          <span className="spin-mode-tab-icon">拼</span>
          <span>聚餐模式</span>
        </button>
      </div>

      {/* 盲盒模式提示 */}
      {mode === 'blind' && !result && (
        <div className="blind-hint">
          <span>团子已根据{greeting.includes('早') ? '早餐' : greeting.includes('午') ? '午餐' : greeting.includes('下午') ? '下午茶' : greeting.includes('晚') ? '晚餐' : '宵夜'}时段为你精选了 {blindPicks.length} 家餐厅</span>
          <button className="blind-refresh" onClick={refreshBlindBox}>换一批</button>
        </div>
      )}

      {/* 聚餐模式：室友选择流程 */}
      {mode === 'group' && !groupAllDone && (
        <GroupSetup
          groupPicks={groupPicks}
          onAddPick={handleGroupPick}
          currentStep={groupStep}
          allDone={groupAllDone}
        />
      )}

      {/* 聚餐模式：我的选择器 */}
      {mode === 'group' && groupStep === 3 && !groupAllDone && (
        <div className="my-pick-section">
          <div className="my-pick-title">选一家你想吃的：</div>
          <div className="my-pick-grid">
            {baseRestaurants
              .filter(r => !groupPicks.some(p => p.restaurantId === r.id))
              .slice(0, 6)
              .map(r => (
                <button
                  key={r.id}
                  className="my-pick-item"
                  onClick={() => handleMyGroupPick(r.id)}
                >
                  <img src={r.images[0]} alt={r.name} className="my-pick-img" />
                  <div className="my-pick-name">{r.name}</div>
                  <div className="my-pick-meta">¥{r.avgPrice} · {r.rating}分</div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 聚餐模式全部选完后显示提示 */}
      {mode === 'group' && groupAllDone && !result && (
        <div className="group-ready-hint">
          全员就位！点击下方按钮，让转盘来裁决！
        </div>
      )}

      {/* 转盘 */}
      {(mode !== 'group' || groupAllDone) && (
        <SpinWheel
          items={wheelItems}
          isSpinning={isSpinning}
          rotation={wheelRotation}
          revealed={revealed}
          mode={mode}
        />
      )}

      {/* 开始按钮 */}
      {(mode !== 'group' || groupAllDone) && (
        <button
          className={`random-btn ${isSpinning ? 'spinning' : ''}`}
          onClick={spin}
          disabled={isSpinning || currentPool.length === 0}
        >
          {isSpinning ? '命运转动中...' : result ? '再转一次' : mode === 'group' ? '开始裁决！' : '转！'}
        </button>
      )}

      {currentPool.length === 0 && mode === 'custom' && (
        <p style={{ color: '#FC8181', marginTop: '12px', fontSize: '0.9rem' }}>
          没有符合条件的餐厅，请调整筛选条件
        </p>
      )}

      {/* 结果卡片 */}
      {result && !isSpinning && (
        <div className="random-result">
          <div className="ai-reason">
            <span className="ai-reason-icon">团子</span>
            <span className="ai-reason-text">
              {mode === 'group' ? '命运之选！大家一起去：' : '选它是因为：'}{aiReason}
            </span>
          </div>

          <div
            className="restaurant-list-item"
            onClick={() => navigate(`/restaurant/${result.id}`)}
          >
            <img
              className="image"
              src={result.images[0]}
              alt={result.name}
            />
            <div className="content">
              <div className="header">
                <div className="name">{result.name}</div>
                <div className="price">¥{result.avgPrice}/人</div>
              </div>
              <div className="meta">
                <span className="rating">{result.rating}分</span>
                <span>{result.walkTime}分钟</span>
                <span>{result.category}</span>
              </div>
              <div className="tags">
                {result.features.slice(0, 3).map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 餐厅优惠信息 */}
          {result.studentDiscount && (
            <div className="result-discount">
              <span>学生优惠：{result.studentDiscount}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={spin}
            >
              换一家
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => navigate(`/restaurant/${result.id}`)}
            >
              就它了！
            </button>
          </div>
        </div>
      )}

      {/* 自选模式的筛选条件 */}
      {mode === 'custom' && (
        <div className="random-filter-hint">
          <p style={{ marginBottom: '16px' }}>设置筛选条件，缩小选择范围</p>

          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '0.8rem', marginBottom: '8px', color: '#4A5568' }}>想吃什么？</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`filter-option ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                  style={{ padding: '8px 14px' }}
                >
                  {cat === 'all' ? '不限' : cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: '0.8rem', marginBottom: '8px', color: '#4A5568' }}>预算多少？</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {priceRanges.map((price) => (
                <button
                  key={price.value}
                  className={`filter-option ${selectedPrice === price.value ? 'active' : ''}`}
                  onClick={() => setSelectedPrice(price.value)}
                  style={{ padding: '8px 14px' }}
                >
                  {price.label}
                </button>
              ))}
            </div>
          </div>

          <p style={{ marginTop: '16px', fontSize: '0.8rem' }}>
            当前有 <strong style={{ color: '#FF6B35' }}>{customFiltered.length}</strong> 家餐厅可选
          </p>
        </div>
      )}

      {/* 底部引导到 AI */}
      <div className="random-ai-hint" onClick={() => navigate('/ai')}>
        <span>🍜</span>
        <span>有更具体的想法？和团子聊聊</span>
        <span>&gt;</span>
      </div>
    </div>
  )
}
