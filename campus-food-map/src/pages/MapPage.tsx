import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { University, Restaurant } from '../types'
import { restaurants, universities } from '../data/restaurants'

interface Props {
  university: University | 'all'
}

export default function MapPage({ university }: Props) {
  const navigate = useNavigate()
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)

  const filteredRestaurants = useMemo(() => {
    return university === 'all'
      ? restaurants
      : restaurants.filter((r) => r.university === university)
  }, [university])

  const currentUniversity = useMemo(() => {
    if (university === 'all') return universities[0]
    return universities.find((u) => u.name === university) || universities[0]
  }, [university])

  // 模拟地图上的marker位置分布
  const getMarkerPosition = (_restaurant: Restaurant, index: number) => {
    const baseX = 30 + (index % 5) * 15
    const baseY = 20 + Math.floor(index / 5) * 18
    const offsetX = (Math.sin(index * 1.5) * 8)
    const offsetY = (Math.cos(index * 1.3) * 6)
    return {
      left: `${Math.min(Math.max(baseX + offsetX, 5), 85)}%`,
      top: `${Math.min(Math.max(baseY + offsetY, 10), 70)}%`
    }
  }

  const getCategoryLabel = (category: string) => {
    const labelMap: Record<string, string> = {
      '中餐': '中',
      '西餐': '西',
      '日料': '日',
      '韩餐': '韩',
      '火锅': '锅',
      '烧烤': '烤',
      '小吃': '吃',
      '快餐': '快',
      '饮品': '饮',
      '甜点': '甜',
      '面食': '面',
      '粥店': '粥',
      '东南亚': '东',
    }
    return labelMap[category] || '食'
  }

  return (
    <div className="page" style={{ padding: 0 }}>
      <div className="map-container">
        {/* 模拟地图背景 */}
        <div className="map-placeholder">
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(circle at 50% 40%, rgba(255, 107, 53, 0.1) 0%, transparent 50%),
              linear-gradient(135deg, #E8F5E9 0%, #E3F2FD 50%, #FFF3E0 100%)
            `
          }}>
            {/* 模拟道路线条 */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              {/* 主干道 */}
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.8)" strokeWidth="8" />
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.8)" strokeWidth="8" />
              <line x1="20%" y1="0" x2="80%" y2="100%" stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
            </svg>

            {/* 大学标记 */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '45%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(255,255,255,0.95)',
              padding: '12px 20px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 5,
              textAlign: 'center'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#FFD100',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: '#111'
              }}>校</div>
              <div style={{ fontWeight: 600, color: '#2D3748' }}>
                {university === 'all' ? '大学城' : currentUniversity.shortName}
              </div>
            </div>
          </div>

          {/* 餐厅标记 */}
          {filteredRestaurants.map((restaurant, index) => {
            const position = getMarkerPosition(restaurant, index)
            return (
              <div
                key={restaurant.id}
                className="map-marker"
                style={{
                  ...position,
                  background: selectedRestaurant?.id === restaurant.id ? '#E85A2A' : '#FF6B35'
                }}
                onClick={() => setSelectedRestaurant(restaurant)}
              >
                <span className="icon">{getCategoryLabel(restaurant.category)}</span>
              </div>
            )
          })}
        </div>

        {/* 底部信息卡片 */}
        <div className="map-bottom-sheet">
          {selectedRestaurant ? (
            <div
              className="restaurant-list-item"
              onClick={() => navigate(`/restaurant/${selectedRestaurant.id}`)}
              style={{ margin: 0, boxShadow: 'none' }}
            >
              <img
                className="image"
                src={selectedRestaurant.images[0]}
                alt={selectedRestaurant.name}
              />
              <div className="content">
                <div className="header">
                  <div className="name">{selectedRestaurant.name}</div>
                  <div className="price">¥{selectedRestaurant.avgPrice}/人</div>
                </div>
                <div className="meta">
                  <span className="rating">{selectedRestaurant.rating}分</span>
                  <span>{selectedRestaurant.walkTime}分钟</span>
                  <span>{selectedRestaurant.category}</span>
                </div>
                <div className="tags">
                  {selectedRestaurant.features.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
              <p>点击地图上的标记查看餐厅详情</p>
              <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                共 {filteredRestaurants.length} 家餐厅
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
