import { Restaurant } from './index'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  restaurantResults?: Restaurant[]
  status?: 'streaming' | 'tool_calling' | 'done'
  toolInfo?: string
}

// OpenAI 兼容的消息格式
export interface APIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

// Streaming delta events
export type StreamDelta =
  | { type: 'content'; text: string }
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_result'; restaurants: Restaurant[] }
  | { type: 'done'; content: string; restaurants: Restaurant[] }
  | { type: 'error'; message: string }
