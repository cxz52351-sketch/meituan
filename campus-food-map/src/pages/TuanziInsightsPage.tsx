import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserInsights } from '../services/userInsights'

export default function TuanziInsightsPage() {
  const navigate = useNavigate()
  const userInsights = getUserInsights()
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const toggleCard = (key: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const ThinkingSection = ({ cardKey, reasoning }: { cardKey: string; reasoning: string[] }) => {
    const isExpanded = expandedCards.has(cardKey)
    return (
      <div className="tuanzi-thinking-wrapper">
        <button className="tuanzi-thinking-toggle" onClick={() => toggleCard(cardKey)}>
          <span className="tuanzi-thinking-toggle-icon">🧠</span>
          <span>团子的思考</span>
          <span className={`tuanzi-thinking-arrow ${isExpanded ? 'expanded' : ''}`}>›</span>
        </button>
        <div className={`tuanzi-thinking-box ${isExpanded ? 'expanded' : ''}`}>
          <div className="tuanzi-thinking-steps">
            {reasoning.map((step, i) => (
              <div key={i} className="tuanzi-thinking-step">
                <span className="tuanzi-thinking-step-num">{i + 1}</span>
                <span className="tuanzi-thinking-step-text">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 如果没有数据，显示空状态
  if (!userInsights || userInsights.taste.topCategories.length === 0) {
    return (
      <div className="page tuanzi-insights-page">
        <div className="tuanzi-insights-header">
          <button className="tuanzi-insights-back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h1 className="tuanzi-insights-title">团子·干饭顾问</h1>
        </div>

        <div className="tuanzi-insights-empty">
          <div className="tuanzi-insights-empty-icon">🍽️</div>
          <h2 className="tuanzi-insights-empty-title">还没有足够的数据哦</h2>
          <p className="tuanzi-insights-empty-hint">多逛逛餐厅、用用随机吃、拼拼单<br/>团子就能分析出你的口味基因啦</p>
          <button className="tuanzi-insights-empty-btn" onClick={() => navigate('/')}>
            去首页逛逛
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page tuanzi-insights-page">
      {/* 顶部导航 */}
      <div className="tuanzi-insights-header">
        <button className="tuanzi-insights-back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h1 className="tuanzi-insights-title">团子·干饭顾问</h1>
      </div>

      <div className="tuanzi-insights-content">
        {/* 团子眼中的你 - Hero区域 */}
        <div className="tuanzi-insights-hero">
          <div className="tuanzi-insights-hero-bg"></div>
          <div className="tuanzi-insights-hero-content">
            <img className="tuanzi-insights-hero-avatar" src="/tuanzi.png" alt="团子" />
            <p className="tuanzi-insights-hero-text">
              这是团子眼中的你，你愿意补充更多关于你的信息，让团子更懂你，成为你更得力的吃饭小助手嘛～
            </p>
          </div>
        </div>

        {/* 口味偏好 */}
        <div className="tuanzi-insights-card">
          <div className="tuanzi-insights-card-header">
            <h3 className="tuanzi-insights-card-title">
              <span className="tuanzi-insights-card-icon">🍜</span>
              口味偏好
            </h3>
          </div>
          <div className="tuanzi-insights-taste-grid">
            {userInsights.taste.topCategories.slice(0, 3).map((item, i) => (
              <div key={i} className="tuanzi-insights-taste-item">
                <div className="tuanzi-insights-taste-rank">
                  {i === 0 && '🥇'}
                  {i === 1 && '🥈'}
                  {i === 2 && '🥉'}
                </div>
                <div className="tuanzi-insights-taste-name">{item.category}</div>
              </div>
            ))}
          </div>
          <div className="tuanzi-insights-detail-row">
            <span className="tuanzi-insights-detail-label">辣度偏好</span>
            <span className="tuanzi-insights-detail-value tuanzi-insights-spice-badge">
              {userInsights.taste.spiceLevel === 'light' && '清淡'}
              {userInsights.taste.spiceLevel === 'mild' && '微辣'}
              {userInsights.taste.spiceLevel === 'medium' && '中辣'}
              {userInsights.taste.spiceLevel === 'heavy' && '重辣'}
            </span>
          </div>
          <div className="tuanzi-insights-summary-box">
            <div className="tuanzi-insights-summary-icon">💭</div>
            <p className="tuanzi-insights-summary-text">{userInsights.taste.aiSummary}</p>
          </div>
          <ThinkingSection cardKey="taste" reasoning={userInsights.taste.reasoning} />
        </div>

        {/* 消费习惯 */}
        <div className="tuanzi-insights-card">
          <div className="tuanzi-insights-card-header">
            <h3 className="tuanzi-insights-card-title">
              <span className="tuanzi-insights-card-icon">💰</span>
              消费习惯
            </h3>
          </div>
          <div className="tuanzi-insights-detail-row">
            <span className="tuanzi-insights-detail-label">平均消费</span>
            <span className="tuanzi-insights-detail-value tuanzi-insights-price-badge">¥{userInsights.consumption.avgSpending}/人</span>
          </div>
          <div className="tuanzi-insights-detail-row">
            <span className="tuanzi-insights-detail-label">价格敏感度</span>
            <span className="tuanzi-insights-detail-value tuanzi-insights-sensitivity-badge">
              {userInsights.consumption.priceSensitivity === 'high' && '高'}
              {userInsights.consumption.priceSensitivity === 'medium' && '中'}
              {userInsights.consumption.priceSensitivity === 'low' && '低'}
            </span>
          </div>
          <div className="tuanzi-insights-summary-box">
            <div className="tuanzi-insights-summary-icon">💭</div>
            <p className="tuanzi-insights-summary-text">{userInsights.consumption.aiSummary}</p>
          </div>
          <ThinkingSection cardKey="consumption" reasoning={userInsights.consumption.reasoning} />
        </div>

        {/* 社交属性 */}
        <div className="tuanzi-insights-card">
          <div className="tuanzi-insights-card-header">
            <h3 className="tuanzi-insights-card-title">
              <span className="tuanzi-insights-card-icon">👥</span>
              社交属性
            </h3>
          </div>
          <div className="tuanzi-insights-detail-row">
            <span className="tuanzi-insights-detail-label">社交类型</span>
            <span className="tuanzi-insights-detail-value tuanzi-insights-social-badge">
              {userInsights.social.socialType === 'introvert' && '独行侠'}
              {userInsights.social.socialType === 'balanced' && '随缘型'}
              {userInsights.social.socialType === 'extrovert' && '社交达人'}
            </span>
          </div>
          <div className="tuanzi-insights-detail-row">
            <span className="tuanzi-insights-detail-label">拼单次数</span>
            <span className="tuanzi-insights-detail-value">{userInsights.social.groupOrderCount}次</span>
          </div>
          <div className="tuanzi-insights-summary-box">
            <div className="tuanzi-insights-summary-icon">💭</div>
            <p className="tuanzi-insights-summary-text">{userInsights.social.aiSummary}</p>
          </div>
          <ThinkingSection cardKey="social" reasoning={userInsights.social.reasoning} />
        </div>

        {/* 探店行为 */}
        <div className="tuanzi-insights-card">
          <div className="tuanzi-insights-card-header">
            <h3 className="tuanzi-insights-card-title">
              <span className="tuanzi-insights-card-icon">🔍</span>
              探店行为
            </h3>
          </div>
          <div className="tuanzi-insights-detail-row">
            <span className="tuanzi-insights-detail-label">探索类型</span>
            <span className="tuanzi-insights-detail-value tuanzi-insights-explore-badge">{userInsights.explore.exploreTypeText}</span>
          </div>
          <div className="tuanzi-insights-detail-row">
            <span className="tuanzi-insights-detail-label">最近常去</span>
            <span className="tuanzi-insights-detail-value tuanzi-insights-detail-multi">
              {userInsights.explore.recentVisits.slice(0, 3).map(v => v.name).join(' · ')}
            </span>
          </div>
          <div className="tuanzi-insights-summary-box">
            <div className="tuanzi-insights-summary-icon">💭</div>
            <p className="tuanzi-insights-summary-text">{userInsights.explore.aiSummary}</p>
          </div>
          <ThinkingSection cardKey="explore" reasoning={userInsights.explore.reasoning} />
        </div>
      </div>
    </div>
  )
}
