import { useState, useEffect } from 'react'
import { 
  Edit2, Trash2, Wallet, CreditCard, Banknote, Landmark, 
  TrendingUp, TrendingDown, MoreHorizontal, Home, Coins, 
  DollarSign, CreditCard as LoanIcon
} from 'lucide-react'
import type { Account, Liability, InvestmentTransaction, AssetHistory } from '../types'
import { storage } from '../utils/storage'
import * as echarts from 'echarts'
import { useNumberAnimation, formatCurrency } from '../hooks/useNumberAnimation'
import { useTheme } from '../hooks/useTheme'
import { CURRENCIES, DEFAULT_EXCHANGE_RATES } from '../constants/currencies'

const ACCOUNT_TYPES = [
  { value: 'cash', label: '现金', icon: <Banknote size={18} aria-hidden="true" />, color: 'bg-green-50 style={{color: 'var(--success)'}}' },
  { value: 'bank', label: '银行卡', icon: <Landmark size={18} aria-hidden="true" />, color: 'bg-blue-50 style={{color: 'var(--primary)'}}' },
  { value: 'alipay', label: '支付宝', icon: <CreditCard size={18} aria-hidden="true" />, color: 'bg-blue-50 style={{color: 'var(--primary)'}}' },
  { value: 'wechat', label: '微信钱包', icon: <Wallet size={18} aria-hidden="true" />, color: 'bg-green-50 style={{color: 'var(--success)'}}' },
  { value: 'stock', label: '股票账户', icon: <TrendingUp size={18} aria-hidden="true" />, color: 'bg-purple-50 text-purple-600' },
  { value: 'fund', label: '基金账户', icon: <TrendingUp size={18} aria-hidden="true" />, color: 'bg-purple-50 text-purple-600' },
  { value: 'bond', label: '债券', icon: <Coins size={18} aria-hidden="true" />, color: 'bg-amber-50 style={{color: 'var(--warning)'}}' },
  { value: 'real_estate', label: '房产', icon: <Home size={18} aria-hidden="true" />, color: 'bg-red-50 style={{color: 'var(--danger)'}}' },
  { value: 'gold', label: '贵金属', icon: <Coins size={18} aria-hidden="true" />, color: 'bg-amber-50 style={{color: 'var(--warning)'}}' },
  { value: 'cryptocurrency', label: '加密货币', icon: <DollarSign size={18} aria-hidden="true" />, color: 'bg-blue-50 style={{color: 'var(--primary)'}}' },
  { value: 'other', label: '其他账户', icon: <MoreHorizontal size={18} aria-hidden="true" />, color: 'bg-gray-50 style={{color: 'var(--text-muted)'}}' },
] as const

const LIABILITY_TYPES = [
  { value: 'credit_card', label: '信用卡', icon: <CreditCard size={18} aria-hidden="true" />, color: 'bg-red-50 style={{color: 'var(--danger)'}}' },
  { value: 'mortgage', label: '房贷', icon: <Home size={18} aria-hidden="true" />, color: 'bg-red-50 style={{color: 'var(--danger)'}}' },
  { value: 'car_loan', label: '车贷', icon: <LoanIcon size={18} aria-hidden="true" />, color: 'bg-red-50 style={{color: 'var(--danger)'}}' },
  { value: 'personal_loan', label: '个人贷款', icon: <LoanIcon size={18} aria-hidden="true" />, color: 'bg-red-50 style={{color: 'var(--danger)'}}' },
  { value: 'other_loan', label: '其他负债', icon: <LoanIcon size={18} aria-hidden="true" />, color: 'bg-red-50 style={{color: 'var(--danger)'}}' },
] as const

interface Props {
  className?: string
}

export default function Assets({ className }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [investmentTransactions, setInvestmentTransactions] = useState<InvestmentTransaction[]>([])
  const [assetHistory, setAssetHistory] = useState<AssetHistory[]>([])
  const [activeTab, setActiveTab] = useState<'assets' | 'liabilities' | 'trend'>('assets')
  const { isDark } = useTheme()
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalType, setModalType] = useState<'account' | 'liability'>('account')
  const [editingItem, setEditingItem] = useState<Account | Liability | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'cash' as Account['type'] | Liability['type'],
    balance: 0,
    amount: 0,
    interestRate: 0,
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    icon: '💰',
    color: '#3b82f6',
    currency: 'CNY' as string
  })

  // 生成近6个月的资产历史数据
  const generateAssetHistory = () => {
    const now = new Date()
    const history: AssetHistory[] = []
    const totalAssets = accounts.reduce((sum, account) => sum + account.balance, 0)
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0)
    
    // 模拟近6个月的数据，后续可以改为根据实际交易计算
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      
      // 模拟资产增长
      const baseAssets = totalAssets * (0.8 + Math.random() * 0.4)
      const baseLiabilities = totalLiabilities * (0.9 + Math.random() * 0.2)
      
      history.push({
        id: monthKey,
        date: monthKey,
        totalAssets: Math.round(baseAssets),
        totalLiabilities: Math.round(baseLiabilities),
        netWorth: Math.round(baseAssets - baseLiabilities),
        createdAt: d.getTime()
      })
    }
    
    // 保存到本地存储
    const existingHistory = storage.getAssetHistory()
    if (existingHistory.length === 0) {
      history.forEach(item => storage.addAssetHistory(item))
    }
    
    setAssetHistory(existingHistory.length > 0 ? existingHistory : history)
  }

  // 初始化图表
  useEffect(() => {
    if (activeTab === 'trend' && assetHistory.length > 0) {
      const chartDom = document.getElementById('netWorthChart')
      if (!chartDom) return

      const myChart = echarts.init(chartDom, isDark ? 'dark' : undefined)
      const textColor = isDark ? '#CBD5E1' : '#64748B'
      
      const option = {
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            let result = `${params[0].axisValue}<br/>`
            params.forEach((item: any) => {
              result += `${item.marker}${item.seriesName}: ¥${item.value.toLocaleString()}<br/>`
            })
            return result
          }
        },
        legend: {
          data: ['总资产', '净资产', '总负债'],
          bottom: 10,
          textStyle: {
            color: textColor
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: assetHistory.map(d => d.date.slice(5)),
          axisLabel: {
            color: textColor
          },
          axisLine: {
            lineStyle: {
              color: isDark ? '#334155' : '#E7EDF5'
            }
          }
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            color: textColor
          },
          axisLine: {
            lineStyle: {
              color: isDark ? '#334155' : '#E7EDF5'
            }
          },
          splitLine: {
            lineStyle: {
              color: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(231, 237, 245, 0.5)'
            }
          }
        },
        series: [
          {
            name: '总资产',
            type: 'line',
            data: assetHistory.map(d => d.totalAssets),
            color: '#165DFF',
            smooth: true,
            lineStyle: {
              width: 2
            }
          },
          {
            name: '净资产',
            type: 'line',
            data: assetHistory.map(d => d.netWorth),
            color: '#00B42A',
            smooth: true,
            lineStyle: {
              width: 2
            }
          },
          {
            name: '总负债',
            type: 'line',
            data: assetHistory.map(d => d.totalLiabilities),
            color: '#F53F3F',
            smooth: true,
            lineStyle: {
              width: 2
            }
          }
        ]
      }

      myChart.setOption(option)
    }
  }, [activeTab, assetHistory, isDark])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setAccounts(storage.getAccounts())
    setLiabilities(storage.getLiabilities())
    setInvestmentTransactions(storage.getInvestmentTransactions())
  }

  useEffect(() => {
    if (accounts.length > 0 || liabilities.length > 0) {
      generateAssetHistory()
    }
  }, [accounts, liabilities])

  // 计算核心指标（统一换算为人民币）
  const totalAssets = accounts.reduce((sum, account) => {
    const rate = DEFAULT_EXCHANGE_RATES[account.currency || 'CNY'] || 1
    return sum + account.balance * rate
  }, 0)
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0)
  const netWorth = totalAssets - totalLiabilities
  
  // 计算投资收益
  const calculateInvestmentProfit = () => {
    let totalProfit = 0
    investmentTransactions.forEach(t => {
      if (t.type === 'sell' || t.type === 'dividend' || t.type === 'interest') {
        totalProfit += t.amount
      } else if (t.type === 'buy') {
        totalProfit -= t.amount + t.fee
      }
    })
    return totalProfit
  }
  const investmentProfit = calculateInvestmentProfit()

  // 数字动画
  const animatedTotalAssets = useNumberAnimation(totalAssets, 1500, formatCurrency)
  const animatedTotalLiabilities = useNumberAnimation(totalLiabilities, 1500, formatCurrency)
  const animatedNetWorth = useNumberAnimation(netWorth, 1500, formatCurrency)
  const animatedInvestmentProfit = useNumberAnimation(investmentProfit, 1500, formatCurrency)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (modalType === 'account') {
      const accounts = storage.getAccounts()
      if (editingItem && 'icon' in editingItem) {
          // 编辑账户
          const updated = accounts.map(acc => 
            acc.id === editingItem.id ? { ...acc, ...formData, type: formData.type as Account['type'], updatedAt: Date.now() } : acc
          )
        storage.saveAccounts(updated)
      } else {
         // 新增账户
         const newAccount: Account = {
           id: Date.now().toString(),
           name: formData.name,
           type: formData.type as Account['type'],
           balance: formData.balance,
           icon: formData.icon,
           color: formData.color,
           currency: formData.currency,
           createdAt: Date.now(),
           updatedAt: Date.now()
         }
        accounts.push(newAccount)
        storage.saveAccounts(accounts)
      }
    } else {
      const liabilities = storage.getLiabilities()
      if (editingItem && 'interestRate' in editingItem) {
          // 编辑负债
          const updated = liabilities.map(liab => 
            liab.id === editingItem.id ? { 
              ...liab, 
              ...formData, 
              type: formData.type as Liability['type'],
              startDate: new Date(formData.startDate).getTime(),
              dueDate: formData.dueDate ? new Date(formData.dueDate).getTime() : undefined,
              updatedAt: Date.now(),
              amount: formData.amount || formData.balance,
              balance: formData.balance
            } : liab
          )
        storage.saveLiabilities(updated)
      } else {
        // 新增负债
        const newLiability: Liability = {
          id: Date.now().toString(),
          name: formData.name,
          type: formData.type as Liability['type'],
          amount: formData.amount || formData.balance,
          balance: formData.balance,
          interestRate: formData.interestRate,
          startDate: new Date(formData.startDate).getTime(),
          dueDate: formData.dueDate ? new Date(formData.dueDate).getTime() : undefined,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        liabilities.push(newLiability)
        storage.saveLiabilities(liabilities)
      }
    }

    loadData()
    resetForm()
    setShowAddModal(false)
    setEditingItem(null)
  }

  const handleEdit = (item: Account | Liability) => {
    setEditingItem(item)
    // 判断是否为Account类型
    if ('icon' in item && 'color' in item) {
      setModalType('account')
       setFormData({
         name: item.name,
         type: item.type,
         balance: item.balance,
         icon: item.icon,
         color: item.color,
         currency: item.currency || 'CNY',
         amount: 0,
         interestRate: 0,
         startDate: new Date().toISOString().slice(0, 10),
         dueDate: ''
       })
    } else {
      const liability = item as Liability
      setModalType('liability')
      setFormData({
        name: liability.name,
        type: liability.type,
        balance: liability.balance,
        amount: liability.amount,
        interestRate: liability.interestRate,
        startDate: new Date(liability.startDate).toISOString().slice(0, 10),
        dueDate: liability.dueDate ? new Date(liability.dueDate).toISOString().slice(0, 10) : '',
        icon: '💳',
        color: '#ef4444',
        currency: 'CNY'
      })
    }
    setShowAddModal(true)
  }

  const handleDelete = (id: string, type: 'account' | 'liability') => {
    if (confirm(`确定要删除这个${type === 'account' ? '账户' : '负债'}吗？`)) {
      if (type === 'account') {
        const accounts = storage.getAccounts()
        storage.saveAccounts(accounts.filter(acc => acc.id !== id))
      } else {
        const liabilities = storage.getLiabilities()
        storage.saveLiabilities(liabilities.filter(liab => liab.id !== id))
      }
      loadData()
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'cash',
      balance: 0,
      amount: 0,
      interestRate: 0,
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      icon: '💰',
      color: '#3b82f6',
      currency: 'CNY'
    })
  }

  const getAccountTypeInfo = (type: Account['type']) => {
    return ACCOUNT_TYPES.find(t => t.value === type) || ACCOUNT_TYPES[0]
  }

  const getLiabilityTypeInfo = (type: Liability['type']) => {
    return LIABILITY_TYPES.find(t => t.value === type) || LIABILITY_TYPES[0]
  }

  return (
    <div className={`animate-fade-in ${className || ''}`}>
      {/* 核心指标卡片 */}
      <div className="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[14px] style={{boxShadow: 'var(--shadow)'}} p-8 relative overflow-hidden">
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center icon-scale-hover">
              <Wallet size={32} className="style={{color: 'var(--primary)'}}" />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold style={{color: 'var(--text)'}} mb-4">总资产</div>
              <div className="text-[35px] font-black style={{color: 'var(--text)'}} mb-6 number leading-none">
                ¥{animatedTotalAssets}
              </div>
              <div className="text-base font-semibold style={{color: 'var(--text-muted)'}}">共 {accounts.length} 个账户</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[14px] style={{boxShadow: 'var(--shadow)'}} p-8 relative overflow-hidden">
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center icon-spin-hover">
              <TrendingDown size={32} className="style={{color: 'var(--danger)'}}" />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold style={{color: 'var(--text)'}} mb-4">总负债</div>
              <div className="text-[35px] font-black style={{color: 'var(--danger)'}} mb-6 number leading-none">
                ¥{animatedTotalLiabilities}
              </div>
              <div className="text-base font-semibold style={{color: 'var(--text-muted)'}}">共 {liabilities.length} 项负债</div>
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
              <div className="text-lg font-extrabold style={{color: 'var(--text)'}} mb-4">净资产</div>
              <div className={`text-[35px] font-black mb-6 number leading-none ${netWorth >= 0 ? 'style={{color: 'var(--success)'}}' : 'style={{color: 'var(--danger)'}}'}`}>
                ¥{animatedNetWorth}
              </div>
              <div className="text-base font-semibold style={{color: 'var(--text-muted)'}}">总资产 - 总负债</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(24,191,95,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[14px] style={{boxShadow: 'var(--shadow)'}} p-8 relative overflow-hidden">
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center icon-scale-hover">
              <TrendingUp size={32} className="style={{color: 'var(--warning)'}}" />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold style={{color: 'var(--text)'}} mb-4">投资收益</div>
              <div className={`text-[35px] font-black mb-6 number leading-none ${investmentProfit >= 0 ? 'style={{color: 'var(--warning)'}}' : 'style={{color: 'var(--danger)'}}'}`}>
                {investmentProfit >= 0 ? '+' : ''}¥{animatedInvestmentProfit}
              </div>
              <div className="text-base font-semibold style={{color: 'var(--text-muted)'}}">累计收益</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(255,146,15,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>
      </div>

      {/* 资产/负债/走势卡片 */}
      <div className="bg-white border style={{borderColor: 'var(--border)'}} rounded-[13px] style={{boxShadow: 'var(--shadow)'}} overflow-hidden mt-6">
        {/* 头部tab区域 */}
        <div className="h-[75px] flex items-start justify-between px-8 pt-6">
          <div className="flex gap-14 h-[50px] items-start">
            <button
              onClick={() => setActiveTab('assets')}
              className={`relative text-xl font-bold transition-all pb-4 ${
                activeTab === 'assets' 
                  ? 'style={{color: 'var(--primary)'}} font-black' 
                  : 'style={{color: 'var(--text-muted)'}} hover:style={{color: 'var(--text)'}}'
              }`}
            >
              资产账户
              {activeTab === 'assets' && (
                <span className="absolute left-0 right-0 bottom-[-18px] h-[3px] rounded-[2px] style={{backgroundColor: 'var(--primary)'}}"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('liabilities')}
              className={`relative text-xl font-bold transition-all pb-4 ${
                activeTab === 'liabilities' 
                  ? 'style={{color: 'var(--primary)'}} font-black' 
                  : 'style={{color: 'var(--text-muted)'}} hover:style={{color: 'var(--text)'}}'
              }`}
            >
              负债管理
              {activeTab === 'liabilities' && (
                <span className="absolute left-0 right-0 bottom-[-18px] h-[3px] rounded-[2px] style={{backgroundColor: 'var(--primary)'}}"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('trend')}
              className={`relative text-xl font-bold transition-all pb-4 ${
                activeTab === 'trend' 
                  ? 'style={{color: 'var(--primary)'}} font-black' 
                  : 'style={{color: 'var(--text-muted)'}} hover:style={{color: 'var(--text)'}}'
              }`}
            >
              资产走势
              {activeTab === 'trend' && (
                <span className="absolute left-0 right-0 bottom-[-18px] h-[3px] rounded-[2px] style={{backgroundColor: 'var(--primary)'}}"></span>
              )}
            </button>
          </div>
           <button
             onClick={() => {
               resetForm()
               setEditingItem(null)
               setModalType(activeTab === 'liabilities' ? 'liability' : 'account')
               setShowAddModal(true)
             }}
             aria-label={activeTab === 'liabilities' ? '添加负债' : '添加账户'}
             className="h-[42px] px-6 rounded-lg border-0 text-white bg-gradient-to-b from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 flex items-center gap-2 text-base font-bold"
           >
             <span className="text-2xl font-normal mt-[-2px]" aria-hidden="true">＋</span>
             {activeTab === 'liabilities' ? '添加负债' : '添加账户'}
           </button>
        </div>
        
        {/* 内容区域 */}
        <div className="p-8 pt-0">

        {/* 内容区域 */}
        {activeTab === 'assets' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
            {accounts.map(account => {
              const typeInfo = getAccountTypeInfo(account.type)
              return (
                <div key={account.id} className="glass-card p-4 hover:style={{boxShadow: 'var(--shadow-lg)'}} transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-sm ${typeInfo.color} grid place-items-center`}>
                        {typeInfo.icon}
                      </div>
                   <div>
                     <div className="font-medium style={{color: 'var(--text)'}}">{account.name}</div>
                     <div className="text-xs style={{color: 'var(--text-muted)'}}">
                       {typeInfo.label} · {account.currency || 'CNY'}
                     </div>
                   </div>
                    </div>
                     <div className="flex gap-2">
                       <button
                         onClick={() => handleEdit(account)}
                         aria-label="编辑账户"
                         className="w-10 h-10 flex items-center justify-center style={{color: 'var(--primary)'}} hover:bg-blue-50 rounded-sm transition-all"
                       >
                         <Edit2 size={18} aria-hidden="true" />
                       </button>
                       <button
                         onClick={() => handleDelete(account.id, 'account')}
                         aria-label="删除账户"
                         className="w-10 h-10 flex items-center justify-center style={{color: 'var(--danger)'}} hover:bg-red-50 rounded-sm transition-all"
                       >
                         <Trash2 size={18} aria-hidden="true" />
                       </button>
                     </div>
                  </div>
                  <div>
                    <div className="text-sm style={{color: 'var(--text-muted)'}} mb-1">账户余额</div>
                     <div className="text-2xl font-bold style={{color: 'var(--text)'}} number">
                       {account.currency === 'USD' ? '$' : 
                        account.currency === 'EUR' ? '€' : 
                        account.currency === 'GBP' ? '£' : 
                        account.currency === 'HKD' ? 'HK$' : 
                        account.currency === 'JPY' ? '¥' : 
                        account.currency === 'KRW' ? '₩' : '¥'}
                       {account.balance.toLocaleString()}
                     </div>
                  </div>
                </div>
              )
            })}

            {accounts.length === 0 && (
              <div className="col-span-full py-20 text-center flex flex-col items-center justify-center empty-state">
                <div className="w-[205px] h-[134px] mb-3">
                  <svg viewBox="0 0 205 134" width="205" height="134" fill="none">
                    <ellipse cx="102" cy="110" rx="70" ry="13" fill="#eef6ff"/>
                    <path d="M45 79c-8-30 13-48 42-44 10 1 18 4 30 7 23 5 42 1 49 19 7 17-2 38-23 46-22 8-54 5-75-3-13-5-19-13-23-25Z" fill="#f2f8ff"/>
                    <path d="M42 70c3-26 24-39 53-29 25 8 42 7 59-3" stroke="#9ec8ff" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round"/>
                    <g filter="url(#wallet-shadow)">
                      <path d="M82 34 147 47c5 1 8 5 7 10l-12 50c-1 5-6 8-11 7L66 101c-5-1-8-6-7-11l12-48c1-6 6-9 11-8Z" fill="#73a7ff"/>
                      <path d="M82 42 146 55c4 .8 7 4.8 6 8.9l-9.4 38.5c-.9 4.2-5 6.8-9.2 6L69 95.8c-4.2-.9-6.8-5-5.9-9.2L72.5 48c.9-4.2 5.1-6.8 9.5-6Z" fill="#8db9ff"/>
                      <path d="M93 47 150 58c4 .8 6.7 4.7 5.9 8.7l-7.4 37.6c-.8 4-4.7 6.6-8.7 5.8L82.8 99c-4-.8-6.7-4.7-5.9-8.7l7.4-37.6c.8-4.1 4.7-6.7 8.7-5.9Z" fill="#6da3f9"/>
                      <path d="M122 76h35c4 0 7 3 7 7v13c0 4-3 7-7 7h-35c-4 0-7-3-7-7V83c0-4 3-7 7-7Z" fill="#d7e8ff"/>
                      <circle cx="127" cy="89" r="5" fill="#367cff"/>
                    </g>
                    <circle cx="154" cy="105" r="10" fill="#367cff"/>
                    <path d="M154 100v10M149 105h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                    <defs>
                      <filter id="wallet-shadow" x="47" y="25" width="129" height="101" filterUnits="userSpaceOnUse">
                        <feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#6ea7ff" floodOpacity=".28"/>
                      </filter>
                    </defs>
                  </svg>
                </div>
                <p className="text-xl font-extrabold style={{color: 'var(--text)'}} mt-1">暂无资产账户</p>
                <p className="text-lg style={{color: 'var(--text-muted)'}} mt-5 font-medium">点击右上角添加您的第一个资产账户吧</p>
              </div>
            )}
          </div>
        ) : activeTab === 'liabilities' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
            {liabilities.map(liability => {
              const typeInfo = getLiabilityTypeInfo(liability.type)
              return (
                <div key={liability.id} className="glass-card p-4 hover:style={{boxShadow: 'var(--shadow-lg)'}} transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-sm ${typeInfo.color} grid place-items-center`}>
                        {typeInfo.icon}
                      </div>
                      <div>
                        <div className="font-medium style={{color: 'var(--text)'}}">{liability.name}</div>
                        <div className="text-xs style={{color: 'var(--text-muted)'}}">{typeInfo.label}</div>
                      </div>
                    </div>
                     <div className="flex gap-2">
                       <button
                         onClick={() => handleEdit(liability)}
                         aria-label="编辑负债"
                         className="w-10 h-10 flex items-center justify-center style={{color: 'var(--primary)'}} hover:bg-blue-50 rounded-sm transition-all"
                       >
                         <Edit2 size={18} aria-hidden="true" />
                       </button>
                       <button
                         onClick={() => handleDelete(liability.id, 'liability')}
                         aria-label="删除负债"
                         className="w-10 h-10 flex items-center justify-center style={{color: 'var(--danger)'}} hover:bg-red-50 rounded-sm transition-all"
                       >
                         <Trash2 size={18} aria-hidden="true" />
                       </button>
                     </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm style={{color: 'var(--text-muted)'}} mb-1">待还金额</div>
                      <div className="text-xl font-bold style={{color: 'var(--danger)'}} number">
                        ¥{liability.balance.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs style={{color: 'var(--text-muted)'}}">
                      <span>总额: ¥{liability.amount.toLocaleString()}</span>
                      <span>利率: {liability.interestRate}%</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {liabilities.length === 0 && (
              <div className="col-span-full py-20 text-center flex flex-col items-center justify-center empty-state">
                <div className="w-[205px] h-[134px] mb-3">
                  <svg viewBox="0 0 205 134" width="205" height="134" fill="none">
                    <ellipse cx="102" cy="110" rx="70" ry="13" fill="#ffe9ed"/>
                    <path d="M45 79c-8-30 13-48 42-44 10 1 18 4 30 7 23 5 42 1 49 19 7 17-2 38-23 46-22 8-54 5-75-3-13-5-19-13-23-25Z" fill="#fff2f4"/>
                    <path d="M42 70c3-26 24-39 53-29 25 8 42 7 59-3" stroke="#ffb3c0" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round"/>
                    <g filter="url(#liability-shadow)">
                      <path d="M82 34 147 47c5 1 8 5 7 10l-12 50c-1 5-6 8-11 7L66 101c-5-1-8-6-7-11l12-48c1-6 6-9 11-8Z" fill="#ff7a8a"/>
                      <path d="M82 42 146 55c4 .8 7 4.8 6 8.9l-9.4 38.5c-.9 4.2-5 6.8-9.2 6L69 95.8c-4.2-.9-6.8-5-5.9-9.2L72.5 48c.9-4.2 5.1-6.8 9.5-6Z" fill="#ff8f9c"/>
                      <path d="M93 47 150 58c4 .8 6.7 4.7 5.9 8.7l-7.4 37.6c-.8 4-4.7 6.6-8.7 5.8L82.8 99c-4-.8-6.7-4.7-5.9-8.7l7.4-37.6c.8-4.1 4.7-6.7 8.7-5.9Z" fill="#ff5c6e"/>
                      <path d="M122 76h35c4 0 7 3 7 7v13c0 4-3 7-7 7h-35c-4 0-7-3-7-7V83c0-4 3-7 7-7Z" fill="#ffd7dc"/>
                      <circle cx="127" cy="89" r="5" fill="#ff384b"/>
                    </g>
                    <circle cx="154" cy="105" r="10" fill="#ff384b"/>
                    <path d="M154 100v10M149 105h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                    <defs>
                      <filter id="liability-shadow" x="47" y="25" width="129" height="101" filterUnits="userSpaceOnUse">
                        <feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#ff5c6e" floodOpacity=".28"/>
                      </filter>
                    </defs>
                  </svg>
                </div>
                <p className="text-xl font-extrabold style={{color: 'var(--text)'}} mt-1">暂无负债记录</p>
                <p className="text-lg style={{color: 'var(--text-muted)'}} mt-5 font-medium">添加负债可以更准确地计算您的净资产</p>
              </div>
            )}
          </div>
        ) : (
          // 资产走势页面
          <div className="pt-6">
            <div className="mb-5">
              <h3 className="text-lg font-semibold style={{color: 'var(--text)'}}">净资产走势</h3>
              <p className="text-sm style={{color: 'var(--text-muted)'}} mt-1">近6个月资产、负债、净资产变化趋势</p>
            </div>
            <div id="netWorthChart" className="h-[400px]"></div>
          </div>
        )}
        </div>
      </div>

      {/* 添加/编辑弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg style={{boxShadow: 'var(--shadow-lg)'}} max-w-md w-full p-6 animate-slide-up">
            <h3 className="text-xl font-bold mb-4 style={{color: 'var(--text)'}}">
              {editingItem 
                ? `编辑${modalType === 'account' ? '账户' : '负债'}` 
                : `添加${modalType === 'account' ? '账户' : '负债'}`
              }
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">
                  {modalType === 'account' ? '账户名称' : '负债名称'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-glass w-full"
                  placeholder={modalType === 'account' ? '例如：工商银行储蓄卡' : '例如：招商银行信用卡'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">
                  {modalType === 'account' ? '账户类型' : '负债类型'}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="input-glass w-full"
                >
                  {(modalType === 'account' ? ACCOUNT_TYPES : LIABILITY_TYPES).map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {modalType === 'liability' && (
                <div>
                  <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">
                    负债总额
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="input-glass w-full"
                    placeholder="请输入总负债金额"
                  />
                </div>
              )}

               <div>
                 <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">
                   {modalType === 'account' ? '当前余额' : '剩余待还金额'}
                 </label>
                 <input
                   type="number"
                   required
                   step="0.01"
                   value={formData.balance || ''}
                   onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                   className="input-glass w-full"
                   placeholder={`请输入${modalType === 'account' ? '余额' : '待还金额'}`}
                 />
               </div>

               {modalType === 'account' && (
                 <div>
                   <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">
                     币种
                   </label>
                   <select
                     value={formData.currency}
                     onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                     className="input-glass w-full"
                   >
                      {CURRENCIES.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.name} ({currency.symbol})
                        </option>
                      ))}
                   </select>
                 </div>
               )}

              {modalType === 'liability' && (
                <>
                  <div>
                    <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">
                      年利率（%）
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.interestRate || ''}
                      onChange={(e) => setFormData({ ...formData, interestRate: Number(e.target.value) })}
                      className="input-glass w-full"
                      placeholder="请输入年利率"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">
                      借款日期
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="input-glass w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium style={{color: 'var(--text)'}} mb-2">
                      到期日期（可选）
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="input-glass w-full"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingItem(null)
                  }}
                  className="flex-1 px-4 py-2.5 border style={{borderColor: 'var(--border)'}} rounded-sm hover:style={{backgroundColor: 'var(--bg-soft)'}} transition-all style={{color: 'var(--text)'}}"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  {editingItem ? '保存修改' : `添加${modalType === 'account' ? '账户' : '负债'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
