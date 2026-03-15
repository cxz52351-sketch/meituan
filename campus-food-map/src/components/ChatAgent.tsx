import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { University } from '../types'
import { ChatMessage, APIMessage } from '../types/chat'
import { sendMessageStream, getMealPeriod, getTimeSuggestions } from '../services/ai'
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

export default function ChatAgent({ university }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const conversationRef = useRef<APIMessage[]>([])
  const initialHandled = useRef(false)
  const location = useLocation()
  const navigate = useNavigate()

  const { greeting } = getMealPeriod()
  const suggestions = getTimeSuggestions()

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 自动聚焦
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  // 处理从首页传来的初始消息
  useEffect(() => {
    if (initialHandled.current) return
    const state = location.state as { initialMessage?: string } | null
    if (state?.initialMessage) {
      initialHandled.current = true
      // 清理 state 防止刷新重发
      navigate('/ai', { replace: true, state: null })
      // 延迟发送，等组件完全 mount
      setTimeout(() => handleSend(state.initialMessage!), 100)
    }
  }, [location.state])

  const handleSend = useCallback(async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || isLoading) return

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
  }, [input, isLoading, university])

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
        {messages.length === 0 && (
          <div className="ai-welcome">
            <div className="ai-welcome-avatar">🍜</div>
            <div className="ai-welcome-title">{greeting}</div>
            <div className="ai-welcome-desc">我是你的美食决策助手，告诉我你想吃什么，或者让我帮你选！</div>
            <div className="ai-welcome-suggestions">
              {suggestions.map(s => (
                <button key={s} className="ai-welcome-chip" onClick={() => handleSend(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => {
          const isLastAssistant = msg.id === lastAssistantId
          const { text: displayText, quickReplies } = msg.role === 'assistant' && msg.status === 'done'
            ? parseQuickReplies(msg.content)
            : { text: msg.content, quickReplies: [] }

          return (
            <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
              {msg.role === 'assistant' && <div className="chat-avatar">🍜</div>}
              <div className="chat-bubble-wrap">
                {msg.role === 'assistant' && !msg.content && msg.status === 'streaming' && (
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
          placeholder="想吃点什么？"
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
