import { useState } from 'react'
import { Category, PriceRange, Scene } from '../types'

interface Filters {
  category: Category | 'all'
  priceRange: PriceRange | 'all'
  scene: Scene | 'all'
  maxWalkTime: number
  sortBy: 'rating' | 'distance' | 'price'
}

interface Props {
  filters: Filters
  onApply: (filters: Filters) => void
  onClose: () => void
}

const categories: (Category | 'all')[] = [
  'all', '中餐', '西餐', '日料', '韩餐', '火锅', '烧烤', '小吃', '快餐', '饮品', '甜点', '面食', '东南亚'
]

const priceRanges: { value: PriceRange | 'all'; label: string }[] = [
  { value: 'all', label: '不限' },
  { value: 'budget', label: '15元以下' },
  { value: 'affordable', label: '15-35元' },
  { value: 'moderate', label: '35-60元' },
  { value: 'premium', label: '60元以上' }
]

const scenes: (Scene | 'all')[] = [
  'all', '一个人', '和室友', '约会', '聚餐', '请客', '深夜', '快速'
]

const walkTimes = [5, 10, 15, 20, 30]

export default function FilterModal({ filters, onApply, onClose }: Props) {
  const [localFilters, setLocalFilters] = useState<Filters>(filters)

  const handleReset = () => {
    setLocalFilters({
      category: 'all',
      priceRange: 'all',
      scene: 'all',
      maxWalkTime: 30,
      sortBy: 'rating'
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">筛选条件</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* 品类 */}
          <div className="filter-section">
            <h3 className="filter-section-title">品类</h3>
            <div className="filter-options">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`filter-option ${localFilters.category === cat ? 'active' : ''}`}
                  onClick={() => setLocalFilters({ ...localFilters, category: cat })}
                >
                  {cat === 'all' ? '不限' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* 价格 */}
          <div className="filter-section">
            <h3 className="filter-section-title">人均价格</h3>
            <div className="filter-options">
              {priceRanges.map((price) => (
                <button
                  key={price.value}
                  className={`filter-option ${localFilters.priceRange === price.value ? 'active' : ''}`}
                  onClick={() => setLocalFilters({ ...localFilters, priceRange: price.value })}
                >
                  {price.label}
                </button>
              ))}
            </div>
          </div>

          {/* 场景 */}
          <div className="filter-section">
            <h3 className="filter-section-title">用餐场景</h3>
            <div className="filter-options">
              {scenes.map((scene) => (
                <button
                  key={scene}
                  className={`filter-option ${localFilters.scene === scene ? 'active' : ''}`}
                  onClick={() => setLocalFilters({ ...localFilters, scene: scene })}
                >
                  {scene === 'all' ? '不限' : scene}
                </button>
              ))}
            </div>
          </div>

          {/* 步行时间 */}
          <div className="filter-section">
            <h3 className="filter-section-title">步行时间（分钟内）</h3>
            <div className="filter-options">
              {walkTimes.map((time) => (
                <button
                  key={time}
                  className={`filter-option ${localFilters.maxWalkTime === time ? 'active' : ''}`}
                  onClick={() => setLocalFilters({ ...localFilters, maxWalkTime: time })}
                >
                  {time}分钟
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="filter-actions">
          <button className="btn btn-secondary" onClick={handleReset}>
            重置
          </button>
          <button className="btn btn-primary" onClick={() => onApply(localFilters)}>
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
