
import { useState, useEffect } from 'react'
import { Edit2, Trash2, Filter, TrendingUp, TrendingDown, DollarSign, Coins, ArrowUpRight, ArrowDownRight, Wallet, RefreshCw, Loader2 } from 'lucide-react'
import { storage } from '../utils/storage'
import type { InvestmentTransaction, Account } from '../types'
import { useNumberAnimation, formatCurrency } from '../hooks/useNumberAnimation'

const API_BASE = (() => {
  // Tauri 环境检测：window.__TAURI__ 存在即为 Tauri 运行时
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    return 'http://127.0.0.1:8000'
  }
  return 'http://localhost:8000'
})()

const TRANSACTION_TYPES = [
  { value: 'buy', label: '买入', icon: <ArrowDownRight size={18} />, color: 'text-red-600 bg-red-50' },
  { value: 'sell', label: '卖出', icon: <ArrowUpRight size={18} />, color: 'text-green-600 bg-green-50' },
  { value: 'invest', label: '定投', icon: <RefreshCw size={18} />, color: 'text-purple-600 bg-purple-50' },
  { value: 'dividend', label: '分红', icon: <Coins size={18} />, color: 'text-green-600 bg-green-50' },
  { value: 'interest', label: '利息', icon: <DollarSign size={18} />, color: 'text-green-600 bg-green-50' },
  { value: 'transfer_in', label: '转入', icon: <ArrowDownRight size={18} />, color: 'text-blue-600 bg-blue-50' },
  { value: 'transfer_out', label: '转出', icon: <ArrowUpRight size={18} />, color: 'text-orange-600 bg-orange-50' },
] as const

const SCHEDULE_PERIODS = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'biweekly', label: '每两周' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季度' },
] as const

interface Props {
  className?: string
}

export default function Investment({ className }: Props) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'positions' | 'backtest'>('transactions')
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filterAccount, setFilterAccount] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7))
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<InvestmentTransaction | null>(null)
  const [updatingNav, setUpdatingNav] = useState(false)
  const [formData, setFormData] = useState({
    accountId: '',
    type: 'buy' as InvestmentTransaction['type'],
    symbol: '',
    name: '',
    quantity: 0,
    price: 0,
    amount: 0,
    fee: 0,
    time: new Date().toISOString().slice(0, 16),
    remark: '',
    // 定投相关
    schedulePeriod: 'monthly' as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly',
    scheduleStartDate: new Date().toISOString().slice(0, 10),
    scheduleEndDate: '',
    scheduleAmount: 0,
  })
  const [fetchingFund, setFetchingFund] = useState(false)
  const [fundFetchError, setFundFetchError] = useState('')

  const getTransactionTypeInfo = (type: InvestmentTransaction['type']) => {
    return TRANSACTION_TYPES.find(t => t.value === type) || TRANSACTION_TYPES[0]
  }

  const getAccountName = (accountId: string) => {
    return accounts.find(acc => acc.id === accountId)?.name || '未知账户'
  }

  // 计算持仓数据
  const calculatePositions = () => {
    // 每次计算时从 storage 读取已更新的行情价格
    const priceMap: Record<string, number> = {}
    storage.getPositions().forEach(p => {
      if (p.symbol && p.currentPrice > 0) {
        priceMap[p.symbol] = p.currentPrice
      }
    })

    const positionMap: Record<string, {
      accountId: string
      accountName: string
      symbol?: string
      name: string
      totalBuyQuantity: number
      totalBuyAmount: number
      totalSellQuantity: number
      totalSellAmount: number
      totalFee: number
      averageCost: number
      currentPrice: number
      currentQuantity: number
      currentValue: number
      profit: number
      profitRate: number
    }> = {}

    transactions.forEach(t => {
      const key = `${t.accountId}_${t.symbol || t.name}`

      if (!positionMap[key]) {
        positionMap[key] = {
          accountId: t.accountId,
          accountName: getAccountName(t.accountId),
          symbol: t.symbol,
          name: t.name,
          totalBuyQuantity: 0,
          totalBuyAmount: 0,
          totalSellQuantity: 0,
          totalSellAmount: 0,
          totalFee: 0,
          averageCost: 0,
          currentPrice: 0,
          currentQuantity: 0,
          currentValue: 0,
          profit: 0,
          profitRate: 0
        }
      }

      if (t.type === 'buy' || t.type === 'transfer_in') {
        positionMap[key].totalBuyQuantity += t.quantity
        positionMap[key].totalBuyAmount += t.amount
        positionMap[key].totalFee += t.fee
      } else if (t.type === 'sell' || t.type === 'transfer_out') {
        positionMap[key].totalSellQuantity += t.quantity
        positionMap[key].totalSellAmount += t.amount
      } else if (t.type === 'dividend' || t.type === 'interest') {
        positionMap[key].profit += t.amount
      }

      positionMap[key].currentQuantity = positionMap[key].totalBuyQuantity - positionMap[key].totalSellQuantity

      if (positionMap[key].currentQuantity > 0) {
        positionMap[key].averageCost = (positionMap[key].totalBuyAmount + positionMap[key].totalFee) / positionMap[key].currentQuantity
      } else {
        positionMap[key].averageCost = 0
      }

      // 当前价格：优先用 storage 中已更新的行情，其次用平均成本
      const savedPrice = t.symbol ? priceMap[t.symbol] : undefined
      if (savedPrice && savedPrice > 0) {
        positionMap[key].currentPrice = savedPrice
      } else if (positionMap[key].currentPrice === 0) {
        positionMap[key].currentPrice = positionMap[key].averageCost
      }

      positionMap[key].currentValue = positionMap[key].currentQuantity * positionMap[key].currentPrice
      positionMap[key].profit += positionMap[key].currentValue - (positionMap[key].totalBuyAmount + positionMap[key].totalFee) + positionMap[key].totalSellAmount
      positionMap[key].profitRate = positionMap[key].totalBuyAmount > 0 ? (positionMap[key].profit / (positionMap[key].totalBuyAmount + positionMap[key].totalFee)) * 100 : 0
    })

    return Object.values(positionMap).filter(pos => pos.currentQuantity > 0)
  }

  const positions = calculatePositions()

  useEffect(() => {
    loadData()
  }, [filterAccount, filterType, filterMonth])

  const loadData = () => {
    let transactions = storage.getInvestmentTransactions()
    // 支持所有类型的账户，不再限制仅投资类账户
    const accounts = storage.getAccounts()

    if (filterAccount !== 'all') {
      transactions = transactions.filter(t => t.accountId === filterAccount)
    }
    if (filterType !== 'all') {
      transactions = transactions.filter(t => t.type === filterType)
    }
    if (filterMonth) {
      transactions = transactions.filter(t => {
        const date = new Date(t.time)
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return month === filterMonth
      })
    }

    setTransactions(transactions.sort((a, b) => b.time - a.time))
    setAccounts(accounts)
  }

  useEffect(() => {
    const quantity = Number(formData.quantity) || 0
    const price = Number(formData.price) || 0
    const fee = Number(formData.fee) || 0
    if (quantity > 0 && price > 0) {
      setFormData(prev => ({ ...prev, amount: quantity * price + fee }))
    }
  }, [formData.quantity, formData.price, formData.fee])

  // 防抖查询基金信息
  useEffect(() => {
    const code = formData.symbol.trim()
    console.log('[FundFetch] symbol changed:', code)
    if (!/^\d{6}$/.test(code)) {
      setFundFetchError('')
      return
    }
    setFetchingFund(true)
    setFundFetchError('')
    const timer = setTimeout(async () => {
      console.log('[FundFetch] fetching fund:', code, 'API_BASE:', API_BASE)
      try {
        const res = await fetch(`${API_BASE}/api/fund/${code}`)
        console.log('[FundFetch] response status:', res.status)
        if (!res.ok) {
          if (res.status === 404) {
            setFundFetchError('未找到该基金代码')
          } else {
            setFundFetchError('查询失败，请检查后端服务是否启动')
          }
          setFetchingFund(false)
          return
        }
        const data = await res.json()
        console.log('[FundFetch] response data:', data)
        if (data.fund_name && data.fund_name !== code) {
          console.log('[FundFetch] setting name:', data.fund_name)
          setFormData(prev => ({ ...prev, name: data.fund_name }))
        }
        if (data.latest_nav && data.latest_nav > 0) {
          console.log('[FundFetch] setting price:', data.latest_nav)
          setFormData(prev => ({ ...prev, price: data.latest_nav }))
        }
      } catch (err) {
        console.error('[FundFetch] error:', err)
        setFundFetchError('无法连接后端服务，请确认已启动 (python main.py)')
      } finally {
        setFetchingFund(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [formData.symbol])

  const handleUpdateMarketData = async () => {
    setUpdatingNav(true)
    try {
      // 从交易记录计算当前持仓（持仓分析页面的数据源）
      const calculatedPositions = calculatePositions()
      const positionsWithSymbol = calculatedPositions.filter(p => p.symbol && p.symbol.trim() !== '')

      if (positionsWithSymbol.length === 0) {
        alert('暂无带代码的持仓，无需更新')
        return
      }

      // 同步计算持仓到 storage（确保 storage 与交易记录一致）
      const existingPositions = storage.getPositions()
      const syncedPositions = calculatedPositions.map(cp => {
        const existing = existingPositions.find(ep => ep.symbol === cp.symbol && ep.accountId === cp.accountId)
        if (existing) {
          return { ...existing, name: cp.name }
        }
        // 新增的持仓，写入 storage
        return {
          id: `${cp.accountId}_${cp.symbol || cp.name}`,
          accountId: cp.accountId,
          symbol: cp.symbol,
          name: cp.name,
          quantity: cp.currentQuantity,
          averageCost: cp.averageCost,
          currentPrice: cp.currentPrice,
          currentValue: cp.currentValue,
          totalValue: cp.currentValue,
          profit: cp.profit,
          profitRate: cp.profitRate,
          firstBuyDate: Date.now(),
          updatedAt: Date.now(),
          fundInfo: cp.symbol ? { fundCode: cp.symbol, fundName: cp.name, lastNav: cp.currentPrice, lastNavDate: '' } : undefined
        } as Position
      })
      storage.savePositions(syncedPositions)

      const fundCodes = positionsWithSymbol
        .map(p => p.symbol!)
        .filter(code => /^\d{6}$/.test(code))

      const stockCodes = positionsWithSymbol
        .map(p => p.symbol!)
        .filter(code => /^(sh|sz|hk|us)\d{6}$/i.test(code))

      let updatedCount = 0
      const updatedPositions = [...syncedPositions]

      if (fundCodes.length > 0) {
        try {
          const fundResponse = await fetch(`${API_BASE}/api/fund/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fund_codes: fundCodes })
          })
          if (fundResponse.ok) {
            const fundResult = await fundResponse.json()
            Object.values(fundResult).forEach((fund: any) => {
              const fundCode = fund.fund_code
              const fundName = fund.fund_name
              const netWorth = fund.latest_nav
              const netWorthDate = fund.latest_nav_date

              const positionIndex = updatedPositions.findIndex(p => p.symbol === fundCode)
              if (positionIndex !== -1 && netWorth) {
                const pos = updatedPositions[positionIndex]
                const latestNav = parseFloat(netWorth)
                const currentValue = latestNav * pos.quantity
                const profit = currentValue - pos.averageCost * pos.quantity
                const profitRate = pos.averageCost > 0 ? (profit / (pos.averageCost * pos.quantity)) * 100 : 0

                updatedPositions[positionIndex] = {
                  ...pos,
                  currentPrice: latestNav,
                  currentValue,
                  totalValue: currentValue,
                  profit,
                  profitRate,
                  updatedAt: Date.now(),
                  fundInfo: {
                    ...pos.fundInfo,
                    fundCode: fundCode,
                    fundName: fundName || pos.name,
                    lastNav: latestNav,
                    lastNavDate: netWorthDate,
                    dayGrowth: fund.day_growth
                  }
                }
                updatedCount++
              }
            })
          }
        } catch (err) {
          console.error('后端基金接口调用失败:', err)
        }
      }

      if (stockCodes.length > 0) {
        const sinaCodes = stockCodes.map(code => code.toLowerCase()).join(',')
        const stockResponse = await fetch(`https://hq.sinajs.cn/list=${sinaCodes}`)
        if (stockResponse.ok) {
          const text = await stockResponse.text()
          const lines = text.split('\n')
          lines.forEach(line => {
            if (!line.trim()) return
            const match = line.match(/var hq_str_(.+?)="(.+?)"/)
            if (match) {
              const code = match[1]
              const data = match[2].split(',')
              if (data.length > 3) {
                const positionIndex = updatedPositions.findIndex(p => p.symbol?.toLowerCase() === code)
                if (positionIndex !== -1) {
                  const pos = updatedPositions[positionIndex]
                  const latestPrice = parseFloat(data[3])
                  if (latestPrice > 0) {
                    const currentValue = latestPrice * pos.quantity
                    const profit = currentValue - pos.averageCost * pos.quantity
                    const profitRate = pos.averageCost > 0 ? (profit / (pos.averageCost * pos.quantity)) * 100 : 0

                    updatedPositions[positionIndex] = {
                      ...pos,
                      currentPrice: latestPrice,
                      currentValue,
                      totalValue: currentValue,
                      profit,
                      profitRate,
                      updatedAt: Date.now()
                    }
                    updatedCount++
                  }
                }
              }
            }
          })
        }
      }

      storage.savePositions(updatedPositions)
      // 用新数组引用触发重新渲染，使 calculatePositions 读取到最新的 storage 价格
      setTransactions(prev => [...prev])

      alert(`成功更新 ${updatedCount} 个持仓的最新行情`)
    } catch (error) {
      console.error('更新行情失败:', error)
      alert(`更新失败：${error instanceof Error ? error.message : '未知错误'}\n请检查网络连接`)
    } finally {
      setUpdatingNav(false)
    }
  }

  // 生成定投日期列表
  const generateScheduleDates = (
    startDate: string,
    endDate: string,
    period: 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  ): Date[] => {
    const dates: Date[] = []
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate())
    const now = new Date()
    // 结束日期不能晚于今天（只生成已执行的定投）
    const effectiveEnd = end < now ? end : now

    const current = new Date(start)
    while (current <= effectiveEnd) {
      dates.push(new Date(current))
      switch (period) {
        case 'daily':
          current.setDate(current.getDate() + 1)
          break
        case 'weekly':
          current.setDate(current.getDate() + 7)
          break
        case 'biweekly':
          current.setDate(current.getDate() + 14)
          break
        case 'monthly':
          current.setMonth(current.getMonth() + 1)
          break
        case 'quarterly':
          current.setMonth(current.getMonth() + 3)
          break
      }
    }
    return dates
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.accountId || !formData.name) {
      alert('请填写完整信息')
      return
    }

    // 定投模式
    if (formData.type === 'invest') {
      if (!formData.scheduleAmount || formData.scheduleAmount <= 0 || !formData.scheduleStartDate) {
        alert('请填写定投金额和开始日期')
        return
      }
      const dates = generateScheduleDates(
        formData.scheduleStartDate,
        formData.scheduleEndDate,
        formData.schedulePeriod
      )
      if (dates.length === 0) {
        alert('定投日期范围内没有可生成的期数，请检查开始和结束日期')
        return
      }
      const scheduledId = Date.now().toString()
      const price = formData.price > 0 ? formData.price : 0
      const quantity = price > 0 ? formData.scheduleAmount / price : 0
      const newTransactions: InvestmentTransaction[] = dates.map((date, index) => ({
        id: `${scheduledId}_${index}`,
        accountId: formData.accountId,
        type: 'buy' as const,
        symbol: formData.symbol,
        name: formData.name,
        quantity: parseFloat(quantity.toFixed(4)),
        price,
        amount: formData.scheduleAmount,
        fee: 0,
        time: date.getTime(),
        remark: `定投第${index + 1}期`,
        isScheduled: true,
        scheduledId,
        scheduledIndex: index + 1,
      }))
      // 批量添加
      const existing = storage.getInvestmentTransactions()
      storage.saveInvestmentTransactions([...existing, ...newTransactions])
      alert(`定投计划已创建，共生成 ${newTransactions.length} 期买入记录`)
    } else if (editingTransaction) {
      if (!formData.amount || formData.amount <= 0) {
        alert('请填写完整信息')
        return
      }
      const updated: InvestmentTransaction = {
        ...editingTransaction,
        ...formData,
        time: new Date(formData.time).getTime()
      }
      storage.updateInvestmentTransaction(updated)
      alert('记录更新成功')
    } else {
      if (!formData.amount || formData.amount <= 0) {
        alert('请填写完整信息')
        return
      }
      const newTransaction: InvestmentTransaction = {
        id: Date.now().toString(),
        ...formData,
        time: new Date(formData.time).getTime()
      }
      storage.addInvestmentTransaction(newTransaction)
      alert('记录保存成功')
    }

    loadData()
    resetForm()
    setShowAddModal(false)
    setEditingTransaction(null)
  }

  const handleEdit = (transaction: InvestmentTransaction) => {
    setEditingTransaction(transaction)
    setFormData({
      accountId: transaction.accountId,
      type: transaction.type,
      symbol: transaction.symbol || '',
      name: transaction.name,
      quantity: transaction.quantity,
      price: transaction.price,
      amount: transaction.amount,
      fee: transaction.fee,
      time: new Date(transaction.time).toISOString().slice(0, 16),
      remark: transaction.remark || ''
    })
    setShowAddModal(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条交易记录吗？')) {
      storage.deleteInvestmentTransaction(id)
      loadData()
    }
  }

  const resetForm = () => {
    setFormData({
      accountId: '',
      type: 'buy',
      symbol: '',
      name: '',
      quantity: 0,
      price: 0,
      amount: 0,
      fee: 0,
      time: new Date().toISOString().slice(0, 16),
      remark: '',
      schedulePeriod: 'monthly',
      scheduleStartDate: new Date().toISOString().slice(0, 10),
      scheduleEndDate: '',
      scheduleAmount: 0,
    })
  }

  // 计算统计数据
  const totalBuyAmount = transactions.filter(t => t.type === 'buy').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const totalSellAmount = transactions.filter(t => t.type === 'sell').reduce((sum, t) => sum + t.amount, 0)
  const totalDividend = transactions.filter(t => t.type === 'dividend').reduce((sum, t) => sum + t.amount, 0)
  const totalProfit = totalSellAmount + totalDividend - totalBuyAmount

  // 数字动画
  const animatedTotalBuyAmount = useNumberAnimation(totalBuyAmount, 1500, formatCurrency)
  const animatedTotalSellAmount = useNumberAnimation(totalSellAmount, 1500, formatCurrency)
  const animatedTotalDividend = useNumberAnimation(totalDividend, 1500, formatCurrency)
  const animatedTotalProfit = useNumberAnimation(totalProfit, 1500, formatCurrency)

  return (
    <div className={`animate-fade-in ${className || ''}`}>
      {/* 统计卡片 */}
      <div className="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <div className="bg-white border rounded-[14px] p-8 relative overflow-hidden" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center icon-spin-hover">
              <TrendingDown size={32} style={{color: 'var(--danger)'}} />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold mb-4" style={{color: 'var(--text)'}}>总买入</div>
              <div className="text-[35px] font-black mb-6 number leading-none" style={{color: 'var(--danger)'}}>
                ¥{animatedTotalBuyAmount}
              </div>
              <div className="text-base font-semibold" style={{color: 'var(--text-muted)'}}>累计买入金额</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(248,59,77,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border rounded-[14px] p-8 relative overflow-hidden" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center icon-bounce-hover">
              <TrendingUp size={32} style={{color: 'var(--success)'}} />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold mb-4" style={{color: 'var(--text)'}}>总卖出</div>
              <div className="text-[35px] font-black mb-6 number leading-none" style={{color: 'var(--success)'}}>
                ¥{animatedTotalSellAmount}
              </div>
              <div className="text-base font-semibold" style={{color: 'var(--text-muted)'}}>累计卖出金额</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(24,191,95,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border rounded-[14px] p-8 relative overflow-hidden" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center icon-bounce-hover">
              <Coins size={32} style={{color: 'var(--success)'}} />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold mb-4" style={{color: 'var(--text)'}}>分红/利息</div>
              <div className="text-[35px] font-black mb-6 number leading-none" style={{color: 'var(--success)'}}>
                ¥{animatedTotalDividend}
              </div>
              <div className="text-base font-semibold" style={{color: 'var(--text-muted)'}}>累计被动收入</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(24,191,95,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border rounded-[14px] p-8 relative overflow-hidden" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className={`w-[66px] h-[66px] rounded-[14px] flex items-center justify-center icon-scale-hover ${totalProfit >= 0 ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-red-50 to-red-100'}`}>
              <DollarSign size={32} style={{color: totalProfit >= 0 ? 'var(--success)' : 'var(--danger)'}} />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold mb-4" style={{color: 'var(--text)'}}>实现收益</div>
              <div className="text-[35px] font-black mb-6 number leading-none" style={{color: totalProfit >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                {totalProfit >= 0 ? '+' : ''}¥{animatedTotalProfit}
              </div>
              <div className="text-base font-semibold" style={{color: 'var(--text-muted)'}}>已实现盈亏</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(24,191,95,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>
      </div>

      {/* 切换tab */}
      <div className="bg-white border rounded-[13px] p-8 mt-6" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
        <div className="flex flex-wrap items-center justify-between gap-4">
           <div className="flex items-center gap-14">
             <button
               onClick={() => setActiveTab('transactions')}
               className={`relative text-xl font-bold transition-all pb-4 ${
                 activeTab === 'transactions'
                   ? 'font-black'
                   : ''
               }`}
               style={{color: activeTab === 'transactions' ? 'var(--primary)' : 'var(--text-muted)'}}
             >
               交易记录
               {activeTab === 'transactions' && (
                 <span className="absolute left-0 right-0 bottom-[-8px] h-[3px] rounded-[2px]" style={{backgroundColor: 'var(--primary)'}}></span>
               )}
             </button>
             <button
               onClick={() => setActiveTab('positions')}
               className={`relative text-xl font-bold transition-all pb-4 ${
                 activeTab === 'positions'
                   ? 'font-black'
                   : ''
               }`}
               style={{color: activeTab === 'positions' ? 'var(--primary)' : 'var(--text-muted)'}}
             >
               持仓分析
               {activeTab === 'positions' && (
                 <span className="absolute left-0 right-0 bottom-[-8px] h-[3px] rounded-[2px]" style={{backgroundColor: 'var(--primary)'}}></span>
               )}
             </button>
             <button
               onClick={() => setActiveTab('backtest')}
               className={`relative text-xl font-bold transition-all pb-4 ${
                 activeTab === 'backtest'
                   ? 'font-black'
                   : ''
               }`}
               style={{color: activeTab === 'backtest' ? 'var(--primary)' : 'var(--text-muted)'}}
             >
               收益回测
               {activeTab === 'backtest' && (
                 <span className="absolute left-0 right-0 bottom-[-8px] h-[3px] rounded-[2px]" style={{backgroundColor: 'var(--primary)'}}></span>
               )}
             </button>
           </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={18} style={{color: 'var(--text-muted)'}} />
              <span className="font-medium" style={{color: 'var(--text)'}}>筛选：</span>
            </div>

            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="input-glass px-3 py-2 rounded-sm"
            >
              <option value="all">全部账户</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>

            {activeTab === 'transactions' && (
              <>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="input-glass px-3 py-2 rounded-sm"
                >
                  <option value="all">全部类型</option>
                  {TRANSACTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>

                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="input-glass px-3 py-2 rounded-sm"
                />
              </>
            )}

             {activeTab === 'positions' && (
               <button
                 onClick={handleUpdateMarketData}
                 disabled={updatingNav}
                 className="h-[42px] px-6 rounded-lg border-0 text-white bg-gradient-to-b from-green-500 to-green-600 shadow-lg shadow-green-500/25 flex items-center gap-2 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <RefreshCw size={18} className={updatingNav ? 'animate-spin' : ''} />
                 {updatingNav ? '更新中...' : '更新所有行情'}
               </button>
             )}

            <button
              onClick={() => {
                resetForm()
                setEditingTransaction(null)
                setShowAddModal(true)
              }}
              className="h-[42px] px-6 rounded-lg border-0 text-white bg-gradient-to-b from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 flex items-center gap-2 text-base font-bold"
            >
              <span className="text-2xl font-normal mt-[-2px]">＋</span>
              记交易
            </button>
          </div>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[14px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b" style={{borderColor: 'var(--border)'}}>
              <h3 className="text-xl font-bold" style={{color: 'var(--text)'}}>{editingTransaction ? '编辑交易记录' : '新增交易记录'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>账户</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  style={{borderColor: 'var(--border)'}}
                  required
                >
                  <option value="">请选择账户</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>交易类型</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as InvestmentTransaction['type'] }))}
                  className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  style={{borderColor: 'var(--border)'}}
                  required
                >
                  {TRANSACTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>标的代码（可选）</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                      placeholder="如：000001（输入6位基金代码自动查询）"
                      className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      style={{borderColor: 'var(--border)'}}
                    />
                    {fetchingFund && (
                      <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{color: 'var(--primary)'}} />
                    )}
                  </div>
                  {fundFetchError && (
                    <p className="text-xs mt-1" style={{color: 'var(--danger)'}}>{fundFetchError}</p>
                  )}
                  {!fundFetchError && !fetchingFund && formData.symbol.trim().length === 6 && formData.name && (
                    <p className="text-xs mt-1" style={{color: 'var(--success)'}}>✓ 已自动填充基金信息</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>标的名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="如：平安银行"
                    className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    style={{borderColor: 'var(--border)'}}
                    required
                  />
                </div>
              </div>

              {/* 定投字段 */}
              {formData.type === 'invest' ? (
                <div className="space-y-4 p-4 rounded-sm border" style={{borderColor: 'var(--border)', backgroundColor: 'var(--bg-soft)'}}>
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw size={16} className="text-purple-600" />
                    <span className="text-sm font-semibold text-purple-700">定投设置</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>定投周期</label>
                      <select
                        value={formData.schedulePeriod}
                        onChange={(e) => setFormData(prev => ({ ...prev, schedulePeriod: e.target.value as any }))}
                        className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        style={{borderColor: 'var(--border)'}}
                      >
                        {SCHEDULE_PERIODS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>每期金额（元）</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.scheduleAmount || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduleAmount: parseFloat(e.target.value) || 0 }))}
                        placeholder="如：500"
                        className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        style={{borderColor: 'var(--border)'}}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>开始日期</label>
                      <input
                        type="date"
                        value={formData.scheduleStartDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduleStartDate: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        style={{borderColor: 'var(--border)'}}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>结束日期（可选）</label>
                      <input
                        type="date"
                        value={formData.scheduleEndDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduleEndDate: e.target.value }))}
                        placeholder="留空默认1年"
                        className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        style={{borderColor: 'var(--border)'}}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>净值（用于估算份额，可选）</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.price || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      placeholder="如：2.118（从标的代码自动获取）"
                      className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      style={{borderColor: 'var(--border)'}}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>数量</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.quantity || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      style={{borderColor: 'var(--border)'}}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>价格（元）</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.price || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      style={{borderColor: 'var(--border)'}}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>手续费（元）</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.fee || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, fee: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      style={{borderColor: 'var(--border)'}}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>总金额（元）</label>
                <input
                  type="number"
                  step="any"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  style={{borderColor: 'var(--border)'}}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>交易时间</label>
                <input
                  type="datetime-local"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  style={{borderColor: 'var(--border)'}}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>备注（可选）</label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  style={{borderColor: 'var(--border)'}}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingTransaction(null)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 border bg-white rounded-sm font-medium transition-colors"
                  style={{borderColor: 'var(--border)', color: 'var(--text)'}}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white rounded-sm font-medium hover:bg-blue-600 transition-colors"
                  style={{backgroundColor: 'var(--primary)'}}
                >
                  {editingTransaction ? '保存修改' : '新增记录'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 内容区域 */}
      {activeTab === 'transactions' ? (
        /* 交易列表 */
        <div className="bg-white border rounded-[13px] overflow-hidden mt-6" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)'}}>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>时间</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>账户</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>类型</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>标的</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>数量</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>价格</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>金额</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>手续费</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>备注</th>
                <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>操作</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-16 text-center empty-state" style={{color: 'var(--text-light)'}}>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full grid place-items-center" style={{backgroundColor: 'var(--bg-soft)'}}>
                      <TrendingUp size={32} className="opacity-50" />
                    </div>
                    <p className="text-lg font-medium" style={{color: 'var(--text)'}}>暂无投资交易记录</p>
                    <p className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>点击右上角「记交易」开始记录您的第一笔投资交易</p>
                  </td>
                </tr>
              ) : (
                transactions.map(transaction => {
                  const typeInfo = getTransactionTypeInfo(transaction.type)
                  return (
                    <tr key={transaction.id} className="border-b transition-all" style={{borderColor: 'var(--border)'}} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-soft)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                      <td className="px-5 py-4 text-sm" style={{color: 'var(--text-muted)'}}>
                        {new Date(transaction.time).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-5 py-4 text-sm" style={{color: 'var(--text)'}}>
                        {getAccountName(transaction.accountId)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${typeInfo.color}`}>
                            {typeInfo.icon}
                            {typeInfo.label}
                          </span>
                          {transaction.isScheduled && transaction.scheduledIndex && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-600">
                              第{transaction.scheduledIndex}期
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <div className="font-medium" style={{color: 'var(--text)'}}>{transaction.name}</div>
                          {transaction.symbol && <div className="text-xs" style={{color: 'var(--text-muted)'}}>{transaction.symbol}</div>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm number" style={{color: 'var(--text)'}}>
                        {transaction.quantity || '-'}
                      </td>
                      <td className="px-5 py-4 text-sm number" style={{color: 'var(--text)'}}>
                        {transaction.price ? `¥${transaction.price.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-5 py-4 font-bold text-sm number" style={{
                        color: ['sell', 'dividend', 'interest', 'transfer_in'].includes(transaction.type)
                          ? 'var(--success)'
                          : 'var(--danger)'
                      }}>
                        {['sell', 'dividend', 'interest', 'transfer_in'].includes(transaction.type) ? '+' : '-'}
                        ¥{transaction.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-sm number" style={{color: 'var(--text-muted)'}}>
                        {transaction.fee ? `¥${transaction.fee.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-5 py-4 text-sm" style={{color: 'var(--text-muted)'}}>
                        {transaction.remark || '-'}
                      </td>
                       <td className="px-5 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <button
                             className="w-10 h-10 flex items-center justify-center hover:bg-blue-50 rounded-sm transition-all"
                             style={{color: 'var(--primary)'}}
                             onClick={() => handleEdit(transaction)}
                             aria-label="编辑投资记录"
                           >
                             <Edit2 size={18} aria-hidden="true" />
                           </button>
                           <button
                             onClick={() => handleDelete(transaction.id)}
                             className="w-10 h-10 flex items-center justify-center hover:bg-red-50 rounded-sm transition-all"
                             style={{color: 'var(--danger)'}}
                             aria-label="删除投资记录"
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
      ) : activeTab === 'positions' ? (
         /* 持仓分析 */
         <div className="space-y-5 mt-5">
           {/* 持仓统计卡片 */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
             <div className="bg-white border rounded-[14px] p-6 relative overflow-hidden" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
               <div className="flex justify-between items-start">
                 <div>
                   <p className="text-base font-semibold mb-2" style={{color: 'var(--text-muted)'}}>持仓总市值</p>
                   <h3 className="text-3xl font-black mb-3 number" style={{color: 'var(--text)'}}>
                     ¥{positions.reduce((sum, pos) => sum + pos.currentValue, 0).toLocaleString()}
                   </h3>
                   <p className="text-sm" style={{color: 'var(--text-muted)'}}>当前持有标的总价值</p>
                 </div>
                 <div className="w-[50px] h-[50px] rounded-[10px] bg-gradient-to-br from-blue-50 to-blue-100 grid place-items-center" style={{color: 'var(--primary)'}}>
                   <Wallet size={24} />
                 </div>
               </div>
               <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
             </div>

             <div className="bg-white border rounded-[14px] p-6 relative overflow-hidden" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
               <div className="flex justify-between items-start">
                 <div>
                   <p className="text-base font-semibold mb-2" style={{color: 'var(--text-muted)'}}>累计收益</p>
                   <h3 className="text-3xl font-black mb-3 number" style={{
                     color: positions.reduce((sum, pos) => sum + pos.profit, 0) >= 0 ? 'var(--success)' : 'var(--danger)'
                   }}>
                     {positions.reduce((sum, pos) => sum + pos.profit, 0) >= 0 ? '+' : ''}
                     ¥{positions.reduce((sum, pos) => sum + pos.profit, 0).toLocaleString()}
                   </h3>
                   <p className="text-sm" style={{color: 'var(--text-muted)'}}>包含已实现和浮盈浮亏</p>
                 </div>
                 <div className={`w-[50px] h-[50px] rounded-[10px] grid place-items-center ${
                   positions.reduce((sum, pos) => sum + pos.profit, 0) >= 0
                     ? 'bg-gradient-to-br from-green-50 to-green-100'
                     : 'bg-gradient-to-br from-red-50 to-red-100'
                 }`} style={{
                   color: positions.reduce((sum, pos) => sum + pos.profit, 0) >= 0 ? 'var(--success)' : 'var(--danger)'
                 }}>
                   <TrendingUp size={24} />
                 </div>
               </div>
               <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(24,191,95,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
             </div>

             <div className="bg-white border rounded-[14px] p-6 relative overflow-hidden" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
               <div className="flex justify-between items-start">
                 <div>
                   <p className="text-base font-semibold mb-2" style={{color: 'var(--text-muted)'}}>平均收益率</p>
                   <h3 className="text-3xl font-black mb-3 number" style={{
                     color: positions.reduce((sum, pos) => sum + pos.profit, 0) >= 0 ? 'var(--success)' : 'var(--danger)'
                   }}>
                     {positions.length > 0 ? (positions.reduce((sum, pos) => sum + pos.profitRate, 0) / positions.length).toFixed(2) : '0.00'}%
                   </h3>
                   <p className="text-sm" style={{color: 'var(--text-muted)'}}>所有持仓平均收益率</p>
                 </div>
                 <div className="w-[50px] h-[50px] rounded-[10px] bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 grid place-items-center">
                   <TrendingUp size={24} />
                 </div>
               </div>
               <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
             </div>
           </div>

           {/* 持仓列表 */}
           <div className="bg-white border rounded-[13px] overflow-hidden" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)'}}>
                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>账户</th>
                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>标的</th>
                    <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>持仓数量</th>
                    <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>平均成本</th>
                    <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>当前价格</th>
                    <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>持仓市值</th>
                    <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>持仓收益</th>
                    <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>收益率</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center empty-state" style={{color: 'var(--text-light)'}}>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full grid place-items-center" style={{backgroundColor: 'var(--bg-soft)'}}>
                          <TrendingUp size={32} className="opacity-50" />
                        </div>
                        <p className="text-lg font-medium" style={{color: 'var(--text)'}}>暂无持仓</p>
                        <p className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>添加买入交易后将自动计算持仓信息</p>
                      </td>
                    </tr>
                  ) : (
                    positions.map((pos, index) => (
                      <tr key={index} className="border-b transition-all" style={{borderColor: 'var(--border)'}} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-soft)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                        <td className="px-5 py-4 text-sm" style={{color: 'var(--text)'}}>
                          {pos.accountName}
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <div className="font-medium" style={{color: 'var(--text)'}}>{pos.name}</div>
                            {pos.symbol && <div className="text-xs" style={{color: 'var(--text-muted)'}}>{pos.symbol}</div>}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-right number" style={{color: 'var(--text)'}}>
                          {pos.currentQuantity.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-sm text-right number" style={{color: 'var(--text)'}}>
                          ¥{pos.averageCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 text-sm text-right number" style={{color: 'var(--text)'}}>
                          ¥{pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 text-sm text-right number" style={{color: 'var(--text)'}}>
                          ¥{pos.currentValue.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-right number" style={{
                          color: pos.profit >= 0 ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {pos.profit >= 0 ? '+' : ''}¥{pos.profit.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-right number" style={{
                          color: pos.profitRate >= 0 ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {pos.profitRate >= 0 ? '+' : ''}{pos.profitRate.toFixed(2)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
               </table>
             </div>
           </div>
          </div>
         ) : (
         /* 收益回测 */
         <div className="mt-6 space-y-6">
           {/* 回测说明 */}
           <div className="bg-blue-50 border border-blue-100 rounded-[13px] p-6">
             <div className="flex items-start gap-3">
               <TrendingUp size={24} className="flex-shrink-0 mt-1" style={{color: 'var(--primary)'}} />
               <div>
                 <h3 className="font-semibold text-lg text-blue-900 mb-2">收益回测说明</h3>
                 <p className="text-sm text-blue-800">
                   基于您的历史交易记录，模拟计算投资组合在不同时间维度的收益表现。由于采用成本计价法，未考虑市场波动对未卖出持仓的影响，收益仅供参考。
                 </p>
               </div>
             </div>
           </div>

           {/* 回测结果卡片 */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {(() => {
               const now = Date.now()
               const oneYearAgo = now - 1 * 365 * 24 * 60 * 60 * 1000
               const threeYearAgo = now - 3 * 365 * 24 * 60 * 60 * 1000
               const fiveYearAgo = now - 5 * 365 * 24 * 60 * 60 * 1000

               const calculateReturn = (startTime: number) => {
                 const buyBefore = transactions
                   .filter(t => t.time <= startTime && (t.type === 'buy' || t.type === 'transfer_in'))
                   .reduce((sum, t) => sum + t.amount + t.fee, 0)

                 const sellBefore = transactions
                   .filter(t => t.time <= startTime && ['sell', 'dividend', 'interest', 'transfer_out'].includes(t.type))
                   .reduce((sum, t) => sum + t.amount, 0)

                 const buyAfter = transactions
                   .filter(t => t.time > startTime && (t.type === 'buy' || t.type === 'transfer_in'))
                   .reduce((sum, t) => sum + t.amount + t.fee, 0)

                 const sellAfter = transactions
                   .filter(t => t.time > startTime && ['sell', 'dividend', 'interest', 'transfer_out'].includes(t.type))
                   .reduce((sum, t) => sum + t.amount, 0)

                 const positions = calculatePositions()
                 const currentPositionValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0)

                 const periodProfit = sellAfter + currentPositionValue - buyAfter
                 const initialInvestment = Math.max(0, buyBefore - sellBefore)
                 const returnRate = initialInvestment > 0 ? (periodProfit / initialInvestment) * 100 : 0

                 return {
                   initialInvestment,
                   totalProfit: periodProfit,
                   returnRate
                 }
               }

               const oneYearReturn = calculateReturn(oneYearAgo)
               const threeYearReturn = calculateReturn(threeYearAgo)
               const fiveYearReturn = calculateReturn(fiveYearAgo)

               const periods = [
                 { name: '近1年', ...oneYearReturn },
                 { name: '近3年', ...threeYearReturn },
                 { name: '近5年', ...fiveYearReturn }
               ]

               return periods.map((period, index) => (
                 <div key={index} className="bg-white border rounded-[14px] p-8" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
                   <div className="mb-4">
                     <h4 className="text-lg font-bold" style={{color: 'var(--text)'}}>{period.name}</h4>
                     <div className="text-xs" style={{color: 'var(--text-muted)'}}>收益统计</div>
                   </div>
                   <div className="space-y-4">
                     <div>
                       <div className="text-sm mb-1" style={{color: 'var(--text-muted)'}}>累计收益</div>
                       <div className="text-3xl font-bold number" style={{
                         color: period.totalProfit >= 0 ? 'var(--success)' : 'var(--danger)'
                       }}>
                         {period.totalProfit >= 0 ? '+' : ''}¥{period.totalProfit.toLocaleString()}
                       </div>
                     </div>
                     <div>
                       <div className="text-sm mb-1" style={{color: 'var(--text-muted)'}}>收益率</div>
                       <div className="text-3xl font-bold number" style={{
                         color: period.returnRate >= 0 ? 'var(--success)' : 'var(--danger)'
                       }}>
                         {period.returnRate >= 0 ? '+' : ''}{period.returnRate.toFixed(2)}%
                       </div>
                     </div>
                     <div>
                       <div className="text-sm mb-1" style={{color: 'var(--text-muted)'}}>期初投入</div>
                       <div className="text-lg font-medium number" style={{color: 'var(--text)'}}>
                         ¥{period.initialInvestment.toLocaleString()}
                       </div>
                     </div>
                   </div>
                 </div>
               ))
             })()}
           </div>

           {/* 年度收益明细 */}
           <div className="bg-white border rounded-[13px] p-8" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
             <h3 className="text-xl font-bold mb-6" style={{color: 'var(--text)'}}>年度收益明细</h3>
             {(() => {
               const yearStats: Record<string, {
                 year: string
                 buy: number
                 sell: number
                 dividend: number
                 profit: number
                 returnRate: number
               }> = {}

               transactions.forEach(t => {
                 const year = new Date(t.time).getFullYear().toString()
                 if (!yearStats[year]) {
                   yearStats[year] = { year, buy: 0, sell: 0, dividend: 0, profit: 0, returnRate: 0 }
                 }

                 if (t.type === 'buy' || t.type === 'transfer_in') {
                   yearStats[year].buy += t.amount + t.fee
                 } else if (t.type === 'sell' || t.type === 'transfer_out') {
                   yearStats[year].sell += t.amount
                 } else if (t.type === 'dividend' || t.type === 'interest') {
                   yearStats[year].dividend += t.amount
                 }
               })

               let cumulativeInvestment = 0
               const sortedYears = Object.values(yearStats).sort((a, b) => a.year.localeCompare(b.year))
               sortedYears.forEach(year => {
                 year.profit = year.sell + year.dividend - year.buy
                 cumulativeInvestment += year.buy - year.sell - year.dividend
                 year.returnRate = cumulativeInvestment > 0 ? (year.profit / cumulativeInvestment) * 100 : 0
               })

               return sortedYears.length > 0 ? (
                 <div className="overflow-x-auto">
                   <table className="w-full">
                     <thead>
                       <tr className="border-b" style={{backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)'}}>
                         <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>年度</th>
                         <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>总买入</th>
                         <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>总卖出</th>
                         <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>分红/利息</th>
                         <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>年度收益</th>
                         <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>收益率</th>
                       </tr>
                     </thead>
                     <tbody>
                       {sortedYears.map(year => (
                         <tr key={year.year} className="border-b transition-all" style={{borderColor: 'var(--border)'}} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-soft)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                           <td className="px-4 py-4 text-sm font-medium" style={{color: 'var(--text)'}}>{year.year}年</td>
                           <td className="px-4 py-4 text-sm text-right number" style={{color: 'var(--danger)'}}>¥{year.buy.toLocaleString()}</td>
                           <td className="px-4 py-4 text-sm text-right number" style={{color: 'var(--success)'}}>¥{year.sell.toLocaleString()}</td>
                           <td className="px-4 py-4 text-sm text-right number" style={{color: 'var(--success)'}}>¥{year.dividend.toLocaleString()}</td>
                           <td className="px-4 py-4 text-sm font-bold text-right number" style={{
                             color: year.profit >= 0 ? 'var(--success)' : 'var(--danger)'
                           }}>
                             {year.profit >= 0 ? '+' : ''}¥{year.profit.toLocaleString()}
                           </td>
                           <td className="px-4 py-4 text-sm font-bold text-right number" style={{
                             color: year.returnRate >= 0 ? 'var(--success)' : 'var(--danger)'
                           }}>
                             {year.returnRate >= 0 ? '+' : ''}{year.returnRate.toFixed(2)}%
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               ) : (
                 <div className="text-center py-16" style={{color: 'var(--text-muted)'}}>
                   <p>暂无足够的交易数据进行回测</p>
                 </div>
               )
             })()}
           </div>
         </div>
        )}
    </div>
  )
}
