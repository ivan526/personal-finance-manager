import { useState, useEffect } from 'react'
import type { Transaction, TransactionCategory } from '../../types'
import { loadState, saveState } from '../../store'
import { Edit2, Trash2, Filter } from 'lucide-react'
import TransactionForm from './TransactionForm'

const TransactionList = () => {
  const [state, setState] = useState(loadState())
  const [showForm, setShowForm] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | undefined>()
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7))
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => {
    setState(loadState())
  }, [])

  const getCategory = (categoryId: string): TransactionCategory | undefined => {
    return state.categories.find(c => c.id === categoryId)
  }

  const filteredTransactions = state.transactions.filter(t => {
    const matchType = filterType === 'all' || t.type === filterType
    const matchMonth = t.date.startsWith(filterMonth)
    const matchCategory = filterCategory === 'all' || t.categoryId === filterCategory
    return matchType && matchMonth && matchCategory
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      const updatedTransactions = state.transactions.filter(t => t.id !== id)
      saveState({ ...state, transactions: updatedTransactions })
      setState(loadState())
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditTransaction(transaction)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setState(loadState())
    setEditTransaction(undefined)
  }

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  const balance = totalIncome - totalExpense

  const categories = [...new Set(filteredTransactions.map(t => t.categoryId))].map(id => getCategory(id)).filter(Boolean) as TransactionCategory[]

  return (
    <div className="content">
      <div className="flex justify-between items-center mb-6">
        <div className="card-head">
          <div>
            <h3 className="text-2xl font-bold">收支记录</h3>
            <p className="text-gray-600">买卖、收入、支出统一管理，支持导入导出</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn primary"
        >
          <span>+ 记一笔</span>
        </button>
      </div>

      <div className="grid-3 mb-6">
        <div className="card metric">
          <div>
            <div className="metric-top">
              <div className="metric-icon" style={{ background: '#ecfdf5', color: '#059669' }}>↗</div>
              <span className="pill green">收入</span>
            </div>
            <div className="name">总收入</div>
            <div className="num text-green-600">¥{totalIncome.toFixed(2)}</div>
          </div>
        </div>
        <div className="card metric">
          <div>
            <div className="metric-top">
              <div className="metric-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>↘</div>
              <span className="pill red">支出</span>
            </div>
            <div className="name">总支出</div>
            <div className="num text-red-600">¥{totalExpense.toFixed(2)}</div>
          </div>
        </div>
        <div className="card metric">
          <div>
            <div className="metric-top">
              <div className="metric-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>¥</div>
              <span className={`pill ${balance >= 0 ? 'green' : 'red'}`}>结余</span>
            </div>
            <div className="name">本月结余</div>
            <div className={`num ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ¥{balance.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Filter size={18} className="text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="border rounded px-2 py-1 text-sm h-10 rounded-lg bg-white"
              >
                <option value="all">全部类型</option>
                <option value="income">仅收入</option>
                <option value="expense">仅支出</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="border rounded px-2 py-1 text-sm h-10 rounded-lg bg-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border rounded px-2 py-1 text-sm h-10 rounded-lg bg-white"
              >
                <option value="all">全部分类</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>暂无收支记录，点击右上角「记一笔」添加第一条记录吧~</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-gray-600">日期</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-600">类型</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-600">分类</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-600">金额</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-600">备注</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTransactions.map(t => {
                    const category = getCategory(t.categoryId)
                    return (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="p-4 text-sm text-gray-900">{t.date}</td>
                        <td className="p-4 text-sm">
                          <span className={`pill ${t.type === 'income' ? 'green' : 'red'}`}>
                            {t.type === 'income' ? '收入' : '支出'}
                          </span>
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <span>{category?.icon}</span>
                            <span>{category?.name}</span>
                          </div>
                        </td>
                        <td className={`p-4 text-sm text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'income' ? '+' : '-'}¥{t.amount.toFixed(2)}
                        </td>
                        <td className="p-4 text-sm text-gray-600">{t.remark || '-'}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(t)}
                              className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                              title="编辑"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="删除"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <TransactionForm
          onClose={() => { setShowForm(false); setEditTransaction(undefined) }}
          onSuccess={handleFormSuccess}
          editTransaction={editTransaction}
        />
      )}
    </div>
  )
}

export default TransactionList
