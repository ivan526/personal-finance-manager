import { useEffect, useState } from 'react'
import { TrendingUp, Wallet, AlertTriangle, ArrowRightLeft, AlertCircle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../utils/storage'
import { getTotalAssets } from '../utils/calculations'
import type { MonthData, RiskAssessmentResult } from '../types'
import * as echarts from 'echarts'
import { useNumberAnimation, formatCurrency } from '../hooks/useNumberAnimation'
import { useTheme } from '../hooks/useTheme'

// 不同风险等级的推荐资产配置
const RISK_ALLOCATION_CONFIG = {
  '保守型': {
    cash: 30,    // 现金类：30%
    bond: 50,    // 债券类：50%
    equity: 15,  // 权益类：15%
    alternative: 5, // 另类资产：5%
  },
  '稳健型': {
    cash: 20,
    bond: 40,
    equity: 35,
    alternative: 5,
  },
  '平衡型': {
    cash: 15,
    bond: 25,
    equity: 50,
    alternative: 10,
  },
  '成长型': {
    cash: 10,
    bond: 15,
    equity: 65,
    alternative: 10,
  },
  '进取型': {
    cash: 5,
    bond: 10,
    equity: 75,
    alternative: 10,
  }
}

// 默认汇率（1外币兑换多少人民币）
const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  CNY: 1,
  USD: 7.2,
  EUR: 7.8,
  GBP: 8.5,
  HKD: 0.92,
  JPY: 0.048,
  KRW: 0.0054
}

interface Props {
  className?: string
}

export default function Dashboard({ className }: Props) {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [totalBalance, setTotalBalance] = useState(0)
  const [monthData, setMonthData] = useState<MonthData[]>([])
  // 资产再平衡提醒
  const [rebalanceAlert, setRebalanceAlert] = useState<{
    show: boolean
    deviation: number
    message: string
  }>({ show: false, deviation: 0, message: '' })

  // 数字滚动动画
  const animatedIncome = useNumberAnimation(totalIncome, 1500, formatCurrency)
  const animatedExpense = useNumberAnimation(totalExpense, 1500, formatCurrency)
  const animatedBalance = useNumberAnimation(totalBalance, 1500, formatCurrency)
  const animatedTotalAssets = useNumberAnimation(getTotalAssets(), 1500, formatCurrency)
  const animatedSavingRate = useNumberAnimation(
    totalIncome > 0 ? ((totalBalance / totalIncome) * 100) : 0, 
    1500, 
    (v) => v.toFixed(1)
  )

  useEffect(() => {
    calculateStats()
    initChart()
    calculateRebalanceAlert()
  }, [isDark])

  // 计算资产再平衡提醒
  const calculateRebalanceAlert = () => {
    const accounts = storage.getAccounts()
    if (accounts.length === 0) return

    // 加载风险测评结果
    const savedRiskResult = localStorage.getItem('risk_assessment_result')
    if (!savedRiskResult) return

    const riskResult: RiskAssessmentResult = JSON.parse(savedRiskResult)
    const recommended = RISK_ALLOCATION_CONFIG[riskResult.riskProfile]

    // 计算总资产（包含投资市值）
    const totalAssets = getTotalAssets()

    if (totalAssets === 0) return

    // 计算大类资产分布
    const assetClass = {
      cash: 0,    // 现金类：现金、银行、支付宝、微信、货币基金
      bond: 0,    // 债券类：债券、债券基金、银行理财
      equity: 0,  // 权益类：股票、股票基金、混合基金、指数基金
      alternative: 0, // 另类资产：黄金、房产、贵金属、加密货币
    }

    accounts.forEach(acc => {
      const rate = DEFAULT_EXCHANGE_RATES[acc.currency || 'CNY'] || 1
      const amount = acc.balance * rate

      switch(acc.type) {
        case 'cash':
        case 'bank':
        case 'alipay':
        case 'wechat':
          assetClass.cash += amount
          break
        case 'bond':
          assetClass.bond += amount
          break
        case 'stock':
        case 'fund':
          assetClass.equity += amount
          break
        case 'gold':
        case 'real_estate':
        case 'cryptocurrency':
        case 'other':
          assetClass.alternative += amount
          break
        default:
          assetClass.alternative += amount
      }
    })

    // 计算占比
    const currentPercentage = {
      cash: (assetClass.cash / totalAssets) * 100,
      bond: (assetClass.bond / totalAssets) * 100,
      equity: (assetClass.equity / totalAssets) * 100,
      alternative: (assetClass.alternative / totalAssets) * 100,
    }

    // 计算总偏离度
    const totalDeviation = Object.entries(recommended).reduce((sum, [assetClass, target]) => {
      return sum + Math.abs(currentPercentage[assetClass as keyof typeof currentPercentage] - target)
    }, 0) / 2

    // 偏离度超过15%显示提醒
    if (totalDeviation > 15) {
      setRebalanceAlert({
        show: true,
        deviation: totalDeviation,
        message: `您的资产配置偏离推荐比例${totalDeviation.toFixed(1)}%，建议进行再平衡调整以匹配您的风险承受能力`
      })
    } else if (totalDeviation > 10) {
      setRebalanceAlert({
        show: true,
        deviation: totalDeviation,
        message: `您的资产配置略有偏离（${totalDeviation.toFixed(1)}%），可根据情况进行小幅调整`
      })
    } else {
      setRebalanceAlert({ show: false, deviation: 0, message: '' })
    }
  }

  const calculateStats = () => {
    const transactions = storage.getTransactions()
    const now = new Date()

    let income = 0
    let expense = 0

    // 月度数据
    const months: Record<string, { income: number; expense: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months[key] = { income: 0, expense: 0 }
    }

    transactions.forEach(t => {
      const date = new Date(t.time)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (t.type === 'income') {
        income += t.amount
        if (months[monthKey]) months[monthKey].income += t.amount
      } else {
        expense += t.amount
        if (months[monthKey]) months[monthKey].expense += t.amount
      }
    })

    setTotalIncome(income)
    setTotalExpense(expense)
    setTotalBalance(income - expense)

    const data: MonthData[] = Object.entries(months).map(([month, values]) => ({
      month,
      income: values.income,
      expense: values.expense,
    }))
    setMonthData(data)
  }

  const initChart = () => {
    const chartDom = document.getElementById('trendChart')
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
        data: ['收入', '支出'],
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
        data: monthData.map(d => d.month.slice(5)),
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
          name: '收入',
          type: 'line',
          data: monthData.map(d => d.income),
          color: '#00B42A',
          smooth: true,
          lineStyle: {
            width: 2
          },
          symbol: 'circle',
          symbolSize: 6
        },
        {
          name: '支出',
          type: 'line',
          data: monthData.map(d => d.expense),
          color: '#F53F3F',
          smooth: true,
          lineStyle: {
            width: 2
          },
          symbol: 'circle',
          symbolSize: 6
        }
      ]
    }

    myChart.setOption(option)
  }

  return (
    <div className={`animate-fade-in ${className || ''}`}>
      {/* 资产再平衡提醒 */}
      {rebalanceAlert.show && (
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-[14px] p-6" style={{boxShadow: 'var(--shadow)'}}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={24} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-amber-900 text-lg">资产配置再平衡提醒</h3>
                <span className="text-sm font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                  偏离度 {rebalanceAlert.deviation.toFixed(1)}%
                </span>
              </div>
              <p className="text-amber-800 mb-3">{rebalanceAlert.message}</p>
              <button 
                onClick={() => navigate('/analysis?tab=asset')}
                className="flex items-center gap-1 font-medium hover:underline transition-all group" style={{color: 'var(--primary)'}}
              >
                查看详细配置建议 
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <div className={`stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${rebalanceAlert.show ? 'mt-6' : 'mt-8'}`}>
        <div className="bg-white border rounded-[14px] p-8 relative overflow-hidden hover-lift" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center icon-spin-hover">
              <Wallet size={32} style={{color: 'var(--primary)'}} />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold mb-4" style={{color: 'var(--text)'}}>总资产</div>
              <div className="text-[35px] font-black mb-6 number leading-none" style={{color: 'var(--text)'}}>
                ¥{animatedTotalAssets}
              </div>
              <div className="text-base font-semibold" style={{color: 'var(--text-muted)'}}>账户余额 + 投资市值</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border rounded-[14px] p-8 relative overflow-hidden hover-lift" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center icon-bounce-hover">
              <TrendingUp size={32} style={{color: 'var(--success)'}} />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold mb-4" style={{color: 'var(--text)'}}>累计收入</div>
              <div className="text-[35px] font-black mb-6 number leading-none" style={{color: 'var(--success)'}}>
                ¥{animatedIncome}
              </div>
              <div className="text-base font-semibold" style={{color: 'var(--text-muted)'}}>
                <span style={{color: 'var(--success)'}}>+{totalIncome > 0 ? ((totalIncome / (totalIncome + totalExpense)) * 100).toFixed(1) : 0}%</span> 收入占比
              </div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(24,191,95,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border rounded-[14px] p-8 relative overflow-hidden hover-lift" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center icon-spin-hover">
              <ArrowRightLeft size={32} style={{color: 'var(--danger)'}} />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold mb-4" style={{color: 'var(--text)'}}>总支出</div>
              <div className="text-[35px] font-black mb-6 number leading-none" style={{color: 'var(--danger)'}}>
                ¥{animatedExpense}
              </div>
              <div className="text-base font-semibold" style={{color: 'var(--text-muted)'}}>所有记录的支出总和</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(248,59,77,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>

        <div className="bg-white border rounded-[14px] p-8 relative overflow-hidden hover-lift" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
          <div className="grid grid-cols-[78px_1fr_auto] items-center">
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center icon-bounce-hover">
              <AlertTriangle size={32} style={{color: 'var(--warning)'}} />
            </div>
            <div className="pl-2">
              <div className="text-lg font-extrabold mb-4" style={{color: 'var(--text)'}}>结余率</div>
              <div className="text-[35px] font-black mb-6 number leading-none" style={{
                color: (totalIncome > 0 && (totalBalance / totalIncome) * 100 >= 30) ? 'var(--success)' : 'var(--warning)'
              }}>
                {animatedSavingRate}%
              </div>
              <div className="text-base font-semibold" style={{color: 'var(--text-muted)'}}>建议结余率 ≥ 30%</div>
            </div>
            <div className="self-end justify-self-end mb-1"></div>
          </div>
          <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(255,146,15,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
        </div>
      </div>

      {/* 趋势图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border rounded-[13px] p-8" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
          <div className="mb-5">
            <h3 className="text-lg font-semibold" style={{color: 'var(--text)'}}>近6个月收支趋势</h3>
            <p className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>收入支出对比折线图</p>
          </div>
          <div id="trendChart" className="h-[300px]"></div>
        </div>

        <div className="bg-white border rounded-[13px] p-8" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
          <div className="mb-5">
            <h3 className="text-lg font-semibold" style={{color: 'var(--text)'}}>快速操作</h3>
            <p className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>常用功能快捷入口</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button 
              className="p-4 bg-blue-50 border border-blue-100 rounded-sm text-left transition-all group" style={{boxShadow: 'var(--shadow)'}}
              onClick={() => window.dispatchEvent(new CustomEvent('openAddTransactionModal'))}
            >
              <div className="text-base font-semibold text-blue-700 group-hover:translate-x-1 transition-all">➕ 记一笔</div>
              <div className="text-xs text-blue-600 mt-1">快速记录收支</div>
            </button>
            <button 
              className="p-4 bg-green-50 border border-green-100 rounded-sm text-left transition-all group" style={{boxShadow: 'var(--shadow)'}}
              onClick={() => navigate('/analysis')}
            >
              <div className="text-base font-semibold text-green-700 group-hover:translate-x-1 transition-all">📊 查看报告</div>
              <div className="text-xs text-green-600 mt-1">月度消费分析</div>
            </button>
            <button 
              className="p-4 bg-purple-50 border border-purple-100 rounded-sm text-left transition-all group" style={{boxShadow: 'var(--shadow)'}}
              onClick={() => navigate('/assets')}
            >
              <div className="text-base font-semibold text-purple-700 group-hover:translate-x-1 transition-all">💰 账户管理</div>
              <div className="text-xs text-purple-600 mt-1">添加资产账户</div>
            </button>
            <button 
              className="p-4 bg-amber-50 border border-amber-100 rounded-sm text-left transition-all group" style={{boxShadow: 'var(--shadow)'}}
              onClick={() => navigate('/budget')}
            >
              <div className="text-base font-semibold text-amber-700 group-hover:translate-x-1 transition-all">⚙️ 设置预算</div>
              <div className="text-xs text-amber-600 mt-1">管控月度支出</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
