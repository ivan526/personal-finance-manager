import { useState, useEffect } from 'react'
import { Edit2, Trash2, Target, Calendar, Coins, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react'
import type { FinancialGoal } from '../types'
import { storage } from '../utils/storage'
import { useNumberAnimation, formatCurrency } from '../hooks/useNumberAnimation'

const GOAL_ICONS = [
  { value: '🏠', label: '买房' },
  { value: '🚗', label: '买车' },
  { value: '🎓', label: '教育金' },
  { value: '🏖️', label: '旅行' },
  { value: '👵', label: '养老' },
  { value: '💍', label: '结婚' },
  { value: '💻', label: '数码产品' },
  { value: '💰', label: '储蓄' },
  { value: '🎁', label: '礼物' },
  { value: '其他', label: '其他' },
] as const

const GOAL_COLORS = [
  '#165DFF', // 蓝色
  '#00B42A', // 绿色
  '#FF7D00', // 橙色
  '#F53F3F', // 红色
  '#722ED1', // 紫色
  '#FFC53D', // 黄色
  '#13C2C2', // 青色
  '#EB0AA4', // 粉色
] as const

interface Props {
  className?: string
}

export default function Goals({ className }: Props) {
  const [goals, setGoals] = useState<FinancialGoal[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    targetAmount: number
    currentAmount: number
    targetDate: string
    description: string
    icon: string
    color: string
  }>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 10),
    description: '',
    icon: '💰',
    color: GOAL_COLORS[0],
  })

  useEffect(() => {
    loadGoals()
  }, [])

  const loadGoals = () => {
    const goals = storage.getFinancialGoals()
    setGoals(goals.sort((a, b) => {
      // 未完成的排在前面，按截止日期排序
      if (a.isCompleted === b.isCompleted) {
        return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
      }
      return a.isCompleted ? 1 : -1
    }))
  }

  // 计算每个目标的统计信息
  const calculateGoalStats = (goal: FinancialGoal) => {
    const now = Date.now()
    const targetDate = goal.targetDate
    const startDate = goal.createdAt

    const totalDays = Math.ceil((targetDate - startDate) / (1000 * 60 * 60 * 24))
    const passedDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))
    const remainingDays = Math.max(0, Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24)))

    const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
    const expectedProgress = Math.min(100, (passedDays / totalDays) * 100)
    
    // 每月需要储蓄的金额
    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount)
    const monthlySaving = remainingDays > 0 
      ? remainingAmount / Math.ceil(remainingDays / 30) 
      : 0

    // 状态判断
    let status: 'on_track' | 'behind' | 'completed' | 'overdue' = 'on_track'
    if (goal.isCompleted) {
      status = 'completed'
    } else if (remainingDays <= 0) {
      status = 'overdue'
    } else if (progress < expectedProgress * 0.9) {
      status = 'behind'
    }

    return {
      progress,
      expectedProgress,
      remainingDays,
      monthlySaving,
      status,
      passedDays,
      totalDays,
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || formData.targetAmount <= 0) {
      alert('请填写完整信息')
      return
    }

    const targetDate = new Date(formData.targetDate).getTime()
    if (targetDate <= Date.now()) {
      alert('目标截止日期必须晚于当前时间')
      return
    }

    if (editingGoal) {
      // 编辑
      const updated: FinancialGoal = {
        ...editingGoal,
        ...formData,
        targetDate,
        isCompleted: formData.currentAmount >= formData.targetAmount,
        updatedAt: Date.now(),
      }
      storage.updateFinancialGoal(updated)
    } else {
      // 新增
      const newGoal: FinancialGoal = {
        id: Date.now().toString(),
        ...formData,
        targetDate,
        isCompleted: formData.currentAmount >= formData.targetAmount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      storage.addFinancialGoal(newGoal)
    }

    loadGoals()
    resetForm()
    setShowAddModal(false)
    setEditingGoal(null)
  }

  const handleEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal)
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: new Date(goal.targetDate).toISOString().slice(0, 10),
      description: goal.description || '',
      icon: goal.icon,
      color: goal.color,
    })
    setShowAddModal(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个理财目标吗？')) {
      storage.deleteFinancialGoal(id)
      loadGoals()
    }
  }

  const toggleComplete = (goal: FinancialGoal) => {
    const updated: FinancialGoal = {
      ...goal,
      isCompleted: !goal.isCompleted,
      updatedAt: Date.now(),
    }
    storage.updateFinancialGoal(updated)
    loadGoals()
  }

  const resetForm = () => {
    setFormData({
      name: '',
      targetAmount: 0,
      currentAmount: 0,
      targetDate: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 10),
      description: '',
      icon: '💰',
      color: GOAL_COLORS[0],
    })
  }

  // 计算总统计数据
  const totalGoals = goals.length
  const completedGoals = goals.filter(g => g.isCompleted).length
  const totalTargetAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0)
  const totalSavedAmount = goals.reduce((sum, g) => sum + g.currentAmount, 0)
  const overallProgress = totalTargetAmount > 0 ? (totalSavedAmount / totalTargetAmount) * 100 : 0

  const animatedTotalTarget = useNumberAnimation(totalTargetAmount, 1500, formatCurrency)
  const animatedTotalSaved = useNumberAnimation(totalSavedAmount, 1500, formatCurrency)
  const animatedOverallProgress = useNumberAnimation(overallProgress, 1500, (v) => v.toFixed(1))

  const getStatusText = (status: string) => {
    const map: Record<string, { text: string; color: string; icon: React.ReactElement }> = {
      on_track: { text: '进展顺利', color: 'text-green-600 bg-green-50', icon: <CheckCircle size={16} className="text-green-600" /> },
      behind: { text: '进度落后', color: 'text-amber-600 bg-amber-50', icon: <AlertCircle size={16} className="text-amber-600" /> },
      completed: { text: '已完成', color: 'text-blue-600 bg-blue-50', icon: <CheckCircle size={16} className="text-blue-600" /> },
      overdue: { text: '已逾期', color: 'text-red-600 bg-red-50', icon: <AlertCircle size={16} className="text-red-600" /> },
    }
    return map[status] || map.on_track
  }

  return (
    <div className={`animate-fade-in ${className || ''}`}>
      {/* 统计卡片 */}
      <div className="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <div className="bg-white border rounded-[14px] p-8 relative overflow-hidden" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center icon-spin-hover">
              <Target size={32} style={{color: 'var(--primary)'}} />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold mb-4" style={{color: 'var(--text)'}}>目标总数</div>
              <div className="text-[35px] font-black mb-6 number leading-none" style={{color: 'var(--text)'}}>
                {totalGoals}
              </div>
              <div className="text-base font-semibold" style={{color: 'var(--text-muted)'}}>已完成 {completedGoals} 个</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border rounded-[14px] p-8 relative overflow-hidden" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center icon-bounce-hover">
              <Coins size={32} className="text-purple-600" />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold mb-4" style={{color: 'var(--text)'}}>目标总金额</div>
              <div className="text-[35px] font-black text-purple-600 mb-6 number leading-none">
                ¥{animatedTotalTarget}
              </div>
              <div className="text-base font-semibold" style={{color: 'var(--text-muted)'}}>所有目标合计金额</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border rounded-[14px] p-8 relative overflow-hidden" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center icon-bounce-hover">
              <TrendingUp size={32} style={{color: 'var(--success)'}} />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold mb-4" style={{color: 'var(--text)'}}>已储蓄</div>
              <div className="text-[35px] font-black mb-6 number leading-none" style={{color: 'var(--success)'}}>
                ¥{animatedTotalSaved}
              </div>
              <div className="text-base font-semibold" style={{color: 'var(--text-muted)'}}>当前已存入金额</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(24,191,95,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border rounded-[14px] p-8 relative overflow-hidden" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center icon-scale-hover">
              <Target size={32} style={{color: 'var(--warning)'}} />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold mb-4" style={{color: 'var(--text)'}}>总进度</div>
              <div className="text-[35px] font-black mb-6 number leading-none" style={{color: 'var(--warning)'}}>
                {animatedOverallProgress}%
              </div>
              <div className="text-base font-semibold" style={{color: 'var(--text-muted)'}}>整体完成进度</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(255,146,15,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>
      </div>

      {/* 目标列表 */}
      <div className="bg-white border rounded-[13px] overflow-hidden mt-6" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
        <div className="h-[75px] flex items-center justify-between px-8 pt-6">
          <h3 className="text-xl font-extrabold" style={{color: 'var(--text)'}}>我的理财目标</h3>
          <button
            onClick={() => {
              resetForm()
              setEditingGoal(null)
              setShowAddModal(true)
            }}
            className="h-[42px] px-6 rounded-lg border-0 text-white bg-gradient-to-b from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 flex items-center gap-2 text-base font-bold"
          >
            <span className="text-2xl font-normal mt-[-2px]" aria-hidden="true">＋</span>
            新增目标
          </button>
        </div>

        <div className="p-8 pt-0">
          {goals.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center empty-state">
              <div className="w-[205px] h-[134px] mb-3">
                <svg viewBox="0 0 205 134" width="205" height="134" fill="none">
                  <ellipse cx="102" cy="110" rx="70" ry="13" fill="#eef6ff"/>
                  <path d="M45 79c-8-30 13-48 42-44 10 1 18 4 30 7 23 5 42 1 49 19 7 17-2 38-23 46-22 8-54 5-75-3-13-5-19-13-23-25Z" fill="#f2f8ff"/>
                  <path d="M42 70c3-26 24-39 53-29 25 8 42 7 59-3" stroke="#9ec8ff" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round"/>
                  <g filter="url(#goal-shadow)">
                    <path d="M82 34 147 47c5 1 8 5 7 10l-12 50c-1 5-6 8-11 7L66 101c-5-1-8-6-7-11l12-48c1-6 6-9 11-8Z" fill="#73a7ff"/>
                    <path d="M82 42 146 55c4 .8 7 4.8 6 8.9l-9.4 38.5c-.9 4.2-5 6.8-9.2 6L69 95.8c-4.2-.9-6.8-5-5.9-9.2L72.5 48c.9-4.2 5.1-6.8 9.5-6Z" fill="#8db9ff"/>
                    <path d="M93 47 150 58c4 .8 6.7 4.7 5.9 8.7l-7.4 37.6c-.8 4-4.7 6.6-8.7 5.8L82.8 99c-4-.8-6.7-4.7-5.9-8.7l7.4-37.6c.8-4.1 4.7-6.7 8.7-5.9Z" fill="#6da3f9"/>
                    <path d="M122 76h35c4 0 7 3 7 7v13c0 4-3 7-7 7h-35c-4 0-7-3-7-7V83c0-4 3-7 7-7Z" fill="#d7e8ff"/>
                    <circle cx="127" cy="89" r="5" fill="#367cff"/>
                  </g>
                  <circle cx="154" cy="105" r="10" fill="#367cff"/>
                  <path d="M154 100v10M149 105h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  <defs>
                    <filter id="goal-shadow" x="47" y="25" width="129" height="101" filterUnits="userSpaceOnUse">
                      <feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#6ea7ff" floodOpacity=".28"/>
                    </filter>
                  </defs>
                </svg>
              </div>
              <p className="text-xl font-extrabold mt-1" style={{color: 'var(--text)'}}>暂无理财目标</p>
              <p className="text-lg mt-5 font-medium" style={{color: 'var(--text-muted)'}}>点击右上角添加您的第一个理财目标吧</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
              {goals.map(goal => {
                const stats = calculateGoalStats(goal)
                const statusInfo = getStatusText(stats.status)
                return (
                  <div 
                    key={goal.id} 
                    className={`glass-card p-4  transition-all relative ${
                      goal.isCompleted ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-full text-2xl grid place-items-center"
                          style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                        >
                          {goal.icon}
                        </div>
                        <div>
                          <div className="font-medium text-lg" style={{color: 'var(--text)'}}>{goal.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${statusInfo.color}`}>
                              {statusInfo.icon}
                              {statusInfo.text}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleComplete(goal)}
                          aria-label={goal.isCompleted ? '标记为未完成' : '标记为已完成'}
                          className="w-8 h-8 flex items-center justify-center text-green-600 hover:bg-green-50 rounded-sm transition-all"
                        >
                          <CheckCircle size={16} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleEdit(goal)}
                          aria-label="编辑目标"
                          className="w-8 h-8 flex items-center justify-center hover:bg-blue-50 rounded-sm transition-all" style={{color: 'var(--primary)'}}
                        >
                          <Edit2 size={16} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          aria-label="删除目标"
                          className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-sm transition-all" style={{color: 'var(--danger)'}}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm" style={{color: 'var(--text-muted)'}}>目标金额</div>
                          <div className="text-xl font-bold number" style={{color: 'var(--text)'}}>
                            ¥{goal.targetAmount.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm" style={{color: 'var(--text-muted)'}}>已存</div>
                          <div className="text-xl font-bold number" style={{color: 'var(--primary)'}}>
                            ¥{goal.currentAmount.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* 进度条 */}
                      <div className="relative pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm font-medium" style={{color: 'var(--text)'}}>
                            进度 {stats.progress.toFixed(1)}%
                          </div>
                          <div className="text-sm flex items-center gap-1" style={{color: 'var(--text-muted)'}}>
                            <Calendar size={14} />
                            {stats.remainingDays > 0 
                              ? `剩余 ${stats.remainingDays} 天` 
                              : '已过期'
                            }
                          </div>
                        </div>
                        <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-100">
                          <div
                            style={{ 
                              width: `${stats.progress}%`, 
                              backgroundColor: goal.color,
                              transition: 'width 1s ease-in-out'
                            }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center"
                          ></div>
                        </div>
                        {/* 预期进度线 */}
                        {!goal.isCompleted && stats.status !== 'overdue' && (
                          <div 
                            className="absolute top-0 h-6 w-0.5 bg-gray-400 border-dashed border-l-2"
                            style={{ left: `${stats.expectedProgress}%` }}
                          >
                            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                              预期 {stats.expectedProgress.toFixed(0)}%
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 每月需要储蓄 */}
                      {!goal.isCompleted && stats.remainingDays > 0 && stats.monthlySaving > 0 && (
                        <div className="bg-blue-50 border border-blue-100 rounded-sm p-2 text-sm text-blue-700 flex items-center gap-2">
                          <Coins size={14} />
                          <span>每月需储蓄 ¥{stats.monthlySaving.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} 即可达成目标</span>
                        </div>
                      )}

                      {goal.description && (
                        <div className="text-sm mt-2" style={{color: 'var(--text-muted)'}}>
                          {goal.description}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 添加/编辑弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 animate-slide-up max-h-[90vh] overflow-y-auto" style={{boxShadow: 'var(--shadow-lg)'}}>
            <h3 className="text-xl font-bold mb-4" style={{color: 'var(--text)'}}>
              {editingGoal ? '编辑理财目标' : '新增理财目标'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                    目标名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-glass w-full"
                    placeholder="例如：买房首付"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                    目标图标
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {GOAL_ICONS.map(icon => (
                      <button
                        key={icon.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: icon.value })}
                        className={`w-10 h-10 rounded-full text-xl grid place-items-center transition-all ${
                          formData.icon === icon.value 
                            ? 'bg-blue-100 border-2 border-blue-500' 
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        title={icon.label}
                      >
                        {icon.value}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                    目标颜色
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {GOAL_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full transition-all ${
                          formData.color === color 
                            ? 'ring-2 ring-offset-2 ring-gray-400' 
                            : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                    截止日期 *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className="input-glass w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                    目标总金额 *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={formData.targetAmount || ''}
                    onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
                    className="input-glass w-full"
                    placeholder="请输入目标总金额"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                    当前已存金额
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.currentAmount || ''}
                    onChange={(e) => setFormData({ ...formData, currentAmount: Number(e.target.value) })}
                    className="input-glass w-full"
                    placeholder="请输入已存储金额"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                  目标描述（可选）
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-glass w-full min-h-[80px]"
                  placeholder="描述一下这个目标的详细信息"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingGoal(null)
                  }}
                  className="flex-1 px-4 py-2.5 border rounded-sm  transition-all" style={{borderColor: 'var(--border)', color: 'var(--text)'}}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  {editingGoal ? '保存修改' : '添加目标'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}