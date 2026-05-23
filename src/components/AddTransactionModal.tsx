import { useState, useEffect } from 'react'
import { X, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { TransactionType, Transaction, Category } from '../types'
import { storage } from '../utils/storage'

interface Props {
  onClose: () => void
  editTransaction?: Transaction | null
}

export default function AddTransactionModal({ onClose, editTransaction }: Props) {
  const [recordType, setRecordType] = useState<'expense_income' | 'investment'>('expense_income')
  const [type, setType] = useState<TransactionType>('expense')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')
  const [time, setTime] = useState(new Date().toISOString().slice(0, 16))
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    setCategories(storage.getCategories())
  }, [])

  useEffect(() => {
    if (editTransaction) {
      setType(editTransaction.type)
      setSelectedCategory(editTransaction.categoryId)
      setAmount(editTransaction.amount.toString())
      setRemark(editTransaction.remark || '')
      setTime(new Date(editTransaction.time).toISOString().slice(0, 16))
    }
  }, [editTransaction])

  const filteredCategories = categories.filter(c => c.type === type)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert('请填写正确的信息')
      return
    }

    const amountNum = Number(amount)

    if (type === 'expense') {
      const currentMonth = new Date(time).toISOString().slice(0, 7)
      const budgets = storage.getBudgets()
      const transactions = storage.getTransactions()

      let currentCategoryExpense = 0
      transactions.forEach(t => {
        const tMonth = new Date(t.time).toISOString().slice(0, 7)
        if (tMonth === currentMonth && t.type === 'expense' && t.categoryId === selectedCategory && t.id !== editTransaction?.id) {
          currentCategoryExpense += t.amount
        }
      })

      let currentTotalExpense = 0
      transactions.forEach(t => {
        const tMonth = new Date(t.time).toISOString().slice(0, 7)
        if (tMonth === currentMonth && t.type === 'expense' && t.id !== editTransaction?.id) {
          currentTotalExpense += t.amount
        }
      })

      const newCategoryExpense = currentCategoryExpense + amountNum
      const newTotalExpense = currentTotalExpense + amountNum

      const categoryBudget = budgets.find(b => b.month === currentMonth && b.categoryId === selectedCategory)?.amount || 0
      if (categoryBudget > 0 && newCategoryExpense > categoryBudget) {
        if (!confirm(`⚠️ 该分类月度预算为¥${categoryBudget.toLocaleString()}，当前已支出¥${currentCategoryExpense.toLocaleString()}，本次支出后将超出预算，是否继续保存？`)) {
          return
        }
      } else if (categoryBudget > 0 && newCategoryExpense >= categoryBudget * 0.8) {
        alert(`⚠️ 该分类月度预算已使用${((newCategoryExpense / categoryBudget) * 100).toFixed(1)}%，即将超支`)
      }

      const totalBudget = budgets.find(b => b.month === currentMonth && !b.categoryId)?.amount || 0
      if (totalBudget > 0 && newTotalExpense > totalBudget) {
        if (!confirm(`⚠️ 月度总预算为¥${totalBudget.toLocaleString()}，当前已支出¥${currentTotalExpense.toLocaleString()}，本次支出后将超出总预算，是否继续保存？`)) {
          return
        }
      }
    }

    if (editTransaction) {
      const updatedTransaction: Transaction = {
        ...editTransaction,
        type,
        categoryId: selectedCategory,
        amount: amountNum,
        time: new Date(time).getTime(),
        remark,
      }
      storage.updateTransaction(updatedTransaction)
      alert('记录更新成功')
    } else {
      const transaction: Transaction = {
        id: Date.now().toString(),
        type,
        categoryId: selectedCategory,
        amount: amountNum,
        time: new Date(time).getTime(),
        remark,
      }
      storage.addTransaction(transaction)
      alert('记录保存成功')
    }

    onClose()
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(15,23,42,0.15)] w-full max-w-lg overflow-hidden animate-slide-up border overscroll-behavior-contain modal" style={{borderColor: 'var(--border)'}}>
        <div className="flex items-center justify-between px-8 py-6 border-b" style={{borderColor: 'var(--border)'}}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRecordType('expense_income')}
              className={`px-5 py-2.5 rounded-md font-semibold transition-all text-base ${
                recordType === 'expense_income'
                  ? 'text-white shadow-[0_4px_12px_rgba(29,110,255,0.18)]'
                  : ''
              }`}
              style={{
                backgroundColor: recordType === 'expense_income' ? 'var(--primary)' : undefined,
                color: recordType === 'expense_income' ? 'white' : 'var(--text-muted)'
              }}
            >
              收支
            </button>
            <button
              onClick={() => setRecordType('investment')}
              className={`px-5 py-2.5 rounded-md font-semibold transition-all flex items-center gap-2 text-base ${
                recordType === 'investment'
                  ? 'text-white shadow-[0_4px_12px_rgba(29,110,255,0.18)]'
                  : ''
              }`}
              style={{
                backgroundColor: recordType === 'investment' ? 'var(--primary)' : undefined,
                color: recordType === 'investment' ? 'white' : 'var(--text-muted)'
              }}
            >
              <TrendingUp size={18} aria-hidden="true" />
              投资
            </button>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭弹窗"
            className="p-2.5 rounded-md transition-all hover:bg-bg-soft"
          >
            <X size={20} style={{color: 'var(--text-muted)'}} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 modal-content">
          {recordType === 'expense_income' ? (
            <>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 py-3.5 rounded-md font-semibold transition-all text-base ${
                    type === 'expense'
                      ? 'bg-gradient-to-b from-[#FF384B] to-[#E82E40] text-white shadow-[0_4px_12px_rgba(255,56,75,0.18)]'
                      : 'hover:bg-[var(--border)]'
                  }`}
                  style={type !== 'expense' ? {backgroundColor: 'var(--bg-soft)', color: 'var(--text-muted)'} : undefined}
                >
                  支出
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 py-3.5 rounded-md font-semibold transition-all text-base ${
                    type === 'income'
                      ? 'bg-gradient-to-b from-[#10BA51] to-[#0EA648] text-white shadow-[0_4px_12px_rgba(16,186,81,0.18)]'
                      : 'hover:bg-[var(--border)]'
                  }`}
                  style={type !== 'income' ? {backgroundColor: 'var(--bg-soft)', color: 'var(--text-muted)'} : undefined}
                >
                  收入
                </button>
              </div>

              <div>
                <label className="block text-base font-semibold mb-4" style={{color: 'var(--text)'}}>选择分类</label>
                <div className="grid grid-cols-4 gap-3">
                  {filteredCategories.map(category => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      aria-label={`选择${category.name}分类`}
                      className={`py-4 rounded-[10px] text-center transition-all border ${
                        selectedCategory === category.id
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-[0_2px_8px_rgba(29,110,255,0.1)] scale-[1.02]'
                          : 'hover:border-blue-200 hover:bg-blue-50/50'
                      }`}
                      style={selectedCategory !== category.id ? {borderColor: 'var(--border)'} : undefined}
                    >
                      <div className="text-2xl mb-1.5" aria-hidden="true">{category.icon}</div>
                      <div className="text-xs font-medium">{category.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-base font-semibold mb-3" style={{color: 'var(--text)'}}>金额</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="请输入金额…"
                  autoComplete="off"
                  className="input-glass w-full px-5 py-4 text-lg font-semibold rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-base font-semibold mb-3" style={{color: 'var(--text)'}}>时间</label>
                <input
                  type="datetime-local"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  autoComplete="off"
                  className="input-glass w-full px-5 py-4 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-base font-semibold mb-3" style={{color: 'var(--text)'}}>备注（可选）</label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="添加备注信息…"
                  autoComplete="off"
                  className="input-glass w-full px-5 py-4 rounded-md"
                />
              </div>

              <button
                type="submit"
                className="w-full btn-primary h-[48px] text-base font-semibold rounded-md justify-center"
              >
                保存记录
              </button>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl grid place-items-center mx-auto mb-6">
                <TrendingUp size={32} style={{color: 'var(--primary)'}} aria-hidden="true" />
              </div>
              <h4 className="text-xl font-bold mb-3" style={{color: 'var(--text)'}}>投资交易记录</h4>
              <p className="mb-6" style={{color: 'var(--text-muted)'}}>投资交易需要更多信息，请前往投资页面记录</p>
              <Link
                to="/investment"
                onClick={onClose}
                className="btn-primary mx-auto px-6 no-underline inline-flex"
              >
                前往投资页面
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
