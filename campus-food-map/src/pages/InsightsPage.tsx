import { useNavigate } from 'react-router-dom'
import { getUserInsights } from '../services/userAgents'
import { useState, useEffect } from 'react'
import { getProfile, saveProfile } from '../services/profile'

export default function InsightsPage() {
  const navigate = useNavigate()
  const [aiSummary, setAiSummary] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  // 编辑状态
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  const insights = getUserInsights()

  // 用AI理解用户的自然语言描述，转换为标签
  const parseUserInput = async (field: string, userInput: string) => {
    setIsSaving(true)
    try {
      const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
      if (!apiKey) {
        alert('未配置API Key')
        setIsSaving(false)
        return
      }

      let prompt = ''
      if (field === 'spiceLevel') {
        prompt = `用户对自己的辣度偏好描述是："${userInput}"。请判断用户属于以下哪一类，只返回一个词：
- light（不吃辣、清淡、养生）
- mild（微辣、适度、偶尔吃辣）
- medium（中辣、比较能吃辣）
- heavy（无辣不欢、重口味、嗜辣）

只返回一个英文单词：light/mild/medium/heavy`
      } else if (field === 'priceSensitivity') {
        prompt = `用户对自己的消费习惯描述是："${userInput}"。请判断用户的价格敏感度属于以下哪一类，只返回一个词：
- high（省钱、穷学生、精打细算、性价比）
- medium（正常、适中、偶尔奢侈）
- low（不在乎价格、追求品质、舍得花钱）

只返回一个英文单词：high/medium/low`
      } else if (field === 'socialType') {
        prompt = `用户对自己的社交属性描述是："${userInput}"。请判断用户属于以下哪一类，只返回一个词：
- introvert（社恐、独来独往、喜欢一个人、不爱社交）
- balanced（适中、看情况、有时一个人有时和朋友）
- extrovert（社牛、爱社交、喜欢热闹、经常约饭）

只返回一个英文单词：introvert/balanced/extrovert`
      }

      const response = await fetch('/api/deepseek/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      })

      if (!response.ok) throw new Error('API调用失败')

      const data = await response.json()
      const result = data.choices[0]?.message?.content?.trim().toLowerCase() || ''

      // 保存结果
      handleCorrectPreference(field, result)
    } catch (error) {
      console.error('AI解析失败:', error)
      alert('保存失败，请稍后重试')
    } finally {
      setIsSaving(false)
    }
  }

  // 保存用户修正后的偏好到 profile
  const handleCorrectPreference = (field: string, value: string) => {
    const profile = getProfile()
    if (!profile) return

    const updatedTags = new Set(profile.diningTags || [])

    // 根据字段更新标签
    if (field === 'spiceLevel') {
      // 移除旧的辣度标签
      updatedTags.forEach(tag => {
        if (['不吃辣星人', '微辣选手', '无辣不欢', '变态辣挑战者'].includes(tag)) {
          updatedTags.delete(tag)
        }
      })
      // 添加新标签
      const spiceMap: Record<string, string> = {
        'light': '不吃辣星人',
        'mild': '微辣选手',
        'medium': '微辣选手',
        'heavy': '无辣不欢'
      }
      if (spiceMap[value]) updatedTags.add(spiceMap[value])
    }

    if (field === 'priceSensitivity') {
      // 移除旧的预算标签
      updatedTags.forEach(tag => {
        if (['穷鬼套餐专业户', '性价比之王', '偶尔奢侈', '顿顿不亏嘴'].includes(tag)) {
          updatedTags.delete(tag)
        }
      })
      // 添加新标签
      const priceMap: Record<string, string> = {
        'high': '穷鬼套餐专业户',
        'medium': '性价比之王',
        'low': '偶尔奢侈'
      }
      if (priceMap[value]) updatedTags.add(priceMap[value])
    }

    if (field === 'socialType') {
      // 移除旧的社交标签
      updatedTags.forEach(tag => {
        if (['一人食达人', '社交型干饭'].includes(tag)) {
          updatedTags.delete(tag)
        }
      })
      // 添加新标签
      const socialMap: Record<string, string> = {
        'introvert': '一人食达人',
        'extrovert': '社交型干饭'
      }
      if (socialMap[value]) updatedTags.add(socialMap[value])
    }

    saveProfile({ ...profile, diningTags: Array.from(updatedTags) })
    setEditingField(null)
    // 刷新页面数据（简单方式：重新加载）
    window.location.reload()
  }

  // P2: AI生成个性化文案
  const generateAISummary = async () => {
    setIsGenerating(true)
    try {
      const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
      if (!apiKey) {
        setAiSummary('未配置API Key，无法生成AI总结')
        setIsGenerating(false)
        return
      }

      const prompt = `根据以下用户画像，生成一段有趣的、拟人化的总结文案（50-80字），要有网感、接地气，像朋友聊天一样：

口味：${insights.taste.summary}（偏好${insights.taste.topCategories.join('、')}，${insights.taste.spiceLevel}）
消费：${insights.budget.priceRange}，日均¥${insights.budget.avgPrice}
社交：${insights.social.summary}
行为：${insights.browsing.lastVisitPattern}

要求：
1. 用"你"称呼，不要用"该用户"
2. 可以用网络梗、emoji
3. 突出最有特色的1-2个点
4. 结尾可以加一句鼓励或调侃

示例风格："你是传说中的'深夜食堂常客'，凌晨1点还在为烧烤奋斗的硬核干饭人 🔥 火锅烧烤是你的快乐源泉，¥25吃遍全校是你的终极目标。继续保持，干饭人永不认输！"`

      const response = await fetch('/api/deepseek/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
        }),
      })

      if (!response.ok) throw new Error('API调用失败')

      const data = await response.json()
      const summary = data.choices[0]?.message?.content || '生成失败'
      setAiSummary(summary)
    } catch (error) {
      console.error('AI生成失败:', error)
      setAiSummary('生成失败，请稍后重试')
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    // 页面加载时自动生成AI总结
    if (insights.taste.topCategories[0] !== '暂无偏好') {
      generateAISummary()
    }
  }, [])

  // 如果没有数据，显示空状态
  if (insights.taste.topCategories[0] === '暂无偏好' && insights.budget.avgPrice === 0) {
    return (
      <div className="insights-page">
        <div className="insights-header">
          <button className="insights-back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h1 className="insights-title">我的口味DNA</h1>
        </div>

        <div className="insights-empty-state">
          <div className="insights-empty-icon">🍽️</div>
          <h2 className="insights-empty-title">还没有足够的数据哦</h2>
          <p className="insights-empty-hint">多逛逛餐厅、用用随机吃、拼拼单<br/>团子就能分析出你的口味基因啦</p>
          <button className="insights-empty-btn" onClick={() => navigate('/')}>
            去首页逛逛
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="insights-page">
      {/* 顶部导航 */}
      <div className="insights-header">
        <button className="insights-back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h1 className="insights-title">我的口味DNA</h1>
      </div>

      <div className="insights-scroll-content">
        {/* P2: AI生成的个性化总结 - Hero区域 */}
        <div className="insights-hero">
          <div className="insights-hero-bg"></div>
          <div className="insights-hero-content">
            <div className="insights-hero-icon">🧬</div>
            <h2 className="insights-hero-label">团子眼中的你</h2>
            {isGenerating ? (
              <div className="insights-hero-loading">
                <div className="loading-dots">
                  <span></span><span></span><span></span>
                </div>
                <p>团子正在分析中...</p>
              </div>
            ) : aiSummary ? (
              <>
                <p className="insights-hero-text">{aiSummary}</p>
                <button className="insights-hero-refresh" onClick={generateAISummary}>
                  🔄 换一个说法
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* 引导补充信息卡片 - 改为"纠正AI判断"模式 */}
        <div className="insights-guide-card">
          <div className="insights-guide-icon">✨</div>
          <h3 className="insights-guide-title">团子已经帮你分析好了</h3>
          <p className="insights-guide-text">
            下面是团子根据你的行为分析出的口味偏好，看看准不准？不对的地方点击修改就行～
          </p>
        </div>

        {/* P1: 口味DNA雷达图 - 已在外层展示，此处移除避免重复 */}

        {/* 口味偏好 */}
        <div className="insights-card">
          <div className="insights-card-header">
            <h3 className="insights-card-title">
              <span className="insights-card-icon">🍜</span>
              口味偏好
            </h3>
          </div>
          <div className="insights-taste-grid">
            {insights.taste.topCategories.slice(0, 3).map((cat, i) => (
              <div key={i} className="insights-taste-item">
                <div className="insights-taste-rank">
                  {i === 0 && '🥇'}
                  {i === 1 && '🥈'}
                  {i === 2 && '🥉'}
                </div>
                <div className="insights-taste-name">{cat}</div>
              </div>
            ))}
          </div>
          <div className="insights-detail-row">
            <span className="insights-detail-label">辣度偏好</span>
            {editingField === 'spiceLevel' ? (
              <div className="insights-edit-container">
                <input
                  type="text"
                  className="insights-edit-input"
                  placeholder="用你自己的话描述，比如：其实我只是偶尔吃辣..."
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  autoFocus
                />
                <div className="insights-edit-actions">
                  <button
                    className="insights-edit-save"
                    onClick={() => parseUserInput('spiceLevel', editingValue)}
                    disabled={isSaving || !editingValue.trim()}
                  >
                    {isSaving ? '保存中...' : '保存'}
                  </button>
                  <button
                    className="insights-edit-cancel"
                    onClick={() => {
                      setEditingField(null)
                      setEditingValue('')
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="insights-detail-value insights-spice-badge">{insights.taste.spiceLevel}</span>
                <button
                  className="insights-correct-btn"
                  onClick={() => {
                    setEditingField('spiceLevel')
                    setEditingValue('')
                  }}
                >
                  纠正
                </button>
              </>
            )}
          </div>
          <div className="insights-summary-box">
            <div className="insights-summary-icon">💭</div>
            <p className="insights-summary-text">{insights.taste.summary}</p>
          </div>
        </div>

        {/* 消费习惯 */}
        <div className="insights-card">
          <div className="insights-card-header">
            <h3 className="insights-card-title">
              <span className="insights-card-icon">💰</span>
              消费习惯
            </h3>
          </div>
          <div className="insights-stats-row">
            <div className="insights-stat-box">
              <div className="insights-stat-value">¥{insights.budget.avgPrice}</div>
              <div className="insights-stat-label">日均消费</div>
            </div>
            <div className="insights-stat-divider"></div>
            <div className="insights-stat-box">
              {editingField === 'priceSensitivity' ? (
                <div className="insights-edit-container">
                  <input
                    type="text"
                    className="insights-edit-input-small"
                    placeholder="比如：我其实挺在意价格的..."
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    autoFocus
                  />
                  <div className="insights-edit-actions-small">
                    <button
                      className="insights-edit-save"
                      onClick={() => parseUserInput('priceSensitivity', editingValue)}
                      disabled={isSaving || !editingValue.trim()}
                    >
                      {isSaving ? '...' : '保存'}
                    </button>
                    <button
                      className="insights-edit-cancel"
                      onClick={() => {
                        setEditingField(null)
                        setEditingValue('')
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="insights-stat-value">{insights.budget.budgetConscious ? '高' : '中'}</div>
                  <button
                    className="insights-correct-btn-small"
                    onClick={() => {
                      setEditingField('priceSensitivity')
                      setEditingValue('')
                    }}
                  >
                    纠正
                  </button>
                </>
              )}
              <div className="insights-stat-label">价格敏感度</div>
            </div>
          </div>
          <div className="insights-detail-row">
            <span className="insights-detail-label">价格区间</span>
            <span className="insights-detail-value">{insights.budget.priceRange}</span>
          </div>
          <div className="insights-summary-box">
            <div className="insights-summary-icon">💭</div>
            <p className="insights-summary-text">
              {insights.budget.budgetConscious
                ? `精打细算的省钱高手，日均¥${insights.budget.avgPrice}就能吃得很满足`
                : `标准的学生消费水平，日均¥${insights.budget.avgPrice}，偶尔也会奢侈一把`}
            </p>
          </div>
        </div>

        {/* 社交属性 */}
        <div className="insights-card">
          <div className="insights-card-header">
            <h3 className="insights-card-title">
              <span className="insights-card-icon">🤝</span>
              社交属性
            </h3>
          </div>
          <div className="insights-stats-row">
            <div className="insights-stat-box">
              <div className="insights-stat-value">{insights.social.groupDiningFreq}</div>
              <div className="insights-stat-label">拼单次数</div>
            </div>
            <div className="insights-stat-divider"></div>
            <div className="insights-stat-box">
              {editingField === 'socialType' ? (
                <div className="insights-edit-container">
                  <input
                    type="text"
                    className="insights-edit-input-small"
                    placeholder="比如：我不是社恐，只是更喜欢和熟人吃..."
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    autoFocus
                  />
                  <div className="insights-edit-actions-small">
                    <button
                      className="insights-edit-save"
                      onClick={() => parseUserInput('socialType', editingValue)}
                      disabled={isSaving || !editingValue.trim()}
                    >
                      {isSaving ? '...' : '保存'}
                    </button>
                    <button
                      className="insights-edit-cancel"
                      onClick={() => {
                        setEditingField(null)
                        setEditingValue('')
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="insights-stat-value">{insights.social.personality}</div>
                  <button
                    className="insights-correct-btn-small"
                    onClick={() => {
                      setEditingField('socialType')
                      setEditingValue('')
                    }}
                  >
                    纠正
                  </button>
                </>
              )}
              <div className="insights-stat-label">社交类型</div>
            </div>
          </div>
          <div className="insights-summary-box">
            <div className="insights-summary-icon">💭</div>
            <p className="insights-summary-text">{insights.social.summary}</p>
          </div>
        </div>

        {/* 探店行为 */}
        <div className="insights-card">
          <div className="insights-card-header">
            <h3 className="insights-card-title">
              <span className="insights-card-icon">🔍</span>
              探店行为
            </h3>
          </div>
          <div className="insights-detail-row">
            <span className="insights-detail-label">探索类型</span>
            <span className="insights-detail-value insights-explore-badge">{insights.browsing.explorationLevel}</span>
          </div>
          <div className="insights-detail-row">
            <span className="insights-detail-label">最近常去</span>
            <span className="insights-detail-value insights-detail-multi">
              {insights.browsing.recentFavorites.slice(0, 3).join(' · ')}
            </span>
          </div>
          <div className="insights-summary-box">
            <div className="insights-summary-icon">💭</div>
            <p className="insights-summary-text">{insights.browsing.lastVisitPattern}</p>
          </div>
        </div>

        {/* 底部说明 */}
        <div className="insights-footer">
          <div className="insights-footer-icon">🤖</div>
          <p className="insights-footer-text">团子就是根据这些数据为你推荐的哦</p>
          <p className="insights-footer-hint">数据会随着你的使用自动更新</p>
        </div>
      </div>
    </div>
  )
}
