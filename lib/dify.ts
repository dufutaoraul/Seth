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

    // ⭐⭐⭐ 打印完整的Dify响应，用于验证是否包含Token信息 ⭐⭐⭐
    console.log('========================================')
    console.log('🔍 完整Dify API响应:')
    console.log(JSON.stringify(response.data, null, 2))
    console.log('========================================')

    // 特别检查是否有Token相关字段
    if (response.data.metadata) {
      console.log('✅ 发现 metadata 字段:', JSON.stringify(response.data.metadata, null, 2))
    }
    if (response.data.usage) {
      console.log('✅ 发现 usage 字段:', JSON.stringify(response.data.usage, null, 2))
    }
    if (response.data.metadata?.usage) {
      console.log('✅ 发现 metadata.usage 字段:', JSON.stringify(response.data.metadata.usage, null, 2))
    }
    if (!response.data.metadata && !response.data.usage) {
      console.log('❌ 未发现任何Token统计信息')
    }

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