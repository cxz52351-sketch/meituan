import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { University, UserProfile } from '../types'
import { getProfile, saveProfile, getFriends, removeFriend } from '../services/profile'
import { universities } from '../data/restaurants'

interface Props {
  university: University | 'all'
}

const avatarOptions = ['😎', '😊', '🤓', '😋', '🥳', '🤗', '😺', '🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐸', '🦁', '🐯', '🐷', '🐮', '🐵', '🦄', '👦', '👧', '🧑', '👩', '🧔', '👱‍♀️', '🧑‍💻', '📷', '🎮', '⚽', '🎵', '🌟']

const yearOptions = ['大一', '大二', '大三', '大四', '研一', '研二', '研三']

export default function ProfilePage({ university }: Props) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isSetup, setIsSetup] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [friends, setFriends] = useState(getFriends())

  // 表单状态
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('😎')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('大三')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [selectedUni, setSelectedUni] = useState<University>(university === 'all' ? '北京大学' : university)

  useEffect(() => {
    const saved = getProfile()
    if (saved) {
      setProfile(saved)
      // 预填编辑表单
      setNickname(saved.nickname)
      setAvatar(saved.avatar)
      setMajor(saved.major)
      setYear(saved.year)
      setGender(saved.gender)
      setSelectedUni(saved.university)
    } else {
      setIsSetup(true)
    }
  }, [])

  useEffect(() => {
    setFriends(getFriends())
  }, [])

  const handleSave = () => {
    if (!nickname.trim()) return
    const p: UserProfile = {
      id: `user-${Date.now()}`,
      nickname: nickname.trim(),
      avatar,
      university: selectedUni,
      major: major.trim() || '未填写',
      year,
      gender,
    }
    // 编辑时保留原 id
    if (profile) p.id = profile.id
    saveProfile(p)
    setProfile(p)
    setIsSetup(false)
    setIsEditing(false)
  }

  const handleRemoveFriend = (id: string) => {
    removeFriend(id)
    setFriends(getFriends())
  }

  const handleEdit = () => {
    if (profile) {
      setNickname(profile.nickname)
      setAvatar(profile.avatar)
      setMajor(profile.major)
      setYear(profile.year)
      setGender(profile.gender)
      setSelectedUni(profile.university)
    }
    setIsEditing(true)
  }

  // 设置/编辑卡片
  if (isSetup || isEditing) {
    return (
      <div className="page profile-page">
        <div className="profile-setup-card">
          <h2 className="profile-setup-title">{isEditing ? '编辑资料' : '设置个人信息'}</h2>
          <p className="profile-setup-subtitle">{isEditing ? '修改你的个人信息' : '让同学们认识你，拼单更方便'}</p>

          {/* 头像选择 */}
          <div className="profile-field">
            <label className="profile-label">选择头像</label>
            <div className="profile-avatar-grid">
              {avatarOptions.map(e => (
                <span
                  key={e}
                  className={`profile-avatar-option ${avatar === e ? 'selected' : ''}`}
                  onClick={() => setAvatar(e)}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>

          {/* 昵称 */}
          <div className="profile-field">
            <label className="profile-label">昵称</label>
            <input
              type="text"
              className="profile-input"
              placeholder="给自己起个名字吧"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={12}
            />
          </div>

          {/* 学校 */}
          <div className="profile-field">
            <label className="profile-label">学校</label>
            <select
              className="profile-select"
              value={selectedUni}
              onChange={e => setSelectedUni(e.target.value as University)}
            >
              {universities.map(uni => (
                <option key={uni.id} value={uni.name}>{uni.name}</option>
              ))}
            </select>
          </div>

          {/* 专业 */}
          <div className="profile-field">
            <label className="profile-label">专业</label>
            <input
              type="text"
              className="profile-input"
              placeholder="如：计算机科学"
              value={major}
              onChange={e => setMajor(e.target.value)}
              maxLength={20}
            />
          </div>

          {/* 年级 */}
          <div className="profile-field">
            <label className="profile-label">年级</label>
            <div className="profile-year-options">
              {yearOptions.map(y => (
                <span
                  key={y}
                  className={`profile-year-option ${year === y ? 'selected' : ''}`}
                  onClick={() => setYear(y)}
                >
                  {y}
                </span>
              ))}
            </div>
          </div>

          {/* 性别 */}
          <div className="profile-field">
            <label className="profile-label">性别</label>
            <div className="profile-gender-options">
              <span
                className={`profile-gender-option ${gender === 'male' ? 'selected' : ''}`}
                onClick={() => setGender('male')}
              >
                男
              </span>
              <span
                className={`profile-gender-option ${gender === 'female' ? 'selected' : ''}`}
                onClick={() => setGender('female')}
              >
                女
              </span>
            </div>
          </div>

          <div className="profile-setup-actions">
            {isEditing && (
              <button className="profile-cancel-btn" onClick={() => setIsEditing(false)}>取消</button>
            )}
            <button
              className={`profile-save-btn ${!nickname.trim() ? 'disabled' : ''}`}
              onClick={handleSave}
              disabled={!nickname.trim()}
            >
              {isEditing ? '保存修改' : '完成设置'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 个人主页展示
  return (
    <div className="page profile-page">
      {/* 用户信息卡 */}
      {profile && (
        <div className="profile-info-card">
          <div className="profile-info-main">
            <span className="profile-info-avatar">{profile.avatar}</span>
            <div className="profile-info-text">
              <span className="profile-info-name">{profile.nickname}</span>
              <span className="profile-info-detail">
                {profile.university} · {profile.major} · {profile.year}
              </span>
            </div>
          </div>
          <button className="profile-edit-btn" onClick={handleEdit}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            编辑
          </button>
        </div>
      )}

      {/* 好友列表 */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3 className="profile-section-title">我的好友</h3>
          <span className="profile-section-count">{friends.length}人</span>
        </div>
        {friends.length === 0 ? (
          <div className="profile-empty">
            <span className="profile-empty-icon">🤝</span>
            <p>还没有好友</p>
            <p className="profile-empty-hint">去拼单广场认识新朋友吧</p>
            <button className="profile-go-btn" onClick={() => navigate('/group')}>去拼单广场</button>
          </div>
        ) : (
          <div className="profile-friend-list">
            {friends.map(f => (
              <div key={f.id} className="profile-friend-item">
                <span className="profile-friend-avatar">{f.avatar}</span>
                <div className="profile-friend-info">
                  <span className="profile-friend-name">{f.name}</span>
                  <span className="profile-friend-detail">
                    {f.university.replace('北京', '').replace('大学', '')} · {f.major} · {f.year}
                  </span>
                </div>
                <button className="profile-friend-remove" onClick={() => handleRemoveFriend(f.id)}>移除</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快捷入口 */}
      <div className="profile-section">
        <h3 className="profile-section-title">更多功能</h3>
        <div className="profile-shortcuts">
          <div className="profile-shortcut-item">
            <span className="profile-shortcut-icon">⭐</span>
            <span className="profile-shortcut-label">收藏的店</span>
            <span className="profile-shortcut-badge">敬请期待</span>
          </div>
          <div className="profile-shortcut-item">
            <span className="profile-shortcut-icon">💬</span>
            <span className="profile-shortcut-label">我的评论</span>
            <span className="profile-shortcut-badge">敬请期待</span>
          </div>
        </div>
      </div>
    </div>
  )
}
