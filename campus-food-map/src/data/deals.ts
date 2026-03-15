// 省钱方案数据 — 美团在校园场景的留存引擎
// 核心逻辑：不做比价工具，帮学生在美团内省到最多

export interface Coupon {
  id: string
  title: string       // "满25减8"
  threshold: number   // 满多少
  discount: number    // 减多少
  expireDay: string   // "周日到期"
  isNew?: boolean     // 新人券
}

export interface GroupOrderInfo {
  peopleNeeded: number    // 还差几人
  totalPeople: number     // 凑满几人
  discountDesc: string    // "免配送费" / "满50减15"
  savings: number         // 预计省多少
}

export interface SavingsPlan {
  restaurantId: string
  coupons: Coupon[]
  groupOrder?: GroupOrderInfo
  selfPickupSave: number   // 到店自取省多少（配送费）
  deliveryFee: number      // 配送费
}

// 每家餐厅的省钱方案
export const savingsPlans: SavingsPlan[] = [
  {
    restaurantId: '1', // 老王麻辣烫
    coupons: [
      { id: 'c1', title: '满20减5', threshold: 20, discount: 5, expireDay: '周日到期' },
      { id: 'c2', title: '新人立减8', threshold: 0, discount: 8, expireDay: '限新用户', isNew: true }
    ],
    groupOrder: { peopleNeeded: 1, totalPeople: 2, discountDesc: '2人拼单免配送费', savings: 4 },
    selfPickupSave: 4,
    deliveryFee: 4
  },
  {
    restaurantId: '2', // 清华园小厨
    coupons: [
      { id: 'c3', title: '满25减6', threshold: 25, discount: 6, expireDay: '周五到期' }
    ],
    groupOrder: { peopleNeeded: 2, totalPeople: 3, discountDesc: '3人拼满减15', savings: 5 },
    selfPickupSave: 3,
    deliveryFee: 3
  },
  {
    restaurantId: '3', // 一兰拉面
    coupons: [
      { id: 'c4', title: '满40减10', threshold: 40, discount: 10, expireDay: '周六到期' },
      { id: 'c5', title: '学生专属满50减12', threshold: 50, discount: 12, expireDay: '长期有效' }
    ],
    selfPickupSave: 5,
    deliveryFee: 5
  },
  {
    restaurantId: '4', // 大学生烤肉
    coupons: [
      { id: 'c6', title: '满60减15', threshold: 60, discount: 15, expireDay: '周日到期' }
    ],
    groupOrder: { peopleNeeded: 1, totalPeople: 4, discountDesc: '4人拼单满减25', savings: 6 },
    selfPickupSave: 0,
    deliveryFee: 0
  },
  {
    restaurantId: '5', // 喜茶
    coupons: [
      { id: 'c7', title: '第二杯半价', threshold: 0, discount: 14, expireDay: '周末限定' },
      { id: 'c8', title: '满30减5', threshold: 30, discount: 5, expireDay: '周四到期' }
    ],
    groupOrder: { peopleNeeded: 1, totalPeople: 2, discountDesc: '2人拼单各省3元', savings: 3 },
    selfPickupSave: 3,
    deliveryFee: 3
  },
  {
    restaurantId: '6', // 人大食堂
    coupons: [
      { id: 'c9', title: '满15减3', threshold: 15, discount: 3, expireDay: '长期有效' }
    ],
    selfPickupSave: 0,
    deliveryFee: 0
  },
  {
    restaurantId: '7', // 湘里人家
    coupons: [
      { id: 'c10', title: '满50减10', threshold: 50, discount: 10, expireDay: '周五到期' }
    ],
    groupOrder: { peopleNeeded: 1, totalPeople: 3, discountDesc: '3人拼满100减25', savings: 8 },
    selfPickupSave: 4,
    deliveryFee: 4
  },
  {
    restaurantId: '8', // 深夜食堂
    coupons: [
      { id: 'c11', title: '满60减8', threshold: 60, discount: 8, expireDay: '周日到期' },
      { id: 'c12', title: '学生9折券', threshold: 0, discount: 5, expireDay: '长期有效' }
    ],
    selfPickupSave: 5,
    deliveryFee: 5
  },
  {
    restaurantId: '9', // 沙县小吃
    coupons: [
      { id: 'c13', title: '满10减2', threshold: 10, discount: 2, expireDay: '长期有效' },
      { id: 'c14', title: '早餐满8减3', threshold: 8, discount: 3, expireDay: '每天6-10点' }
    ],
    selfPickupSave: 2,
    deliveryFee: 2
  },
  {
    restaurantId: '10', // 韩宫宴烤肉
    coupons: [
      { id: 'c15', title: '满100减20', threshold: 100, discount: 20, expireDay: '周六到期' },
      { id: 'c16', title: '午市立减15', threshold: 0, discount: 15, expireDay: '11:30-14:00' }
    ],
    groupOrder: { peopleNeeded: 2, totalPeople: 4, discountDesc: '4人拼单满200减50', savings: 12 },
    selfPickupSave: 0,
    deliveryFee: 0
  },
  {
    restaurantId: '11', // 师大炸鸡
    coupons: [
      { id: 'c17', title: '满30减8', threshold: 30, discount: 8, expireDay: '周四到期' }
    ],
    groupOrder: { peopleNeeded: 1, totalPeople: 2, discountDesc: '2人拼单免配送', savings: 3 },
    selfPickupSave: 3,
    deliveryFee: 3
  },
  {
    restaurantId: '12', // 觅唐茶餐厅
    coupons: [
      { id: 'c18', title: '下午茶套餐减10', threshold: 38, discount: 10, expireDay: '14:00-17:00' }
    ],
    selfPickupSave: 4,
    deliveryFee: 4
  },
  {
    restaurantId: '13', // 北航小炒王
    coupons: [
      { id: 'c19', title: '满20减5', threshold: 20, discount: 5, expireDay: '长期有效' }
    ],
    selfPickupSave: 2,
    deliveryFee: 2
  },
  {
    restaurantId: '14', // 海底捞
    coupons: [
      { id: 'c20', title: '学生69折券', threshold: 0, discount: 28, expireDay: '长期有效' },
      { id: 'c21', title: '满200减30', threshold: 200, discount: 30, expireDay: '周末限定' }
    ],
    groupOrder: { peopleNeeded: 1, totalPeople: 4, discountDesc: '4人拼单满300减60', savings: 15 },
    selfPickupSave: 0,
    deliveryFee: 0
  },
  {
    restaurantId: '15', // 兰州牛肉面
    coupons: [
      { id: 'c22', title: '满15减3', threshold: 15, discount: 3, expireDay: '长期有效' },
      { id: 'c23', title: '早餐加蛋免费', threshold: 0, discount: 2, expireDay: '6:00-9:00' }
    ],
    selfPickupSave: 2,
    deliveryFee: 2
  },
  {
    restaurantId: '16', // 泰香米
    coupons: [
      { id: 'c24', title: '午市套餐立减8', threshold: 39, discount: 8, expireDay: '11:00-14:00' }
    ],
    groupOrder: { peopleNeeded: 1, totalPeople: 2, discountDesc: '2人拼单各省5元', savings: 5 },
    selfPickupSave: 4,
    deliveryFee: 4
  },
  {
    restaurantId: '17', // 杨国福
    coupons: [
      { id: 'c25', title: '满15减3', threshold: 15, discount: 3, expireDay: '长期有效' },
      { id: 'c26', title: '新人满20减10', threshold: 20, discount: 10, expireDay: '限新用户', isNew: true }
    ],
    selfPickupSave: 3,
    deliveryFee: 3
  },
  {
    restaurantId: '18', // 老北京铜锅涮肉
    coupons: [
      { id: 'c27', title: '满80减15', threshold: 80, discount: 15, expireDay: '周日到期' }
    ],
    groupOrder: { peopleNeeded: 2, totalPeople: 4, discountDesc: '4人拼单满150减35', savings: 9 },
    selfPickupSave: 0,
    deliveryFee: 0
  },
  {
    restaurantId: '19', // 瑞幸
    coupons: [
      { id: 'c28', title: '9.9元优惠券', threshold: 0, discount: 5, expireDay: '每周可领' },
      { id: 'c29', title: '第二杯1元', threshold: 0, discount: 14, expireDay: '周三会员日' }
    ],
    groupOrder: { peopleNeeded: 1, totalPeople: 3, discountDesc: '3人拼单各省2元', savings: 2 },
    selfPickupSave: 0,
    deliveryFee: 0
  },
  {
    restaurantId: '20', // 小龙坎
    coupons: [
      { id: 'c30', title: '满100减15', threshold: 100, discount: 15, expireDay: '周六到期' },
      { id: 'c31', title: '甜品免费券', threshold: 50, discount: 8, expireDay: '长期有效' }
    ],
    groupOrder: { peopleNeeded: 1, totalPeople: 4, discountDesc: '4人拼满200减45', savings: 11 },
    selfPickupSave: 0,
    deliveryFee: 0
  }
]

// 获取某个餐厅的省钱方案
export function getSavingsPlan(restaurantId: string): SavingsPlan | undefined {
  return savingsPlans.find(s => s.restaurantId === restaurantId)
}

// 计算最大省钱金额
export function getMaxSavings(plan: SavingsPlan): number {
  const couponMax = plan.coupons.length > 0
    ? Math.max(...plan.coupons.map(c => c.discount))
    : 0
  const groupSave = plan.groupOrder?.savings || 0
  return Math.max(couponMax, groupSave, plan.selfPickupSave)
}

// ========== 今日翻牌 ==========
// 校园版"疯狂星期四"：每天一家店，社交裂变 + 从众效应

export interface DailyFlip {
  restaurantId: string
  restaurantName: string
  dealDish: string           // 特价菜品
  originalPrice: number      // 原价
  flipPrice: number          // 翻牌价
  participantBase: number    // 基础参与人数（模拟）
  icon: string
}

export interface FlipCandidate {
  restaurantId: string
  restaurantName: string
  dealDish: string
  flipPrice: number
  votes: number              // 模拟票数
}

// 今日翻牌：基于星期几轮换
const flipPool: DailyFlip[] = [
  { restaurantId: '1', restaurantName: '老王麻辣烫', dealDish: '招牌麻酱碗+宽粉', originalPrice: 22, flipPrice: 9.9, participantBase: 74, icon: '🌶️' },
  { restaurantId: '9', restaurantName: '沙县小吃', dealDish: '拌面+蒸饺+汤套餐', originalPrice: 18, flipPrice: 7.9, participantBase: 93, icon: '🥟' },
  { restaurantId: '19', restaurantName: '瑞幸咖啡', dealDish: '生椰拿铁大杯', originalPrice: 29, flipPrice: 9.9, participantBase: 156, icon: '☕' },
  { restaurantId: '13', restaurantName: '北航小炒王', dealDish: '酸辣土豆丝盖饭', originalPrice: 22, flipPrice: 8.8, participantBase: 68, icon: '🍚' },
  { restaurantId: '11', restaurantName: '师大炸鸡', dealDish: '原味炸鸡3块装', originalPrice: 25, flipPrice: 9.9, participantBase: 112, icon: '🍗' },
  { restaurantId: '15', restaurantName: '兰州正宗牛肉面', dealDish: '牛肉面+卤蛋', originalPrice: 20, flipPrice: 8.9, participantBase: 87, icon: '🍜' },
  { restaurantId: '17', restaurantName: '杨国福麻辣烫', dealDish: '小份麻辣烫', originalPrice: 20, flipPrice: 9.9, participantBase: 81, icon: '🥘' }
]

// 明日翻牌候选：用于投票
const candidatePool: FlipCandidate[] = [
  { restaurantId: '4', restaurantName: '大学生烤肉', dealDish: '烤五花肉套餐', flipPrice: 19.9, votes: 203 },
  { restaurantId: '2', restaurantName: '清华园小厨', dealDish: '红烧肉盖饭', flipPrice: 9.9, votes: 156 },
  { restaurantId: '5', restaurantName: '喜茶', dealDish: '多肉葡萄中杯', flipPrice: 9.9, votes: 189 },
  { restaurantId: '6', restaurantName: '人大食堂', dealDish: '麻辣香锅小份', flipPrice: 6.9, votes: 134 }
]

// 获取今日翻牌（基于星期几）
export function getTodayFlip(): DailyFlip {
  const dayIndex = new Date().getDay()
  return flipPool[dayIndex % flipPool.length]
}

// 获取明日候选
export function getTomorrowCandidates(): FlipCandidate[] {
  return [...candidatePool].sort((a, b) => b.votes - a.votes)
}
