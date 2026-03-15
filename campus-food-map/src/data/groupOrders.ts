// 拼单广场 — 表面省钱，骨子里联谊
// 核心设计："我不是在社交，我只是想凑个满减"
// 线上拼单 = 省钱工具（凑满减/拼外卖配送费）
// 线下拼单 = 社交入口（约着一起吃，认识新朋友）

import { University } from '../types'

export type GroupOrderMode = 'online' | 'offline'

export interface GroupOrderUser {
  name: string
  avatar: string
  university: University
  major: string
  year: string     // 大一~研三
  gender: 'male' | 'female'
}

export interface GroupOrderPost {
  id: string
  mode: GroupOrderMode
  initiator: GroupOrderUser
  participants: GroupOrderUser[]   // 已加入的人（不含发起者）
  restaurantId: string
  restaurantName: string
  targetPeople: number             // 需要凑几人
  dealDesc: string                 // "满50减15"
  savingsPerPerson: number
  // 线下专属
  pickupLocation?: string          // "北大西门门口碰面"
  pickupTime?: string              // "12:00"
  // 线上专属
  deliveryAddress?: string         // "北大39号宿舍楼"
  deliveryTime?: string            // "12:30前送达"
  message: string                  // 发起者留言——社交破冰的关键
  tags: string[]
  createdMinutesAgo: number
}

// 标签定义
export const onlineTags = ['凑满减', '拼配送费', '宿舍外卖', '奶茶拼单', '深夜外卖']
export const offlineTags = ['找饭搭子', '欢迎新朋友', '深夜局', '长期搭子', '拍照打卡']

export const groupOrderPosts: GroupOrderPost[] = [
  // ===== 线下拼单 =====
  {
    id: 'g1',
    mode: 'offline',
    initiator: {
      name: '小林',
      avatar: '👦',
      university: '北京大学',
      major: '计算机科学',
      year: '大三',
      gender: 'male'
    },
    participants: [
      { name: '小雨', avatar: '👧', university: '北京大学', major: '中文系', year: '大二', gender: 'female' }
    ],
    restaurantId: '14',
    restaurantName: '海底捞',
    targetPeople: 4,
    dealDesc: '4人学生69折+满200减30',
    savingsPerPerson: 15,
    pickupLocation: '学府路购物中心4层',
    pickupTime: '18:30',
    message: '今晚去海底捞，还差2位同学！AA下来人均50出头，比自己去划算太多了',
    tags: ['找饭搭子', '欢迎新朋友'],
    createdMinutesAgo: 8
  },
  {
    id: 'g3',
    mode: 'offline',
    initiator: {
      name: '干饭王阿杰',
      avatar: '🧑',
      university: '北京大学',
      major: '物理学',
      year: '大四',
      gender: 'male'
    },
    participants: [
      { name: '小美', avatar: '👩', university: '北京大学', major: '经济学', year: '大三', gender: 'female' },
      { name: '老张', avatar: '🧔', university: '北京大学', major: '法学', year: '研一', gender: 'male' }
    ],
    restaurantId: '18',
    restaurantName: '老北京铜锅涮肉',
    targetPeople: 4,
    dealDesc: '4人拼单满150减35',
    savingsPerPerson: 9,
    pickupLocation: '成府路158号',
    pickupTime: '18:00',
    message: '涮肉就得人多才热闹！还差1位，来的都是朋友，边涮边聊',
    tags: ['找饭搭子', '欢迎新朋友'],
    createdMinutesAgo: 15
  },
  {
    id: 'g4',
    mode: 'offline',
    initiator: {
      name: '考研搭子',
      avatar: '🧑‍💻',
      university: '中国人民大学',
      major: '金融学',
      year: '大三',
      gender: 'male'
    },
    participants: [],
    restaurantId: '17',
    restaurantName: '杨国福麻辣烫',
    targetPeople: 2,
    dealDesc: '满30减8',
    savingsPerPerson: 4,
    pickupLocation: '人大西门外',
    pickupTime: '12:00',
    message: '每天中午都在图书馆复习，一个人吃饭太孤单了，找个饭搭子聊聊天放松一下',
    tags: ['找饭搭子', '长期搭子'],
    createdMinutesAgo: 20
  },
  {
    id: 'g5',
    mode: 'offline',
    initiator: {
      name: '湖南妹子',
      avatar: '👧',
      university: '北京师范大学',
      major: '教育学',
      year: '大二',
      gender: 'female'
    },
    participants: [
      { name: '川妹子', avatar: '👩', university: '北京师范大学', major: '心理学', year: '大二', gender: 'female' }
    ],
    restaurantId: '7',
    restaurantName: '湘里人家',
    targetPeople: 3,
    dealDesc: '3人拼满100减25',
    savingsPerPerson: 8,
    pickupLocation: '魏公村路12号',
    pickupTime: '12:30',
    message: '想吃辣的！能吃辣的同学来～不能吃辣的也可以来试试',
    tags: ['欢迎新朋友'],
    createdMinutesAgo: 25
  },
  {
    id: 'g6',
    mode: 'offline',
    initiator: {
      name: '夜猫子小王',
      avatar: '🦉',
      university: '北京航空航天大学',
      major: '航空工程',
      year: '研一',
      gender: 'male'
    },
    participants: [],
    restaurantId: '20',
    restaurantName: '小龙坎火锅',
    targetPeople: 4,
    dealDesc: '4人拼满200减45',
    savingsPerPerson: 11,
    pickupLocation: '中关村东路66号',
    pickupTime: '21:00',
    message: '赶完论文犒劳自己！深夜火锅局，来的都是卷王，边吃边聊学术（不是）',
    tags: ['深夜局', '欢迎新朋友'],
    createdMinutesAgo: 35
  },
  {
    id: 'g7',
    mode: 'offline',
    initiator: {
      name: '转学新生',
      avatar: '😊',
      university: '清华大学',
      major: '电子工程',
      year: '大二',
      gender: 'female'
    },
    participants: [],
    restaurantId: '3',
    restaurantName: '一兰拉面',
    targetPeople: 2,
    dealDesc: '2人学生套餐减8元',
    savingsPerPerson: 4,
    pickupLocation: '五道口地铁站B口',
    pickupTime: '12:30',
    message: '刚转来清华，还不太认识人 有没有同学愿意一起吃个饭认识一下呀',
    tags: ['找饭搭子', '欢迎新朋友'],
    createdMinutesAgo: 40
  },
  {
    id: 'g8',
    mode: 'offline',
    initiator: {
      name: '摄影爱好者',
      avatar: '📷',
      university: '清华大学',
      major: '美术学院',
      year: '大三',
      gender: 'male'
    },
    participants: [],
    restaurantId: '12',
    restaurantName: '觅唐·茶餐厅',
    targetPeople: 2,
    dealDesc: '下午茶套餐减10元',
    savingsPerPerson: 5,
    pickupLocation: '五道口东街9号',
    pickupTime: '15:30',
    message: '觅唐的港风装修超出片，想去拍照顺便喝个下午茶，有没有同好一起？',
    tags: ['拍照打卡', '找饭搭子'],
    createdMinutesAgo: 48
  },

  // ===== 线上拼单 =====
  {
    id: 'g9',
    mode: 'online',
    initiator: {
      name: '奶茶女孩',
      avatar: '👱‍♀️',
      university: '清华大学',
      major: '建筑学',
      year: '大二',
      gender: 'female'
    },
    participants: [],
    restaurantId: '5',
    restaurantName: '喜茶',
    targetPeople: 2,
    dealDesc: '第二杯半价',
    savingsPerPerson: 7,
    deliveryAddress: '清华紫荆公寓',
    deliveryTime: '15:00前送达',
    message: '一个人喝不了两杯，找个人一起拼第二杯半价～外卖送到紫荆',
    tags: ['奶茶拼单', '凑满减'],
    createdMinutesAgo: 5
  },
  {
    id: 'g10',
    mode: 'online',
    initiator: {
      name: '宿舍干饭人',
      avatar: '🍚',
      university: '北京大学',
      major: '数学系',
      year: '大二',
      gender: 'male'
    },
    participants: [
      { name: '室友小刘', avatar: '🧑', university: '北京大学', major: '数学系', year: '大二', gender: 'male' }
    ],
    restaurantId: '1',
    restaurantName: '老王麻辣烫',
    targetPeople: 3,
    dealDesc: '满50减15+免配送费',
    savingsPerPerson: 7,
    deliveryAddress: '北大39号宿舍楼',
    deliveryTime: '12:00前送达',
    message: '宿舍点外卖，差一个人凑满减！送到39楼下自取',
    tags: ['凑满减', '宿舍外卖'],
    createdMinutesAgo: 10
  },
  {
    id: 'g11',
    mode: 'online',
    initiator: {
      name: '肥宅快乐',
      avatar: '🎮',
      university: '北京航空航天大学',
      major: '软件工程',
      year: '大三',
      gender: 'male'
    },
    participants: [],
    restaurantId: '11',
    restaurantName: '师大炸鸡',
    targetPeople: 2,
    dealDesc: '满40减12',
    savingsPerPerson: 6,
    deliveryAddress: '北航学院路校区3号楼',
    deliveryTime: '20:00前送达',
    message: '晚上打游戏想点炸鸡外卖，一个人凑不了满减，来拼一下',
    tags: ['凑满减', '深夜外卖'],
    createdMinutesAgo: 18
  },
  {
    id: 'g12',
    mode: 'online',
    initiator: {
      name: '减肥中的胖虎',
      avatar: '🐯',
      university: '中国人民大学',
      major: '社会学',
      year: '大四',
      gender: 'male'
    },
    participants: [],
    restaurantId: '6',
    restaurantName: '人大食堂风味馆',
    targetPeople: 2,
    dealDesc: '满35减10+拼单免配送',
    savingsPerPerson: 7,
    deliveryAddress: '人大知行宿舍楼',
    deliveryTime: '12:30前送达',
    message: '一个人外卖配送费6块太亏了，拼一下平摊配送费+凑满减',
    tags: ['拼配送费', '凑满减'],
    createdMinutesAgo: 22
  },
  {
    id: 'g13',
    mode: 'online',
    initiator: {
      name: '咖啡续命',
      avatar: '☕',
      university: '清华大学',
      major: '计算机系',
      year: '研二',
      gender: 'female'
    },
    participants: [
      { name: '同门师弟', avatar: '🧑', university: '清华大学', major: '计算机系', year: '研一', gender: 'male' }
    ],
    restaurantId: '19',
    restaurantName: '瑞幸咖啡',
    targetPeople: 3,
    dealDesc: '3杯以上每杯减5元',
    savingsPerPerson: 5,
    deliveryAddress: '清华FIT楼',
    deliveryTime: '14:00前送达',
    message: '下午实验室续命，拼个瑞幸外卖，送到FIT楼下',
    tags: ['奶茶拼单', '凑满减'],
    createdMinutesAgo: 30
  },
  {
    id: 'g14',
    mode: 'online',
    initiator: {
      name: '期末突击选手',
      avatar: '📚',
      university: '北京师范大学',
      major: '历史学',
      year: '大三',
      gender: 'female'
    },
    participants: [],
    restaurantId: '9',
    restaurantName: '沙县小吃',
    targetPeople: 2,
    dealDesc: '满30减8+免配送',
    savingsPerPerson: 5,
    deliveryAddress: '北师大学生公寓8号楼',
    deliveryTime: '18:30前送达',
    message: '在图书馆复习不想出去，拼个外卖送到宿舍，省点配送费',
    tags: ['拼配送费', '宿舍外卖'],
    createdMinutesAgo: 38
  }
]

// 按大学 + 模式筛选拼单
export function getGroupOrders(opts?: { university?: string; mode?: GroupOrderMode; tag?: string }): GroupOrderPost[] {
  let posts = [...groupOrderPosts]
  if (opts?.university && opts.university !== 'all') {
    posts = posts.filter(p => p.initiator.university === opts.university)
  }
  if (opts?.mode) {
    posts = posts.filter(p => p.mode === opts.mode)
  }
  if (opts?.tag) {
    const tag = opts.tag
    posts = posts.filter(p => p.tags.includes(tag))
  }
  return posts.sort((a, b) => a.createdMinutesAgo - b.createdMinutesAgo)
}
