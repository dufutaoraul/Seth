import axios from 'axios'

const DIFY_API_URL = process.env.DIFY_API_URL!
const DIFY_API_KEY = process.env.DIFY_API_KEY!

export interface DifyMessage {
  query: string
  conversation_id?: string
  user: string
}

export interface DifyResponse {
  conversation_id: string
  message_id: string
  answer: string
  created_at: number
}

// Dify聊天API调用
export async function sendMessageToDify(
  message: string,
  userId: string,
  conversationId?: string
): Promise<DifyResponse> {
  try {
    const payload: DifyMessage = {
      query: message,
      user: userId,
    }

    if (conversationId) {
      payload.conversation_id = conversationId
    }

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