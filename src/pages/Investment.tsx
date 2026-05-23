import { useState, useEffect } from 'react'
import { Edit2, Trash2, Filter, TrendingUp, TrendingDown, DollarSign, Coins, ArrowUpRight, ArrowDownRight, Wallet, RefreshCw } from 'lucide-react'
import { storage } from '../utils/storage'
import type { InvestmentTransaction, Account } from '../types'
import { useNumberAnimation, formatCurrency } from '../hooks/useNumberAnimation'

const TRANSACTION_TYPES = [
  { value: 'buy', label: '买入', icon: <ArrowDownRight size={18} />, color: 'text-red-600 bg-red-50' },
  { value: 'sell', label: '卖出', icon: <ArrowUpRight size={18} />, color: 'text-green-600 bg-green-50' },
  { value: 'dividend', label: '分红', icon: <Coins size={18} />, color: 'text-green-600 bg-green-50' },
  { value: 'interest', label: '利息', icon: <DollarSign size={18} />, color: 'text-green-600 bg-green-50' },
  { value: 'transfer_in', label: '转入', icon: <ArrowDownRight size={18} />, color: 'text-blue-600 bg-blue-50' },
  { value: 'transfer_out', label: '转出', icon: <ArrowUpRight size={18} />, color: 'text-orange-600 bg-orange-50' },
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
    remark: ''
  })

  const getTransactionTypeInfo = (type: InvestmentTransaction['type']) => {
    return TRANSACTION_TYPES.find(t => t.value === type) || TRANSACTION_TYPES[0]
  }

  const getAccountName = (accountId: string) => {
    return accounts.find(acc => acc.id === accountId)?.name || '未知账户'
  }

  // 计算持仓数据
  const calculatePositions = () => {
    // 按账户+标的分组
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

      // 更新持仓数据
      if (t.type === 'buy' || t.type === 'transfer_in') {
        positionMap[key].totalBuyQuantity += t.quantity
        positionMap[key].totalBuyAmount += t.amount
        positionMap[key].totalFee += t.fee
      } else if (t.type === 'sell' || t.type === 'transfer_out') {
        positionMap[key].totalSellQuantity += t.quantity
        positionMap[key].totalSellAmount += t.amount
      } else if (t.type === 'dividend' || t.type === 'interest') {
        // 分红利息直接算入收益
        positionMap[key].profit += t.amount
      }

      // 计算当前持仓
      positionMap[key].currentQuantity = positionMap[key].totalBuyQuantity - positionMap[key].totalSellQuantity
      
      // 计算平均成本
      if (positionMap[key].currentQuantity > 0) {
        positionMap[key].averageCost = (positionMap[key].totalBuyAmount + positionMap[key].totalFee) / positionMap[key].currentQuantity
      } else {
        positionMap[key].averageCost = 0
      }

      // 计算当前价值和收益（默认用成本价，后续行情更新会覆盖currentPrice）
      if (positionMap[key].currentPrice === 0) {
        positionMap[key].currentPrice = positionMap[key].averageCost
      }
      
      positionMap[key].currentValue = positionMap[key].currentQuantity * positionMap[key].currentPrice
      positionMap[key].profit += positionMap[key].currentValue - (positionMap[key].totalBuyAmount + positionMap[key].totalFee) + positionMap[key].totalSellAmount
      positionMap[key].profitRate = positionMap[key].totalBuyAmount > 0 ? (positionMap[key].profit / (positionMap[key].totalBuyAmount + positionMap[key].totalFee)) * 100 : 0
    })

    // 转换为数组并过滤掉持仓为0的
    return Object.values(positionMap).filter(pos => pos.currentQuantity > 0)
  }

  const positions = calculatePositions()

  useEffect(() => {
    loadData()
  }, [filterAccount, filterType, filterMonth])

  const loadData = () => {
    let transactions = storage.getInvestmentTransactions()
    const accounts = storage.getAccounts().filter(acc => 
      ['stock', 'fund', 'bond', 'cryptocurrency', 'other'].includes(acc.type)
    )
    
    // 筛选
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

  const calculateAmount = () => {
    if (formData.quantity && formData.price) {
      const amount = formData.quantity * formData.price + formData.fee
      setFormData(prev => ({ ...prev, amount }))
    }
  }

  useEffect(() => {
    calculateAmount()
  }, [formData.quantity, formData.price, formData.fee])

  // 更新所有行情（基金+股票）
  const handleUpdateMarketData = async () => {
    setUpdatingNav(true)
    try {
      // 获取所有持仓
      const positions = storage.getPositions()
      // 筛选出有symbol的持仓
      const positionsWithSymbol = positions.filter(p => p.symbol && p.symbol.trim() !== '')
      
      if (positionsWithSymbol.length === 0) {
        alert('暂无带代码的持仓，无需更新')
        return
      }

      // 区分基金和股票
      const fundCodes = positionsWithSymbol
        .map(p => p.symbol!)
        .filter(code => /^\d{6}$/.test(code)) // 6位数字是基金代码
      
      const stockCodes = positionsWithSymbol
        .map(p => p.symbol!)
        .filter(code => /^(sh|sz|hk|us)\d{6}$/i.test(code)) // 带市场前缀的是股票代码，比如sh600000, sz000001

      let updatedCount = 0
      const updatedPositions = [...positions]

      // 更新基金行情
      if (fundCodes.length > 0) {
        // 调用免费公开基金API
        const fundResponse = await fetch(`https://api.doctorxiong.club/v1/fund?code=${fundCodes.join(',')}`)
        if (fundResponse.ok) {
          const fundResult = await fundResponse.json()
          if (fundResult.code === 200 && fundResult.data) {
            fundResult.data.forEach((fund: any) => {
              const positionIndex = updatedPositions.findIndex(p => p.symbol === fund.code)
              if (positionIndex !== -1 && fund.netWorth) {
                const pos = updatedPositions[positionIndex]
                const latestNav = parseFloat(fund.netWorth)
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
                    fundCode: fund.code,
                    fundName: fund.name,
                    lastNav: latestNav,
                    lastNavDate: fund.netWorthDate,
                    dayGrowth: fund.dayGrowth
                  }
                }
                updatedCount++
              }
             })
          }
        }
      }

      // 更新股票行情（使用新浪股票API）
      if (stockCodes.length > 0) {
        // 转换新浪股票API需要的代码格式
        const sinaCodes = stockCodes.map(code => code.toLowerCase()).join(',')
        const stockResponse = await fetch(`https://hq.sinajs.cn/list=${sinaCodes}`)
        if (stockResponse.ok) {
          const text = await stockResponse.text()
          // 解析新浪返回的文本格式
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
                  const latestPrice = parseFloat(data[3]) // 当前价格
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

      // 保存更新后的持仓
      storage.savePositions(updatedPositions)
      // 重新加载数据
      loadData()
      
      alert(`成功更新 ${updatedCount} 个持仓的最新行情`)
    } catch (error) {
      console.error('更新行情失败:', error)
      alert(`更新失败：${error instanceof Error ? error.message : '未知错误'}\n请检查网络连接`)
    } finally {
      setUpdatingNav(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.accountId || !formData.name || !formData.amount || formData.amount <= 0) {
      alert('请填写完整信息')
      return
    }

    if (editingTransaction) {
      // 编辑
      const updated: InvestmentTransaction = {
        ...editingTransaction,
        ...formData,
        time: new Date(formData.time).getTime()
      }
      storage.updateInvestmentTransaction(updated)
      alert('记录更新成功')
    } else {
      // 新增
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
      remark: ''
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
        <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[14px] style={{boxShadow: 'var(--shadow)'}} p-8 relative overflow-hidden">
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center icon-spin-hover">
              <TrendingDown size={32} className="style={{color: 'var(--danger)'}}" />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold style={{color: 'var(--text)'}} mb-4">总买入</div>
              <div className="text-[35px] font-black style={{color: 'var(--danger)'}} mb-6 number leading-none">
                ¥{animatedTotalBuyAmount}
              </div>
              <div className="text-base font-semibold style={{color: 'var(--text-muted)'}}">累计买入金额</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(248,59,77,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[14px] style={{boxShadow: 'var(--shadow)'}} p-8 relative overflow-hidden">
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center icon-bounce-hover">
              <TrendingUp size={32} className="style={{color: 'var(--success)'}}" />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold style={{color: 'var(--text)'}} mb-4">总卖出</div>
              <div className="text-[35px] font-black style={{color: 'var(--success)'}} mb-6 number leading-none">
                ¥{animatedTotalSellAmount}
              </div>
              <div className="text-base font-semibold style={{color: 'var(--text-muted)'}}">累计卖出金额</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(24,191,95,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[14px] style={{boxShadow: 'var(--shadow)'}} p-8 relative overflow-hidden">
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center icon-bounce-hover">
              <Coins size={32} className="style={{color: 'var(--success)'}}" />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold style={{color: 'var(--text)'}} mb-4">分红/利息</div>
              <div className="text-[35px] font-black style={{color: 'var(--success)'}} mb-6 number leading-none">
                ¥{animatedTotalDividend}
              </div>
              <div className="text-base font-semibold style={{color: 'var(--text-muted)'}}">累计被动收入</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(24,191,95,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[14px] style={{boxShadow: 'var(--shadow)'}} p-8 relative overflow-hidden">
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className={`w-[66px] h-[66px] rounded-[14px] flex items-center justify-center icon-scale-hover ${totalProfit >= 0 ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-red-50 to-red-100'}`}>
              <DollarSign size={32} className={totalProfit >= 0 ? 'style={{color: 'var(--success)'}}' : 'style={{color: 'var(--danger)'}}'} />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold style={{color: 'var(--text)'}} mb-4">实现收益</div>
              <div className={`text-[35px] font-black mb-6 number leading-none ${totalProfit >= 0 ? 'style={{color: 'var(--success)'}}' : 'style={{color: 'var(--danger)'}}'}`}>
                {totalProfit >= 0 ? '+' : ''}¥{animatedTotalProfit}
              </div>
              <div className="text-base font-semibold style={{color: 'var(--text-muted)'}}">已实现盈亏</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(24,191,95,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>
      </div>

      {/* 切换tab */}
      <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[13px] style={{boxShadow: 'var(--shadow)'}} p-8 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
           <div className="flex items-center gap-14">
             <button
               onClick={() => setActiveTab('transactions')}
               className={`relative text-xl font-bold transition-all pb-4 ${
                 activeTab === 'transactions' 
                   ? 'style={{color: 'var(--primary)'}} font-black' 
                   : 'style={{color: 'var(--text-muted)'}} hover:style={{color: 'var(--text)'}}'
               }`}
             >
               交易记录
               {activeTab === 'transactions' && (
                 <span className="absolute left-0 right-0 bottom-[-8px] h-[3px] rounded-[2px] style={{backgroundColor: 'var(--primary)'}}"></span>
               )}
             </button>
             <button
               onClick={() => setActiveTab('positions')}
               className={`relative text-xl font-bold transition-all pb-4 ${
                 activeTab === 'positions' 
                   ? 'style={{color: 'var(--primary)'}} font-black' 
                   : 'style={{color: 'var(--text-muted)'}} hover:style={{color: 'var(--text)'}}'
               }`}
             >
               持仓分析
               {activeTab === 'positions' && (
                 <span className="absolute left-0 right-0 bottom-[-8px] h-[3px] rounded-[2px] style={{backgroundColor: 'var(--primary)'}}"></span>
               )}
             </button>
             <button
               onClick={() => setActiveTab('backtest')}
               className={`relative text-xl font-bold transition-all pb-4 ${
                 activeTab === 'backtest' 
                   ? 'style={{color: 'var(--primary)'}} font-black' 
                   : 'style={{color: 'var(--text-muted)'}} hover:style={{color: 'var(--text)'}}'
               }`}
             >
               收益回测
               {activeTab === 'backtest' && (
                 <span className="absolute left-0 right-0 bottom-[-8px] h-[3px] rounded-[2px] style={{backgroundColor: 'var(--primary)'}}"></span>
               )}
             </button>
           </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={18} className="style={{color: 'var(--text-muted)'}}" />
              <span className="font-medium style={{color: 'var(--text)'}}">筛选：</span>
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
            <div className="p-6 border-b style={{borderColor: 'var(--border)'}}">
              <h3 className="text-xl font-bold style={{color: 'var(--text)'}}">{editingTransaction ? '编辑交易记录' : '新增交易记录'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">账户</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                  className="w-full px-3 py-2 border style={{borderColor: 'var(--border)'}} rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  required
                >
                  <option value="">请选择账户</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">交易类型</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as InvestmentTransaction['type'] }))}
                  className="w-full px-3 py-2 border style={{borderColor: 'var(--border)'}} rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  required
                >
                  {TRANSACTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">标的代码（可选）</label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                    placeholder="如：000001"
                    className="w-full px-3 py-2 border style={{borderColor: 'var(--border)'}} rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">标的名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="如：平安银行"
                    className="w-full px-3 py-2 border style={{borderColor: 'var(--border)'}} rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">数量</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border style={{borderColor: 'var(--border)'}} rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">价格（元）</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.price || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border style={{borderColor: 'var(--border)'}} rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">手续费（元）</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.fee || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, fee: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border style={{borderColor: 'var(--border)'}} rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">总金额（元）</label>
                <input
                  type="number"
                  step="any"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border style={{borderColor: 'var(--border)'}} rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">交易时间</label>
                <input
                  type="datetime-local"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 border style={{borderColor: 'var(--border)'}} rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">备注（可选）</label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border style={{borderColor: 'var(--border)'}} rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
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
                  className="flex-1 px-4 py-2 border style={{borderColor: 'var(--border)'}} bg-white style={{color: 'var(--text)'}} rounded-sm font-medium hover:style={{backgroundColor: 'var(--bg-soft)'}} transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 style={{backgroundColor: 'var(--primary)'}} text-white rounded-sm font-medium hover:bg-blue-600 transition-colors"
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
        <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[13px] style={{boxShadow: 'var(--shadow)'}} overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="style={{backgroundColor: 'var(--bg-soft)'}} border-b style={{borderColor: 'var(--border)'}}">
                <th className="text-left px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">时间</th>
                <th className="text-left px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">账户</th>
                <th className="text-left px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">类型</th>
                <th className="text-left px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">标的</th>
                <th className="text-left px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">数量</th>
                <th className="text-left px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">价格</th>
                <th className="text-left px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">金额</th>
                <th className="text-left px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">手续费</th>
                <th className="text-left px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">备注</th>
                <th className="text-right px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-16 text-center style={{color: 'var(--text-light)'}} empty-state">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full style={{backgroundColor: 'var(--bg-soft)'}} grid place-items-center">
                      <TrendingUp size={32} className="opacity-50" />
                    </div>
                    <p className="text-lg font-medium style={{color: 'var(--text)'}}">暂无投资交易记录</p>
                    <p className="text-sm style={{color: 'var(--text-muted)'}} mt-1">点击右上角「记交易」开始记录您的第一笔投资交易</p>
                  </td>
                </tr>
              ) : (
                transactions.map(transaction => {
                  const typeInfo = getTransactionTypeInfo(transaction.type)
                  return (
                    <tr key={transaction.id} className="border-b style={{borderColor: 'var(--border)'}} hover:style={{backgroundColor: 'var(--bg-soft)'}} transition-all">
                      <td className="px-5 py-4 text-sm style={{color: 'var(--text-muted)'}}">
                        {new Date(transaction.time).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-5 py-4 text-sm style={{color: 'var(--text)'}}">
                        {getAccountName(transaction.accountId)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${typeInfo.color}`}>
                          {typeInfo.icon}
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <div className="font-medium style={{color: 'var(--text)'}}">{transaction.name}</div>
                          {transaction.symbol && <div className="text-xs style={{color: 'var(--text-muted)'}}">{transaction.symbol}</div>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm style={{color: 'var(--text)'}} number">
                        {transaction.quantity || '-'}
                      </td>
                      <td className="px-5 py-4 text-sm style={{color: 'var(--text)'}} number">
                        {transaction.price ? `¥${transaction.price.toLocaleString()}` : '-'}
                      </td>
                      <td className={`px-5 py-4 font-bold text-sm number ${
                        ['sell', 'dividend', 'interest', 'transfer_in'].includes(transaction.type) 
                          ? 'style={{color: 'var(--success)'}}' 
                          : 'style={{color: 'var(--danger)'}}'
                      }`}>
                        {['sell', 'dividend', 'interest', 'transfer_in'].includes(transaction.type) ? '+' : '-'}
                        ¥{transaction.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-sm style={{color: 'var(--text-muted)'}} number">
                        {transaction.fee ? `¥${transaction.fee.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-5 py-4 text-sm style={{color: 'var(--text-muted)'}}">
                        {transaction.remark || '-'}
                      </td>
                       <td className="px-5 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <button 
                             className="w-10 h-10 flex items-center justify-center style={{color: 'var(--primary)'}} hover:bg-blue-50 rounded-sm transition-all"
                             onClick={() => handleEdit(transaction)}
                             aria-label="编辑投资记录"
                           >
                             <Edit2 size={18} aria-hidden="true" />
                           </button>
                           <button 
                             onClick={() => handleDelete(transaction.id)}
                             className="w-10 h-10 flex items-center justify-center style={{color: 'var(--danger)'}} hover:bg-red-50 rounded-sm transition-all"
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
             <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[14px] style={{boxShadow: 'var(--shadow)'}} p-6 relative overflow-hidden">
               <div className="flex justify-between items-start">
                 <div>
                   <p className="text-base font-semibold style={{color: 'var(--text-muted)'}} mb-2">持仓总市值</p>
                   <h3 className="text-3xl font-black style={{color: 'var(--text)'}} mb-3 number">
                     ¥{positions.reduce((sum, pos) => sum + pos.currentValue, 0).toLocaleString()}
                   </h3>
                   <p className="text-sm style={{color: 'var(--text-muted)'}}">当前持有标的总价值</p>
                 </div>
                 <div className="w-[50px] h-[50px] rounded-[10px] bg-gradient-to-br from-blue-50 to-blue-100 style={{color: 'var(--primary)'}} grid place-items-center">
                   <Wallet size={24} />
                 </div>
               </div>
               <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
             </div>

             <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[14px] style={{boxShadow: 'var(--shadow)'}} p-6 relative overflow-hidden">
               <div className="flex justify-between items-start">
                 <div>
                   <p className="text-base font-semibold style={{color: 'var(--text-muted)'}} mb-2">累计收益</p>
                   <h3 className={`text-3xl font-black mb-3 number ${
                     positions.reduce((sum, pos) => sum + pos.profit, 0) >= 0 
                       ? 'style={{color: 'var(--success)'}}' 
                       : 'style={{color: 'var(--danger)'}}'
                   }`}>
                     {positions.reduce((sum, pos) => sum + pos.profit, 0) >= 0 ? '+' : ''}
                     ¥{positions.reduce((sum, pos) => sum + pos.profit, 0).toLocaleString()}
                   </h3>
                   <p className="text-sm style={{color: 'var(--text-muted)'}}">包含已实现和浮盈浮亏</p>
                 </div>
                 <div className={`w-[50px] h-[50px] rounded-[10px] grid place-items-center ${
                   positions.reduce((sum, pos) => sum + pos.profit, 0) >= 0 
                     ? 'bg-gradient-to-br from-green-50 to-green-100 style={{color: 'var(--success)'}}' 
                     : 'bg-gradient-to-br from-red-50 to-red-100 style={{color: 'var(--danger)'}}'
                 }`}>
                   <TrendingUp size={24} />
                 </div>
               </div>
               <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(24,191,95,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
             </div>

             <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[14px] style={{boxShadow: 'var(--shadow)'}} p-6 relative overflow-hidden">
               <div className="flex justify-between items-start">
                 <div>
                   <p className="text-base font-semibold style={{color: 'var(--text-muted)'}} mb-2">平均收益率</p>
                   <h3 className={`text-3xl font-black mb-3 number ${
                     positions.reduce((sum, pos) => sum + pos.profit, 0) >= 0 
                       ? 'style={{color: 'var(--success)'}}' 
                       : 'style={{color: 'var(--danger)'}}'
                   }`}>
                     {positions.length > 0 ? (positions.reduce((sum, pos) => sum + pos.profitRate, 0) / positions.length).toFixed(2) : '0.00'}%
                   </h3>
                   <p className="text-sm style={{color: 'var(--text-muted)'}}">所有持仓平均收益率</p>
                 </div>
                 <div className="w-[50px] h-[50px] rounded-[10px] bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 grid place-items-center">
                   <TrendingUp size={24} />
                 </div>
               </div>
               <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
             </div>
           </div>

           {/* 持仓列表 */}
           <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[13px] style={{boxShadow: 'var(--shadow)'}} overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="style={{backgroundColor: 'var(--bg-soft)'}} border-b style={{borderColor: 'var(--border)'}}">
                    <th className="text-left px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">账户</th>
                    <th className="text-left px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">标的</th>
                    <th className="text-right px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">持仓数量</th>
                    <th className="text-right px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">平均成本</th>
                    <th className="text-right px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">当前价格</th>
                    <th className="text-right px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">持仓市值</th>
                    <th className="text-right px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">持仓收益</th>
                    <th className="text-right px-5 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">收益率</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center style={{color: 'var(--text-light)'}} empty-state">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full style={{backgroundColor: 'var(--bg-soft)'}} grid place-items-center">
                          <TrendingUp size={32} className="opacity-50" />
                        </div>
                        <p className="text-lg font-medium style={{color: 'var(--text)'}}">暂无持仓</p>
                        <p className="text-sm style={{color: 'var(--text-muted)'}} mt-1">添加买入交易后将自动计算持仓信息</p>
                      </td>
                    </tr>
                  ) : (
                    positions.map((pos, index) => (
                      <tr key={index} className="border-b style={{borderColor: 'var(--border)'}} hover:style={{backgroundColor: 'var(--bg-soft)'}} transition-all">
                        <td className="px-5 py-4 text-sm style={{color: 'var(--text)'}}">
                          {pos.accountName}
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <div className="font-medium style={{color: 'var(--text)'}}">{pos.name}</div>
                            {pos.symbol && <div className="text-xs style={{color: 'var(--text-muted)'}}">{pos.symbol}</div>}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm style={{color: 'var(--text)'}} text-right number">
                          {pos.currentQuantity.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-sm style={{color: 'var(--text)'}} text-right number">
                          ¥{pos.averageCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 text-sm style={{color: 'var(--text)'}} text-right number">
                          ¥{pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 text-sm style={{color: 'var(--text)'}} text-right number">
                          ¥{pos.currentValue.toLocaleString()}
                        </td>
                        <td className={`px-5 py-4 text-sm font-bold text-right number ${
                          pos.profit >= 0 ? 'style={{color: 'var(--success)'}}' : 'style={{color: 'var(--danger)'}}'
                        }`}>
                          {pos.profit >= 0 ? '+' : ''}¥{pos.profit.toLocaleString()}
                        </td>
                        <td className={`px-5 py-4 text-sm font-bold text-right number ${
                          pos.profitRate >= 0 ? 'style={{color: 'var(--success)'}}' : 'style={{color: 'var(--danger)'}}'
                        }`}>
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
               <TrendingUp size={24} className="style={{color: 'var(--primary)'}} flex-shrink-0 mt-1" />
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
               // 计算不同时间段的收益
               const now = Date.now()
               const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000
               const threeYearAgo = now - 3 * 365 * 24 * 60 * 60 * 1000
               const fiveYearAgo = now - 5 * 365 * 24 * 60 * 60 * 1000

               // 计算指定时间点的收益
               const calculateReturn = (startTime: number) => {
                 // 该时间点之前的所有买入
                 const buyBefore = transactions
                   .filter(t => t.time <= startTime && (t.type === 'buy' || t.type === 'transfer_in'))
                   .reduce((sum, t) => sum + t.amount + t.fee, 0)
                 
                 // 该时间点之前的所有卖出/分红/利息
                 const sellBefore = transactions
                   .filter(t => t.time <= startTime && ['sell', 'dividend', 'interest', 'transfer_out'].includes(t.type))
                   .reduce((sum, t) => sum + t.amount, 0)

                 // 该时间点之后的所有操作
                 const buyAfter = transactions
                   .filter(t => t.time > startTime && (t.type === 'buy' || t.type === 'transfer_in'))
                   .reduce((sum, t) => sum + t.amount + t.fee, 0)
                 
                 const sellAfter = transactions
                   .filter(t => t.time > startTime && ['sell', 'dividend', 'interest', 'transfer_out'].includes(t.type))
                   .reduce((sum, t) => sum + t.amount, 0)

                 // 当前持仓价值（按成本计算）
                 const positions = calculatePositions()
                 const currentPositionValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0)

                 // 时间段内的收益 = 期间卖出 + 当前持仓价值 - 期间买入
                 const periodProfit = sellAfter + currentPositionValue - buyAfter
                 // 期初投入 = 期初投入 - 期初收回
                 const initialInvestment = Math.max(0, buyBefore - sellBefore)
                 // 收益率
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
                 <div key={index} className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[14px] style={{boxShadow: 'var(--shadow)'}} p-8">
                   <div className="mb-4">
                     <h4 className="text-lg font-bold style={{color: 'var(--text)'}}">{period.name}</h4>
                     <div className="text-xs style={{color: 'var(--text-muted)'}}">收益统计</div>
                   </div>
                   <div className="space-y-4">
                     <div>
                       <div className="text-sm style={{color: 'var(--text-muted)'}} mb-1">累计收益</div>
                       <div className={`text-3xl font-bold number ${
                         period.totalProfit >= 0 ? 'style={{color: 'var(--success)'}}' : 'style={{color: 'var(--danger)'}}'
                       }`}>
                         {period.totalProfit >= 0 ? '+' : ''}¥{period.totalProfit.toLocaleString()}
                       </div>
                     </div>
                     <div>
                       <div className="text-sm style={{color: 'var(--text-muted)'}} mb-1">收益率</div>
                       <div className={`text-3xl font-bold number ${
                         period.returnRate >= 0 ? 'style={{color: 'var(--success)'}}' : 'style={{color: 'var(--danger)'}}'
                       }`}>
                         {period.returnRate >= 0 ? '+' : ''}{period.returnRate.toFixed(2)}%
                       </div>
                     </div>
                     <div>
                       <div className="text-sm style={{color: 'var(--text-muted)'}} mb-1">期初投入</div>
                       <div className="text-lg font-medium style={{color: 'var(--text)'}} number">
                         ¥{period.initialInvestment.toLocaleString()}
                       </div>
                     </div>
                   </div>
                 </div>
               ))
             })()}
           </div>

           {/* 年度收益明细 */}
           <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[13px] style={{boxShadow: 'var(--shadow)'}} p-8">
             <h3 className="text-xl font-bold style={{color: 'var(--text)'}} mb-6">年度收益明细</h3>
             {(() => {
               // 按年度统计收益
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

               // 计算每年收益
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
                       <tr className="style={{backgroundColor: 'var(--bg-soft)'}} border-b style={{borderColor: 'var(--border)'}}">
                         <th className="text-left px-4 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">年度</th>
                         <th className="text-right px-4 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">总买入</th>
                         <th className="text-right px-4 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">总卖出</th>
                         <th className="text-right px-4 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">分红/利息</th>
                         <th className="text-right px-4 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">年度收益</th>
                         <th className="text-right px-4 py-3 text-xs font-bold style={{color: 'var(--text-muted)'}} uppercase tracking-wider">收益率</th>
                       </tr>
                     </thead>
                     <tbody>
                       {sortedYears.map(year => (
                         <tr key={year.year} className="border-b style={{borderColor: 'var(--border)'}} hover:style={{backgroundColor: 'var(--bg-soft)'}} transition-all">
                           <td className="px-4 py-4 text-sm font-medium style={{color: 'var(--text)'}}">{year.year}年</td>
                           <td className="px-4 py-4 text-sm text-right number style={{color: 'var(--danger)'}}">¥{year.buy.toLocaleString()}</td>
                           <td className="px-4 py-4 text-sm text-right number style={{color: 'var(--success)'}}">¥{year.sell.toLocaleString()}</td>
                           <td className="px-4 py-4 text-sm text-right number style={{color: 'var(--success)'}}">¥{year.dividend.toLocaleString()}</td>
                           <td className={`px-4 py-4 text-sm font-bold text-right number ${
                             year.profit >= 0 ? 'style={{color: 'var(--success)'}}' : 'style={{color: 'var(--danger)'}}'
                           }`}>
                             {year.profit >= 0 ? '+' : ''}¥{year.profit.toLocaleString()}
                           </td>
                           <td className={`px-4 py-4 text-sm font-bold text-right number ${
                             year.returnRate >= 0 ? 'style={{color: 'var(--success)'}}' : 'style={{color: 'var(--danger)'}}'
                           }`}>
                             {year.returnRate >= 0 ? '+' : ''}{year.returnRate.toFixed(2)}%
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               ) : (
                 <div className="text-center py-16 style={{color: 'var(--text-muted)'}}">
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