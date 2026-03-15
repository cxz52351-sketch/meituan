import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { University, Category, PriceRange, Scene } from '../types'
import { restaurants } from '../data/restaurants'
import RestaurantListItem from '../components/RestaurantListItem'
import FilterModal from '../components/FilterModal'

interface Props {
  university: University | 'all'
}

interface Filters {
  category: Category | 'all'
  priceRange: PriceRange | 'all'
  scene: Scene | 'all'
  maxWalkTime: number
  sortBy: 'rating' | 'distance' | 'price'
}

export default function ListPage({ university }: Props) {
  const navigate = useNavigate()
  const [showFilter, setShowFilter] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<Filters>({
    category: 'all',
    priceRange: 'all',
    scene: 'all',
    maxWalkTime: 30,
    sortBy: 'rating'
  })

  const filteredRestaurants = useMemo(() => {
    let result = university === 'all'
      ? restaurants
      : restaurants.filter((r) => r.university === university)

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((r) =>
        r.name.toLowerCase().includes(query) ||
        r.category.includes(query) ||
        r.tags.some((t) => t.toLowerCase().includes(query))
      )
    }

    // 分类过滤
    if (filters.category !== 'all') {
      result = result.filter((r) => r.category === filters.category)
    }

    // 价格过滤
    if (filters.priceRange !== 'all') {
      result = result.filter((r) => r.priceRange === filters.priceRange)
    }

    // 场景过滤
    if (filters.scene !== 'all') {
      result = result.filter((r) => r.scenes.includes(filters.scene as typeof r.scenes[number]))
    }

    // 步行时间过滤
    result = result.filter((r) => r.walkTime <= filters.maxWalkTime)

    // 排序
    switch (filters.sortBy) {
      case 'rating':
        result.sort((a, b) => b.rating - a.rating)
        break
      case 'distance':
        result.sort((a, b) => a.distance - b.distance)
        break
      case 'price':
        result.sort((a, b) => a.avgPrice - b.avgPrice)
        break
    }

    return result
  }, [university, searchQuery, filters])

  const activeFilterCount = [
    filters.category !== 'all',
    filters.priceRange !== 'all',
    filters.scene !== 'all',
    filters.maxWalkTime < 30
  ].filter(Boolean).length

  return (
    <div className="page">
      {/* 搜索框 */}
      <div className="search-container">
        <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="搜索餐厅、菜系..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 筛选栏 */}
      <div className="filter-bar">
        <div className="filter-group">
          <button
            className={`filter-btn ${activeFilterCount > 0 ? 'active' : ''}`}
            onClick={() => setShowFilter(true)}
          >
            筛选{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </button>

          <button
            className={`filter-btn ${filters.sortBy === 'rating' ? 'active' : ''}`}
            onClick={() => setFilters({ ...filters, sortBy: 'rating' })}
          >
            评分最高
          </button>

          <button
            className={`filter-btn ${filters.sortBy === 'distance' ? 'active' : ''}`}
            onClick={() => setFilters({ ...filters, sortBy: 'distance' })}
          >
            距离最近
          </button>

          <button
            className={`filter-btn ${filters.sortBy === 'price' ? 'active' : ''}`}
            onClick={() => setFilters({ ...filters, sortBy: 'price' })}
          >
            价格最低
          </button>
        </div>
      </div>

      {/* 结果数量 */}
      <p style={{ color: '#718096', fontSize: '0.85rem', marginBottom: '16px' }}>
        共找到 {filteredRestaurants.length} 家餐厅
      </p>

      {/* 餐厅列表 */}
      {filteredRestaurants.length > 0 ? (
        <div className="restaurant-list">
          {filteredRestaurants.map((restaurant) => (
            <RestaurantListItem key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="icon" style={{ fontSize: '2rem', color: '#ccc' }}>暂无</div>
          <p className="text">没有找到符合条件的餐厅</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '16px', width: 'auto' }}
            onClick={() => {
              setFilters({
                category: 'all',
                priceRange: 'all',
                scene: 'all',
                maxWalkTime: 30,
                sortBy: 'rating'
              })
              setSearchQuery('')
            }}
          >
            重置筛选条件
          </button>
        </div>
      )}

      {/* 筛选弹窗 */}
      {showFilter && (
        <FilterModal
          filters={filters}
          onApply={(newFilters) => {
            setFilters(newFilters)
            setShowFilter(false)
          }}
          onClose={() => setShowFilter(false)}
        />
      )}

      {/* 纠结了？AI 帮你选 */}
      {filteredRestaurants.length > 2 && (
        <div className="ai-nudge" onClick={() => navigate('/ai')}>
          <span>😋 纠结了？让 AI 帮你选</span>
        </div>
      )}
    </div>
  )
}
