import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Restaurant } from '../types'
import { restaurants } from '../data/restaurants'
import { getReviewsByRestaurant, formatTimeAgo } from '../data/reviews'
import { getSavingsPlan, getMaxSavings } from '../data/deals'
import { addVisitHistory, addGiftHistory } from '../services/history'
import { getFriends } from '../services/profile'
import { Friend } from '../types'
import { getMealPeriod } from '../services/ai'

// AI 一句话点评（本地生成，基于餐厅数据+时段）
function getAiComment(r: Restaurant): string {
  const hour = new Date().getHours()
  const { period } = getMealPeriod()
  const comments: string[] = []

  // 时段相关
  if (hour >= 11 && hour < 14 && r.avgDeliveryMinutes <= 8)
    comments.push(`${period}赶时间？${r.avgDeliveryMinutes}分钟出餐，吃完还能午休`)
  if (hour >= 21 && r.scenes.includes('深夜'))
    comments.push('深夜肚子饿？这家还在营业，赶紧冲')
  if (hour >= 14 && hour < 17 && (r.category === '饮品' || r.category === '甜点'))
    comments.push(`下午茶时段，来一杯${r.recommendDishes[0]}犒劳自己`)

  // 数据驱动
  if (r.repurchaseRate >= 0.6)
    comments.push(`${Math.round(r.repurchaseRate * 100)}%的同学吃了还想再来，闭眼入`)
  if (r.actualPayPrice <= 15)
    comments.push(`实付才¥${r.actualPayPrice}，穷鬼福音，月底也能放心吃`)
  if (r.walkTime <= 3)
    comments.push(`走路${r.walkTime}分钟就到，比食堂还近`)
  if (r.weeklyStudentOrders >= 400)
    comments.push(`本周${r.weeklyStudentOrders}位同学下单，大学城人气王`)
  if (r.rating >= 4.7)
    comments.push(`${r.rating}分高口碑，这个评分在大学城周边属于天花板`)
  if (r.features.includes('环境好') && r.scenes.includes('约会'))
    comments.push('环境和氛围都在线，约会带ta来不会出错')
  if (r.features.includes('分量足') && r.priceRange === 'budget')
    comments.push('量大管饱还便宜，干饭人的快乐就是这么朴实')

  // fallback
  if (comments.length === 0)
    comments.push(`${r.category}爱好者别错过，${r.recommendDishes[0]}是招牌`)

  return comments[0]
}

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const restaurant = useMemo(() => {
    return restaurants.find((r) => r.id === id)
  }, [id])

  const reviews = useMemo(() => {
    return id ? getReviewsByRestaurant(id) : []
  }, [id])

  const savingsPlan = useMemo(() => {
    return id ? getSavingsPlan(id) : undefined
  }, [id])

  // 下单弹窗状态
  const [showOrderSheet, setShowOrderSheet] = useState(false)
  const [showOrderToast, setShowOrderToast] = useState(false)

  // 请Ta吃 状态
  const [showGiftFlow, setShowGiftFlow] = useState(false)
  const [giftStep, setGiftStep] = useState<'dish' | 'friend' | 'success'>('dish')
  const [selectedDish, setSelectedDish] = useState('')
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])

  useEffect(() => {
    setFriends(getFriends())
  }, [])

  // 记录浏览足迹
  useEffect(() => {
    if (restaurant) {
      addVisitHistory({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        category: restaurant.category,
        avgPrice: restaurant.avgPrice,
        image: restaurant.images[0],
        timestamp: Date.now(),
      })
    }
  }, [restaurant])

  const startGiftFlow = () => {
    setShowGiftFlow(true)
    setGiftStep('dish')
    setSelectedDish('')
    setSelectedFriend(null)
    setFriends(getFriends())
  }

  const handleSelectDish = (dish: string) => {
    setSelectedDish(dish)
    setGiftStep('friend')
  }

  const handleSelectFriend = (friend: Friend) => {
    setSelectedFriend(friend)
    // 保存礼物记录
    if (restaurant) {
      addGiftHistory({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        dish: selectedDish,
        friendName: friend.name,
        friendAvatar: friend.avatar,
        timestamp: Date.now(),
      })
    }
    setGiftStep('success')
  }

  const closeGiftFlow = () => {
    setShowGiftFlow(false)
    setGiftStep('dish')
    setSelectedDish('')
    setSelectedFriend(null)
  }

  if (!restaurant) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="icon" style={{ fontSize: '2rem', color: '#ccc' }}>暂无</div>
          <p className="text">餐厅不存在</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '16px', width: 'auto' }}
            onClick={() => navigate('/')}
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="detail-page">
      {/* 头部图片 */}
      <div className="detail-header">
        <img
          className="detail-image"
          src={restaurant.images[0]}
          alt={restaurant.name}
        />
        <button className="detail-back" onClick={() => navigate(-1)}>
          ←
        </button>
      </div>

      {/* 内容区 */}
      <div className="detail-content">
        <h1 className="detail-title">{restaurant.name}</h1>
        <span className="detail-category">{restaurant.category}</span>

        {/* AI 一句话点评 */}
        <div className="detail-ai-comment">
          <span className="detail-ai-comment-badge">团子</span>
          <span className="detail-ai-comment-text">{getAiComment(restaurant)}</span>
        </div>

        {/* 统计数据 */}
        <div className="detail-stats">
          <div className="detail-stat">
            <div className="value">{restaurant.rating}分</div>
            <div className="label">{restaurant.reviewCount}条评价</div>
          </div>
          <div className="detail-stat">
            <div className="value">¥{restaurant.avgPrice}</div>
            <div className="label">人均消费</div>
          </div>
          <div className="detail-stat">
            <div className="value">{restaurant.walkTime}分钟</div>
            <div className="label">{restaurant.distance}米</div>
          </div>
        </div>

        {/* 美团交易数据 - 核心差异化 */}
        <div className="detail-transaction">
          <div className="detail-transaction-row">
            <div className="detail-transaction-item">
              <span className="detail-transaction-value highlight">{Math.round(restaurant.repurchaseRate * 100)}%</span>
              <span className="detail-transaction-label">同学复购率</span>
            </div>
            <div className="detail-transaction-item">
              <span className="detail-transaction-value">{restaurant.weeklyStudentOrders}</span>
              <span className="detail-transaction-label">本周学生单量</span>
            </div>
            <div className="detail-transaction-item">
              <span className="detail-transaction-value">¥{restaurant.actualPayPrice}</span>
              <span className="detail-transaction-label">实付均价</span>
            </div>
            <div className="detail-transaction-item">
              <span className="detail-transaction-value">{restaurant.avgDeliveryMinutes}min</span>
              <span className="detail-transaction-label">平均出餐</span>
            </div>
          </div>
          {restaurant.studentDiscount && (
            <div className="detail-discount-banner">
              学生专属：{restaurant.studentDiscount}
            </div>
          )}
        </div>

        {/* 省钱方案 - AI 帮你算账 */}
        {savingsPlan && (
          <div className="detail-section">
            <h2 className="detail-section-title">
              省钱方案
              {savingsPlan && <span className="savings-max">最多省¥{getMaxSavings(savingsPlan)}</span>}
            </h2>
            <div className="savings-plans">
              {savingsPlan.coupons.map(coupon => (
                <div key={coupon.id} className={`savings-card ${coupon.isNew ? 'new' : ''}`}>
                  <div className="savings-card-left">
                    <span className="savings-amount">省{coupon.discount}元</span>
                    <span className="savings-title">{coupon.title}</span>
                  </div>
                  <div className="savings-card-right">
                    <span className="savings-expire">{coupon.expireDay}</span>
                    <button className="savings-btn">领取</button>
                  </div>
                </div>
              ))}
              {savingsPlan.groupOrder && (
                <div className="savings-card group">
                  <div className="savings-card-left">
                    <span className="savings-amount">省{savingsPlan.groupOrder.savings}元</span>
                    <span className="savings-title">{savingsPlan.groupOrder.discountDesc}</span>
                  </div>
                  <div className="savings-card-right">
                    <span className="savings-expire">还差{savingsPlan.groupOrder.peopleNeeded}人</span>
                    <button className="savings-btn">拼单</button>
                  </div>
                </div>
              )}
              {savingsPlan.selfPickupSave > 0 && (
                <div className="savings-card pickup">
                  <div className="savings-card-left">
                    <span className="savings-amount">省{savingsPlan.selfPickupSave}元</span>
                    <span className="savings-title">到店自取免配送费（¥{savingsPlan.deliveryFee}）</span>
                  </div>
                  <div className="savings-card-right">
                    <span className="savings-expire">步行{restaurant.walkTime}分钟</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 基本信息 */}
        <div className="detail-section">
          <h2 className="detail-section-title">基本信息</h2>
          <div className="detail-info-list">
            <div className="detail-info-item">
              <span className="icon" style={{ color: '#FFD100', fontWeight: 600 }}>地址</span>
              <span>{restaurant.address}</span>
            </div>
            <div className="detail-info-item">
              <span className="icon" style={{ color: '#FFD100', fontWeight: 600 }}>时间</span>
              <span>{restaurant.openTime} - {restaurant.closeTime}</span>
            </div>
            <div className="detail-info-item">
              <span className="icon" style={{ color: '#FFD100', fontWeight: 600 }}>电话</span>
              <span>{restaurant.phone}</span>
            </div>
            <div className="detail-info-item">
              <span className="icon" style={{ color: '#FFD100', fontWeight: 600 }}>位置</span>
              <span>{restaurant.university}附近</span>
            </div>
          </div>
        </div>

        {/* 餐厅特色 */}
        <div className="detail-section">
          <h2 className="detail-section-title">餐厅特色</h2>
          <div className="detail-tags">
            {restaurant.features.map((feature) => (
              <span key={feature} className="detail-tag">{feature}</span>
            ))}
            {restaurant.scenes.map((scene) => (
              <span key={scene} className="detail-tag">适合{scene}</span>
            ))}
          </div>
        </div>

        {/* 推荐菜品 */}
        <div className="detail-section">
          <h2 className="detail-section-title">推荐菜品</h2>
          <div className="detail-tags">
            {restaurant.recommendDishes.map((dish) => (
              <span
                key={dish}
                className="detail-tag"
                style={{ background: '#FFF0EB', color: '#FF6B35' }}
              >
                {dish}
              </span>
            ))}
          </div>
        </div>

        {/* 学长学姐Tips */}
        <div className="detail-section">
          <h2 className="detail-section-title">学长学姐Tips</h2>
          <div className="detail-tips">
            {restaurant.tips.map((tip, index) => (
              <div key={index} className="detail-tip">
                <span className="icon">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 同学说 - UGC 评论 */}
        {reviews.length > 0 && (
          <div className="detail-section">
            <h2 className="detail-section-title">同学说 ({reviews.length})</h2>
            <div className="detail-reviews">
              {reviews.map((review) => (
                <div key={review.id} className="detail-review">
                  <div className="detail-review-header">
                    <span className="detail-review-avatar">{review.avatar}</span>
                    <div className="detail-review-user">
                      <span className="detail-review-name">{review.userName}</span>
                      <span className="detail-review-meta">{review.university} · {review.major}</span>
                    </div>
                    <div className="detail-review-right">
                      <span className="detail-review-rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                      <span className="detail-review-time">{formatTimeAgo(review.timestamp)}</span>
                    </div>
                  </div>
                  <p className="detail-review-content">{review.content}</p>
                  {review.tags && (
                    <div className="detail-review-tags">
                      {review.tags.map(tag => (
                        <span key={tag} className="detail-review-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="detail-review-footer">
                    <span className="detail-review-likes">{review.likes}人觉得有用</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 餐厅简介 */}
        <div className="detail-section">
          <h2 className="detail-section-title">餐厅简介</h2>
          <p style={{ color: '#4A5568', lineHeight: 1.8 }}>
            {restaurant.description}
          </p>
        </div>

        {/* 标签 */}
        <div className="detail-section" style={{ marginBottom: '100px' }}>
          <h2 className="detail-section-title">标签</h2>
          <div className="detail-tags">
            {restaurant.tags.map((tag) => (
              <span key={tag} className="detail-tag">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 请Ta吃弹窗流程 */}
      {showGiftFlow && (
        <div className="gift-overlay" onClick={closeGiftFlow}>
          <div className="gift-modal" onClick={e => e.stopPropagation()}>
            {/* 步骤一：选菜品 */}
            {giftStep === 'dish' && (
              <>
                <div className="gift-modal-header">
                  <h3>请Ta吃什么？</h3>
                  <span className="gift-modal-close" onClick={closeGiftFlow}>✕</span>
                </div>
                <p className="gift-modal-subtitle">选一道 {restaurant.name} 的招牌菜送给好友</p>
                <div className="gift-dish-list">
                  {restaurant.recommendDishes.map(dish => (
                    <button
                      key={dish}
                      className="gift-dish-item"
                      onClick={() => handleSelectDish(dish)}
                    >
                      <span className="gift-dish-name">{dish}</span>
                      <span className="gift-dish-price">约¥{Math.round(restaurant.avgPrice * 0.6)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 步骤二：选好友 */}
            {giftStep === 'friend' && (
              <>
                <div className="gift-modal-header">
                  <h3>送给谁？</h3>
                  <span className="gift-modal-close" onClick={closeGiftFlow}>✕</span>
                </div>
                <div className="gift-selected-dish">
                  已选：{selectedDish}（{restaurant.name}）
                </div>
                {friends.length === 0 ? (
                  <div className="gift-no-friends">
                    <p className="gift-no-friends-text">还没有饭搭子</p>
                    <p className="gift-no-friends-hint">去拼单广场认识同学，添加为好友后就能请Ta吃了</p>
                    <button className="gift-no-friends-btn" onClick={() => { closeGiftFlow(); navigate('/group') }}>
                      去拼单广场
                    </button>
                  </div>
                ) : (
                  <div className="gift-friend-list">
                    {friends.map(friend => (
                      <button
                        key={friend.id}
                        className="gift-friend-item"
                        onClick={() => handleSelectFriend(friend)}
                      >
                        <span className="gift-friend-avatar">{friend.avatar}</span>
                        <div className="gift-friend-info">
                          <span className="gift-friend-name">{friend.name}</span>
                          <span className="gift-friend-detail">
                            {friend.university.replace('北京', '').replace('大学', '')} · {friend.major}
                          </span>
                        </div>
                        <span className="gift-friend-action">送Ta</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 步骤三：成功 */}
            {giftStep === 'success' && selectedFriend && (
              <div className="gift-success">
                <div className="gift-success-animation">
                  <div className="gift-success-icon">
                    <span className="gift-success-check">✓</span>
                  </div>
                </div>
                <h3 className="gift-success-title">已送出！</h3>
                <div className="gift-success-card">
                  <div className="gift-success-from">你</div>
                  <div className="gift-success-arrow">→</div>
                  <div className="gift-success-to">
                    <span className="gift-success-to-avatar">{selectedFriend.avatar}</span>
                    <span>{selectedFriend.name}</span>
                  </div>
                </div>
                <div className="gift-success-dish">
                  {selectedDish}（{restaurant.name}）
                </div>
                <div className="gift-success-share">
                  <p>已生成分享卡片，可发送给好友领取</p>
                </div>
                <div className="gift-success-actions">
                  <button className="gift-success-btn share" onClick={() => {
                    closeGiftFlow()
                  }}>
                    分享给Ta
                  </button>
                  <button className="gift-success-btn close" onClick={closeGiftFlow}>
                    完成
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 底部操作栏 */}
      <div className="detail-actions">
        <button className="detail-action-btn secondary">
          电话
        </button>
        <button
          className="detail-action-btn gift"
          onClick={startGiftFlow}
        >
          请Ta吃
        </button>
        <button
          className="detail-action-btn primary"
          onClick={() => setShowOrderSheet(true)}
        >
          去美团下单
        </button>
      </div>

      {/* 下单弹窗 */}
      {showOrderSheet && (
        <div className="order-sheet-overlay" onClick={() => setShowOrderSheet(false)}>
          <div className="order-sheet" onClick={e => e.stopPropagation()}>
            <div className="order-sheet-header">
              <img src={restaurant.images[0]} alt={restaurant.name} />
              <div className="order-sheet-header-info">
                <div className="order-sheet-header-name">{restaurant.name}</div>
                <div className="order-sheet-header-rating">
                  ★ {restaurant.rating} · {restaurant.category} · ¥{restaurant.avgPrice}/人
                </div>
              </div>
              <span className="order-sheet-close" onClick={() => setShowOrderSheet(false)}>✕</span>
            </div>

            {savingsPlan && (savingsPlan.coupons.length > 0 || savingsPlan.groupOrder || savingsPlan.selfPickupSave > 0) && (
              <div className="order-sheet-coupons">
                <div className="order-sheet-coupons-title">可用优惠</div>
                {savingsPlan.coupons.map(coupon => (
                  <div key={coupon.id} className="order-sheet-coupon">
                    <span className="order-sheet-coupon-text">
                      {coupon.isNew && '🆕 '}{coupon.title}
                    </span>
                    <span className="order-sheet-coupon-value">-¥{coupon.discount}</span>
                  </div>
                ))}
                {savingsPlan.groupOrder && (
                  <div className="order-sheet-coupon">
                    <span className="order-sheet-coupon-text">拼单 · {savingsPlan.groupOrder.discountDesc}</span>
                    <span className="order-sheet-coupon-value">-¥{savingsPlan.groupOrder.savings}</span>
                  </div>
                )}
                {savingsPlan.selfPickupSave > 0 && (
                  <div className="order-sheet-coupon">
                    <span className="order-sheet-coupon-text">到店自取免配送费</span>
                    <span className="order-sheet-coupon-value">-¥{savingsPlan.selfPickupSave}</span>
                  </div>
                )}
              </div>
            )}

            <div className="order-sheet-price">
              <span className="order-sheet-price-label">预估实付</span>
              <span className="order-sheet-price-value">{restaurant.actualPayPrice}</span>
            </div>

            <button
              className="order-sheet-btn"
              onClick={() => {
                setShowOrderToast(true)
                setTimeout(() => {
                  setShowOrderToast(false)
                  setShowOrderSheet(false)
                }, 2000)
              }}
            >
              打开美团APP下单
            </button>
          </div>
        </div>
      )}

      {/* 下单跳转toast */}
      {showOrderToast && (
        <div className="toast">正在跳转美团APP...</div>
      )}
    </div>
  )
}
