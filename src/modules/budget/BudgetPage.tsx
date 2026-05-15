import { useState, useEffect } from 'react'
import type { Budget } from '../../types'
import { loadState, saveState } from '../../store'
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'

const BudgetPage = () => {
  const [state, setState] = useState(loadState())
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7))
  const [showAddForm, setShowAddForm] = useState(false)
  const [editBudget, setEditBudget] = useState<Budget | undefined>()
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    setState(loadState())
  }, [])

  const expenseCategories = state.categories.filter(c => c.type === 'expense')
  
  const getMonthSpent = (categoryId: string) => {
    return state.transactions
      .filter(t => t.type === 'expense' && t.categoryId === categoryId && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0)
  }

  const getCategoryBudget = (categoryId: string) => {
    return state.budgets.find(b => b.categoryId === categoryId && b.month === currentMonth)
  }

  const totalBudget = expenseCategories.reduce((sum, cat) => {
    const budget = getCategoryBudget(cat.id)
    return sum + (budget?.amount || 0)
  }, 0)

  const totalSpent = expenseCategories.reduce((sum, cat) => sum + getMonthSpent(cat.id), 0)

  const overallProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategoryId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert('请填写完整有效的信息')
      return
    }

    const existingBudget = getCategoryBudget(selectedCategoryId)
    let updatedBudgets: Budget[]

    if (editBudget) {
      updatedBudgets = state.budgets.map(b => 
        b.id === editBudget.id 
          ? { ...b, categoryId: selectedCategoryId, amount: Number(amount) }
          : b
      )
    } else if (existingBudget) {
      if (window.confirm('该分类本月已有预算，是否覆盖？')) {
        updatedBudgets = state.budgets.map(b => 
          b.id === existingBudget.id 
            ? { ...b, amount: Number(amount) }
            : b
        )
      } else {
        return
      }
    } else {
      const newBudget: Budget = {
        id: Date.now().toString(),
        categoryId: selectedCategoryId,
        amount: Number(amount),
        month: currentMonth,
        createdAt: new Date().toISOString()
      }
      updatedBudgets = [...state.budgets, newBudget]
    }

    saveState({ ...state, budgets: updatedBudgets })
    setState(loadState())
    setShowAddForm(false)
    setEditBudget(undefined)
    setSelectedCategoryId('')
    setAmount('')
  }

  const handleDeleteBudget = (id: string) => {
    if (window.confirm('确定要删除这个预算吗？')) {
      const updatedBudgets = state.budgets.filter(b => b.id !== id)
      saveState({ ...state, budgets: updatedBudgets })
      setState(loadState())
    }
  }

  const handleEditBudget = (budget: Budget) => {
    setEditBudget(budget)
    setSelectedCategoryId(budget.categoryId)
    setAmount(budget.amount.toString())
    setShowAddForm(true)
  }

  const getBudgetStatus = (spent: number, budget: number) => {
    const ratio = spent / budget
    if (ratio >= 1) return { text: '已超支', color: 'red', icon: <AlertTriangle size={16} className="text-red-500" /> }
    if (ratio >= 0.8) return { text: '即将超支', color: 'amber', icon: <AlertTriangle size={16} className="text-orange-500" /> }
    return { text: '正常', color: 'green', icon: <CheckCircle size={16} className="text-green-500" /> }
  }

  return (
    <div className="content">
      <div className="flex justify-between items-center mb-6">
        <div className="card-head">
          <div>
            <h3 className="text-2xl font-bold">预算管控</h3>
            <p className="text-gray-600">按分类设置月度预算，实时监控支出进度，超支预警提醒</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn primary"
        >
          <Plus size={18} />
          <span>新增预算</span>
        </button>
      </div>

      <div className="grid-3 mb-6">
        <div className="card metric">
          <div>
            <div className="metric-top">
              <div className="metric-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>¥</div>
              <span className="pill blue">总预算</span>
            </div>
            <div className="name">本月总预算</div>
            <div className="num text-blue-600">¥{totalBudget.toFixed(2)}</div>
          </div>
        </div>
        <div className="card metric">
          <div>
            <div className="metric-top">
              <div className="metric-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>↘</div>
              <span className="pill red">已支出</span>
            </div>
            <div className="name">已支出</div>
            <div className="num text-red-600">¥{totalSpent.toFixed(2)}</div>
          </div>
        </div>
        <div className="card metric">
          <div>
            <div className="metric-top">
              <div className="metric-icon" style={{ background: '#ecfdf5', color: '#059669' }}>↗</div>
              <span className={`pill ${totalBudget - totalSpent >= 0 ? 'green' : 'red'}`}>剩余</span>
            </div>
            <div className="name">剩余预算</div>
            <div className={`num ${totalBudget - totalSpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ¥{(totalBudget - totalSpent).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">整体进度</h3>
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="border rounded px-2 py-1 text-sm h-10 rounded-lg bg-white"
            />
          </div>
          <div className="progress mb-2">
            <span
              className={`${overallProgress >= 100 ? 'bg-red-500' : overallProgress >= 80 ? 'bg-orange-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(overallProgress, 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">已使用 {overallProgress.toFixed(1)}%</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-wrap">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">分类</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-600">预算金额</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-600">已支出</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-600">剩余金额</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">进度</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">状态</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenseCategories.map(cat => {
                  const budget = getCategoryBudget(cat.id)
                  const spent = getMonthSpent(cat.id)
                  const remaining = budget ? budget.amount - spent : 0
                  const progress = budget ? (spent / budget.amount) * 100 : 0
                  const status = budget ? getBudgetStatus(spent, budget.amount) : null

                  return (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="p-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-right font-medium">
                        {budget ? `¥${budget.amount.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-4 text-sm text-right text-red-600">
                        ¥{spent.toFixed(2)}
                      </td>
                      <td className={`p-4 text-sm text-right font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {budget ? `¥${remaining.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-4 text-sm">
                        {budget ? (
                          <div className="progress">
                            <span
                              className={`${progress >= 100 ? 'bg-red-500' : progress >= 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        ) : '-'}
                      </td>
                      <td className="p-4 text-sm">
                        {status && (
                          <div className="flex items-center space-x-1">
                            {status.icon}
                            <span className={`text-${status.color}-600`}>{status.text}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end space-x-2">
                          {budget ? (
                            <>
                              <button
                                onClick={() => handleEditBudget(budget)}
                                className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                title="编辑"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteBudget(budget.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                title="删除"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedCategoryId(cat.id)
                                setShowAddForm(true)
                              }}
                              className="btn primary text-xs h-8 px-2"
                            >
                              设置
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">{editBudget ? '编辑预算' : '新增预算'}</h3>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditBudget(undefined)
                  setSelectedCategoryId('')
                  setAmount('')
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <form onSubmit={handleSaveBudget} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择分类</option>
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">预算金额</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入预算金额"
                  autoFocus
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditBudget(undefined)
                    setSelectedCategoryId('')
                    setAmount('')
                  }}
                  className="flex-1 py-2 border rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button type="submit" className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BudgetPage
