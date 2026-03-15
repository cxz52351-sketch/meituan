// 餐厅类型
export interface Restaurant {
  id: string;
  name: string;
  category: Category;
  tags: string[];
  rating: number;
  reviewCount: number;
  priceRange: PriceRange;
  avgPrice: number;
  distance: number; // 米
  walkTime: number; // 分钟
  address: string;
  phone: string;
  openTime: string;
  closeTime: string;
  images: string[];
  description: string;
  recommendDishes: string[];
  tips: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  university: University;
  scenes: Scene[];
  features: Feature[];
  // 美团交易数据（核心壁垒）
  repurchaseRate: number;       // 学生复购率 (0-1)
  weeklyStudentOrders: number;  // 本周学生订单量
  actualPayPrice: number;       // 学生实付均价（含满减/红包后）
  studentDiscount?: string;     // 学生专属优惠描述
  avgDeliveryMinutes: number;   // 平均配送/出餐时间（分钟）
}

// 美食分类
export type Category =
  | '中餐' | '西餐' | '日料' | '韩餐'
  | '火锅' | '烧烤' | '小吃' | '快餐'
  | '饮品' | '甜点' | '面食' | '粥店'
  | '东南亚' | '其他';

// 价格区间
export type PriceRange = 'budget' | 'affordable' | 'moderate' | 'premium';

// 大学
export type University = '北京大学' | '清华大学' | '中国人民大学' | '北京师范大学' | '北京航空航天大学';

// 用餐场景
export type Scene = '一个人' | '和室友' | '约会' | '聚餐' | '请客' | '深夜' | '快速';

// 餐厅特色
export type Feature = '穷鬼友好' | '快速出餐' | '环境好' | '分量足' | '有包间' | '可外带' | '有wifi';

// 筛选条件
export interface FilterOptions {
  university: University | 'all';
  priceRange: PriceRange | 'all';
  category: Category | 'all';
  maxWalkTime: number; // 分钟
  scene: Scene | 'all';
  sortBy: 'rating' | 'distance' | 'price';
}

// 榜单类型
export interface RankList {
  id: string;
  title: string;
  icon: string;
  description: string;
  filterFn: (r: Restaurant) => boolean;
  sortFn: (a: Restaurant, b: Restaurant) => number;
}
