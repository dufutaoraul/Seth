import axios from 'axios'

const DIFY_API_URL = process.env.DIFY_API_URL!
const DIFY_API_KEY = process.env.DIFY_API_KEY!

export interface DifyMessage {
  inputs: Record<string, any>
  query: string
  response_mode: string
  conversation_id?: string
  user: string
}

export interface DifyResponse {
  conversation_id: string
  message_id: string
  answer: string
  created_at: number
}

// Dify聊天API调用（阻塞模式，用于非流式场景）
export async function sendMessageToDify(
  message: string,
  userId: string,
  conversationId?: string
): Promise<DifyResponse> {
  try {
    const payload: DifyMessage = {
      inputs: {
        user: userId,
      },
      query: message,
      response_mode: 'blocking',
      user: userId,
    }

    if (conversationId) {
      payload.conversation_id = conversationId
    }

    console.log('Dify API payload:', JSON.stringify(payload, null, 2))

    const response = await axios.post(
      `${DIFY_API_URL}/chat-messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${DIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30秒超时
      }
    )

    return {
      conversation_id: response.data.conversation_id,
      message_id: response.data.id,
      answer: response.data.answer,
      created_at: response.data.created_at,
    }
  } catch (error) {
    console.error('Dify API调用失败:', error)
    if (axios.isAxiosError(error)) {
      throw new Error(`Dify API错误: ${error.response?.data?.message || error.message}`)
    }
    throw new Error('与AI服务连接失败，请稍后重试')
  }
}

// Dify聊天API调用（流式模式）
export async function sendMessageToDifyStreaming(
  message: string,
  userId: string,
  conversationId?: string
): Promise<Response> {
  const payload = {
    inputs: {
      user: userId,
    },
    query: message,
    response_mode: 'streaming',
    user: userId,
    ...(conversationId ? { conversation_id: conversationId } : {}),
  }

  console.log('Dify Streaming API payload:', JSON.stringify(payload, null, 2))

  const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Dify API错误: ${response.statusText}`)
  }

  return response
}

// 获取对话历史
export async function getDifyConversationHistory(
  conversationId: string,
  userId: string
): Promise<any[]> {
  try {
    const response = await axios.get(
      `${DIFY_API_URL}/conversations/${conversationId}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${DIFY_API_KEY}`,
        },
        params: {
          user: userId,
        },
      }
    )

    return response.data.data || []
  } catch (error) {
    console.error('获取对话历史失败:', error)
    return []
  }
}