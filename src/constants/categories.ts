import type { Category } from '../types'

export const DEFAULT_CATEGORIES: Category[] = [
  // 支出分类
  { id: 'food', name: '餐饮', type: 'expense', icon: '🍽️', color: '#f59e0b' },
  { id: 'transport', name: '交通', type: 'expense', icon: '🚗', color: '#3b82f6' },
  { id: 'shopping', name: '购物', type: 'expense', icon: '🛍️', color: '#ec4899' },
  { id: 'entertainment', name: '娱乐', type: 'expense', icon: '🎮', color: '#8b5cf6' },
  { id: 'medical', name: '医疗', type: 'expense', icon: '🏥', color: '#ef4444' },
  { id: 'education', name: '教育', type: 'expense', icon: '📚', color: '#10b981' },
  { id: 'housing', name: '住房', type: 'expense', icon: '🏠', color: '#f97316' },
  { id: 'communication', name: '通讯', type: 'expense', icon: '📱', color: '#06b6d4' },
  { id: 'social', name: '人情', type: 'expense', icon: '🎁', color: '#f43f5e' },
  { id: 'sports', name: '运动', type: 'expense', icon: '🏃', color: '#22c55e' },
  { id: 'other_expense', name: '其他支出', type: 'expense', icon: '💰', color: '#6b7280' },
  
  // 收入分类
  { id: 'salary', name: '工资', type: 'income', icon: '💼', color: '#10b981' },
  { id: 'bonus', name: '奖金', type: 'income', icon: '🎊', color: '#0ea5e9' },
  { id: 'investment', name: '投资收益', type: 'income', icon: '📈', color: '#8b5cf6' },
  { id: 'red_packet', name: '红包', type: 'income', icon: '🧧', color: '#ef4444' },
  { id: 'other_income', name: '其他收入', type: 'income', icon: '💸', color: '#65a30d' },
]
