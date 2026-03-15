import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { University, Category, PriceRange, Restaurant } from '../types'
import { restaurants } from '../data/restaurants'
import { getMealPeriod } from '../services/ai'

interface Props {
  university: University | 'all'
}

const categories: (Category | 'all')[] = ['all', '中餐', '日料', '韩餐', '火锅', '烧烤', '小吃', '快餐', '饮品']
const priceRanges: { value: PriceRange | 'all'; label: string }[] = [
  { value: 'all', label: '不限' },
  { value: 'budget', label: '15元以下' },
  { value: 'affordable', label: '15-35元' },
  { value: 'moderate', label: '35-60元' },
  { value: 'premium', label: '60元以上' }
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

  // 时段相关
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

  // 优惠信息
  const discountTip = r.tips.find(t => t.includes('折') || t.includes('优惠') || t.includes('半价') || t.includes('免费'))
  if (discountTip) {
    reasons.push(discountTip)
  }

  return reasons.length > 0
    ? reasons.slice(0, 3).join('，')
    : `${r.features[0]}，${r.tags[0]}`
}

export default function RandomPage({ university }: Props) {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')
  const [selectedPrice, setSelectedPrice] = useState<PriceRange | 'all'>('all')
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<Restaurant | null>(null)
  const [aiReason, setAiReason] = useState('')
  const [wheelRotation, setWheelRotation] = useState(0)

  const availableRestaurants = useMemo(() => {
    let filtered = university === 'all'
      ? restaurants
      : restaurants.filter((r) => r.university === university)

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((r) => r.category === selectedCategory)
    }

    if (selectedPrice !== 'all') {
      filtered = filtered.filter((r) => r.priceRange === selectedPrice)
    }

    return filtered
  }, [university, selectedCategory, selectedPrice])

  const spin = () => {
    if (availableRestaurants.length === 0 || isSpinning) return

    setIsSpinning(true)
    setResult(null)
    setAiReason('')

    const randomRotation = 1440 + Math.random() * 720
    setWheelRotation(prev => prev + randomRotation)

    setTimeout(() => {
      // 加权随机：评分高 + 当前营业的概率更大
      const pool = availableRestaurants
      const weights = pool.map(r => {
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

      const picked = pool[idx]
      setResult(picked)
      setAiReason(getSmartReason(picked))
      setIsSpinning(false)
    }, 2000)
  }

  return (
    <div className="random-page">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: '#2D3748' }}>
        今天吃什么？
      </h1>
      <p style={{ color: '#718096', marginBottom: '30px' }}>
        让命运来决定！
      </p>

      {/* 转盘 */}
      <div
        className="random-wheel"
        style={{
          transform: `rotate(${wheelRotation}deg)`,
          transition: isSpinning ? 'transform 2s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
        }}
      >
        <div className="random-wheel-center">
          {isSpinning ? (
            <div className="text">转动中...</div>
          ) : result ? (
            <>
              <div className="text">命运之选</div>
              <div className="result">{result.name}</div>
            </>
          ) : (
            <div className="text">点击下方按钮</div>
          )}
        </div>
      </div>

      {/* 开始按钮 */}
      <button
        className={`random-btn ${isSpinning ? 'spinning' : ''}`}
        onClick={spin}
        disabled={isSpinning || availableRestaurants.length === 0}
      >
        {isSpinning ? '选择中...' : '随机选择'}
      </button>

      {availableRestaurants.length === 0 && (
        <p style={{ color: '#FC8181', marginTop: '12px', fontSize: '0.9rem' }}>
          没有符合条件的餐厅，请调整筛选条件
        </p>
      )}

      {/* 结果卡片 + AI 推荐理由 */}
      {result && !isSpinning && (
        <div className="random-result">
          {/* AI 推荐理由 */}
          <div className="ai-reason">
            <span className="ai-reason-icon">🍜</span>
            <span className="ai-reason-text">选它是因为：{aiReason}</span>
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

      {/* 筛选条件 */}
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
          当前有 <strong style={{ color: '#FF6B35' }}>{availableRestaurants.length}</strong> 家餐厅可选
        </p>
      </div>

      {/* 底部引导到 AI */}
      <div className="random-ai-hint" onClick={() => navigate('/ai')}>
        <span>🍜</span>
        <span>有更具体的想法？和 AI 聊聊</span>
        <span>&gt;</span>
      </div>
    </div>
  )
}
