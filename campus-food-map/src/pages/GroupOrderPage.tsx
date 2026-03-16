import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { University } from '../types'
import { restaurants } from '../data/restaurants'
import { getGroupOrders, GroupOrderPost, GroupOrderMode, GroupOrderUser, onlineTags, offlineTags } from '../data/groupOrders'
import { getDefaultInitiator, getFriends, addFriend, isFriend } from '../services/profile'
import { addGroupOrderHistory } from '../services/history'

interface Props {
  university: University | 'all'
}

export default function GroupOrderPage({ university }: Props) {
  const navigate = useNavigate()
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<GroupOrderMode>('offline')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [userPosts, setUserPosts] = useState<GroupOrderPost[]>([])
  const [addedFriendIds, setAddedFriendIds] = useState<Set<string>>(() => {
    // 初始化时标记已有好友
    const ids = new Set<string>()
    getFriends().forEach(f => ids.add(f.id))
    return ids
  })
  const [invitedFriendIds, setInvitedFriendIds] = useState<Set<string>>(new Set())

  // 发起拼单表单状态
  const [createMode, setCreateMode] = useState<GroupOrderMode>('offline')
  const [createRestaurantId, setCreateRestaurantId] = useState('')
  const [createPeople, setCreatePeople] = useState(2)
  const [createTime, setCreateTime] = useState('')
  const [createMessage, setCreateMessage] = useState('')
  const [createAddress, setCreateAddress] = useState('')
  const [createLocation, setCreateLocation] = useState('')
  const [createTags, setCreateTags] = useState<Set<string>>(new Set())
  const [showPublishToast, setShowPublishToast] = useState(false)

  const availableRestaurants = useMemo(() => {
    if (university === 'all') return restaurants
    return restaurants.filter(r => r.university === university)
  }, [university])

  const allPosts = useMemo(() => {
    const dataPosts = getGroupOrders({
      university: university === 'all' ? undefined : university,
      mode,
      tag: activeTag || undefined
    })
    // 用户发布的帖子也要筛选
    let myPosts = userPosts.filter(p => p.mode === mode)
    if (university !== 'all') {
      myPosts = myPosts.filter(p => p.initiator.university === university)
    }
    if (activeTag) {
      myPosts = myPosts.filter(p => p.tags.includes(activeTag))
    }
    return [...myPosts, ...dataPosts]
  }, [university, mode, activeTag, userPosts])

  const currentTags = mode === 'online' ? onlineTags : offlineTags

  const handleJoin = (post: GroupOrderPost) => {
    if (joinedIds.has(post.id)) return
    setJoinedIds(prev => new Set(prev).add(post.id))
  }

  const currentPeople = (post: GroupOrderPost) => {
    const base = 1 + post.participants.length
    return joinedIds.has(post.id) ? base + 1 : base
  }

  const isFull = (post: GroupOrderPost) => {
    return currentPeople(post) >= post.targetPeople
  }

  const handleTagToggle = (tag: string) => {
    if (activeTag === tag) {
      setActiveTag(null)
    } else {
      setActiveTag(tag)
    }
  }

  const handleCreateTagToggle = (tag: string) => {
    setCreateTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
      return next
    })
  }

  const resetCreateForm = () => {
    setCreateRestaurantId('')
    setCreatePeople(2)
    setCreateTime('')
    setCreateMessage('')
    setCreateAddress('')
    setCreateLocation('')
    setCreateTags(new Set())
    setInvitedFriendIds(new Set())
  }

  const handlePublish = () => {
    if (!createRestaurantId || !createMessage) return

    const selectedR = restaurants.find(r => r.id === createRestaurantId)
    if (!selectedR) return

    const initiator = getDefaultInitiator(university)

    // 被邀请的好友作为初始 participants
    const allFriends = getFriends()
    const invitedParticipants: GroupOrderUser[] = allFriends
      .filter(f => invitedFriendIds.has(f.id))
      .map(f => ({
        name: f.name,
        avatar: f.avatar,
        university: f.university,
        major: f.major,
        year: f.year,
        gender: f.gender,
      }))

    const newPost: GroupOrderPost = {
      id: `user-${Date.now()}`,
      mode: createMode,
      initiator,
      participants: invitedParticipants,
      restaurantId: selectedR.id,
      restaurantName: selectedR.name,
      targetPeople: createPeople,
      dealDesc: selectedR.studentDiscount || `满${createPeople * 20}减${createPeople * 3}`,
      savingsPerPerson: Math.floor(Math.random() * 8) + 3,
      message: createMessage,
      tags: Array.from(createTags),
      createdMinutesAgo: 0,
      ...(createMode === 'offline' ? {
        pickupLocation: createLocation || `${selectedR.name}门口`,
        pickupTime: createTime || '12:00'
      } : {
        deliveryAddress: createAddress || '宿舍楼下',
        deliveryTime: createTime ? `${createTime}前送达` : '12:00前送达'
      })
    }

    setUserPosts(prev => [newPost, ...prev])
    setJoinedIds(prev => new Set(prev).add(newPost.id)) // 自己自动加入
    setMode(createMode) // 切到发布的模式
    setActiveTag(null)
    setShowCreate(false)
    resetCreateForm()

    // 保存拼单历史
    addGroupOrderHistory({
      id: newPost.id,
      mode: newPost.mode,
      restaurantName: newPost.restaurantName,
      restaurantId: newPost.restaurantId,
      targetPeople: newPost.targetPeople,
      message: newPost.message,
      tags: newPost.tags,
      timestamp: Date.now(),
    })

    setShowPublishToast(true)
    setTimeout(() => setShowPublishToast(false), 2000)
  }

  const openCreate = () => {
    setCreateMode(mode) // 默认选中当前模式
    setShowCreate(true)
  }

  const isMyPost = (post: GroupOrderPost) => post.id.startsWith('user-')

  const handleAddFriend = (user: GroupOrderUser) => {
    const friend = addFriend(user)
    setAddedFriendIds(prev => new Set(prev).add(friend.id))
  }

  const isAlreadyFriend = (user: GroupOrderUser) => {
    return addedFriendIds.has(`${user.name}-${user.university}-${user.major}`) || isFriend(user)
  }

  const handleInviteToggle = (friendId: string) => {
    setInvitedFriendIds(prev => {
      const next = new Set(prev)
      if (next.has(friendId)) {
        next.delete(friendId)
      } else {
        next.add(friendId)
      }
      return next
    })
  }

  return (
    <div className="page group-order-page">
      <div className="group-order-hero">
        <h1 className="group-order-title">拼单广场</h1>
        <p className="group-order-subtitle">一起拼单省更多，顺便认识新朋友</p>
      </div>

      {/* 线上/线下模式切换 */}
      <div className="group-mode-tabs">
        <button
          className={`group-mode-tab ${mode === 'offline' ? 'active' : ''}`}
          onClick={() => { setMode('offline'); setActiveTag(null) }}
        >
          <span className="group-mode-icon">🍽️</span>
          <div className="group-mode-text">
            <span className="group-mode-label">线下拼单</span>
            <span className="group-mode-desc">约着一起吃，认识新朋友</span>
          </div>
        </button>
        <button
          className={`group-mode-tab ${mode === 'online' ? 'active' : ''}`}
          onClick={() => { setMode('online'); setActiveTag(null) }}
        >
          <span className="group-mode-icon">📦</span>
          <div className="group-mode-text">
            <span className="group-mode-label">线上拼单</span>
            <span className="group-mode-desc">凑满减拼配送，宿舍省钱</span>
          </div>
        </button>
      </div>

      {/* 快捷标签筛选 */}
      <div className="group-order-tags-bar">
        <span
          className={`group-tag-filter ${!activeTag ? 'active' : ''}`}
          onClick={() => setActiveTag(null)}
        >
          全部
        </span>
        {currentTags.map(tag => (
          <span
            key={tag}
            className={`group-tag-filter ${activeTag === tag ? 'active' : ''}`}
            onClick={() => handleTagToggle(tag)}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* 拼单列表 */}
      <div className="group-order-list">
        {allPosts.length === 0 && (
          <div className="group-order-empty">
            <span className="group-order-empty-icon">{mode === 'offline' ? '🍽️' : '📦'}</span>
            <p>暂无{mode === 'offline' ? '线下' : '线上'}拼单</p>
            <p className="group-order-empty-hint">成为第一个发起拼单的人吧！</p>
          </div>
        )}
        {allPosts.map((post) => (
          <div key={post.id} className={`group-order-card ${isFull(post) ? 'full' : ''}`}>
            {/* 模式标记 */}
            <span className={`group-order-mode-badge ${post.mode}`}>
              {post.mode === 'offline' ? '线下' : '线上'}
            </span>

            {/* 发起人信息 */}
            <div className="group-order-header">
              <div className="group-order-user">
                <span className="group-order-avatar">{post.initiator.avatar}</span>
                <div className="group-order-user-info">
                  <span className="group-order-name">{post.initiator.name}</span>
                  <span className="group-order-meta">
                    {post.initiator.university.replace('北京', '').replace('大学', '')} · {post.initiator.major} · {post.initiator.year}
                  </span>
                </div>
              </div>
              <div className="group-order-header-right">
                {!isMyPost(post) && (
                  <button
                    className={`group-order-add-friend ${isAlreadyFriend(post.initiator) ? 'added' : ''}`}
                    onClick={() => handleAddFriend(post.initiator)}
                    disabled={isAlreadyFriend(post.initiator)}
                  >
                    {isAlreadyFriend(post.initiator) ? '已添加' : '+ 好友'}
                  </button>
                )}
                <span className="group-order-time">
                  {post.createdMinutesAgo === 0 ? '刚刚' : `${post.createdMinutesAgo}分钟前`}
                </span>
              </div>
            </div>

            {/* 留言 */}
            <p className="group-order-message">{post.message}</p>

            {/* 标签 */}
            <div className="group-order-tags">
              {post.tags.map(tag => (
                <span key={tag} className="group-order-tag">{tag}</span>
              ))}
            </div>

            {/* 餐厅 + 优惠信息 */}
            <div
              className="group-order-restaurant"
              onClick={() => navigate(`/restaurant/${post.restaurantId}`)}
            >
              <div className="group-order-restaurant-info">
                <span className="group-order-restaurant-name">📍 {post.restaurantName}</span>
                <span className="group-order-restaurant-deal">{post.dealDesc} · 每人省¥{post.savingsPerPerson}</span>
              </div>
              {/* 线下显示碰面时间地点，线上显示配送地址 */}
              <span className="group-order-restaurant-time">
                {post.mode === 'offline' ? (
                  <>{post.pickupTime} · {post.pickupLocation}</>
                ) : (
                  <>🚚 {post.deliveryTime} · 送至{post.deliveryAddress}</>
                )}
              </span>
            </div>

            {/* 参与人 + 加入按钮 */}
            <div className="group-order-bottom">
              <div className="group-order-people">
                <div className="group-order-people-avatars">
                  <span className="group-order-people-avatar">{post.initiator.avatar}</span>
                  {post.participants.map((p, i) => (
                    <span key={i} className="group-order-people-avatar">{p.avatar}</span>
                  ))}
                  {joinedIds.has(post.id) && !isMyPost(post) && (
                    <span className="group-order-people-avatar me">我</span>
                  )}
                  {Array.from({ length: Math.max(0, post.targetPeople - currentPeople(post)) }).map((_, i) => (
                    <span key={`empty-${i}`} className="group-order-people-avatar empty">?</span>
                  ))}
                </div>
                <span className="group-order-people-count">
                  {currentPeople(post)}/{post.targetPeople}人
                  {isFull(post) && ' · 已满'}
                </span>
              </div>
              {isMyPost(post) ? (
                <span className="group-order-my-post">我发起的</span>
              ) : (
                <button
                  className={`group-order-join ${joinedIds.has(post.id) ? 'joined' : ''} ${isFull(post) && !joinedIds.has(post.id) ? 'disabled' : ''}`}
                  onClick={() => handleJoin(post)}
                  disabled={isFull(post) && !joinedIds.has(post.id)}
                >
                  {joinedIds.has(post.id) ? '已加入 ✓' : isFull(post) ? '已满员' : '加入拼单'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 发起拼单按钮 */}
      <div className="group-order-fab" onClick={openCreate}>
        <span>+</span>
        <span>发起拼单</span>
      </div>

      {/* 发起拼单弹窗 - 完整表单 */}
      {showCreate && (
        <div className="group-order-create-overlay" onClick={() => setShowCreate(false)}>
          <div className="group-order-create-modal" onClick={e => e.stopPropagation()}>
            <div className="group-order-create-top">
              <h3>发起拼单</h3>
              <span className="group-order-create-close" onClick={() => setShowCreate(false)}>✕</span>
            </div>
            <p className="group-order-create-hint">同校同学会优先看到你的拼单</p>

            <div className="group-order-create-fields">
              {/* 模式选择 */}
              <div className="group-order-create-field">
                <label>拼单类型</label>
                <div className="group-order-create-mode-select">
                  <button
                    className={`create-mode-btn ${createMode === 'offline' ? 'active' : ''}`}
                    onClick={() => { setCreateMode('offline'); setCreateTags(new Set()) }}
                  >
                    🍽️ 线下拼单
                    <span>约着一起去吃</span>
                  </button>
                  <button
                    className={`create-mode-btn ${createMode === 'online' ? 'active' : ''}`}
                    onClick={() => { setCreateMode('online'); setCreateTags(new Set()) }}
                  >
                    📦 线上拼单
                    <span>凑满减拼外卖</span>
                  </button>
                </div>
              </div>

              {/* 选择餐厅 */}
              <div className="group-order-create-field">
                <label>选择餐厅</label>
                <select
                  value={createRestaurantId}
                  onChange={e => setCreateRestaurantId(e.target.value)}
                >
                  <option value="">选择你想去的餐厅...</option>
                  {availableRestaurants.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} · ¥{r.avgPrice}/人
                    </option>
                  ))}
                </select>
              </div>

              {/* 拼单人数 */}
              <div className="group-order-create-field">
                <label>拼单人数（含自己）</label>
                <select value={createPeople} onChange={e => setCreatePeople(Number(e.target.value))}>
                  <option value={2}>2人</option>
                  <option value={3}>3人</option>
                  <option value={4}>4人</option>
                  <option value={5}>5人</option>
                  <option value={6}>6人</option>
                </select>
              </div>

              {/* 时间 */}
              <div className="group-order-create-field">
                <label>{createMode === 'offline' ? '碰面时间' : '期望送达时间'}</label>
                <input
                  type="text"
                  placeholder={createMode === 'offline' ? '如：今天18:00' : '如：12:30前'}
                  value={createTime}
                  onChange={e => setCreateTime(e.target.value)}
                />
              </div>

              {/* 地点/地址 */}
              <div className="group-order-create-field">
                <label>{createMode === 'offline' ? '碰面地点' : '配送地址'}</label>
                <input
                  type="text"
                  placeholder={createMode === 'offline' ? '如：海底捞门口集合' : '如：北大39号宿舍楼'}
                  value={createMode === 'offline' ? createLocation : createAddress}
                  onChange={e => createMode === 'offline'
                    ? setCreateLocation(e.target.value)
                    : setCreateAddress(e.target.value)
                  }
                />
              </div>

              {/* 标签选择 */}
              <div className="group-order-create-field">
                <label>选择标签（可多选）</label>
                <div className="group-order-create-tag-list">
                  {(createMode === 'online' ? onlineTags : offlineTags).map(tag => (
                    <span
                      key={tag}
                      className={`group-order-create-tag ${createTags.has(tag) ? 'selected' : ''}`}
                      onClick={() => handleCreateTagToggle(tag)}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 留言 */}
              <div className="group-order-create-field">
                <label>说点什么吧</label>
                <textarea
                  placeholder={createMode === 'offline'
                    ? '如：一个人吃饭太无聊了，有没有同学一起？'
                    : '如：宿舍点外卖凑满减，差一个人！'
                  }
                  value={createMessage}
                  onChange={e => setCreateMessage(e.target.value)}
                  rows={2}
                />
              </div>

              {/* 邀请好友 */}
              {getFriends().length > 0 && (
                <div className="group-order-create-field">
                  <label>邀请好友一起</label>
                  <div className="invite-friend-chips">
                    {getFriends().map(f => (
                      <span
                        key={f.id}
                        className={`invite-friend-chip ${invitedFriendIds.has(f.id) ? 'selected' : ''}`}
                        onClick={() => handleInviteToggle(f.id)}
                      >
                        <span className="invite-friend-chip-avatar">{f.avatar}</span>
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              className={`group-order-create-btn ${!createRestaurantId || !createMessage ? 'btn-disabled' : ''}`}
              onClick={handlePublish}
              disabled={!createRestaurantId || !createMessage}
            >
              发布拼单
            </button>
          </div>
        </div>
      )}

      {/* 发布成功提示 */}
      {showPublishToast && (
        <div className="toast">拼单发布成功！同校同学已收到通知</div>
      )}
    </div>
  )
}
