// 货币定义
export const CURRENCIES = [
  { code: 'CNY', name: '人民币', symbol: '¥', rate: 1 },
  { code: 'USD', name: '美元', symbol: '$', rate: 7.25 },
  { code: 'EUR', name: '欧元', symbol: '€', rate: 7.8 },
  { code: 'GBP', name: '英镑', symbol: '£', rate: 8.9 },
  { code: 'JPY', name: '日元', symbol: '¥', rate: 0.048 },
  { code: 'HKD', name: '港币', symbol: 'HK$', rate: 0.93 },
  { code: 'TWD', name: '新台币', symbol: 'NT$', rate: 0.23 },
] as const

// 默认汇率（相对于人民币）
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  'CNY': 1,
  'USD': 7.25,
  'EUR': 7.8,
  'GBP': 8.9,
  'JPY': 0.048,
  'HKD': 0.93,
  'TWD': 0.23,
}

export type CurrencyCode = typeof CURRENCIES[number]['code']