import { University } from '../types'

export interface Review {
  id: string
  restaurantId: string
  userName: string
  university: University
  major: string
  avatar: string // emoji avatar
  rating: number
  content: string
  images?: string[]
  likes: number
  timestamp: number // unix ms
  tags?: string[] // 用户打的标签
}

// 时间工具：生成"几天前"的时间戳
function daysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000
}

export const reviews: Review[] = [
  // 老王麻辣烫 (id: 1)
  {
    id: 'r1',
    restaurantId: '1',
    userName: '小林同学',
    university: '北京大学',
    major: '计算机科学',
    avatar: '👦',
    rating: 5,
    content: '麻酱yyds！每次加宽粉必点，12块钱吃到撑。唯一缺点就是中午排队太长了，建议11点去。',
    likes: 42,
    timestamp: daysAgo(1),
    tags: ['性价比高', '麻酱好评']
  },
  {
    id: 'r2',
    restaurantId: '1',
    userName: '奶茶续命',
    university: '北京大学',
    major: '新闻传播',
    avatar: '👧',
    rating: 4,
    content: '周二会员日去的，8折后13块吃了一大碗，性价比无敌。就是店面小了点，高峰期找不到座。',
    likes: 28,
    timestamp: daysAgo(3),
    tags: ['便宜', '排队']
  },

  // 清华园小厨 (id: 2)
  {
    id: 'r3',
    restaurantId: '2',
    userName: '工科狗',
    university: '清华大学',
    major: '电子工程',
    avatar: '🧑',
    rating: 4,
    content: '红烧肉盖饭永远的神，米饭免费续是真的良心。就是晚上关门太早了，赶ddl的时候来不及。',
    likes: 35,
    timestamp: daysAgo(2),
    tags: ['分量足', '米饭免费续']
  },

  // 一兰拉面 (id: 3)
  {
    id: 'r4',
    restaurantId: '3',
    userName: '社恐患者',
    university: '清华大学',
    major: '软件工程',
    avatar: '🧑‍💻',
    rating: 5,
    content: '社恐天堂！单人隔间设计太懂我了，面的硬度可以自选，我每次选硬面+浓汤+特辣。深夜11点去人少，完美。',
    likes: 67,
    timestamp: daysAgo(1),
    tags: ['社恐友好', '深夜可去']
  },
  {
    id: 'r5',
    restaurantId: '3',
    userName: '日料爱好者',
    university: '北京大学',
    major: '日语',
    avatar: '👩',
    rating: 5,
    content: '汤底很正宗，溏心蛋是我吃过最好的！就是价格对学生来说有点小贵，但偶尔奖励自己可以。',
    likes: 51,
    timestamp: daysAgo(5),
    tags: ['味道正宗', '值得犒劳']
  },

  // 大学生烤肉 (id: 4)
  {
    id: 'r6',
    restaurantId: '4',
    userName: '聚会达人',
    university: '北京大学',
    major: '社会学',
    avatar: '🧑‍🤝‍🧑',
    rating: 4,
    content: '上周室友生日在这聚的，4个人吃了140，人均35太划算了。五花肉烤得滋滋冒油，配扎啤第二杯半价绝了。',
    likes: 38,
    timestamp: daysAgo(4),
    tags: ['聚餐推荐', '啤酒半价']
  },

  // 喜茶 (id: 5)
  {
    id: 'r7',
    restaurantId: '5',
    userName: '下午茶女孩',
    university: '清华大学',
    major: '建筑学',
    avatar: '👱‍♀️',
    rating: 5,
    content: '工作日下午3点去的，不用排队！多肉葡萄永远是我的本命，环境也很适合坐着画图。',
    likes: 44,
    timestamp: daysAgo(2),
    tags: ['不用排队', '环境好']
  },

  // 人大食堂 (id: 6)
  {
    id: 'r8',
    restaurantId: '6',
    userName: '省钱王者',
    university: '中国人民大学',
    major: '经济学',
    avatar: '💪',
    rating: 4,
    content: '人大食堂二楼的麻辣香锅 15块钱！外面起码要35+，味道还更好。就是需要校园卡，可以找同学帮忙。',
    likes: 56,
    timestamp: daysAgo(1),
    tags: ['超级省钱', '校园卡']
  },

  // 湘里人家 (id: 7)
  {
    id: 'r9',
    restaurantId: '7',
    userName: '湖南老乡',
    university: '北京师范大学',
    major: '中文系',
    avatar: '🌶️',
    rating: 5,
    content: '在北京吃到家乡味了！剁椒鱼头辣度够劲，小炒肉下了三碗饭。老板也是湖南的，聊得来。',
    likes: 41,
    timestamp: daysAgo(3),
    tags: ['正宗湘菜', '辣度足']
  },

  // 深夜食堂 (id: 8)
  {
    id: 'r10',
    restaurantId: '8',
    userName: '夜猫子',
    university: '北京航空航天大学',
    major: '航空工程',
    avatar: '🦉',
    rating: 5,
    content: '赶完论文凌晨1点来的，烤鸡串配啤酒，瞬间被治愈了。环境很有日式氛围，放松心情绝佳。学生证9折！',
    likes: 73,
    timestamp: daysAgo(2),
    tags: ['凌晨可去', '治愈系']
  },

  // 沙县小吃 (id: 9)
  {
    id: 'r11',
    restaurantId: '9',
    userName: '早八人',
    university: '北京大学',
    major: '物理学',
    avatar: '😴',
    rating: 4,
    content: '早上8点课前来一碗拌面+蒸饺，10块钱搞定早餐，汤还免费喝。沙县永远是我们穷学生的好朋友。',
    likes: 33,
    timestamp: daysAgo(6),
    tags: ['早餐首选', '穷鬼友好']
  },

  // 韩宫宴烤肉 (id: 10)
  {
    id: 'r12',
    restaurantId: '10',
    userName: '约会专家',
    university: '中国人民大学',
    major: '法学',
    avatar: '💕',
    rating: 4,
    content: '跟对象来的，午市自助68一位，比晚市便宜30！雪花牛肉入口即化，环境也很有氛围。约会推荐。',
    likes: 46,
    timestamp: daysAgo(5),
    tags: ['约会推荐', '午市划算']
  },

  // 师大炸鸡 (id: 11)
  {
    id: 'r13',
    restaurantId: '11',
    userName: '炸鸡狂人',
    university: '北京师范大学',
    major: '教育学',
    avatar: '🍗',
    rating: 5,
    content: '师大南门yyds！蜂蜜芥末味是绝杀，外酥里嫩，每次路过都控制不住自己。配啤酒看球赛完美。',
    likes: 58,
    timestamp: daysAgo(1),
    tags: ['外酥里嫩', '回购无数次']
  },

  // 海底捞 (id: 14)
  {
    id: 'r14',
    restaurantId: '14',
    userName: '火锅永远滴神',
    university: '北京大学',
    major: '国际关系',
    avatar: '🔥',
    rating: 5,
    content: '学生证69折！我们4个人吃了200出头，人均50多吃海底捞也太爽了。等位还给小零食和美甲，服务绝了。',
    likes: 89,
    timestamp: daysAgo(1),
    tags: ['学生优惠', '服务好']
  },

  // 兰州牛肉面 (id: 15)
  {
    id: 'r15',
    restaurantId: '15',
    userName: '面食控',
    university: '清华大学',
    major: '数学',
    avatar: '🍜',
    rating: 5,
    content: '早上6点就开门，早课前来一碗牛肉面提神醒脑。汤清肉烂面筋道，16块钱在北京找不到更好的了。',
    likes: 47,
    timestamp: daysAgo(3),
    tags: ['早餐神器', '汤清面筋']
  },

  // 小龙坎 (id: 20)
  {
    id: 'r16',
    restaurantId: '20',
    userName: '川渝老乡',
    university: '北京航空航天大学',
    major: '材料科学',
    avatar: '🌶️',
    rating: 5,
    content: '终于在北京找到正宗的川式火锅了！毛肚七上八下，鸭血嫩滑，红糖糍粑免费还好吃。凌晨2点还开着！',
    likes: 62,
    timestamp: daysAgo(2),
    tags: ['正宗川味', '凌晨可去']
  },

  // 觅唐茶餐厅 (id: 12)
  {
    id: 'r17',
    restaurantId: '12',
    userName: '文艺青年',
    university: '清华大学',
    major: '美术学院',
    avatar: '🎨',
    rating: 4,
    content: '港风装修太出片了，丝袜奶茶味道很正。下午茶套餐38块有一杯饮品+一份甜品，拍照约会都合适。',
    likes: 39,
    timestamp: daysAgo(4),
    tags: ['出片圣地', '下午茶推荐']
  },

  // 瑞幸 (id: 19)
  {
    id: 'r18',
    restaurantId: '19',
    userName: '咖啡因依赖',
    university: '北京师范大学',
    major: '心理学',
    avatar: '☕',
    rating: 4,
    content: '生椰拿铁9.9配上APP的优惠券，每天一杯续命。提前小程序下单，到了直接取，赶课也不耽误。',
    likes: 55,
    timestamp: daysAgo(1),
    tags: ['优惠多', '快速取餐']
  },

  // 北航小炒王 (id: 13)
  {
    id: 'r19',
    restaurantId: '13',
    userName: '干饭王',
    university: '北京航空航天大学',
    major: '计算机',
    avatar: '🍚',
    rating: 4,
    content: '酸辣土豆丝+米饭=完美！出餐超快，课间10分钟都能吃完。就是味道偏重，米饭要多吃几碗。',
    likes: 31,
    timestamp: daysAgo(5),
    tags: ['出餐快', '下饭']
  },

  // 泰香米 (id: 16)
  {
    id: 'r20',
    restaurantId: '16',
    userName: '东南亚胃',
    university: '清华大学',
    major: '国际关系',
    avatar: '🥥',
    rating: 5,
    content: '冬阴功汤太绝了！酸辣开胃，一锅都能喝完。菠萝饭也好吃，芒果糯米饭作为收尾简直完美。午市套餐很划算。',
    likes: 36,
    timestamp: daysAgo(3),
    tags: ['酸辣开胃', '午市套餐']
  },

  // 老北京铜锅涮肉 (id: 18)
  {
    id: 'r21',
    restaurantId: '18',
    userName: '北京土著',
    university: '北京大学',
    major: '历史学',
    avatar: '🏮',
    rating: 5,
    content: '冬天涮肉就得来这儿！手切羊肉特别新鲜，麻酱小料免费续。叫上三五好友，围着铜锅涮肉，北京味儿十足。',
    likes: 48,
    timestamp: daysAgo(2),
    tags: ['冬天必吃', '麻酱好评']
  },

  // 杨国福 (id: 17)
  {
    id: 'r22',
    restaurantId: '17',
    userName: '减肥失败者',
    university: '中国人民大学',
    major: '金融学',
    avatar: '😋',
    rating: 4,
    content: '说好只吃小份的，结果又端了一大碗出来…芝麻酱可以多要这件事真的是福音也是诅咒。人均20，钱包友好。',
    likes: 43,
    timestamp: daysAgo(4),
    tags: ['克制选菜', '芝麻酱无限']
  },
]

// 获取某个餐厅的评论
export function getReviewsByRestaurant(restaurantId: string): Review[] {
  return reviews
    .filter(r => r.restaurantId === restaurantId)
    .sort((a, b) => b.timestamp - a.timestamp)
}

// 获取最新评论（用于首页"同学说"）
export function getLatestReviews(count: number = 5, university?: string): Review[] {
  let filtered = reviews
  if (university && university !== 'all') {
    filtered = reviews.filter(r => r.university === university)
  }
  return filtered
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, count)
}

// 获取热门评论（按点赞数）
export function getHotReviews(count: number = 3): Review[] {
  return [...reviews]
    .sort((a, b) => b.likes - a.likes)
    .slice(0, count)
}

// 格式化时间为"x天前"/"刚刚"等
export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return `${Math.floor(days / 30)}个月前`
}
