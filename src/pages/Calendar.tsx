import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, AlertCircle, Coins, CreditCard, TrendingUp, Target } from 'lucide-react'
import { storage } from '../utils/storage'
import type { InvestmentTransaction, Liability, FinancialGoal } from '../types'

interface CalendarEvent {
  id: string
  date: Date
  type: 'dividend' | 'repayment' | 'investment' | 'goal' | 'other'
  title: string
  description: string
  amount?: number
  priority: 'high' | 'medium' | 'low'
}

interface Props {
  className?: string
}

// 生成日历的天数
const generateCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: Date[] = []

  // 添加上个月的最后几天
  const firstDayOfWeek = firstDay.getDay()
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }

  // 添加当月的天
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }

  // 添加下个月的前几天，补全6行
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i))
  }

  return days
}

// 获取当月第一天和最后一天
const getMonthRange = (year: number, month: number) => {
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 0, 23, 59, 59)
  }
}

export default function Calendar({ className }: Props) {
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth()
  })
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(today)
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEvent[]>([])

  const calendarDays = generateCalendarDays(selectedMonth.year, selectedMonth.month)
  const monthName = new Date(selectedMonth.year, selectedMonth.month).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })

  // 加载所有事件
  useEffect(() => {
    loadEvents()
  }, [selectedMonth])

  // 选择日期时加载当天事件
  useEffect(() => {
    if (selectedDate) {
      const dateStr = selectedDate.toDateString()
      const dayEvents = events.filter(e => e.date.toDateString() === dateStr)
      setSelectedDateEvents(dayEvents)
    }
  }, [selectedDate, events])

  const loadEvents = () => {
    const { start, end } = getMonthRange(selectedMonth.year, selectedMonth.month)
    const events: CalendarEvent[] = []

    // 1. 投资交易中的分红、利息、定投事件
    const investmentTransactions = storage.getInvestmentTransactions()
    investmentTransactions.forEach(t => {
      const tDate = new Date(t.time)
      if (tDate >= start && tDate <= end) {
        if (t.type === 'dividend') {
          events.push({
            id: `div_${t.id}`,
            date: tDate,
            type: 'dividend',
            title: `${t.name} 分红到账`,
            description: `账户：${storage.getAccounts().find(a => a.id === t.accountId)?.name || '未知账户'}`,
            amount: t.amount,
            priority: 'high'
          })
        } else if (t.type === 'interest') {
          events.push({
            id: `int_${t.id}`,
            date: tDate,
            type: 'dividend',
            title: `${t.name} 利息到账`,
            description: `账户：${storage.getAccounts().find(a => a.id === t.accountId)?.name || '未知账户'}`,
            amount: t.amount,
            priority: 'medium'
          })
        }
      }
    })

    // 2. 负债还款日提醒
    const liabilities = storage.getLiabilities()
    liabilities.forEach(liability => {
      // 简单模拟还款日：每月10号为还款日
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDate() === 10) {
          const monthlyPayment = liability.balance / 12 // 简单计算月供
          events.push({
            id: `repay_${liability.id}_${d.getTime()}`,
            date: new Date(d),
            type: 'repayment',
            title: `${liability.name} 还款日`,
            description: `剩余待还：¥${liability.balance.toLocaleString()}，年利率：${liability.interestRate}%`,
            amount: monthlyPayment,
            priority: 'high'
          })
        }
      }
    })

    // 3. 定投提醒（假设每月1号定投）
    const accounts = storage.getAccounts().filter(a => a.isInvestment)
    accounts.forEach(account => {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDate() === 1) {
          events.push({
            id: `invest_${account.id}_${d.getTime()}`,
            date: new Date(d),
            type: 'investment',
            title: `${account.name} 定投日`,
            description: '记得按时投入约定金额哦',
            priority: 'medium'
          })
        }
      }
    })

    // 4. 理财目标截止提醒
    const goals = storage.getFinancialGoals().filter(g => !g.isCompleted)
    goals.forEach(goal => {
      const goalDate = new Date(goal.targetDate)
      if (goalDate >= start && goalDate <= end) {
        events.push({
          id: `goal_${goal.id}`,
          date: goalDate,
          type: 'goal',
          title: `目标"${goal.name}"截止`,
          description: `当前进度：${((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)}%，还需储蓄：¥${Math.max(0, goal.targetAmount - goal.currentAmount).toLocaleString()}`,
          priority: 'high'
        })
      }

      // 提前7天提醒
      const remindDate = new Date(goal.targetDate)
      remindDate.setDate(remindDate.getDate() - 7)
      if (remindDate >= start && remindDate <= end) {
        events.push({
          id: `goal_remind_${goal.id}`,
          date: remindDate,
          type: 'goal',
          title: `目标"${goal.name}"即将截止`,
          description: `距离目标日期还有7天，请检查进度`,
          priority: 'high'
        })
      }
    })

    setEvents(events)
  }

  // 获取某天的事件
  const getDayEvents = (date: Date) => {
    const dateStr = date.toDateString()
    return events.filter(e => e.date.toDateString() === dateStr)
  }

  // 检查日期是否是当月
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === selectedMonth.month && date.getFullYear() === selectedMonth.year
  }

  // 检查是否是今天
  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  // 上一个月
  const prevMonth = () => {
    setSelectedMonth(prev => {
      const newMonth = prev.month - 1
      if (newMonth < 0) {
        return { year: prev.year - 1, month: 11 }
      }
      return { ...prev, month: newMonth }
    })
  }

  // 下一个月
  const nextMonth = () => {
    setSelectedMonth(prev => {
      const newMonth = prev.month + 1
      if (newMonth > 11) {
        return { year: prev.year + 1, month: 0 }
      }
      return { ...prev, month: newMonth }
    })
  }

  // 回到今天
  const goToToday = () => {
    setSelectedMonth({ year: today.getFullYear(), month: today.getMonth() })
    setSelectedDate(today)
  }

  // 获取事件类型对应的图标和颜色
  const getEventStyle = (type: string) => {
    const map: Record<string, { icon: React.ReactElement, color: string, bgColor: string }> = {
      dividend: { icon: <Coins size={14} />, color: 'text-amber-600', bgColor: 'bg-amber-50' },
      repayment: { icon: <CreditCard size={14} />, color: 'text-red-600', bgColor: 'bg-red-50' },
      investment: { icon: <TrendingUp size={14} />, color: 'text-blue-600', bgColor: 'bg-blue-50' },
      goal: { icon: <Target size={14} />, color: 'text-purple-600', bgColor: 'bg-purple-50' },
      other: { icon: <AlertCircle size={14} />, color: 'text-gray-600', bgColor: 'bg-gray-50' },
    }
    return map[type] || map.other
  }

  return (
    <div className={`animate-fade-in ${className || ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* 日历部分 */}
        <div className="lg:col-span-2 bg-white border style={{borderColor: 'var(--border)'}} rounded-[13px] style={{boxShadow: 'var(--shadow)'}} p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={prevMonth}
                className="w-10 h-10 rounded-lg hover:style={{backgroundColor: 'var(--bg-soft)'}} flex items-center justify-center transition-all"
              >
                ‹
              </button>
              <h2 className="text-2xl font-bold style={{color: 'var(--text)'}}">{monthName}</h2>
              <button
                onClick={nextMonth}
                className="w-10 h-10 rounded-lg hover:style={{backgroundColor: 'var(--bg-soft)'}} flex items-center justify-center transition-all"
              >
                ›
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
              >
                今天
              </button>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-100 border border-blue-500"></div>
                <span className="style={{color: 'var(--text-muted)'}}">投资</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-100 border border-amber-500"></div>
                <span className="style={{color: 'var(--text-muted)'}}">分红</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-100 border border-red-500"></div>
                <span className="style={{color: 'var(--text-muted)'}}">还款</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-100 border border-purple-500"></div>
                <span className="style={{color: 'var(--text-muted)'}}">目标</span>
              </div>
            </div>
          </div>

          {/* 星期表头 */}
          <div className="grid grid-cols-7 mb-2">
            {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map(week => (
              <div key={week} className="text-center py-2 text-sm font-medium style={{color: 'var(--text-muted)'}}">
                {week}
              </div>
            ))}
          </div>

          {/* 日历格子 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayEvents = getDayEvents(day)
              const hasHighPriorityEvent = dayEvents.some(e => e.priority === 'high')

              return (
                <div
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[90px] p-1 border rounded-lg cursor-pointer transition-all relative ${
                    !isCurrentMonth(day)
                      ? 'bg-gray-50 text-gray-400 opacity-50'
                      : selectedDate?.toDateString() === day.toDateString()
                      ? 'border-blue-500 bg-blue-50'
                      : isToday(day)
                      ? 'border-blue-300 bg-blue-50/50'
                      : 'border-transparent hover:border-blue-200 hover:bg-blue-50/30'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-medium ${isToday(day) ? 'text-blue-600 font-bold' : ''}`}>
                      {day.getDate()}
                    </span>
                    {hasHighPriorityEvent && (
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    )}
                  </div>

                  {/* 事件预览 */}
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 2).map((event, i) => {
                      const style = getEventStyle(event.type)
                      return (
                        <div
                          key={i}
                          className={`text-xs px-1 py-0.5 rounded truncate ${style.bgColor} ${style.color} flex items-center gap-1`}
                        >
                          {style.icon}
                          <span className="truncate">{event.title}</span>
                        </div>
                      )
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-xs style={{color: 'var(--text-muted)'}} pl-1">
                        +{dayEvents.length - 2}更多
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 当日详情 */}
        <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[13px] style={{boxShadow: 'var(--shadow)'}} p-8">
          <div className="mb-6">
            <h3 className="text-xl font-bold style={{color: 'var(--text)'}} flex items-center gap-2">
              <CalendarIcon size={20} className="style={{color: 'var(--primary)'}}" />
              {selectedDate ? (
                <span>{selectedDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
              ) : (
                <span>请选择日期</span>
              )}
            </h3>
          </div>

          {selectedDateEvents.length === 0 ? (
            <div className="py-16 text-center empty-state">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-50 grid place-items-center">
                <Clock size={32} className="text-gray-400" />
              </div>
              <p className="text-lg font-medium style={{color: 'var(--text)'}}">今日没有日程</p>
              <p className="text-sm style={{color: 'var(--text-muted)'}} mt-1">
                还款日、分红、定投等提醒会自动显示在这里
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDateEvents.map(event => {
                const style = getEventStyle(event.type)
                return (
                  <div
                    key={event.id}
                    className={`border rounded-lg p-4 ${style.bgColor} border-opacity-50`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${style.bgColor} grid place-items-center ${style.color}`}>
                          {style.icon}
                        </div>
                        <div>
                          <h4 className="font-semibold style={{color: 'var(--text)'}}">{event.title}</h4>
                          <div className="text-xs style={{color: 'var(--text-muted)'}}">
                            {event.date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      {event.priority === 'high' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                          重要
                        </span>
                      )}
                    </div>
                    <p className="text-sm style={{color: 'var(--text-muted)'}} mb-2">
                      {event.description}
                    </p>
                    {event.amount && (
                      <div className="text-right">
                        <span className="text-lg font-bold number style={{color: 'var(--text)'}}">
                          ¥{event.amount.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* 统计信息 */}
          <div className="mt-8 pt-6 border-t style={{borderColor: 'var(--border)'}}">
            <h4 className="font-semibold style={{color: 'var(--text)'}} mb-4">本月统计</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="style={{color: 'var(--text-muted)'}}">待还款项</span>
                <span className="font-medium text-red-600">
                  {events.filter(e => e.type === 'repayment').length} 笔
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="style={{color: 'var(--text-muted)'}}">分红到账</span>
                <span className="font-medium text-amber-600">
                  {events.filter(e => e.type === 'dividend').length} 笔
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="style={{color: 'var(--text-muted)'}}">定投日</span>
                <span className="font-medium text-blue-600">
                  {events.filter(e => e.type === 'investment').length} 个
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="style={{color: 'var(--text-muted)'}}">目标截止</span>
                <span className="font-medium text-purple-600">
                  {events.filter(e => e.type === 'goal').length} 个
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}