import { useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { University, Restaurant } from '../types'
import { restaurants, rankLists } from '../data/restaurants'
import { getMealPeriod } from '../services/ai'

// AI 榜单洞察（本地生成）
function getAiRankInsight(rankId: string, list: Restaurant[]): string {
  const { period } = getMealPeriod()
  const top = list[0]
  if (!top) return ''

  switch (rankId) {
    case 'rating':
      return `口碑之王「${top.name}」${top.rating}分领跑，${top.weeklyStudentOrders}位同学本周下单验证`
    case 'repurchase':
      return `「${top.name}」复购率${Math.round(top.repurchaseRate * 100)}%，每10个吃过的同学有${Math.round(top.repurchaseRate * 10)}个回头`
    case 'budget':
      return `${period}省钱攻略：「${top.name}」实付仅¥${top.actualPayPrice}，${top.studentDiscount ? '叠加' + top.studentDiscount + '更划算' : '满减后超值'}`
    case 'fast':
      return `赶课赶DDL？「${top.name}」${top.avgDeliveryMinutes}分钟出餐，吃完不迟到`
    case 'late':
      return `深夜肚子咕咕叫？「${top.name}」营业到${top.closeTime}，${top.rating}分好评`
    case 'date':
      return `约会别踩雷，「${top.name}」环境氛围在线，${top.rating}分口碑有保障`
    case 'group':
      return `聚餐选「${top.name}」，人均¥${top.avgPrice}，${top.features.includes('有包间') ? '有包间不怕吵' : '适合多人聚餐'}`
    default:
      return `${period}推荐关注「${top.name}」，综合评分${top.rating}分`
  }
}

interface Props {
  university: University | 'all'
}

// 榜单筛选和排序逻辑
const getRankRestaurants = (
  rankId: string,
  allRestaurants: Restaurant[]
): Restaurant[] => {
  switch (rankId) {
    case 'repurchase':
      // 复购王榜：按学生复购率排序
      return [...allRestaurants]
        .sort((a, b) => b.repurchaseRate - a.repurchaseRate)

    case 'budget':
      // 穷鬼榜：按实付价格排序（含满减后）
      return allRestaurants
        .filter((r) => r.actualPayPrice <= 25)
        .sort((a, b) => a.actualPayPrice - b.actualPayPrice)

    case 'fast':
      // 快速出餐榜：按真实出餐/配送时间排序
      return [...allRestaurants]
        .filter((r) => r.avgDeliveryMinutes <= 10 || r.features.includes('快速出餐'))
        .sort((a, b) => a.avgDeliveryMinutes - b.avgDeliveryMinutes)

    case 'late':
      // 深夜食堂榜：22点后营业
      return allRestaurants
        .filter((r) => {
          const closeHour = parseInt(r.closeTime.split(':')[0])
          return closeHour >= 23 || closeHour <= 3 || r.scenes.includes('深夜')
        })
        .sort((a, b) => b.rating - a.rating)

    case 'date':
      // 约会圣地榜：环境好，适合两人
      return allRestaurants
        .filter((r) => r.scenes.includes('约会') || r.features.includes('环境好'))
        .sort((a, b) => b.rating - a.rating)

    case 'group':
      // 聚餐推荐榜：适合多人
      return allRestaurants
        .filter((r) => r.scenes.includes('聚餐') || r.features.includes('有包间'))
        .sort((a, b) => b.rating - a.rating)

    case 'rating':
    default:
      // 口碑榜：按评分排序
      return [...allRestaurants].sort((a, b) => b.rating - a.rating)
  }
}

export default function RankPage({ university }: Props) {
  const { rankId } = useParams()
  const navigate = useNavigate()

  const currentRankId = rankId || 'rating'
  const currentRank = rankLists.find((r) => r.id === currentRankId) || rankLists[6]
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  const filteredRestaurants = useMemo(() => {
    const baseList = university === 'all'
      ? restaurants
      : restaurants.filter((r) => r.university === university)

    return getRankRestaurants(currentRankId, baseList).slice(0, 10)
  }, [university, currentRankId])

  useEffect(() => {
    if (!mapRef.current || filteredRestaurants.length === 0) return

    // 如果地图已存在，先销毁
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
    })
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

    const bounds = L.latLngBounds([])

    filteredRestaurants.forEach((r, index) => {
      const latlng = L.latLng(r.coordinates.lat, r.coordinates.lng)
      bounds.extend(latlng)

      const marker = L.marker(latlng, {
        icon: L.divIcon({
          className: 'rank-map-marker',
          html: `<div class="rank-map-marker-inner" style="background:${index < 3 ? '#FFD100' : '#FF6B35'}">${index + 1}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(map)

      marker.bindPopup(`<b>${r.name}</b><br/>${r.rating}分 · ¥${r.avgPrice}/人`, {
        closeButton: false,
        className: 'rank-map-popup',
      })
      marker.on('click', () => navigate(`/restaurant/${r.id}`))
    })

    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [filteredRestaurants, navigate])

  return (
    <div className="page">
      {/* 榜单Tab */}
      <div className="rank-tabs">
        {rankLists.map((rank) => (
          <button
            key={rank.id}
            className={`rank-tab ${currentRankId === rank.id ? 'active' : ''}`}
            onClick={() => navigate(`/rank/${rank.id}`)}
          >
            {rank.icon} {rank.title}
          </button>
        ))}
      </div>

      {/* 榜单地图 */}
      <div className="rank-map-container">
        <div ref={mapRef} className="rank-map" />
        <div className="rank-map-title">
          <span className="rank-map-icon">{currentRank.icon}</span>
          {currentRank.title} · {filteredRestaurants.length}家上榜
        </div>
      </div>

      {/* AI 榜单洞察 */}
      {filteredRestaurants.length > 0 && (
        <div className="rank-ai-insight">
          <span className="rank-ai-insight-badge">团子</span>
          <span className="rank-ai-insight-text">{getAiRankInsight(currentRankId, filteredRestaurants)}</span>
        </div>
      )}

      {/* 榜单列表 */}
      {filteredRestaurants.length > 0 ? (
        <div className="rank-list">
          {filteredRestaurants.map((restaurant, index) => (
            <div
              key={restaurant.id}
              className="rank-item"
              onClick={() => navigate(`/restaurant/${restaurant.id}`)}
            >
              <div className="rank-number">{index + 1}</div>
              <img
                className="image"
                src={restaurant.images[0]}
                alt={restaurant.name}
              />
              <div className="content">
                <div className="name">{restaurant.name}</div>
                <div className="meta">
                  <span className="rating">{restaurant.rating}分</span>
                  {currentRankId === 'repurchase' && (
                    <span style={{ color: '#FF6B35', fontWeight: 600 }}>
                      复购率{Math.round(restaurant.repurchaseRate * 100)}%
                    </span>
                  )}
                  {currentRankId === 'budget' ? (
                    <span style={{ color: '#10B981', fontWeight: 600 }}>
                      实付¥{restaurant.actualPayPrice}
                    </span>
                  ) : (
                    <span>¥{restaurant.avgPrice}/人</span>
                  )}
                  {currentRankId === 'fast' ? (
                    <span style={{ color: '#F59E0B', fontWeight: 600 }}>
                      {restaurant.avgDeliveryMinutes}分钟出餐
                    </span>
                  ) : (
                    <span>{restaurant.walkTime}分钟</span>
                  )}
                </div>
                {restaurant.studentDiscount && (currentRankId === 'budget' || currentRankId === 'repurchase') && (
                  <div className="rank-discount">🎫 {restaurant.studentDiscount}</div>
                )}
                {currentRankId === 'repurchase' && (
                  <div className="rank-orders">本周{restaurant.weeklyStudentOrders}位同学下单</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="icon" style={{ fontSize: '2rem', color: '#ccc' }}>暂无</div>
          <p className="text">暂无符合条件的餐厅上榜</p>
        </div>
      )}
    </div>
  )
}
