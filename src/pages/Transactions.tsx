import { useEffect, useState } from 'react'
import { Edit2, Trash2, Filter } from 'lucide-react'
import type { Transaction } from '../types'
import { storage } from '../utils/storage'
import { DEFAULT_CATEGORIES } from '../constants/categories'
import AddTransactionModal from '../components/AddTransactionModal'

interface Props {
  className?: string
}

export default function Transactions({ className }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterMonth, setFilterMonth] = useState(
    new Date().toISOString().slice(0, 7)
  )
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    loadTransactions()
  }, [filterType, filterCategory, filterMonth])

  const loadTransactions = () => {
    let data = storage.getTransactions()

    // 类型筛选
    if (filterType !== 'all') {
      data = data.filter(t => t.type === filterType)
    }

    // 分类筛选
    if (filterCategory !== 'all') {
      data = data.filter(t => t.categoryId === filterCategory)
    }

    // 月份筛选
    data = data.filter(t => {
      const date = new Date(t.time)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      return month === filterMonth
    })

    setTransactions(data)
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      storage.deleteTransaction(id)
      loadTransactions()
    }
  }

  const getCategoryInfo = (categoryId: string) => {
    return DEFAULT_CATEGORIES.find(c => c.id === categoryId)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className={`animate-fade-in ${className || ''}`}>
      {/* 筛选栏 */}
      <div className="bg-white border rounded-[13px] p-8 mt-8" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} style={{color: 'var(--text-muted)'}} />
            <span className="font-medium" style={{color: 'var(--text)'}}>筛选：</span>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="input-glass px-3 py-2 rounded-sm text-sm"
          >
            <option value="all">全部类型</option>
            <option value="income">仅收入</option>
            <option value="expense">仅支出</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-glass px-3 py-2 rounded-sm text-sm"
          >
            <option value="all">全部分类</option>
            {DEFAULT_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="input-glass px-3 py-2 rounded-sm text-sm"
          />

          <div className="ml-auto flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span style={{color: 'var(--text-muted)'}}>收入：</span>
              <span className="font-bold text-lg number" style={{color: 'var(--success)'}}>¥{totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{color: 'var(--text-muted)'}}>支出：</span>
              <span className="font-bold text-lg number" style={{color: 'var(--danger)'}}>¥{totalExpense.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{color: 'var(--text-muted)'}}>结余：</span>
              <span className="font-bold text-lg number" style={{color: totalIncome - totalExpense >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                ¥{(totalIncome - totalExpense).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 交易列表 */}
      <div className="bg-white border rounded-[13px] overflow-hidden mt-6" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)'}}>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>时间</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>类型</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>分类</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>金额</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>备注</th>
                <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>操作</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center empty-state">
                    <p className="text-lg font-medium" style={{color: 'var(--text)'}}>暂无交易记录</p>
                    <p className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>点击右上角「记一笔」开始记录您的第一笔收支</p>
                  </td>
                </tr>
              ) : (
                transactions.map(transaction => {
                  const category = getCategoryInfo(transaction.categoryId)
                  return (
                    <tr key={transaction.id} className="border-b transition-all" style={{borderColor: 'var(--border)'}}>
                      <td className="px-5 py-4 text-sm" style={{color: 'var(--text-muted)'}}>
                        {formatDate(transaction.time)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${transaction.type === 'income' ? 'bg-green-50' : 'bg-red-50'}`}
                          style={{color: transaction.type === 'income' ? 'var(--success)' : 'var(--danger)'}}
                        >
                          {transaction.type === 'income' ? '收入' : '支出'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{category?.icon}</span>
                          <span className="font-medium" style={{color: 'var(--text)'}}>{category?.name}</span>
                        </div>
                      </td>
                      <td
                        className="px-5 py-4 font-bold text-lg number"
                        style={{color: transaction.type === 'income' ? 'var(--success)' : 'var(--danger)'}}
                      >
                        {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-sm" style={{color: 'var(--text-muted)'}}>
                        {transaction.remark || '-'}
                      </td>
                       <td className="px-5 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <button
                             className="w-10 h-10 flex items-center justify-center hover:bg-blue-50 rounded-sm transition-all"
                             style={{color: 'var(--primary)'}}
                             onClick={() => {
                               setEditingTransaction(transaction)
                               setShowEditModal(true)
                             }}
                             aria-label="编辑交易记录"
                           >
                             <Edit2 size={18} aria-hidden="true" />
                           </button>
                           <button
                             onClick={() => handleDelete(transaction.id)}
                             className="w-10 h-10 flex items-center justify-center hover:bg-red-50 rounded-sm transition-all"
                             style={{color: 'var(--danger)'}}
                             aria-label="删除交易记录"
                           >
                             <Trash2 size={18} aria-hidden="true" />
                           </button>
                         </div>
                       </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑弹窗 */}
      {showEditModal && (
        <AddTransactionModal
          onClose={() => {
            setShowEditModal(false)
            setEditingTransaction(null)
          }}
          editTransaction={editingTransaction}
        />
      )}
    </div>
  )
 }
