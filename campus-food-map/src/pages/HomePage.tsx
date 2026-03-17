import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { University, Restaurant } from '../types'
import { restaurants, rankLists } from '../data/restaurants'
import { getTodayFlip, getTomorrowCandidates } from '../data/deals'
import { getMealPeriod } from '../services/ai'
import RestaurantCard from '../components/RestaurantCard'
import { addFlipHistory } from '../services/history'

interface Props {
  university: University | 'all'
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

export default function HomePage({ university }: Props) {
  const navigate = useNavigate()
  const { period } = getMealPeriod()

  const filteredRestaurants = university === 'all'
    ? restaurants
    : restaurants.filter((r) => r.university === university)

  // 模拟实时下单动态
  const orderFeedPool = useMemo(() => {
    const majors = ['计算机', '经济学', '文学', '物理', '数学', '法学', '新闻', '心理学', '建筑', '化学', '生物', '历史']
    return filteredRestaurants.map(r => {
      const major = majors[Math.floor(Math.random() * majors.length)]
      const mins = Math.floor(Math.random() * 15) + 1
      const dish = r.recommendDishes[Math.floor(Math.random() * r.recommendDishes.length)]
      return {
        id: r.id,
        text: `${r.university.replace('北京', '').replace('大学', '')}${major}系同学`,
        restaurant: r.name,
        dish,
        time: `${mins}分钟前`
      }
    })
  }, [filteredRestaurants])

  const [currentOrderIdx, setCurrentOrderIdx] = useState(0)

  useEffect(() => {
    if (orderFeedPool.length === 0) return
    const timer = setInterval(() => {
      setCurrentOrderIdx(prev => (prev + 1) % orderFeedPool.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [orderFeedPool])

  // 今日翻牌
  const todayFlip = useMemo(() => getTodayFlip(), [])
  const tomorrowCandidates = useMemo(() => getTomorrowCandidates(), [])
  const [flipParticipants, setFlipParticipants] = useState(todayFlip.participantBase)
  const [hasJoined, setHasJoined] = useState(false)
  const [votedId, setVotedId] = useState<string | null>(null)
  const [showShareToast, setShowShareToast] = useState(false)
  const [showVoteExpand, setShowVoteExpand] = useState(false)
  const [showNominate, setShowNominate] = useState(false)
  const [nominateId, setNominateId] = useState('')
  const [userCandidates, setUserCandidates] = useState<Array<{ restaurantId: string; restaurantName: string; dealDish: string; flipPrice: number; votes: number }>>([])
  const [nominatePrice, setNominatePrice] = useState('')
  const [nominateDish, setNominateDish] = useState('')

  // 模拟参与人数缓慢增长
  useEffect(() => {
    const timer = setInterval(() => {
      setFlipParticipants(prev => prev + Math.floor(Math.random() * 3))
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  // 智能推荐：基于当前时间 + 营业状态 + 评分加权
  const smartPicks = useMemo(() => {
    const open = filteredRestaurants.filter(isOpenNow)
    const pool = open.length >= 3 ? open : filteredRestaurants

    // 按场景加权
    const scored = pool.map((r, index) => {
      let score = r.rating * 10
      if (isOpenNow(r)) score += 20
      const hour = new Date().getHours()
      if (hour >= 5 && hour < 10 && r.features.includes('快速出餐')) score += 15
      if (hour >= 10 && hour < 14 && r.priceRange !== 'premium') score += 10
      if (hour >= 14 && hour < 17 && (r.category === '饮品' || r.category === '甜点')) score += 20
      if (hour >= 17 && hour < 21) score += 5
      if ((hour >= 21 || hour < 5) && r.scenes.includes('深夜')) score += 25
      score += (index % 7) // 稳定的微小区分度
      return { restaurant: r, score }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.restaurant)
  }, [filteredRestaurants])

  // 今日翻牌餐厅的图片
  const flipRestaurant = useMemo(() => {
    return restaurants.find(r => r.id === todayFlip.restaurantId)
  }, [todayFlip])

  const nearbyRestaurants = [...filteredRestaurants]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6)

  // 推荐理由生成（基于美团交易数据）
  function getRecommendReason(r: Restaurant): string {
    if (r.repurchaseRate >= 0.65) return `${Math.round(r.repurchaseRate * 100)}%同学回头客`
    if (r.weeklyStudentOrders >= 400) return `本周${r.weeklyStudentOrders}位同学下单`
    if (r.actualPayPrice <= 15) return `实付仅¥${r.actualPayPrice}，满减后超值`
    if (r.distance <= 200) return `走路${r.walkTime}分钟就到`
    if (r.rating >= 4.5) return `${r.rating}分口碑好评`
    if (r.studentDiscount) return `🎫 ${r.studentDiscount}`
    return r.tags[0]
  }

  return (
    <div className="page">
      {/* 今日翻牌 - 顶部视觉焦点 */}
      <div
        className="flip-card-hero"
        onClick={() => navigate(`/restaurant/${todayFlip.restaurantId}`)}
        style={{
          backgroundImage: flipRestaurant
            ? `linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%), url(${flipRestaurant.images[0]})`
            : undefined
        }}
      >
        <div className="flip-hero-top">
          <span className="flip-badge">今日翻牌</span>
          <span className="flip-hero-participants">{flipParticipants}人参与</span>
        </div>
        <div className="flip-hero-body">
          <div className="flip-hero-info">
            <div className="flip-hero-name">{todayFlip.restaurantName}</div>
            <div className="flip-hero-dish">{todayFlip.dealDish}</div>
          </div>
          <div className="flip-hero-price">
            <span className="flip-price-original">¥{todayFlip.originalPrice}</span>
            <span className="flip-price-deal">¥{todayFlip.flipPrice}</span>
          </div>
        </div>
        <div className="flip-hero-bottom" onClick={e => e.stopPropagation()}>
          <div className="flip-avatars">
            {'👦👧🧑👩🧑‍💻'.split(/(?=[\u{1F466}\u{1F467}\u{1F9D1}\u{1F469}])/u).slice(0, 5).map((a, i) => (
              <span key={i} className="flip-avatar">{a}</span>
            ))}
            <span className="flip-avatar more">+{flipParticipants - 5}</span>
          </div>
          <div className="flip-hero-actions">
            <button
              className={`flip-btn-join ${hasJoined ? 'joined' : ''}`}
              onClick={() => {
                if (!hasJoined) {
                  setHasJoined(true)
                  setFlipParticipants(p => p + 1)
                  addFlipHistory({
                    action: 'join',
                    restaurantId: todayFlip.restaurantId,
                    restaurantName: todayFlip.restaurantName,
                    detail: `参与了「${todayFlip.dealDish}」翻牌特价 ¥${todayFlip.flipPrice}`,
                    timestamp: Date.now(),
                  })
                }
              }}
            >
              {hasJoined ? '已参与 ✓' : '我也去'}
            </button>
            {hasJoined && (
              <button
                className="flip-btn-share"
                style={{ background: 'var(--meituan-yellow)', color: '#111' }}
                onClick={() => navigate(`/restaurant/${todayFlip.restaurantId}`)}
              >
                去下单 ¥{todayFlip.flipPrice}
              </button>
            )}
            <button
              className="flip-btn-share"
              onClick={() => {
                setShowShareToast(true)
                setTimeout(() => setShowShareToast(false), 2000)
              }}
            >
              分享
            </button>
          </div>
        </div>
      </div>

      {/* 明天翻牌投票 - 收起式入口 */}
      <div className="flip-vote-collapsed" onClick={() => setShowVoteExpand(!showVoteExpand)}>
        <span className="flip-vote-collapsed-text">
          🗳️ 明天翻牌哪家？{votedId ? '已投票' : '去投票'}
        </span>
        <span className="flip-vote-collapsed-count">
          {[...tomorrowCandidates, ...userCandidates].length}家候选
        </span>
        <span className={`flip-vote-collapsed-arrow ${showVoteExpand ? 'expanded' : ''}`}>›</span>
      </div>

      {showVoteExpand && (
        <div className="flip-vote">
          <div className="flip-vote-header">
            <span className="flip-vote-title">投票选出明天的翻牌特价</span>
            {tomorrowCandidates.length + userCandidates.length >= 5 ? (
              <span className="flip-vote-nominate-btn nominate-full">名额已满</span>
            ) : (
              <span className="flip-vote-nominate-btn" onClick={() => setShowNominate(true)}>+ 我来提名</span>
            )}
          </div>
          <div className="flip-vote-list">
            {[...tomorrowCandidates, ...userCandidates].slice(0, 5).map(c => (
              <div
                key={c.restaurantId}
                className={`flip-vote-item ${votedId === c.restaurantId ? 'voted' : ''}`}
                onClick={() => {
                  if (votedId !== c.restaurantId) {
                    setVotedId(c.restaurantId)
                    addFlipHistory({
                      action: 'vote',
                      restaurantId: c.restaurantId,
                      restaurantName: c.restaurantName,
                      detail: `投票给「${c.restaurantName}」· ${c.dealDish} ¥${c.flipPrice}`,
                      timestamp: Date.now(),
                    })
                  }
                }}
              >
                <span className="flip-vote-name">{c.restaurantName}</span>
                <span className="flip-vote-dish">{c.dealDish} ¥{c.flipPrice}</span>
                <div className="flip-vote-bar-wrap">
                  <div
                    className="flip-vote-bar"
                    style={{ width: `${Math.min((c.votes + (votedId === c.restaurantId ? 1 : 0)) / 2.5, 100)}%` }}
                  />
                </div>
                <span className="flip-vote-count">{c.votes + (votedId === c.restaurantId ? 1 : 0)}票</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 提名弹窗 */}
      {showNominate && (
        <div className="group-order-create-overlay" onClick={() => setShowNominate(false)}>
          <div className="group-order-create-modal flip-nominate-modal" onClick={e => e.stopPropagation()}>
            <div className="group-order-create-top">
              <h3>提名明日翻牌餐厅</h3>
              <span className="group-order-create-close" onClick={() => setShowNominate(false)}>✕</span>
            </div>
            <p className="group-order-create-hint">票数最高的餐厅将成为明日翻牌特价</p>
            <div className="group-order-create-fields">
              <div className="group-order-create-field">
                <label>选择餐厅</label>
                <select value={nominateId} onChange={e => setNominateId(e.target.value)}>
                  <option value="">选择你想提名的餐厅...</option>
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="group-order-create-field">
                <label>推荐特价菜品</label>
                <input
                  type="text"
                  placeholder="如：招牌炸鸡套餐"
                  value={nominateDish}
                  onChange={e => setNominateDish(e.target.value)}
                />
              </div>
              <div className="group-order-create-field">
                <label>期望翻牌价</label>
                <input
                  type="text"
                  placeholder="如：9.9"
                  value={nominatePrice}
                  onChange={e => setNominatePrice(e.target.value)}
                />
              </div>
            </div>
            <button
              className={`group-order-create-btn ${!nominateId || !nominateDish || !nominatePrice ? 'btn-disabled' : ''}`}
              disabled={!nominateId || !nominateDish || !nominatePrice}
              onClick={() => {
                const r = restaurants.find(r => r.id === nominateId)
                if (!r) return
                setUserCandidates(prev => [...prev, {
                  restaurantId: r.id,
                  restaurantName: r.name,
                  dealDish: nominateDish,
                  flipPrice: Number(nominatePrice) || 9.9,
                  votes: 1
                }])
                setVotedId(r.id)
                addFlipHistory({
                  action: 'nominate',
                  restaurantId: r.id,
                  restaurantName: r.name,
                  detail: `提名「${r.name}」· ${nominateDish} ¥${nominatePrice}`,
                  timestamp: Date.now(),
                })
                setShowNominate(false)
                setNominateId('')
                setNominateDish('')
                setNominatePrice('')
              }}
            >
              提名并投票
            </button>
          </div>
        </div>
      )}

      {/* AI 搜索入口 */}
      <div className="ai-search-card" onClick={() => navigate('/ai')}>
        <div className="ai-search-card-left">
          <div className="ai-search-card-icon">
            <img src="/tuanzi.png" alt="团子" className="tuanzi-icon" />
          </div>
          <div className="ai-search-card-content">
            <div className="ai-search-card-title">不知道吃什么？问团子</div>
            <div className="ai-search-card-desc">告诉我你的口味，帮你秒选</div>
          </div>
        </div>
        <span className="ai-search-card-btn">试一试</span>
      </div>

      {/* 同学在点 - 实时订单动态 */}
      {orderFeedPool.length > 0 && (
        <div className="live-order-feed">
          <span className="live-dot" />
          <span className="live-text">
            {orderFeedPool[currentOrderIdx].text}
            {' 下单了 '}
            <strong>{orderFeedPool[currentOrderIdx].restaurant}</strong>
            {' 的 '}
            {orderFeedPool[currentOrderIdx].dish}
          </span>
          <span className="live-time">{orderFeedPool[currentOrderIdx].time}</span>
        </div>
      )}

      {/* 猜你想要 - 个性化推荐 */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">猜你想要</h2>
          <span className="section-tag">{period}推荐</span>
        </div>
        <div className="smart-picks">
          {smartPicks.map((r) => (
            <div
              key={r.id}
              className="smart-pick-card"
              onClick={() => navigate(`/restaurant/${r.id}`)}
            >
              <img className="smart-pick-img" src={r.images[0]} alt={r.name} loading="lazy" />
              <div className="smart-pick-info">
                <div className="smart-pick-name">{r.name}</div>
                <div className="smart-pick-meta">
                  <span className="smart-pick-price">¥{r.avgPrice}/人</span>
                  <span className="smart-pick-rating">{r.rating}分</span>
                </div>
                <div className="smart-pick-reason">{getRecommendReason(r)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 快捷决策 */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">快捷决策</h2>
        </div>
        <div className="quick-decisions">
          <button className="quick-decision-btn" onClick={() => navigate('/random')}>
            <span className="quick-decision-icon">🎲</span>
            <span>随机帮我选</span>
          </button>
          <button className="quick-decision-btn" onClick={() => navigate('/rank/budget')}>
            <span className="quick-decision-icon">💰</span>
            <span>穷鬼榜</span>
          </button>
          <button className="quick-decision-btn" onClick={() => navigate('/ai', { state: { initialMessage: '深夜还有什么吃的' } })}>
            <span className="quick-decision-icon">🌙</span>
            <span>深夜觅食</span>
          </button>
          <button className="quick-decision-btn" onClick={() => navigate('/ai', { state: { initialMessage: '适合约会的餐厅' } })}>
            <span className="quick-decision-icon">💕</span>
            <span>约会推荐</span>
          </button>
        </div>
      </section>

      {/* 分享成功提示 */}
      {showShareToast && (
        <div className="toast">已复制分享链接，快去宿舍群粘贴吧！</div>
      )}

      {/* 特色榜单 */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">特色榜单</h2>
          <button className="section-more" onClick={() => navigate('/rank')}>
            查看全部 &gt;
          </button>
        </div>
        <div className="rank-list-grid">
          {rankLists.slice(0, 4).map((rank) => (
            <div
              key={rank.id}
              className="rank-card"
              onClick={() => navigate(`/rank/${rank.id}`)}
            >
              <div
                className="icon"
                style={{ background: rank.color }}
              >
                {rank.icon}
              </div>
              <div className="content">
                <div className="title">{rank.title}</div>
                <div className="desc">{rank.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 附近好店 */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">附近好店</h2>
          <button className="section-more" onClick={() => navigate('/list')}>
            更多 &gt;
          </button>
        </div>
        <div className="scroll-x">
          {nearbyRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </section>

    </div>
  )
}
