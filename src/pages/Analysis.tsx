import { useState, useEffect } from 'react'
import { TrendingUp, PieChart, FileText, AlertCircle, CheckCircle, Wallet, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import * as echarts from 'echarts'
import { storage } from '../utils/storage'
import type { CategoryStats, MonthData, AssetAllocation, Category, RiskAssessmentResult } from '../types'
import { useTheme } from '../hooks/useTheme'
import { useNumberAnimation, formatCurrency } from '../hooks/useNumberAnimation'

const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  CNY: 1,
  USD: 7.2,
  EUR: 7.8,
  GBP: 8.5,
  HKD: 0.92,
  JPY: 0.048,
  KRW: 0.0054
}

const ASSET_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
 cash: { label: '现金', color: '#165DFF' },
 bank: { label: '银行卡', color: '#4080FF' },
 alipay: { label: '支付宝', color: '#165DFF' },
 wechat: { label: '微信钱包', color: '#00B42A' },
 stock: { label: '股票', color: '#722ED1' },
 fund: { label: '基金', color: '#722ED1' },
 bond: { label: '债券', color: '#FF7D00' },
 real_estate: { label: '房产', color: '#F53F3F' },
 gold: { label: '贵金属', color: '#FF7D00' },
 cryptocurrency: { label: '加密货币', color: '#F53F3F' },
 other: { label: '其他', color: '#86909C' },
}

// 不同风险等级的推荐资产配置
const RISK_ALLOCATION_CONFIG = {
 '保守型': {
 cash: 30, // 现金类：30%
 bond: 50, // 债券类：50%
 equity: 15, // 权益类：15%
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

interface Props {
 className?: string
}

export default function Analysis({ className }: Props) {
 const { isDark } = useTheme()
 const [activeTab, setActiveTab] = useState<'expense' | 'asset' | 'health'>('expense')
 const [selectedMonth, setSelectedMonth] = useState(
 new Date().toISOString().slice(0, 7)
 )
 const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
 const [monthData, setMonthData] = useState<MonthData[]>([])
 const [assetAllocation, setAssetAllocation] = useState<AssetAllocation[]>([])
 const [categories, setCategories] = useState<Category[]>([])
 // 资产配置建议相关状态
 const [riskResult, setRiskResult] = useState<RiskAssessmentResult | null>(null)
 const [currentAssetClass, setCurrentAssetClass] = useState<Record<string, number>>({
 cash: 0, // 现金类
 bond: 0, // 债券类
 equity: 0, // 权益类
 alternative: 0, // 另类资产
 })
 const [recommendedAllocation, setRecommendedAllocation] = useState<Record<string, number> | null>(null)
 const [allocationSuggestions, setAllocationSuggestions] = useState<string[]>([])

 // 加载分类和风险测评结果
 useEffect(() => {
 setCategories(storage.getCategories())
 // 加载风险测评结果
 const savedRiskResult = localStorage.getItem('risk_assessment_result')
 if (savedRiskResult) {
 setRiskResult(JSON.parse(savedRiskResult))
 }
 }, [])

 // 计算财务健康度评分
 const calculateHealthScore = () => {
 const transactions = storage.getTransactions()
 const accounts = storage.getAccounts()
 const liabilities = storage.getLiabilities()
 const now = new Date()

 // 1. 计算近6个月平均储蓄率
 let totalIncome6m = 0
 let totalExpense6m = 0
 for (let i = 5; i >= 0; i--) {
 const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
 const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
 
 const monthIncome = transactions
 .filter(t => {
 const tMonth = new Date(t.time).toISOString().slice(0, 7)
 return tMonth === month && t.type === 'income'
 })
 .reduce((sum, t) => sum + t.amount, 0)
 
 const monthExpense = transactions
 .filter(t => {
 const tMonth = new Date(t.time).toISOString().slice(0, 7)
 return tMonth === month && t.type === 'expense'
 })
 .reduce((sum, t) => sum + t.amount, 0)
 
 totalIncome6m += monthIncome
 totalExpense6m += monthExpense
 }
 const avgMonthlyIncome = totalIncome6m / 6
 const avgMonthlyExpense = totalExpense6m / 6
 const savingRate = avgMonthlyIncome > 0 ? ((avgMonthlyIncome - avgMonthlyExpense) / avgMonthlyIncome) * 100 : 0
 // 储蓄率评分：满分20分，>=30%得满分，低于10%得0分，中间线性计算
 const savingScore = savingRate >= 30 ? 20 : savingRate <= 10 ? 0 : Math.round(((savingRate - 10) / 20) * 20)

 // 2. 负债率评分：总负债/总资产，<=30%得满分，>=70%得0分
 const totalAssets = accounts.reduce((sum, acc) => {
 const rate = DEFAULT_EXCHANGE_RATES[acc.currency || 'CNY'] || 1
 return sum + acc.balance * rate
 }, 0)
 const totalLiabilities = liabilities.reduce((sum, liab) => sum + liab.balance, 0)
 const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0
 const debtScore = debtRatio <= 30 ? 20 : debtRatio >= 70 ? 0 : Math.round(((70 - debtRatio) / 40) * 20)

 // 3. 流动性评分：流动资产/月均支出，>=3倍得满分，<1倍得0分
 // 流动资产：现金、银行、支付宝、微信等活期资产
 const liquidAssets = accounts
 .filter(acc => ['cash', 'bank', 'alipay', 'wechat'].includes(acc.type))
 .reduce((sum, acc) => {
 const rate = DEFAULT_EXCHANGE_RATES[acc.currency || 'CNY'] || 1
 return sum + acc.balance * rate
 }, 0)
 const liquidityRatio = avgMonthlyExpense > 0 ? liquidAssets / avgMonthlyExpense : 0
 const liquidityScore = liquidityRatio >= 3 ? 20 : liquidityRatio <= 1 ? 0 : Math.round(((liquidityRatio - 1) / 2) * 20)

 // 4. 投资分散度评分：大类资产数量 >=3类得满分，<=1类得0分
 // 合并同类资产：股票/基金/债券/加密货币算投资类，房产算不动产，现金类算流动性
 const categoryCount = new Set()
 accounts.forEach(acc => {
 if (['stock', 'fund', 'bond', 'cryptocurrency'].includes(acc.type)) {
 categoryCount.add('investment')
 } else if (acc.type === 'real_estate') {
 categoryCount.add('real_estate')
 } else if (acc.type === 'gold') {
 categoryCount.add('commodity')
 } else {
 categoryCount.add('cash')
 }
 })
 const diversityCount = categoryCount.size
 const diversityScore = diversityCount >= 3 ? 20 : diversityCount <= 1 ? 0 : Math.round(((diversityCount - 1) / 2) * 20)

 // 5. 投资参与度评分：投资类资产/总资产 >=30%得满分，<=5%得0分
 const investmentAssets = accounts
 .filter(acc => acc.isInvestment)
 .reduce((sum, acc) => {
 const rate = DEFAULT_EXCHANGE_RATES[acc.currency || 'CNY'] || 1
 return sum + acc.balance * rate
 }, 0)
 const investmentRatio = totalAssets > 0 ? (investmentAssets / totalAssets) * 100 : 0
 const investmentScore = investmentRatio >= 30 ? 20 : investmentRatio <= 5 ? 0 : Math.round(((investmentRatio - 5) / 25) * 20)

 // 总分
 const totalScore = savingScore + debtScore + liquidityScore + diversityScore + investmentScore

 // 生成建议
 const suggestions: string[] = []
 if (savingRate < 20) {
 suggestions.push('您的储蓄率偏低，建议适当控制非必要消费，争取储蓄率达到30%以上')
 }
 if (debtRatio > 50) {
 suggestions.push('当前负债率较高，建议优先偿还高息负债，降低债务压力')
 }
 if (liquidityRatio < 2) {
 suggestions.push('应急准备金不足，建议预留至少3个月的生活费作为流动资金')
 }
 if (diversityCount < 2) {
 suggestions.push('资产配置过于单一，建议适当分散投资，降低单一资产风险')
 }
 if (investmentRatio < 15) {
 suggestions.push('投资类资产占比较低，可适当增加基金、股票等投资，提升长期收益能力')
 }

 // 等级评定
 let level: '优秀' | '良好' | '一般' | '不佳' | '危险'
 if (totalScore >= 80) level = '优秀'
 else if (totalScore >= 70) level = '良好'
 else if (totalScore >= 60) level = '一般'
 else if (totalScore >= 40) level = '不佳'
 else level = '危险'

 return {
 totalScore,
 level,
 dimensions: [
 { name: '储蓄率', score: savingScore, fullScore: 20, value: `${savingRate.toFixed(1)}%`, ideal: '≥30%' },
 { name: '负债率', score: debtScore, fullScore: 20, value: `${debtRatio.toFixed(1)}%`, ideal: '≤30%' },
 { name: '流动性', score: liquidityScore, fullScore: 20, value: `${liquidityRatio.toFixed(1)}倍`, ideal: '≥3倍' },
 { name: '分散度', score: diversityScore, fullScore: 20, value: `${diversityCount}类`, ideal: '≥3类' },
 { name: '投资参与度', score: investmentScore, fullScore: 20, value: `${investmentRatio.toFixed(1)}%`, ideal: '≥30%' },
 ],
 suggestions
 }
 }

 const healthScore = calculateHealthScore()
 const [monthlyReport, setMonthlyReport] = useState({
 totalIncome: 0,
 totalExpense: 0,
 balance: 0,
 topExpenseCategory: { name: '', amount: 0 },
 savingRate: 0,
 suggestions: [] as string[]
 })

 useEffect(() => {
 if (activeTab === 'expense') {
 calculateStats()
 } else {
 calculateAssetAllocation()
 }
 }, [selectedMonth, activeTab])

 // 数字动画
 const animatedTotalIncome = useNumberAnimation(monthlyReport.totalIncome, 1500, formatCurrency)
 const animatedTotalExpense = useNumberAnimation(monthlyReport.totalExpense, 1500, formatCurrency)
 const animatedBalance = useNumberAnimation(monthlyReport.balance, 1500, formatCurrency)
 const animatedTopExpense = useNumberAnimation(monthlyReport.topExpenseCategory.amount, 1500, formatCurrency)

 useEffect(() => {
 if (activeTab === 'expense') {
 if (categoryStats.length > 0) {
 initExpensePieChart()
 }
 if (monthData.length > 0) {
 initTrendChart()
 }
 } else {
 if (assetAllocation.length > 0) {
 initAssetPieChart()
 }
 }
 }, [categoryStats, monthData, assetAllocation, activeTab, isDark])


 // 计算资产配置（统一换算为人民币）
 const calculateAssetAllocation = () => {
 const accounts = storage.getAccounts()
 const typeMap: Record<string, number> = {}
 
 accounts.forEach(acc => {
 if (!typeMap[acc.type]) {
 typeMap[acc.type] = 0
 }
 const rate = DEFAULT_EXCHANGE_RATES[acc.currency || 'CNY'] || 1
 typeMap[acc.type] += acc.balance * rate
 })

 const totalAssets = accounts.reduce((sum, acc) => {
 const rate = DEFAULT_EXCHANGE_RATES[acc.currency || 'CNY'] || 1
 return sum + acc.balance * rate
 }, 0)
 const allocation: AssetAllocation[] = Object.entries(typeMap).map(([type, amount]) => ({
 type: type as any,
 name: ASSET_TYPE_CONFIG[type]?.label || '其他',
 amount,
 percentage: totalAssets > 0 ? (amount / totalAssets) * 100 : 0,
 color: ASSET_TYPE_CONFIG[type]?.color || '#86909C'
 })).filter(a => a.amount > 0).sort((a, b) => b.amount - a.amount)

 setAssetAllocation(allocation)

 // 计算大类资产分布
 calculateAssetClassDistribution(accounts, totalAssets)
 }

 // 计算大类资产分布
 const calculateAssetClassDistribution = (accounts: any[], totalAssets: number) => {
 const assetClass = {
 cash: 0, // 现金类：现金、银行、支付宝、微信、货币基金
 bond: 0, // 债券类：债券、债券基金、银行理财
 equity: 0, // 权益类：股票、股票基金、混合基金、指数基金
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
 case 'money_fund':
 assetClass.cash += amount
 break
 case 'bond':
 case 'bond_fund':
 case 'bank_financing':
 assetClass.bond += amount
 break
 case 'stock':
 case 'fund':
 case 'mixed_fund':
 case 'index_fund':
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
 const currentClassPercentage = {
 cash: totalAssets > 0 ? (assetClass.cash / totalAssets) * 100 : 0,
 bond: totalAssets > 0 ? (assetClass.bond / totalAssets) * 100 : 0,
 equity: totalAssets > 0 ? (assetClass.equity / totalAssets) * 100 : 0,
 alternative: totalAssets > 0 ? (assetClass.alternative / totalAssets) * 100 : 0,
 }

 setCurrentAssetClass(currentClassPercentage)

 // 如果有风险测评结果，计算推荐配置和调仓建议
 if (riskResult && totalAssets > 0) {
 calculateRecommendedAllocation(totalAssets, currentClassPercentage)
 }
 }

 // 计算推荐配置和调仓建议
 const calculateRecommendedAllocation = (totalAssets: number, current: Record<string, number>) => {
 if (!riskResult) return

 const recommended = RISK_ALLOCATION_CONFIG[riskResult.riskProfile]
 setRecommendedAllocation(recommended)

 const suggestions: string[] = []
 const assetClassNames: Record<string, string> = {
 cash: '现金类',
 bond: '债券类',
 equity: '权益类',
 alternative: '另类资产'
 }

 Object.entries(recommended).forEach(([assetClass, targetPercent]) => {
 const currentPercent = current[assetClass as keyof typeof current] || 0
 const diffPercent = currentPercent - targetPercent
 const diffAmount = (diffPercent / 100) * totalAssets

 if (Math.abs(diffPercent) > 5) { // 偏离度超过5%才给出建议
 if (diffPercent > 0) {
 suggestions.push(`您的${assetClassNames[assetClass]}占比(${currentPercent.toFixed(1)}%)高于推荐比例(${targetPercent}%)，建议减持约¥${Math.abs(diffAmount).toLocaleString()}，降低该类资产配置`)
 } else {
 suggestions.push(`您的${assetClassNames[assetClass]}占比(${currentPercent.toFixed(1)}%)低于推荐比例(${targetPercent}%)，建议增持约¥${Math.abs(diffAmount).toLocaleString()}，提升该类资产配置`)
 }
 }
 })

 // 总偏离度
 const totalDeviation = Object.entries(recommended).reduce((sum, [assetClass, target]) => {
 return sum + Math.abs(current[assetClass as keyof typeof current] - target)
 }, 0) / 2

 if (totalDeviation < 5) {
 suggestions.push('🎉 您当前的资产配置与推荐配置非常匹配，无需大调，继续保持即可')
 } else if (totalDeviation < 15) {
 suggestions.push('💡 您当前的资产配置略有偏离，可根据上述建议进行小幅调整')
 } else {
 suggestions.push('⚠️ 您当前的资产配置偏离度较大，建议根据上述建议进行调整以匹配您的风险承受能力')
 }

 setAllocationSuggestions(suggestions)
 }

 const calculateStats = () => {
 const transactions = storage.getTransactions()
 const now = new Date()

 // 计算近6个月收支趋势
 const months: Record<string, { income: number; expense: number }> = {}
 for (let i = 5; i >= 0; i--) {
 const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
 const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
 months[key] = { income: 0, expense: 0 }
 }

 // 计算当月分类支出统计
 const categoryMap: Record<string, { amount: number; count: number }> = {}
 categories.filter(c => c.type === 'expense').forEach(c => {
 categoryMap[c.id] = { amount: 0, count: 0 }
 })

 let totalIncome = 0
 let totalExpense = 0

 transactions.forEach(t => {
 const date = new Date(t.time)
 const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
 
 // 累计近6个月数据
 if (months[monthKey]) {
 if (t.type === 'income') {
 months[monthKey].income += t.amount
 } else {
 months[monthKey].expense += t.amount
 }
 }

 // 累计当月分类数据
 if (monthKey === selectedMonth) {
 if (t.type === 'income') {
 totalIncome += t.amount
 } else {
 totalExpense += t.amount
 if (categoryMap[t.categoryId]) {
 categoryMap[t.categoryId].amount += t.amount
 categoryMap[t.categoryId].count += 1
 }
 }
 }
 })

 // 转换为数组格式
 const stats: CategoryStats[] = Object.entries(categoryMap)
 .map(([categoryId, data]) => ({
 categoryId,
 amount: data.amount,
 count: data.count
 }))
 .filter(s => s.amount > 0)
 .sort((a, b) => b.amount - a.amount)

 const trendData: MonthData[] = Object.entries(months).map(([month, values]) => ({
 month,
 income: values.income,
 expense: values.expense,
 }))

 setCategoryStats(stats)
 setMonthData(trendData)

 // 生成月度报告
 const balance = totalIncome - totalExpense
 const savingRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0
 const topExpense = stats[0]
 const topExpenseCategory = topExpense 
 ? { 
 name: categories.find(c => c.id === topExpense.categoryId)?.name || '未知', 
 amount: topExpense.amount 
 }
 : { name: '无', amount: 0 }

 // 生成消费建议
 const suggestions: string[] = []
 if (savingRate < 30) {
 suggestions.push('本月结余率较低，建议适当控制非必要支出，争取结余率达到30%以上')
 } else {
 suggestions.push('本月结余率表现优秀，继续保持良好的消费习惯')
 }

 if (topExpense && topExpense.amount > totalExpense * 0.4) {
 suggestions.push(`${topExpenseCategory.name}支出占比较高（${((topExpense.amount / totalExpense) * 100).toFixed(1)}%），可考虑优化该类消费`)
 }

 if (totalExpense > totalIncome) {
 suggestions.push('⚠️ 本月支出超过收入，出现赤字，请及时调整消费计划')
 }

 if (stats.length < 3) {
 suggestions.push('本月消费分类较少，可以丰富消费记录以便获得更准确的分析')
 }

 setMonthlyReport({
 totalIncome,
 totalExpense,
 balance,
 topExpenseCategory,
 savingRate,
 suggestions
 })
 }

 // 支出分类饼图
 const initExpensePieChart = () => {
 const chartDom = document.getElementById('categoryPieChart')
 if (!chartDom) return

 const myChart = echarts.init(chartDom, isDark ? 'dark' : undefined)
 const textColor = isDark ? '#CBD5E1' : '#64748B'
 
 const data = categoryStats.map(stat => {
 const category = categories.find(c => c.id === stat.categoryId)
 return {
 value: stat.amount,
 name: category?.name || '其他',
 itemStyle: { 
 color: category?.color || '#6b7280',
 borderColor: isDark ? '#1E293B' : '#fff'
 }
 }
 })

 const option = {
 tooltip: {
 trigger: 'item',
 formatter: (params: any) => {
 return `${params.name}: ¥${params.value.toLocaleString()} (${params.percent}%)`
 }
 },
 legend: {
 orient: 'vertical',
 right: 10,
 top: 'center',
 textStyle: {
 color: textColor
 }
 },
 series: [
 {
 name: '支出分类',
 type: 'pie',
 radius: ['40%', '70%'],
 avoidLabelOverlap: false,
 itemStyle: {
 borderRadius: 8,
 borderColor: isDark ? '#1E293B' : '#fff',
 borderWidth: 2
 },
 label: {
 show: false,
 position: 'center'
 },
 emphasis: {
 label: {
 show: true,
 fontSize: 16,
 fontWeight: 'bold',
 color: textColor
 }
 },
 labelLine: {
 show: false
 },
 data: data
 }
 ]
 }

 myChart.setOption(option)
 }

 // 资产配置饼图
 const initAssetPieChart = () => {
 const chartDom = document.getElementById('assetPieChart')
 if (!chartDom) return

 const myChart = echarts.init(chartDom, isDark ? 'dark' : undefined)
 const textColor = isDark ? '#CBD5E1' : '#64748B'
 
 const data = assetAllocation.map(a => ({
 value: a.amount,
 name: a.name,
 itemStyle: { 
 color: a.color,
 borderColor: isDark ? '#1E293B' : '#fff'
 }
 }))

 const option = {
 tooltip: {
 trigger: 'item',
 formatter: (params: any) => {
 return `${params.name}: ¥${params.value.toLocaleString()} (${params.percent}%)`
 }
 },
 legend: {
 orient: 'vertical',
 right: 10,
 top: 'center',
 textStyle: {
 color: textColor
 }
 },
 series: [
 {
 name: '资产配置',
 type: 'pie',
 radius: ['40%', '70%'],
 avoidLabelOverlap: false,
 itemStyle: {
 borderRadius: 8,
 borderColor: isDark ? '#1E293B' : '#fff',
 borderWidth: 2
 },
 label: {
 show: false,
 position: 'center'
 },
 emphasis: {
 label: {
 show: true,
 fontSize: 16,
 fontWeight: 'bold',
 color: textColor
 }
 },
 labelLine: {
 show: false
 },
 data: data
 }
 ]
 }

 myChart.setOption(option)
 }

 const initTrendChart = () => {
 const chartDom = document.getElementById('trendBarChart')
 if (!chartDom) return

 const myChart = echarts.init(chartDom, isDark ? 'dark' : undefined)
 const textColor = isDark ? '#CBD5E1' : '#64748B'
 
 const option = {
 tooltip: {
 trigger: 'axis',
 axisPointer: {
 type: 'shadow'
 },
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
 top: 10,
 textStyle: {
 color: textColor
 }
 },
 grid: {
 left: '3%',
 right: '4%',
 bottom: '3%',
 containLabel: true
 },
 xAxis: {
 type: 'category',
 data: monthData.map(d => d.month.slice(5)),
 axisLabel: {
 rotate: 0,
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
 type: 'bar',
 data: monthData.map(d => d.income),
 itemStyle: {
 color: '#10b981'
 }
 },
 {
 name: '支出',
 type: 'bar',
 data: monthData.map(d => d.expense),
 itemStyle: {
 color: '#ef4444'
 }
 }
 ]
 }

 myChart.setOption(option)
 }

 return (
 <div className={`animate-fade-in ${className || ''}`}>
 {/* 头部筛选 */}
 <div className="bg-white border rounded-[13px] overflow-hidden mt-8" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
 <div className="h-[75px] flex items-center justify-between px-8 pt-6">
 <div className="flex gap-14 h-[50px] items-start">
 <button
 onClick={() => setActiveTab('expense')}
 className={`relative text-xl font-bold transition-all pb-4 ${
 activeTab === 'expense'
 ? 'font-black'
 : ''
 }`}
 style={{color: activeTab === 'expense' ? 'var(--primary)' : 'var(--text-muted)'}}
 >
 消费分析
 {activeTab === 'expense' && (
 <span className="absolute left-0 right-0 bottom-[-18px] h-[3px] rounded-[2px]" style={{backgroundColor: 'var(--primary)'}}></span>
 )}
 </button>
 <button
 onClick={() => setActiveTab('asset')}
 className={`relative text-xl font-bold transition-all pb-4 ${
 activeTab === 'asset'
 ? 'font-black'
 : ''
 }`}
 style={{color: activeTab === 'asset' ? 'var(--primary)' : 'var(--text-muted)'}}
 >
 资产配置
 {activeTab === 'asset' && (
 <span className="absolute left-0 right-0 bottom-[-18px] h-[3px] rounded-[2px]" style={{backgroundColor: 'var(--primary)'}}></span>
 )}
 </button>
 <button
 onClick={() => setActiveTab('health')}
 className={`relative text-xl font-bold transition-all pb-4 ${
 activeTab === 'health'
 ? 'font-black'
 : ''
 }`}
 style={{color: activeTab === 'health' ? 'var(--primary)' : 'var(--text-muted)'}}
 >
 健康评分
 {activeTab === 'health' && (
 <span className="absolute left-0 right-0 bottom-[-18px] h-[3px] rounded-[2px]" style={{backgroundColor: 'var(--primary)'}}></span>
 )}
 </button>
 </div>

 {activeTab === 'expense' && (
 <input
 type="month"
 value={selectedMonth}
 onChange={(e) => setSelectedMonth(e.target.value)}
 className="input-glass"
 />
 )}
 </div>
 </div>

 {/* 图表区域 */}
 {activeTab === 'expense' ? (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
 {/* 分类占比饼图 */}
 <div className="bg-white border rounded-[13px] p-8" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
 <div className="flex items-center gap-2 mb-6">
 <PieChart size={24} className="text-purple-600 icon-spin-hover" />
 <h3 className="text-xl font-extrabold" style={{color: 'var(--text)'}}>支出分类占比</h3>
 </div>
 {categoryStats.length > 0 ? (
 <div id="categoryPieChart" className="h-[300px]"></div>
 ) : (
 <div className="h-[300px] flex items-center justify-center empty-state" style={{color: 'var(--text-muted)'}}>
 当月暂无支出记录
 </div>
 )}
 </div>

 {/* 收支趋势柱状图 */}
 <div className="bg-white border rounded-[13px] p-8" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
 <div className="flex items-center gap-2 mb-6">
 <TrendingUp size={24} className="icon-bounce-hover" style={{color: 'var(--primary)'}} />
 <h3 className="text-xl font-extrabold" style={{color: 'var(--text)'}}>近6个月收支趋势</h3>
 </div>
 <div id="trendBarChart" className="h-[300px]"></div>
 </div>
 </div>
 ) : activeTab === 'asset' ? (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
 {/* 资产配置饼图 */}
 <div className="bg-white border rounded-[13px] p-8" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
 <div className="flex items-center gap-2 mb-6">
 <PieChart size={24} className="icon-spin-hover" style={{color: 'var(--primary)'}} />
 <h3 className="text-xl font-extrabold" style={{color: 'var(--text)'}}>资产配置分布</h3>
 </div>
 {assetAllocation.length > 0 ? (
 <div id="assetPieChart" className="h-[300px]"></div>
 ) : (
 <div className="h-[300px] flex items-center justify-center empty-state" style={{color: 'var(--text-muted)'}}>
 暂无资产数据，请先添加资产账户
 </div>
 )}
 </div>

 {/* 资产统计卡片 */}
 <div className="space-y-5">
 <div className="bg-white border rounded-[13px] p-8" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
 <div className="flex items-center gap-2 mb-4">
 <Wallet size={20} className="icon-scale-hover" style={{color: 'var(--success)'}} />
 <h3 className="text-lg font-semibold" style={{color: 'var(--text)'}}>资产统计</h3>
 </div>
 <div className="space-y-4">
 {assetAllocation.map(item => (
 <div key={item.type} className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
 <span className="text-sm" style={{color: 'var(--text)'}}>{item.name}</span>
 </div>
 <div className="text-right">
 <div className="text-sm font-medium number" style={{color: 'var(--text)'}}>¥{item.amount.toLocaleString()}</div>
 <div className="text-xs" style={{color: 'var(--text-muted)'}}>{item.percentage.toFixed(1)}%</div>
 </div>
 </div>
 ))}
 {assetAllocation.length === 0 && (
 <div className="text-center py-8 empty-state" style={{color: 'var(--text-muted)'}}>
 暂无资产数据
 </div>
 )}
 </div>
 </div>
 </div>

 {/* 资产配置建议模块 */}
 <div className="mt-6 bg-white border rounded-[13px] p-8" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
 <div className="flex items-center gap-2 mb-6">
 <Target size={24} className="icon-spin-hover" style={{color: 'var(--primary)'}} />
 <h3 className="text-xl font-extrabold" style={{color: 'var(--text)'}}>智能资产配置建议</h3>
 </div>

 {!riskResult ? (
 <div className="text-center py-12 bg-yellow-50 border border-yellow-100 rounded-lg">
 <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4" />
 <p className="text-yellow-800 font-medium mb-2">请先完成风险承受能力测评</p>
 <p className="text-sm text-yellow-700 mb-4">完成测评后我们将为您提供专属的资产配置建议</p>
 <button 
 onClick={() => window.location.href = '/settings'}
 className="px-4 py-2 text-white rounded-lg hover:bg-opacity-90 transition-all" style={{backgroundColor: 'var(--primary)'}}
 >
 去完成风险测评
 </button>
 </div>
 ) : assetAllocation.length === 0 ? (
 <div className="text-center py-12 empty-state" style={{color: 'var(--text-muted)'}}>
 暂无资产数据，请先添加资产账户以获取配置建议
 </div>
 ) : recommendedAllocation ? (
 <div className="space-y-6">
 {/* 风险等级提示 */}
 <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
 <div className="flex items-center gap-2 mb-2">
 <CheckCircle size={20} className="text-blue-600" />
 <span className="font-medium text-blue-900">您的风险等级：{riskResult.riskProfile}（{riskResult.riskLevel}级）</span>
 </div>
 <p className="text-sm text-blue-700">以下资产配置建议基于您的风险承受能力生成，适合您的投资风格</p>
 </div>

 {/* 配置对比表格 */}
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="border-b" style={{borderColor: 'var(--border)'}}>
 <th className="text-left py-3 px-4 text-sm font-medium" style={{color: 'var(--text-muted)'}}>资产类别</th>
 <th className="text-right py-3 px-4 text-sm font-medium" style={{color: 'var(--text-muted)'}}>当前占比</th>
 <th className="text-right py-3 px-4 text-sm font-medium" style={{color: 'var(--text-muted)'}}>推荐占比</th>
 <th className="text-right py-3 px-4 text-sm font-medium" style={{color: 'var(--text-muted)'}}>偏离度</th>
 <th className="text-right py-3 px-4 text-sm font-medium" style={{color: 'var(--text-muted)'}}>建议调整</th>
 </tr>
 </thead>
 <tbody>
 {Object.entries(recommendedAllocation).map(([assetClass, targetPercent]) => {
 const currentPercent = currentAssetClass[assetClass as keyof typeof currentAssetClass] || 0
 const diff = currentPercent - targetPercent
 const totalAssets = assetAllocation.reduce((sum, a) => sum + a.amount, 0)
 const adjustAmount = Math.abs((diff / 100) * totalAssets)
 
 const assetClassNames: Record<string, string> = {
 cash: '现金类',
 bond: '债券类',
 equity: '权益类',
 alternative: '另类资产'
 }

 return (
 <tr key={assetClass} className="border-b last:border-b-0" style={{borderColor: 'var(--border)'}}>
 <td className="py-3 px-4 text-sm font-medium" style={{color: 'var(--text)'}}>{assetClassNames[assetClass]}</td>
 <td className="py-3 px-4 text-sm text-right" style={{color: 'var(--text)'}}>{currentPercent.toFixed(1)}%</td>
 <td className="py-3 px-4 text-sm text-right" style={{color: 'var(--text)'}}>{targetPercent}%</td>
 <td className={`py-3 px-4 text-sm text-right font-medium ${
 Math.abs(diff) > 5 ? (diff > 0 ? 'text-red-600' : 'text-amber-600') : 'text-green-600'
 }`}>
 {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
 </td>
 <td className="py-3 px-4 text-sm text-right">
 {Math.abs(diff) > 2 ? (
 diff > 0 ? (
 <span className="text-red-600 flex items-center justify-end gap-1">
 <ArrowDownRight size={14} /> 减持 ¥{adjustAmount.toLocaleString()}
 </span>
 ) : (
 <span className="text-green-600 flex items-center justify-end gap-1">
 <ArrowUpRight size={14} /> 增持 ¥{adjustAmount.toLocaleString()}
 </span>
 )
 ) : (
 <span className="text-green-600">无需调整</span>
 )}
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>

 {/* 调仓建议 */}
 <div className="p-4 border rounded-lg" style={{borderColor: 'var(--border)', backgroundColor: 'var(--bg-soft)'}}>
 <h4 className="font-medium mb-3 flex items-center gap-2" style={{color: 'var(--text)'}}>
 <AlertCircle size={18} style={{color: 'var(--primary)'}} />
 调仓建议
 </h4>
 <ul className="space-y-2">
 {allocationSuggestions.map((suggestion, index) => (
 <li key={index} className="text-sm flex items-start gap-2" style={{color: 'var(--text)'}}>
 <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{color: 'var(--primary)'}} />
 <span>{suggestion}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>
 ) : null}
 </div>
 </div>
 ) : (
 // 健康评分页面
 <div className="mt-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {/* 总分卡片 */}
 <div className="bg-white border rounded-[14px] p-8 relative overflow-hidden" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
 <div className="text-center">
 <div className="text-lg font-extrabold mb-4" style={{color: 'var(--text-muted)'}}>财务健康指数</div>
 <div className="text-[80px] font-black leading-none mb-6" style={{
 color: healthScore.totalScore >= 80 ? '#10BA51' : 
 healthScore.totalScore >= 70 ? '#3b82f6' :
 healthScore.totalScore >= 60 ? '#FF920F' :
 healthScore.totalScore >= 40 ? '#f59e0b' : '#EF4444'
 }}>
 {healthScore.totalScore}
 </div>
 <div 
 className="inline-block px-4 py-1 rounded-full text-lg font-bold mb-4"
 style={{
 backgroundColor: healthScore.totalScore >= 80 ? '#dcfce7' : 
 healthScore.totalScore >= 70 ? '#dbeafe' :
 healthScore.totalScore >= 60 ? '#ffedd5' :
 healthScore.totalScore >= 40 ? '#fef3c7' : '#fee2e2',
 color: healthScore.totalScore >= 80 ? '#166534' : 
 healthScore.totalScore >= 70 ? '#1e40af' :
 healthScore.totalScore >= 60 ? '#92400e' :
 healthScore.totalScore >= 40 ? '#92400e' : '#991b1b'
 }}
 >
 {healthScore.level}
 </div>
 <div className="text-sm" style={{color: 'var(--text-muted)'}}>满分100分</div>
 </div>
 <div className="absolute right-[-40px] top-[-80px] w-[210px] h-[210px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,.04),rgba(255,255,255,0)_65%)] pointer-events-none"></div>
 </div>

 {/* 维度得分卡片 */}
 <div className="md:col-span-2 bg-white border rounded-[14px] p-8" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
 <h3 className="text-xl font-extrabold mb-6" style={{color: 'var(--text)'}}>各维度得分</h3>
 <div className="space-y-5">
 {healthScore.dimensions.map((dim, index) => (
 <div key={index}>
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <span className="text-base font-medium" style={{color: 'var(--text)'}}>{dim.name}</span>
 <span className="text-sm" style={{color: 'var(--text-muted)'}}>
 (当前: {dim.value} / 理想: {dim.ideal})
 </span>
 </div>
 <span className="text-sm font-bold">
 {dim.score}/{dim.fullScore}
 </span>
 </div>
 <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
 <div
 className={`h-full transition-all ${
 dim.score >= dim.fullScore * 0.8 ? 'bg-green-500' :
 dim.score >= dim.fullScore * 0.6 ? 'bg-blue-500' :
 dim.score >= dim.fullScore * 0.4 ? 'bg-amber-500' : 'bg-red-500'
 }`}
 style={{ width: `${(dim.score / dim.fullScore) * 100}%` }}
 ></div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* 优化建议 */}
 <div className="mt-6 bg-white border rounded-[14px] p-8" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
 <div className="flex items-center gap-2 mb-6">
 <AlertCircle size={24} style={{color: 'var(--primary)'}} />
 <h3 className="text-xl font-extrabold" style={{color: 'var(--text)'}}>优化建议</h3>
 </div>
 {healthScore.suggestions.length > 0 ? (
 <ul className="space-y-3">
 {healthScore.suggestions.map((suggestion, index) => (
 <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
 <CheckCircle size={20} className="flex-shrink-0 mt-0.5" style={{color: 'var(--primary)'}} />
 <span className="text-blue-900">{suggestion}</span>
 </li>
 ))}
 </ul>
 ) : (
 <div className="text-center py-6 text-green-600 font-medium success-bounce">
 🎉 您的财务状况非常健康，继续保持！
 </div>
 )}
 </div>
 </div>
 )}

 {/* 月度报告 - 仅消费分析tab显示 */}
 {activeTab === 'expense' && (
 <>
 <div className="bg-white border rounded-[13px] p-8 mt-6" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
 <div className="flex items-center gap-2 mb-6">
 <FileText size={24} className="icon-scale-hover" style={{color: 'var(--warning)'}} />
 <h3 className="text-xl font-extrabold" style={{color: 'var(--text)'}}>月度消费报告</h3>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
 <div className="bg-green-50 border border-green-100 rounded-sm p-4">
 <div className="text-sm text-green-700 font-medium mb-1">总收入</div>
 <div className="text-2xl font-bold text-green-900 number">
 ¥{animatedTotalIncome}
 </div>
 </div>

 <div className="bg-red-50 border border-red-100 rounded-sm p-4">
 <div className="text-sm text-red-700 font-medium mb-1">总支出</div>
 <div className="text-2xl font-bold text-red-900 number">
 ¥{animatedTotalExpense}
 </div>
 </div>

 <div className={`rounded-sm p-4 ${
 monthlyReport.balance >= 0 
 ? 'bg-blue-50 border border-blue-100' 
 : 'bg-amber-50 border border-amber-100'
 }`}>
 <div className={`text-sm font-medium mb-1 ${
 monthlyReport.balance >= 0 ? 'text-blue-700' : 'text-amber-700'
 }`}>本月结余</div>
 <div className={`text-2xl font-bold ${
 monthlyReport.balance >= 0 ? 'text-blue-900' : 'text-amber-900'
 } number`}>
 {monthlyReport.balance >= 0 ? '+' : ''}¥{animatedBalance}
 </div>
 </div>

 <div className="bg-purple-50 border border-purple-100 rounded-sm p-4">
 <div className="text-sm text-purple-700 font-medium mb-1">结余率</div>
 <div className="text-2xl font-bold text-purple-900 number">
 {monthlyReport.savingRate.toFixed(1)}%
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <div className="border rounded-sm p-4" style={{borderColor: 'var(--border)', backgroundColor: 'var(--bg-soft)'}}>
 <h4 className="font-medium mb-2" style={{color: 'var(--text)'}}>消费亮点</h4>
 <div className="space-y-2">
 <p className="text-sm" style={{color: 'var(--text)'}}>
 最大支出分类：<span className="font-bold">{monthlyReport.topExpenseCategory.name}</span>，
 共计支出 <span className="font-bold" style={{color: 'var(--danger)'}}>¥{animatedTopExpense}</span>
 </p>
 <p className="text-sm" style={{color: 'var(--text)'}}>
 结余率：{monthlyReport.savingRate.toFixed(1)}% 
 {monthlyReport.savingRate >= 30 ? '，表现优秀' : '，有待提高'}
 </p>
 </div>
 </div>

 <div className="bg-blue-50 border border-blue-100 rounded-sm p-4">
 <h4 className="font-medium mb-2 flex items-center gap-2" style={{color: 'var(--text)'}}>
 <AlertCircle size={16} style={{color: 'var(--primary)'}} />
 消费建议
 </h4>
 <ul className="space-y-2">
 {monthlyReport.suggestions.map((suggestion, index) => (
 <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
 <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{color: 'var(--primary)'}} />
 <span>{suggestion}</span>
 </li>
 ))}
 {monthlyReport.suggestions.length === 0 && (
 <li className="text-sm text-blue-800 success-bounce">本月消费情况良好，继续保持！</li>
 )}
 </ul>
 </div>
 </div>
 </div>

 {/* 现金流预测模块 */}
 <div className="bg-white border rounded-[13px] p-8 mt-6" style={{boxShadow: 'var(--shadow)', borderColor: 'var(--border)'}}>
 <div className="flex items-center gap-2 mb-6">
 <TrendingUp size={24} className="icon-bounce-hover" style={{color: 'var(--primary)'}} />
 <h3 className="text-xl font-extrabold" style={{color: 'var(--text)'}}>现金流预测</h3>
 </div>

 {(() => {
 // 计算过去12个月的收支数据
 const transactions = storage.getTransactions()
 const now = new Date()
 const months: Record<string, { income: number; expense: number; balance: number }> = {}
 
 // 过去12个月
 for (let i = 11; i >= 0; i--) {
 const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
 const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
 months[key] = { income: 0, expense: 0, balance: 0 }
 }

 transactions.forEach(t => {
 const date = new Date(t.time)
 const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
 if (months[monthKey]) {
 if (t.type === 'income') {
 months[monthKey].income += t.amount
 } else {
 months[monthKey].expense += t.amount
 }
 months[monthKey].balance = months[monthKey].income - months[monthKey].expense
 }
 })

 const monthList = Object.values(months)
 if (monthList.length === 0 || monthList.every(m => m.income === 0 && m.expense === 0)) {
 return (
 <div className="text-center py-12 empty-state" style={{color: 'var(--text-muted)'}}>
 暂无足够的历史收支数据，无法进行现金流预测
 </div>
 )
 }

 // 计算平均收入和平均支出（加权平均，近3个月权重更高）
 const weights = [0.05, 0.05, 0.05, 0.05, 0.07, 0.07, 0.08, 0.1, 0.12, 0.13, 0.15, 0.18] // 近月权重更高
 let avgIncome = 0
 let avgExpense = 0
 
 monthList.forEach((month, index) => {
 avgIncome += month.income * weights[index]
 avgExpense += month.expense * weights[index]
 })

 // 预测未来3个月和6个月
 const predict3m = {
 income: avgIncome * 3,
 expense: avgExpense * 3,
 balance: (avgIncome - avgExpense) * 3
 }

 const predict6m = {
 income: avgIncome * 6,
 expense: avgExpense * 6,
 balance: (avgIncome - avgExpense) * 6
 }

 // 生成建议
 const suggestions: string[] = []
 const monthlyBalance = avgIncome - avgExpense
 if (monthlyBalance > 0) {
 suggestions.push(`📈 预计未来每月可结余¥${monthlyBalance.toLocaleString()}，建议将结余部分按照资产配置方案进行投资，实现资产增值`)
 if (monthlyBalance >= avgExpense * 3) {
 suggestions.push('✅ 您的现金流非常健康，即使3个月没有收入也能维持正常生活')
 } else if (monthlyBalance >= avgExpense) {
 suggestions.push('💡 您的现金流状况良好，建议预留更多应急准备金')
 }
 } else {
 suggestions.push(`⚠️ 预计未来每月将出现赤字¥${Math.abs(monthlyBalance).toLocaleString()}，建议尽快调整收支结构，减少非必要支出`)
 suggestions.push('🚨 当前现金流为负，长期持续将导致财务压力，建议优先增加收入或削减大额支出')
 }

 if (predict6m.balance > 0) {
 suggestions.push(`🎉 未来6个月预计累计可结余¥${predict6m.balance.toLocaleString()}，可提前规划大额消费或投资计划`)
 } else {
 suggestions.push(`⚠️ 未来6个月预计累计赤字¥${Math.abs(predict6m.balance).toLocaleString()}，请提前做好资金规划，避免出现资金缺口`)
 }

 return (
 <div className="space-y-6">
 {/* 预测统计卡片 */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-blue-50 border border-blue-100 rounded-sm p-4">
 <div className="text-sm text-blue-700 font-medium mb-1">平均月收入</div>
 <div className="text-2xl font-bold text-blue-900 number">
 ¥{avgIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
 </div>
 <div className="text-xs text-blue-600 mt-1">基于过去12个月加权平均</div>
 </div>

 <div className="bg-red-50 border border-red-100 rounded-sm p-4">
 <div className="text-sm text-red-700 font-medium mb-1">平均月支出</div>
 <div className="text-2xl font-bold text-red-900 number">
 ¥{avgExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
 </div>
 <div className="text-xs text-red-600 mt-1">基于过去12个月加权平均</div>
 </div>

 <div className={`rounded-sm p-4 ${
 monthlyBalance >= 0 ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'
 }`}>
 <div className={`text-sm font-medium mb-1 ${
 monthlyBalance >= 0 ? 'text-green-700' : 'text-amber-700'
 }`}>平均月结余</div>
 <div className={`text-2xl font-bold ${
 monthlyBalance >= 0 ? 'text-green-900' : 'text-amber-900'
 } number`}>
 {monthlyBalance >= 0 ? '+' : ''}¥{monthlyBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
 </div>
 <div className={`text-xs mt-1 ${
 monthlyBalance >= 0 ? 'text-green-600' : 'text-amber-600'
 }`}>
 {monthlyBalance >= 0 ? '现金流健康' : '现金流为负'}
 </div>
 </div>
 </div>

 {/* 未来预测 */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="border rounded-sm p-5" style={{borderColor: 'var(--border)', backgroundColor: 'var(--bg-soft)'}}>
 <h4 className="font-medium mb-4" style={{color: 'var(--text)'}}>未来3个月预测</h4>
 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-sm" style={{color: 'var(--text-muted)'}}>预计总收入</span>
 <span className="text-sm font-medium" style={{color: 'var(--success)'}}>¥{predict3m.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-sm" style={{color: 'var(--text-muted)'}}>预计总支出</span>
 <span className="text-sm font-medium" style={{color: 'var(--danger)'}}>¥{predict3m.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
 </div>
 <div className="h-px my-1" style={{backgroundColor: 'var(--border)'}}></div>
 <div className="flex justify-between items-center">
 <span className="text-sm font-medium" style={{color: 'var(--text)'}}>预计累计结余</span>
 <span className={`text-sm font-bold ${
 predict3m.balance >= 0 ? 'text-green-600' : 'text-amber-600'
 }`}>
 {predict3m.balance >= 0 ? '+' : ''}¥{predict3m.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
 </span>
 </div>
 </div>
 </div>

 <div className="border rounded-sm p-5" style={{borderColor: 'var(--border)', backgroundColor: 'var(--bg-soft)'}}>
 <h4 className="font-medium mb-4" style={{color: 'var(--text)'}}>未来6个月预测</h4>
 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-sm" style={{color: 'var(--text-muted)'}}>预计总收入</span>
 <span className="text-sm font-medium" style={{color: 'var(--success)'}}>¥{predict6m.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-sm" style={{color: 'var(--text-muted)'}}>预计总支出</span>
 <span className="text-sm font-medium" style={{color: 'var(--danger)'}}>¥{predict6m.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
 </div>
 <div className="h-px my-1" style={{backgroundColor: 'var(--border)'}}></div>
 <div className="flex justify-between items-center">
 <span className="text-sm font-medium" style={{color: 'var(--text)'}}>预计累计结余</span>
 <span className={`text-sm font-bold ${
 predict6m.balance >= 0 ? 'text-green-600' : 'text-amber-600'
 }`}>
 {predict6m.balance >= 0 ? '+' : ''}¥{predict6m.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* 预测建议 */}
 <div className="bg-blue-50 border border-blue-100 rounded-sm p-4">
 <h4 className="font-medium mb-3 flex items-center gap-2" style={{color: 'var(--text)'}}>
 <AlertCircle size={18} style={{color: 'var(--primary)'}} />
 预测建议
 </h4>
 <ul className="space-y-2">
 {suggestions.map((suggestion, index) => (
 <li key={index} className="text-sm flex items-start gap-2 text-blue-800">
 <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{color: 'var(--primary)'}} />
 <span>{suggestion}</span>
 </li>
 ))}
 </ul>
 <div className="mt-3 text-xs text-blue-700 opacity-80">
 * 预测结果基于历史收支数据，仅供参考，实际情况可能因收入支出变化而不同
 </div>
 </div>
 </div>
 )
 })()}
 </div>
 </>
 )}
 </div>
 )
}
