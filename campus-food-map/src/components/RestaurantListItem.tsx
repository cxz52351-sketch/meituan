import { useNavigate } from 'react-router-dom'
import { Restaurant } from '../types'

interface Props {
  restaurant: Restaurant
}

export default function RestaurantListItem({ restaurant }: Props) {
  const navigate = useNavigate()

  return (
    <div
      className="restaurant-list-item"
      onClick={() => navigate(`/restaurant/${restaurant.id}`)}
    >
      <img
        className="image"
        src={restaurant.images[0]}
        alt={restaurant.name}
        loading="lazy"
      />
      <div className="content">
        <div className="header">
          <div className="name">{restaurant.name}</div>
          <div className="price">¥{restaurant.avgPrice}/人</div>
        </div>
        <div className="meta">
          <span className="rating">{restaurant.rating}分</span>
          <span>{restaurant.distance}m</span>
          <span>{restaurant.walkTime}分钟</span>
          <span>{restaurant.category}</span>
        </div>
        <div className="tags">
          {restaurant.features.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
          {restaurant.scenes.slice(0, 1).map((scene) => (
            <span key={scene} className="tag">适合{scene}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
