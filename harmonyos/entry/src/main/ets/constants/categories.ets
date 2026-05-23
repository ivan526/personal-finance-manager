import { Category } from '../models/Category'
import type { TransactionType } from '../models/Category'

export const DEFAULT_CATEGORIES: Category[] = [
  // 支出分类
  Category.create('food', '餐饮', 'expense', '🍽️', '#f59e0b'),
  Category.create('transport', '交通', 'expense', '🚗', '#3b82f6'),
  Category.create('shopping', '购物', 'expense', '🛍️', '#ec4899'),
  Category.create('entertainment', '娱乐', 'expense', '🎮', '#8b5cf6'),
  Category.create('medical', '医疗', 'expense', '🏥', '#ef4444'),
  Category.create('education', '教育', 'expense', '📚', '#10b981'),
  Category.create('housing', '住房', 'expense', '🏠', '#f97316'),
  Category.create('communication', '通讯', 'expense', '📱', '#06b6d4'),
  Category.create('social', '人情', 'expense', '🎁', '#f43f5e'),
  Category.create('sports', '运动', 'expense', '🏃', '#22c55e'),
  Category.create('other_expense', '其他支出', 'expense', '💰', '#6b7280'),
  
  // 收入分类
  Category.create('salary', '工资', 'income', '💼', '#10b981'),
  Category.create('bonus', '奖金', 'income', '🎊', '#0ea5e9'),
  Category.create('investment', '投资收益', 'income', '📈', '#8b5cf6'),
  Category.create('red_packet', '红包', 'income', '🧧', '#ef4444'),
  Category.create('other_income', '其他收入', 'income', '💸', '#65a30d'),
]
