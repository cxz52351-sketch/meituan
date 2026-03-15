import { useNavigate } from 'react-router-dom'
import { Restaurant } from '../types'

interface Props {
  restaurant: Restaurant
}

export default function RestaurantCard({ restaurant }: Props) {
  const navigate = useNavigate()

  return (
    <div
      className="restaurant-card"
      onClick={() => navigate(`/restaurant/${restaurant.id}`)}
    >
      <img
        className="image"
        src={restaurant.images[0]}
        alt={restaurant.name}
        loading="lazy"
      />
      <div className="info">
        <div className="name">
          {restaurant.name}
          <span className="category-tag">{restaurant.category}</span>
        </div>
        <div className="meta">
          <span className="rating">{restaurant.rating}分</span>
          <span>¥{restaurant.avgPrice}/人</span>
          <span>{restaurant.walkTime}分钟</span>
        </div>
        <div className="tags">
          {restaurant.features.slice(0, 2).map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
