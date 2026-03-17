import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { University, PriceRange, Category } from '../types'
import { ChatMessage, APIMessage, GuideOption } from '../types/chat'
import { sendMessageStream, getMealPeriod, getGuideRecommendation, DiningMode, PersonalContext } from '../services/ai'
import { getProfile } from '../services/profile'
import { computeTasteDNA } from '../services/tasteDNA'
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

type GuideStep = 'mode' | 'mealTime' | 'scene' | 'budget' | 'taste' | 'result' | 'chat'

interface GuideState {
  step: GuideStep
  mode?: DiningMode
  mealTime?: string
  scene?: string
  budget?: PriceRange | PriceRange[]
  taste?: Category
  excludeIds?: string[]
}

const modeOptions: GuideOption[] = [
  { id: 'delivery', emoji: '🛵', label: '外卖到宿舍', description: '送到楼下不用动' },
  { id: 'dinein', emoji: '🏠', label: '去店里吃', description: '堂食环境好' },
  { id: 'pickup', emoji: '🥡', label: '自取带走', description: '顺路带走最快' },
  { id: 'any', emoji: '🤷', label: '无所谓', description: '都可以' },
]

function getMealTimeOptions(): GuideOption[] {
  const hour = new Date().getHours()
  const minute = new Date().getMinutes()
  const currentMin = hour * 60 + minute

  const periods: { id: string; emoji: string; label: string; start: number; end: number }[] = [
    { id: 'breakfast', emoji: '🌅', label: '早餐', start: 360, end: 570 },
    { id: 'brunch', emoji: '🥞', label: '早午餐/Brunch', start: 570, end: 690 },
    { id: 'lunch', emoji: '☀️', label: '午餐', start: 660, end: 840 },
    { id: 'afternoon', emoji: '🍵', label: '下午茶', start: 840, end: 1020 },
    { id: 'dinner', emoji: '🌆', label: '晚餐', start: 1020, end: 1260 },
    { id: 'latenight', emoji: '🌙', label: '宵夜', start: 1260, end: 1560 },
  ]

  return periods.map(p => {
    const isCurrent = currentMin >= p.start && currentMin < p.end
    return {
      id: p.id,
      emoji: p.emoji,
      label: isCurrent ? `${p.label}(现在)` : p.label,
      description: isCurrent ? '当前时段' : undefined,
    }
  })
}

const sceneOptions: GuideOption[] = [
  { id: 'alone', emoji: '🍚', label: '一个人随便吃', description: '简单快捷填饱肚子' },
  { id: 'friends', emoji: '👫', label: '和朋友2-3人', description: '适合多人的餐厅' },
  { id: 'date', emoji: '💕', label: '约会', description: '环境好有氛围感' },
  { id: 'party', emoji: '🎉', label: '聚餐请客', description: '大桌聚餐有面子' },
  { id: 'random', emoji: '🎲', label: '别问了随便', description: '跳过后续直接推荐！' },
]

const budgetOptions: GuideOption[] = [
  { id: 'budget', emoji: '💰', label: '穷鬼模式', description: '人均20以下' },
  { id: 'affordable', emoji: '👍', label: '正常水平', description: '人均20-40' },
  { id: 'splurge', emoji: '🎉', label: '奢侈一把', description: '人均40+' },
  { id: 'any', emoji: '🤷', label: '无所谓', description: '好吃就行' },
]

const sceneMapping: Record<string, string> = {
  alone: '一个人',
  friends: '和室友',
  date: '约会',
  party: '聚餐',
}

const modeLabelMapping: Record<string, string> = {
  delivery: '🛵 外卖到宿舍',
  dinein: '🏠 去店里吃',
  pickup: '🥡 自取带走',
  any: '🤷 无所谓',
}

const mealTimeLabelMapping: Record<string, string> = {
  breakfast: '🌅 早餐',
  brunch: '🥞 早午餐/Brunch',
  lunch: '☀️ 午餐',
  afternoon: '🍵 下午茶',
  dinner: '🌆 晚餐',
  latenight: '🌙 宵夜',
}

const sceneLabelMapping: Record<string, string> = {
  alone: '🍚 一个人随便吃',
  friends: '👫 和朋友2-3人',
  date: '💕 约会',
  party: '🎉 聚餐请客',
  random: '🎲 别问了随便',
}

const budgetLabelMapping: Record<string, string> = {
  budget: '💰 穷鬼模式',
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

// placeholder 示例查询，轮换展示
const exampleQueries = [
  '下课后四个人，想吃辣的，人均50以内',
  '一个人吃，不想排队，快餐就行',
  '和女朋友约会，环境好一点的',
  '宵夜吃什么，最好能外卖',
  '穷鬼模式，人均20以下有啥好吃的',
  '室友聚餐，想吃火锅，有包间吗',
]

// 根据对话上下文生成动态 placeholder（自由聊天模式）
function getSmartPlaceholder(messages: ChatMessage[]): string {
  if (messages.length === 0) return '想吃点什么？'

  // 取最近的 assistant 消息
  const lastAi = [...messages].reverse().find(m => m.role === 'assistant' && m.status === 'done')
  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  if (!lastAi) return '想吃点什么？'

  const aiText = lastAi.content.toLowerCase()
  const hasResults = lastAi.restaurantResults && lastAi.restaurantResults.length > 0
  const userText = lastUser?.content || ''

  // 推荐了餐厅后 → 引导深入或换方向
  if (hasResults) {
    const names = lastAi.restaurantResults!.map(r => r.name)
    const suggestions = [
      names[0] ? `${names[0]}排队要多久？` : null,
      '有没有更便宜的选择？',
      '换几家看看',
      names[0] ? `${names[0]}有什么优惠吗？` : null,
      '哪家最不用排队？',
      '还有别的推荐吗？',
    ].filter(Boolean) as string[]
    return suggestions[Math.floor(Date.now() / 5000) % suggestions.length]
  }

  // AI 回复中提到了某些话题 → 顺着话题引导
  if (aiText.includes('辣') || aiText.includes('口味')) return '不要太辣，微辣就行'
  if (aiText.includes('外卖') || aiText.includes('配送')) return '送到哪个宿舍楼比较快？'
  if (aiText.includes('优惠') || aiText.includes('省钱') || aiText.includes('满减')) return '还有别的省钱方法吗？'
  if (aiText.includes('排队') || aiText.includes('等位')) return '有没有不用排队的？'
  if (aiText.includes('宵夜') || aiText.includes('深夜')) return '现在还有哪家没关门？'
  if (aiText.includes('约会') || aiText.includes('环境')) return '哪家拍照好看？'
  if (aiText.includes('聚餐') || aiText.includes('包间')) return '能坐8个人的有吗？'

  // 用户之前提过的关键词 → 换个角度追问
  if (userText.includes('火锅')) return '有鸳鸯锅的吗？'
  if (userText.includes('奶茶') || userText.includes('饮品')) return '哪家奶茶性价比最高？'
  if (userText.includes('一个人')) return '有没有适合一个人的小馆子？'

  // 兜底：根据时段给不同默认语
  const hour = new Date().getHours()
  if (hour < 10) return '早上吃点什么好？'
  if (hour < 14) return '午饭有什么推荐？'
  if (hour < 17) return '下午茶喝点什么？'
  if (hour < 21) return '晚饭吃什么好？'
  return '这么晚了吃点什么宵夜？'
}

let _msgIdCounter = 0
function nextMsgId(): string {
  return `guide-${Date.now()}-${_msgIdCounter++}`
}

// 简单的 markdown 渲染：支持 **粗体**
function renderMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function ChatAgent({ university }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [guideState, setGuideState] = useState<GuideState>({ step: 'mode' })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const conversationRef = useRef<APIMessage[]>([])
  const initialHandled = useRef(false)
  const location = useLocation()
  const navigate = useNavigate()

  const { greeting } = getMealPeriod()

  // placeholder 轮换
  const [placeholderIdx, setPlaceholderIdx] = useState(
    () => Math.floor(Math.random() * exampleQueries.length)
  )
  useEffect(() => {
    if (guideState.step === 'chat') return
    const timer = setInterval(() => {
      setPlaceholderIdx(prev => (prev + 1) % exampleQueries.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [guideState.step])

  const currentPlaceholder = guideState.step === 'chat'
    ? getSmartPlaceholder(messages)
    : `试试输入："${exampleQueries[placeholderIdx]}"   按Tab填充`

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
    if (messages.length === 0 && guideState.step === 'mode') {
      const welcomeMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: `${greeting} 不知道吃啥？我来帮你一步步选！\n\n今天怎么吃？`,
        timestamp: Date.now(),
        status: 'done',
        guideOptions: modeOptions,
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

  // 获取用户个性化上下文
  const getPersonalContext = useCallback((): PersonalContext => {
    const profile = getProfile()
    const dna = computeTasteDNA(profile)
    return { profile, tasteDNA: dna }
  }, [])

  // 处理引导选项点击
  const handleGuideSelect = useCallback((step: GuideStep, optionId: string) => {
    if (step === 'mode') {
      const label = modeLabelMapping[optionId] || optionId
      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'user',
        content: label,
        timestamp: Date.now(),
      }
      const mode = optionId === 'any' ? undefined : optionId as DiningMode
      setGuideState({ step: 'mealTime', mode })

      const nextMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: '吃哪一顿？',
        timestamp: Date.now(),
        status: 'done',
        guideOptions: getMealTimeOptions(),
      }
      setMessages(prev => [...prev, userMsg, nextMsg])
    } else if (step === 'mealTime') {
      const label = mealTimeLabelMapping[optionId] || optionId
      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'user',
        content: label,
        timestamp: Date.now(),
      }
      setGuideState(prev => ({ ...prev, step: 'scene', mealTime: optionId }))

      const nextMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: '几个人？什么场合？',
        timestamp: Date.now(),
        status: 'done',
        guideOptions: sceneOptions,
      }
      setMessages(prev => [...prev, userMsg, nextMsg])
    } else if (step === 'scene') {
      const label = sceneLabelMapping[optionId] || optionId
      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'user',
        content: label,
        timestamp: Date.now(),
      }

      if (optionId === 'random') {
        // 跳过后续步骤，直接出结果
        const result = getGuideRecommendation({
          mode: guideState.mode,
          mealTime: guideState.mealTime,
          university,
          personal: getPersonalContext(),
        })
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
        setGuideState(prev => ({
          ...prev,
          step: 'result',
          excludeIds: result.restaurants.map(r => r.id),
        }))
        setMessages(prev => [...prev, userMsg, resultMsg, actionMsg])
        return
      }

      const scene = sceneMapping[optionId]
      setGuideState(prev => ({ ...prev, step: 'budget', scene }))

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

      // 展示所有品类选项，让用户自由选择
      const allCategories: Category[] = [
        '中餐', '西餐', '日料', '韩餐',
        '火锅', '烧烤', '小吃', '快餐',
        '饮品', '甜点', '面食', '粥店',
        '东南亚', '其他',
      ]
      const tasteOptions: GuideOption[] = allCategories.map(cat => ({
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
        mode: guideState.mode,
        mealTime: guideState.mealTime,
        scene: guideState.scene,
        priceRange: guideState.budget,
        category: taste,
        university,
        personal: getPersonalContext(),
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
          mode: guideState.mode,
          mealTime: guideState.mealTime,
          scene: guideState.scene,
          priceRange: guideState.budget,
          category: guideState.taste,
          university,
          excludeIds: guideState.excludeIds,
          personal: getPersonalContext(),
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
        setGuideState({ step: 'mode' })
        const modeMsg: ChatMessage = {
          id: nextMsgId(),
          role: 'assistant',
          content: '好的，重新来！今天怎么吃？',
          timestamp: Date.now(),
          status: 'done',
          guideOptions: modeOptions,
        }
        setMessages(prev => [...prev, userMsg, modeMsg])
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
    if (e.key === 'Tab' && !input.trim()) {
      e.preventDefault()
      if (guideState.step === 'chat') {
        // 聊天模式：填充动态建议
        setInput(getSmartPlaceholder(messages))
      } else {
        // 引导模式：填充示例查询
        setInput(exampleQueries[placeholderIdx])
        setPlaceholderIdx(prev => (prev + 1) % exampleQueries.length)
      }
      return
    }
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
              {msg.role === 'assistant' && <div className="chat-avatar">
                <img src="/tuanzi.png" alt="团子" />
              </div>}
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
                    {msg.role === 'user' ? msg.content : renderMarkdown(displayText)}
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
          placeholder={currentPlaceholder}
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
