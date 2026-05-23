import { useState, useEffect } from 'react'
import { Plus, Edit2, AlertTriangle, CheckCircle, History, ArrowRight } from 'lucide-react'
import { storage } from '../utils/storage'
import { useNumberAnimation, formatCurrency } from '../hooks/useNumberAnimation'
import type { Budget, Category } from '../types'

interface Props {
  className?: string
}

export default function Budget({ className }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  )
  const [viewMode, setViewMode] = useState<'current' | 'history'>('current')
  const [totalBudget, setTotalBudget] = useState(0)
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({})
  const [carryOverInfo, setCarryOverInfo] = useState<{ total: number; categories: Record<string, number> }>({ total: 0, categories: {} })
  const [isEditing, setIsEditing] = useState(false)
  const [editTotalBudget, setEditTotalBudget] = useState(0)
  const [editCategoryBudgets, setEditCategoryBudgets] = useState<Record<string, number>>({})
  const [historyData, setHistoryData] = useState<Array<{
    month: string
    totalBudget: number
    totalExpense: number
    remaining: number
    usage: number
  }>>([])
  const [categories, setCategories] = useState<Category[]>([])

  // 加载分类
  useEffect(() => {
    setCategories(storage.getCategories())
  }, [])

  // 获取当前月份支出统计
  const getCurrentMonthExpenses = () => {
    const transactions = storage.getTransactions()
    const expenses: Record<string, number> = {}
    let totalExpense = 0

    transactions.forEach(t => {
      const date = new Date(t.time)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (month === selectedMonth && t.type === 'expense') {
        expenses[t.categoryId] = (expenses[t.categoryId] || 0) + t.amount
        totalExpense += t.amount
      }
    })

    return { expenses, totalExpense }
  }

  const { expenses, totalExpense } = getCurrentMonthExpenses()

  useEffect(() => {
    loadBudgets()
  }, [selectedMonth])

  // 计算上月结转金额
  const calculateCarryOver = (month: string) => {
    const [year, monthNum] = month.split('-').map(Number)
    // 计算上个月
    const lastMonthDate = new Date(year, monthNum - 2, 1)
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
    
    const allBudgets = storage.getBudgets()
    const lastMonthBudgets = allBudgets.filter(b => b.month === lastMonth)
    
    // 计算上月总预算和实际支出
    const lastMonthTotalBudget = lastMonthBudgets.find(b => !b.categoryId)?.amount || 0
    const lastMonthTransactions = storage.getTransactions().filter(t => {
      const tMonth = new Date(t.time).toISOString().slice(0, 7)
      return tMonth === lastMonth && t.type === 'expense'
    })
    const lastMonthTotalExpense = lastMonthTransactions.reduce((sum, t) => sum + t.amount, 0)
    const totalCarryOver = Math.max(0, lastMonthTotalBudget - lastMonthTotalExpense)
    
    // 计算各分类的结转
    const categoryCarryOver: Record<string, number> = {}
    const lastMonthCategoryBudgets = lastMonthBudgets.filter(b => b.categoryId)
    lastMonthCategoryBudgets.forEach(budget => {
      const categoryExpense = lastMonthTransactions
        .filter(t => t.categoryId === budget.categoryId)
        .reduce((sum, t) => sum + t.amount, 0)
      const remaining = Math.max(0, budget.amount - categoryExpense)
      if (remaining > 0) {
        categoryCarryOver[budget.categoryId!] = remaining
      }
    })
    
    return {
      total: totalCarryOver,
      categories: categoryCarryOver,
      lastMonth
    }
  }

  const loadBudgets = () => {
    const allBudgets = storage.getBudgets()
    const monthBudgets = allBudgets.filter(b => b.month === selectedMonth)
    
    const total = monthBudgets.find(b => !b.categoryId)?.amount || 0
    const categories: Record<string, number> = {}
    monthBudgets.filter(b => b.categoryId).forEach(b => {
      categories[b.categoryId!] = b.amount
    })

    // 计算结转信息
    const carryOver = calculateCarryOver(selectedMonth)
    setCarryOverInfo(carryOver)

    setTotalBudget(total)
    setCategoryBudgets(categories)
    setEditTotalBudget(total)
    setEditCategoryBudgets({ ...categories })

    // 加载历史数据
    loadHistoryData()
  }

  // 加载近6个月历史预算数据
  const loadHistoryData = () => {
    const now = new Date()
    const history: typeof historyData = []
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      
      const budgets = storage.getBudgets().filter(b => b.month === month)
      const totalBudget = budgets.find(b => !b.categoryId)?.amount || 0
      
      const transactions = storage.getTransactions().filter(t => {
        const tMonth = new Date(t.time).toISOString().slice(0, 7)
        return tMonth === month && t.type === 'expense'
      })
      const totalExpense = transactions.reduce((sum, t) => sum + t.amount, 0)
      const remaining = Math.max(0, totalBudget - totalExpense)
      const usage = totalBudget > 0 ? (totalExpense / totalBudget) * 100 : 0
      
      history.push({
        month,
        totalBudget,
        totalExpense,
        remaining,
        usage
      })
    }
    
    setHistoryData(history)
  }

  const saveBudgets = () => {
    const allBudgets = storage.getBudgets()
    // 删除当前月份的旧预算
    let filtered = allBudgets.filter(b => b.month !== selectedMonth)
    
    // 询问是否结转上月余额
    if (carryOverInfo.total > 0) {
      const shouldCarryOver = confirm(`上月剩余预算 ¥${carryOverInfo.total.toLocaleString()}，是否结转到本月？`)
      if (shouldCarryOver) {
        // 结转总预算
        setEditTotalBudget(prev => prev + carryOverInfo.total)
        
        // 结转分类预算
        setEditCategoryBudgets(prev => {
          const updated = { ...prev }
          Object.entries(carryOverInfo.categories).forEach(([categoryId, amount]) => {
            updated[categoryId] = (updated[categoryId] || 0) + amount
          })
          return updated
        })
      }
    }
    
    // 添加新的总预算
    if (editTotalBudget > 0) {
      filtered.push({
        id: `${selectedMonth}-total`,
        amount: editTotalBudget,
        month: selectedMonth,
        carryOverFrom: carryOverInfo.total > 0 ? carryOverInfo.lastMonth : undefined,
        carryOverAmount: carryOverInfo.total > 0 ? carryOverInfo.total : undefined,
        updatedAt: Date.now()
      })
    }

    // 添加新的分类预算
    Object.entries(editCategoryBudgets).forEach(([categoryId, amount]) => {
      if (amount > 0) {
        filtered.push({
          id: `${selectedMonth}-${categoryId}`,
          categoryId,
          amount,
          month: selectedMonth,
          carryOverFrom: carryOverInfo.categories[categoryId] ? carryOverInfo.lastMonth : undefined,
          carryOverAmount: carryOverInfo.categories[categoryId],
          updatedAt: Date.now()
        })
      }
    })

    storage.saveBudgets(filtered)
    setTotalBudget(editTotalBudget)
    setCategoryBudgets(editCategoryBudgets)
    setIsEditing(false)
    loadBudgets() // 重新加载数据
  }

  const getBudgetUsage = (categoryId?: string) => {
    if (categoryId) {
      const budget = categoryBudgets[categoryId] || 0
      const expense = expenses[categoryId] || 0
      return budget > 0 ? (expense / budget) * 100 : 0
    } else {
      return totalBudget > 0 ? (totalExpense / totalBudget) * 100 : 0
    }
  }

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500'
    if (percent >= 80) return 'bg-amber-500'
    return 'bg-green-500'
  }

  const getStatusIcon = (percent: number) => {
    if (percent >= 100) return <AlertTriangle size={16} className="text-red-500" />
    if (percent >= 80) return <AlertTriangle size={16} className="text-amber-500" />
    return <CheckCircle size={16} className="text-green-500" />
  }

  const expenseCategories = categories.filter(c => c.type === 'expense')
  const totalUsage = getBudgetUsage()

  // 数字动画
  const animatedTotalBudget = useNumberAnimation(totalBudget, 1500, formatCurrency)
  const animatedTotalExpense = useNumberAnimation(totalExpense, 1500, formatCurrency)
  const animatedRemaining = useNumberAnimation(Math.max(0, totalBudget - totalExpense), 1500, formatCurrency)

  return (
    <div className={`animate-fade-in ${className || ''}`}>
      {/* 头部区域 */}
      <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[13px] style={{boxShadow: 'var(--shadow)'}} p-8 mt-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.25 font-extrabold text-[#17345c] text-lg">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d="M12 3 20 6v5c0 5.1-3.45 8.8-8 10-4.55-1.2-8-4.9-8-10V6l8-3Z" fill="#1d6eff"/>
                <path d="m8.5 12 2.1 2.1 4.9-5.1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>预算管理</span>
            </div>

            {/* 视图切换 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('current')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'current' 
                    ? 'bg-white shadow style={{color: 'var(--primary)'}}' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                当前预算
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'history' 
                    ? 'bg-white shadow style={{color: 'var(--primary)'}}' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-1">
                  <History size={14} />
                  历史对比
                </div>
              </button>
            </div>
          </div>

          {viewMode === 'current' && (
            <div className="flex items-center gap-4">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="input-glass px-3 py-2 rounded-sm"
              />
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="h-[42px] px-6 rounded-lg border-0 text-white bg-gradient-to-b from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 flex items-center gap-2 text-base font-bold"
                >
                   <Edit2 size={18} className="icon-scale-hover" />
                   设置预算
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      loadBudgets()
                    }}
                    className="px-4 py-2.5 border style={{borderColor: 'var(--border)'}} rounded-sm hover:style={{backgroundColor: 'var(--bg-soft)'}} transition-all style={{color: 'var(--text)'}} font-medium"
                  >
                    取消
                  </button>
                  <button
                    onClick={saveBudgets}
                    className="h-[42px] px-6 rounded-lg border-0 text-white bg-gradient-to-b from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 flex items-center gap-2 text-base font-bold"
                  >
                    保存
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {viewMode === 'current' ? (
          <>
            {/* 总预算卡片 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-100 rounded-[14px] p-8">
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <div className="text-base font-semibold style={{color: 'var(--text-muted)'}} mb-2">月度总预算</div>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editTotalBudget || ''}
                      onChange={(e) => setEditTotalBudget(Number(e.target.value))}
                      placeholder="设置总预算"
                      className="text-[35px] font-black style={{color: 'var(--primary)'}} bg-transparent border-b border-blue-300 focus:outline-none focus:border-blue-600 w-48"
                    />
                  ) : (
                    <div className="text-[35px] font-black style={{color: 'var(--primary)'}} leading-none">
                      ¥{animatedTotalBudget}
                    </div>
                  )}
                  {/* 结转信息 */}
                  {carryOverInfo.total > 0 && !isEditing && (
                    <div className="text-sm text-green-600 mt-2 flex items-center gap-1">
                      <ArrowRight size={14} />
                      包含上月结转 ¥{carryOverInfo.total.toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-base font-semibold style={{color: 'var(--text-muted)'}} mb-2">已支出</div>
                  <div className="text-[35px] font-black style={{color: 'var(--danger)'}} leading-none">
                    ¥{animatedTotalExpense}
                  </div>
                </div>
              </div>

              {/* 进度条 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-base font-medium">
                  <span className="style={{color: 'var(--text)'}}">使用进度</span>
                  <span>
                    {totalUsage.toFixed(1)}% 
                    {totalBudget > 0 && ` (剩余¥${animatedRemaining})`}
                  </span>
                </div>
                <div className="h-3 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(totalUsage)} transition-all`}
                    style={{ width: `${Math.min(100, totalUsage)}%` }}
                  ></div>
                </div>
                {totalUsage >= 80 && (
                  <div className={`text-sm flex items-center gap-2 font-medium ${
                    totalUsage >= 100 ? 'style={{color: 'var(--danger)'}}' : 'style={{color: 'var(--warning)'}}'
                  }`}>
                    <AlertTriangle size={16} />
                    {totalUsage >= 100 ? '已超出月度预算，请合理消费' : '月度预算已使用80%，请注意控制支出'}
                  </div>
                )}
              </div>
            </div>

            {/* 分类预算列表 */}
            <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[13px] style={{boxShadow: 'var(--shadow)'}} p-8 mt-6">
              <h3 className="text-xl font-extrabold style={{color: 'var(--text)'}} mb-6">分类预算</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {expenseCategories.map(category => {
                  const budget = isEditing ? editCategoryBudgets[category.id] || 0 : categoryBudgets[category.id] || 0
                  const expense = expenses[category.id] || 0
                  const usage = budget > 0 ? (expense / budget) * 100 : 0
                  const remaining = budget > 0 ? Math.max(0, budget - expense) : 0
                  const carryOver = carryOverInfo.categories[category.id] || 0

                  return (
                    <div key={category.id} className="border style={{borderColor: 'var(--border)'}} rounded-[14px] p-5 hover:border-blue-200 hover:style={{boxShadow: 'var(--shadow)'}} transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category.icon}</span>
                          <span className="font-semibold text-lg style={{color: 'var(--text)'}}">{category.name}</span>
                        </div>
                        {budget > 0 && getStatusIcon(usage)}
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="style={{color: 'var(--text-muted)'}}">
                            已支出：¥{expense.toLocaleString()}
                          </span>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <span className="style={{color: 'var(--text-muted)'}}">预算：</span>
                              <input
                                type="number"
                                value={editCategoryBudgets[category.id] || ''}
                                onChange={(e) => setEditCategoryBudgets({
                                  ...editCategoryBudgets,
                                  [category.id]: Number(e.target.value)
                                })}
                                placeholder="0"
                                className="w-20 text-right border-b style={{borderColor: 'var(--border)'}} focus:outline-none focus:border-[var(--primary)] bg-transparent font-medium"
                              />
                            </div>
                          ) : (
                            <span className="style={{color: 'var(--text)'}} font-medium">
                              预算：¥{budget.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {carryOver > 0 && !isEditing && (
                          <div className="text-xs text-green-600 mb-2">
                            包含上月结转 ¥{carryOver.toLocaleString()}
                          </div>
                        )}
                        {budget > 0 && (
                          <div className="flex items-center justify-between text-xs style={{color: 'var(--text-muted)'}}">
                            <span>使用率：{usage.toFixed(1)}%</span>
                            <span>剩余：¥{remaining.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {budget > 0 && (
                        <div className="h-2 style={{backgroundColor: 'var(--bg-soft)'}} rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(usage)} transition-all`}
                            style={{ width: `${Math.min(100, usage)}%` }}
                          ></div>
                        </div>
                      )}

                      {!isEditing && budget === 0 && (
                        <button
                          onClick={() => {
                            setIsEditing(true)
                            setEditCategoryBudgets(prev => ({
                              ...prev,
                              [category.id]: 0
                            }))
                          }}
                          className="w-full mt-3 text-sm style={{color: 'var(--primary)'}} hover:text-blue-700 flex items-center justify-center gap-1 font-medium py-2 rounded-sm hover:bg-blue-50 transition-all"
                        >
                          <Plus size={16} />
                          设置预算
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          // 历史对比视图
          <div className="space-y-6">
            <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[13px] style={{boxShadow: 'var(--shadow)'}} p-8">
              <h3 className="text-xl font-extrabold style={{color: 'var(--text)'}} mb-6">近6个月预算趋势</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="style={{backgroundColor: 'var(--bg-soft)'}} border-b style={{borderColor: 'var(--border)'}}">
                      <th className="text-left px-4 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">月份</th>
                      <th className="text-right px-4 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">预算金额</th>
                      <th className="text-right px-4 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">实际支出</th>
                      <th className="text-right px-4 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">剩余金额</th>
                      <th className="text-right px-4 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">使用率</th>
                      <th className="text-right px-4 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map(item => (
                      <tr key={item.month} className="border-b style={{borderColor: 'var(--border)'}} hover:style={{backgroundColor: 'var(--bg-soft)'}} transition-all">
                        <td className="px-4 py-4 text-sm font-medium style={{color: 'var(--text)'}}">
                          {item.month}
                        </td>
                        <td className="px-4 py-4 text-sm text-right number style={{color: 'var(--text)'}}">
                          ¥{item.totalBudget.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-right number style={{color: 'var(--danger)'}}">
                          ¥{item.totalExpense.toLocaleString()}
                        </td>
                        <td className={`px-4 py-4 text-sm text-right number font-medium ${
                          item.remaining > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.remaining > 0 ? '+' : ''}¥{item.remaining.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-right number">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getProgressColor(item.usage)}`}
                                style={{ width: `${Math.min(100, item.usage)}%` }}
                              ></div>
                            </div>
                            <span>{item.usage.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-right">
                          {item.usage >= 100 ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">已超支</span>
                          ) : item.usage >= 80 ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">接近预警</span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">健康</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-[14px] p-6">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <History size={18} className="text-blue-600" />
                预算滚动说明
              </h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>当月未使用完的预算会自动结转至下月，设置新月份预算时会提示是否结转</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>支持总预算和分类预算分别结转，保持预算使用的连续性</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>历史对比页面展示近6个月的预算使用情况，帮助您分析消费趋势</span>
                </li>
              </ul>
            </div>
          </div>
        )}
       </div>
     </div>
   )
 }
