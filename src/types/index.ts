export type TransactionType = 'income' | 'expense'

export interface TransactionCategory {
  id: string
  name: string
  type: TransactionType
  icon: string
  color: string
}

export interface Transaction {
  id: string
  type: TransactionType
  categoryId: string
  amount: number
  date: string
  remark?: string
  createdAt: string
}

export interface Budget {
  id: string
  categoryId: string
  amount: number
  month: string
  createdAt: string
}

export interface Account {
  id: string
  name: string
  type: 'cash' | 'bank' | 'alipay' | 'wechat' | 'investment' | 'other'
  balance: number
  createdAt: string
}

export interface AppState {
  transactions: Transaction[]
  categories: TransactionCategory[]
  budgets: Budget[]
  accounts: Account[]
}
