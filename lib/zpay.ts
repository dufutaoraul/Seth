import { createHash } from 'crypto'

const ZPAY_PID = process.env.ZPAY_PID!
const ZPAY_KEY = process.env.ZPAY_KEY!
const ZPAY_GATEWAY = process.env.ZPAY_GATEWAY!

export interface ZPayOrder {
  pid: string
  money: string
  name: string
  notify_url: string
  out_trade_no: string
  return_url: string
  sitename: string
  type: 'alipay' | 'wxpay' | 'qqpay'
}

// 生成订单号
export function generateOrderNo(): string {
  const now = new Date()
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0')

  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return dateStr + randomNum
}

// 参数排序并生成待签名字符串
function getVerifyParams(params: Record<string, any>): string {
  const sortedParams: [string, any][] = []

  for (const key in params) {
    if (!params[key] || key === 'sign' || key === 'sign_type') {
      continue
    }
    sortedParams.push([key, params[key]])
  }

  sortedParams.sort((a, b) => a[0].localeCompare(b[0]))

  let prestr = ''
  for (let i = 0; i < sortedParams.length; i++) {
    const [key, value] = sortedParams[i]
    if (i === sortedParams.length - 1) {
      prestr += `${key}=${value}`
    } else {
      prestr += `${key}=${value}&`
    }
  }

  return prestr
}

// MD5签名
function md5Sign(str: string): string {
  return createHash('md5').update(str, 'utf8').digest('hex')
}

// 创建支付订单
export function createPaymentUrl(
  amount: number,
  productName: string,
  orderNo: string,
  paymentType: 'alipay' | 'wxpay' | 'qqpay' = 'alipay'
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const orderData: ZPayOrder = {
    pid: ZPAY_PID,
    money: amount.toFixed(2),
    name: productName,
    notify_url: `${baseUrl}/api/payment/notify`,
    out_trade_no: orderNo,
    return_url: `${baseUrl}/payment/success`,
    sitename: '与赛斯对话',
    type: paymentType,
  }

  // 生成签名
  const signStr = getVerifyParams(orderData)
  const sign = md5Sign(signStr + ZPAY_KEY)

  // 构建支付URL
  const paymentUrl = `${ZPAY_GATEWAY}/submit.php?${signStr}&sign=${sign}&sign_type=MD5`

  return paymentUrl
}

// 验证回调签名
export function verifyNotifySign(params: Record<string, any>): boolean {
  const { sign, ...otherParams } = params
  const signStr = getVerifyParams(otherParams)
  const expectedSign = md5Sign(signStr + ZPAY_KEY)

  return sign === expectedSign
}

// 会员套餐配置 (测试价格)
export const MEMBERSHIP_PLANS = {
  '免费用户': { credits: 15, price: 0 },
  '标准会员': { credits: 150, price: 1 },    // 测试价格 1元
  '高级会员': { credits: 500, price: 2 },    // 测试价格 2元
} as const

export type MembershipType = keyof typeof MEMBERSHIP_PLANS