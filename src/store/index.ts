import { AppState, Transaction, Budget, Account, TransactionCategory } from '../types'

const STORAGE_KEY = 'personal-finance-data'

export const defaultCategories: TransactionCategory[] = [
  // 支出分类
  { id: 'c1', name: '餐饮', type: 'expense', icon: '🍽️', color: '#FF6B6B' },
  { id: 'c2', name: '交通', type: 'expense', icon: '🚗', color: '#4ECDC4' },
  { id: 'c3', name: '购物', type: 'expense', icon: '🛍️', color: '#FFD166' },
  { id: 'c4', name: '娱乐', type: 'expense', icon: '🎮', color: '#6A0572' },
  { id: 'c5', name: '医疗', type: 'expense', icon: '💊', color: '#06D6A0' },
  { id: 'c6', name: '教育', type: 'expense', icon: '📚', color: '#118AB2' },
  { id: 'c7', name: '住房', type: 'expense', icon: '🏠', color: '#073B4C' },
  { id: 'c8', name: '通讯', type: 'expense', icon: '📱', color: '#118AB2' },
  { id: 'c9', name: '人情', type: 'expense', icon: '🎁', color: '#FFD166' },
  { id: 'c10', name: '运动', type: 'expense', icon: '🏃', color: '#06D6A0' },
  { id: 'c11', name: '其他', type: 'expense', icon: '💰', color: '#888' },
  // 收入分类
  { id: 'i1', name: '工资', type: 'income', icon: '💼', color: '#2ECC71' },
  { id: 'i2', name: '奖金', type: 'income', icon: '🎊', color: '#F1C40F' },
  { id: 'i3', name: '投资收益', type: 'income', icon: '📈', color: '#9B59B6' },
  { id: 'i4', name: '红包', type: 'income', icon: '🧧', color: '#E74C3C' },
  { id: 'i5', name: '其他', type: 'income', icon: '💵', color: '#3498DB' },
]

export const loadState = (): AppState => {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) {
      return {
        transactions: [],
        categories: defaultCategories,
        budgets: [],
        accounts: []
      }
    }
    return JSON.parse(data)
  } catch (e) {
    return {
      transactions: [],
      categories: defaultCategories,
      budgets: [],
      accounts: []
    }
  }
}

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save state:', e)
  }
}

export const exportData = () => {
  const state = loadState()
  const dataStr = JSON.stringify(state, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `finance-data-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export const importData = (file: File): Promise<AppState> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        saveState(data)
        resolve(data)
      } catch (e) {
        reject(new Error('Invalid data file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
