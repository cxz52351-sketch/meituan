import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { University, PriceRange, Category } from '../types'
import { ChatMessage, APIMessage, GuideOption } from '../types/chat'
import { sendMessageStream, getMealPeriod, getGuideRecommendation, getAvailableCategories } from '../services/ai'
import RestaurantListItem from './RestaurantListItem'

interface Props {
  university: University | 'all'
}

// 解析快捷回复标记：[快捷回复:选项1|选项2|选项3]
function parseQuickReplies(content: string): { text: string; quickReplies: string[] } {
  const match = content.match(/\[快捷回复[:：]([^\]]+)\]\s*$/)
  if (!match) return { text: content, quickReplies: [] }
  const text = content.slice(0, match.index).trimEnd()
  const quickReplies = match[1].split('|').map(s => s.trim()).filter(Boolean)
  return { text, quickReplies }
}

// ========== 引导流配置 ==========

type GuideStep = 'scene' | 'budget' | 'taste' | 'result' | 'chat'

interface GuideState {
  step: GuideStep
  scene?: string
  budget?: PriceRange | PriceRange[]
  taste?: Category
  excludeIds?: string[]
}

const sceneOptions: GuideOption[] = [
  { id: 'alone', emoji: '🍚', label: '一个人随便吃', description: '简单快捷填饱肚子' },
  { id: 'friends', emoji: '👫', label: '和朋友一起', description: '适合多人的餐厅' },
  { id: 'date', emoji: '💕', label: '约会', description: '环境好有氛围感' },
  { id: 'party', emoji: '🎉', label: '聚餐请客', description: '大桌聚餐有面子' },
  { id: 'night', emoji: '🌙', label: '深夜觅食', description: '夜猫子也能吃到' },
  { id: 'random', emoji: '🎲', label: '别问了帮我选', description: '直接给我推荐！' },
]

const budgetOptions: GuideOption[] = [
  { id: 'budget', emoji: '💰', label: '越便宜越好', description: '人均20以下' },
  { id: 'affordable', emoji: '👍', label: '正常水平', description: '人均20-40' },
  { id: 'splurge', emoji: '🎉', label: '奢侈一把', description: '人均40+' },
  { id: 'any', emoji: '🤷', label: '无所谓', description: '好吃就行' },
]

const sceneMapping: Record<string, string> = {
  alone: '一个人',
  friends: '和室友',
  date: '约会',
  party: '聚餐',
  night: '深夜',
}

const sceneLabelMapping: Record<string, string> = {
  alone: '🍚 一个人随便吃',
  friends: '👫 和朋友一起',
  date: '💕 约会',
  party: '🎉 聚餐请客',
  night: '🌙 深夜觅食',
  random: '🎲 别问了帮我选',
}

const budgetLabelMapping: Record<string, string> = {
  budget: '💰 越便宜越好',
  affordable: '👍 正常水平',
  splurge: '🎉 奢侈一把',
  any: '🤷 无所谓',
}

function getBudgetFilter(id: string): PriceRange | PriceRange[] | undefined {
  switch (id) {
    case 'budget': return 'budget'
    case 'affordable': return 'affordable'
    case 'splurge': return ['moderate', 'premium']
    default: return undefined
  }
}

let _msgIdCounter = 0
function nextMsgId(): string {
  return `guide-${Date.now()}-${_msgIdCounter++}`
}

export default function ChatAgent({ university }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [guideState, setGuideState] = useState<GuideState>({ step: 'scene' })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const conversationRef = useRef<APIMessage[]>([])
  const initialHandled = useRef(false)
  const location = useLocation()
  const navigate = useNavigate()

  const { greeting } = getMealPeriod()

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 自动聚焦
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  // 初始化引导流第一步消息
  useEffect(() => {
    if (messages.length === 0 && guideState.step === 'scene') {
      const welcomeMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: `${greeting} 不知道吃啥？我来帮你一步步选！\n\n今天什么情况？`,
        timestamp: Date.now(),
        status: 'done',
        guideOptions: sceneOptions,
      }
      setMessages([welcomeMsg])
    }
  }, [])

  // 处理从首页传来的初始消息
  useEffect(() => {
    if (initialHandled.current) return
    const state = location.state as { initialMessage?: string } | null
    if (state?.initialMessage) {
      initialHandled.current = true
      navigate('/ai', { replace: true, state: null })
      // 跳过引导流，直接进入聊天模式
      setGuideState({ step: 'chat' })
      setTimeout(() => handleSend(state.initialMessage!), 100)
    }
  }, [location.state])

  // 处理引导选项点击
  const handleGuideSelect = useCallback((step: GuideStep, optionId: string) => {
    if (step === 'scene') {
      const label = sceneLabelMapping[optionId] || optionId
      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'user',
        content: label,
        timestamp: Date.now(),
      }

      if (optionId === 'random') {
        // 跳过后续步骤，直接出结果
        const result = getGuideRecommendation({ university })
        const resultMsg: ChatMessage = {
          id: nextMsgId(),
          role: 'assistant',
          content: `🎲 好嘞！直接帮你选——\n\n${result.reason}`,
          timestamp: Date.now(),
          status: 'done',
          restaurantResults: result.restaurants,
        }
        const actionMsg: ChatMessage = {
          id: nextMsgId(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          status: 'done',
          guideOptions: [
            { id: 'shuffle', emoji: '🔄', label: '换一批', description: '再随机推荐' },
            { id: 'restart', emoji: '🔙', label: '重新选', description: '回到第一步' },
          ],
        }
        setGuideState({ step: 'result', excludeIds: result.restaurants.map(r => r.id) })
        setMessages(prev => [...prev, userMsg, resultMsg, actionMsg])
        return
      }

      const scene = sceneMapping[optionId]
      const newState: GuideState = { step: 'budget', scene }
      setGuideState(newState)

      const nextMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: '大概花多少？',
        timestamp: Date.now(),
        status: 'done',
        guideOptions: budgetOptions,
      }
      setMessages(prev => [...prev, userMsg, nextMsg])
    } else if (step === 'budget') {
      const label = budgetLabelMapping[optionId] || optionId
      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'user',
        content: label,
        timestamp: Date.now(),
      }

      const budget = getBudgetFilter(optionId)
      const newState: GuideState = { ...guideState, step: 'taste', budget }
      setGuideState(newState)

      // 动态生成可选品类
      const categories = getAvailableCategories({
        scene: guideState.scene,
        priceRange: budget,
        university,
      })
      const tasteOptions: GuideOption[] = categories.map(cat => ({
        id: cat,
        emoji: getCategoryEmoji(cat),
        label: cat,
      }))
      tasteOptions.push({ id: 'any', emoji: '🤷', label: '随便都行', description: '什么都可以' })

      const nextMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: '想吃什么类型？没看到想吃的也可以直接在下方输入框告诉我～',
        timestamp: Date.now(),
        status: 'done',
        guideOptions: tasteOptions,
      }
      setMessages(prev => [...prev, userMsg, nextMsg])
    } else if (step === 'taste') {
      const label = optionId === 'any' ? '🤷 随便都行' : `${getCategoryEmoji(optionId)} ${optionId}`
      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'user',
        content: label,
        timestamp: Date.now(),
      }

      const taste = optionId === 'any' ? undefined : optionId as Category
      const filters = {
        scene: guideState.scene,
        priceRange: guideState.budget,
        category: taste,
        university,
      }
      const result = getGuideRecommendation(filters)

      const resultMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: result.restaurants.length > 0
          ? `🎯 根据你的选择，推荐这${result.restaurants.length === 1 ? '' : '两'}家！\n\n${result.reason}`
          : result.reason,
        timestamp: Date.now(),
        status: 'done',
        restaurantResults: result.restaurants,
      }
      const actionMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'done',
        guideOptions: [
          { id: 'shuffle', emoji: '🔄', label: '换一批', description: '换几家看看' },
          { id: 'restart', emoji: '🔙', label: '重新选', description: '回到第一步' },
        ],
      }
      setGuideState({
        ...guideState,
        step: 'result',
        taste,
        excludeIds: result.restaurants.map(r => r.id),
      })
      setMessages(prev => [...prev, userMsg, resultMsg, actionMsg])
    } else if (step === 'result') {
      if (optionId === 'shuffle') {
        const userMsg: ChatMessage = {
          id: nextMsgId(),
          role: 'user',
          content: '🔄 换一批',
          timestamp: Date.now(),
        }
        const result = getGuideRecommendation({
          scene: guideState.scene,
          priceRange: guideState.budget,
          category: guideState.taste,
          university,
          excludeIds: guideState.excludeIds,
        })
        const resultMsg: ChatMessage = {
          id: nextMsgId(),
          role: 'assistant',
          content: result.restaurants.length > 0
            ? `🔄 再看看这些？\n\n${result.reason}`
            : '已经没有更多符合条件的餐厅了，试试重新选条件？',
          timestamp: Date.now(),
          status: 'done',
          restaurantResults: result.restaurants,
        }
        const actionMsg: ChatMessage = {
          id: nextMsgId(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          status: 'done',
          guideOptions: [
            { id: 'shuffle', emoji: '🔄', label: '换一批', description: '换几家看看' },
            { id: 'restart', emoji: '🔙', label: '重新选', description: '回到第一步' },
          ],
        }
        setGuideState(prev => ({
          ...prev,
          excludeIds: [...(prev.excludeIds || []), ...result.restaurants.map(r => r.id)],
        }))
        setMessages(prev => [...prev, userMsg, resultMsg, actionMsg])
      } else if (optionId === 'restart') {
        const userMsg: ChatMessage = {
          id: nextMsgId(),
          role: 'user',
          content: '🔙 重新选',
          timestamp: Date.now(),
        }
        const newState: GuideState = { step: 'scene' }
        setGuideState(newState)
        const sceneMsg: ChatMessage = {
          id: nextMsgId(),
          role: 'assistant',
          content: '好的，重新来！今天什么情况？',
          timestamp: Date.now(),
          status: 'done',
          guideOptions: sceneOptions,
        }
        setMessages(prev => [...prev, userMsg, sceneMsg])
      }
    }
  }, [guideState, university])

  const handleSend = useCallback(async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || isLoading) return

    // 用户主动打字时，切到自由聊天模式
    if (guideState.step !== 'chat') {
      setGuideState({ step: 'chat' })
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: Date.now()
    }

    const aiMsgId = (Date.now() + 1).toString()
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'streaming'
    }

    setMessages(prev => [...prev, userMsg, aiMsg])
    setInput('')
    setIsLoading(true)

    let finalRestaurants: typeof messages[0]['restaurantResults'] & any[] = []

    try {
      await sendMessageStream(
        conversationRef.current,
        messageText,
        university,
        (delta) => {
          switch (delta.type) {
            case 'content':
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId
                  ? { ...m, content: m.content + delta.text, status: 'streaming' as const, toolInfo: undefined }
                  : m
              ))
              break
            case 'tool_start':
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId
                  ? { ...m, status: 'tool_calling' as const, toolInfo: delta.toolName }
                  : m
              ))
              break
            case 'tool_result':
              finalRestaurants = [...finalRestaurants, ...delta.restaurants]
              break
            case 'done':
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId
                  ? {
                      ...m,
                      content: delta.content,
                      status: 'done' as const,
                      toolInfo: undefined,
                      restaurantResults: finalRestaurants.length > 0 ? finalRestaurants : undefined
                    }
                  : m
              ))
              conversationRef.current = [
                ...conversationRef.current,
                { role: 'user', content: messageText },
                { role: 'assistant', content: delta.content }
              ]
              break
            case 'error':
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId
                  ? { ...m, content: `出错了：${delta.message}`, status: 'done' as const, toolInfo: undefined }
                  : m
              ))
              break
          }
        }
      )
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: err instanceof Error ? `出错了：${err.message}` : '网络异常，请稍后重试', status: 'done' as const }
          : m
      ))
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, university, guideState.step])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id

  return (
    <div className="ai-page">
      {/* 消息列表 */}
      <div className="ai-messages">
        {messages.map(msg => {
          const isLastAssistant = msg.id === lastAssistantId
          const { text: displayText, quickReplies } = msg.role === 'assistant' && msg.status === 'done'
            ? parseQuickReplies(msg.content)
            : { text: msg.content, quickReplies: [] }

          return (
            <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
              {msg.role === 'assistant' && <div className="chat-avatar">🍜</div>}
              <div className="chat-bubble-wrap">
                {msg.role === 'assistant' && !msg.content && !msg.guideOptions && msg.status === 'streaming' && (
                  <div className="chat-bubble chat-bubble-assistant">
                    <div className="chat-loading-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                )}

                {msg.status === 'tool_calling' && (
                  <div className="chat-bubble chat-bubble-assistant chat-bubble-tool">
                    <span className="chat-tool-spinner"></span>
                    {msg.toolInfo}
                  </div>
                )}

                {(msg.role === 'user' ? msg.content : displayText) && (
                  <div className={`chat-bubble chat-bubble-${msg.role}${msg.status === 'streaming' ? ' chat-bubble-streaming' : ''}`}>
                    {msg.role === 'user' ? msg.content : displayText}
                  </div>
                )}

                {msg.restaurantResults && msg.restaurantResults.length > 0 && msg.status === 'done' && (
                  <div className="chat-restaurants">
                    {msg.restaurantResults.map(r => (
                      <RestaurantListItem key={r.id} restaurant={r} />
                    ))}
                  </div>
                )}

                {/* 引导选项卡片 */}
                {msg.guideOptions && msg.guideOptions.length > 0 && isLastAssistant && !isLoading && (
                  <div className="guide-options">
                    {msg.guideOptions.map(opt => (
                      <button
                        key={opt.id}
                        className="guide-option-card"
                        onClick={() => handleGuideSelect(guideState.step, opt.id)}
                      >
                        <span className="guide-option-emoji">{opt.emoji}</span>
                        <span className="guide-option-label">{opt.label}</span>
                        {opt.description && <span className="guide-option-desc">{opt.description}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {quickReplies.length > 0 && isLastAssistant && !isLoading && (
                  <div className="chat-quick-replies">
                    {quickReplies.map(reply => (
                      <button
                        key={reply}
                        className="chat-quick-reply"
                        onClick={() => handleSend(reply)}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="ai-input-area">
        <input
          ref={inputRef}
          className="chat-input"
          type="text"
          placeholder={guideState.step === 'chat' ? '想吃点什么？' : '也可以直接输入问 AI...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          className="chat-send"
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
        >
          发送
        </button>
      </div>
    </div>
  )
}

// 品类 emoji 映射
function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    '中餐': '🥘',
    '西餐': '🍝',
    '日料': '🍣',
    '韩餐': '🍲',
    '火锅': '🫕',
    '烧烤': '🍖',
    '小吃': '🥟',
    '快餐': '🍔',
    '饮品': '🧋',
    '甜点': '🍰',
    '面食': '🍜',
    '粥店': '🥣',
    '东南亚': '🍛',
    '其他': '🍽️',
  }
  return map[category] || '🍽️'
}
