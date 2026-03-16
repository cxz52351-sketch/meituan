import { useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { restaurants } from '../data/restaurants'
import { getReviewsByRestaurant, formatTimeAgo } from '../data/reviews'
import { getSavingsPlan, getMaxSavings } from '../data/deals'
import { addVisitHistory } from '../services/history'

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
              🎫 学生专属：{restaurant.studentDiscount}
            </div>
          )}
        </div>

        {/* 省钱方案 - AI 帮你算账 */}
        {savingsPlan && (
          <div className="detail-section">
            <h2 className="detail-section-title">
              💰 省钱方案
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
            <h2 className="detail-section-title">🗣️ 同学说 ({reviews.length})</h2>
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
                    <span className="detail-review-likes">👍 {review.likes}人觉得有用</span>
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

      {/* 底部操作栏 */}
      <div className="detail-actions">
        <button className="detail-action-btn secondary">
          电话
        </button>
        <button
          className="detail-action-btn primary"
          onClick={() => {
            // 模拟打开导航
            alert(`即将导航至：${restaurant.address}`)
          }}
        >
          导航前往
        </button>
      </div>
    </div>
  )
}
