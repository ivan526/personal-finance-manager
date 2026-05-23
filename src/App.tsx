import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budget from './pages/Budget'
import Assets from './pages/Assets'
import Investment from './pages/Investment'
import Analysis from './pages/Analysis'
import Goals from './pages/Goals'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'
import { storage } from './utils/storage'
import type { Account } from './types'

// 初始化主题
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system'
  const root = document.documentElement
  
  root.classList.remove('light', 'dark')
  
  if (savedTheme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(savedTheme)
  }
}

initTheme()

function App() {
  // 数据迁移逻辑，保证老用户数据兼容
  useEffect(() => {
    const migrateData = () => {
      // 迁移账户数据
      const oldAccounts = storage.getAccounts()
      const migratedAccounts: Account[] = oldAccounts.map(acc => {
        // 老版本的account可能缺少新字段，补充默认值
        return {
          ...acc,
          createdAt: acc.createdAt || Date.now(),
          updatedAt: acc.updatedAt || Date.now(),
          isInvestment: acc.isInvestment || ['stock', 'fund', 'bond', 'real_estate', 'gold', 'cryptocurrency', 'investment'].includes(acc.type),
          currency: acc.currency || 'CNY'
        }
      })
      
      // 如果有数据变化，保存迁移后的数据
      if (JSON.stringify(oldAccounts) !== JSON.stringify(migratedAccounts)) {
        storage.saveAccounts(migratedAccounts)
        console.log('账户数据迁移完成')
      }

      // 标记迁移完成，避免重复运行
      localStorage.setItem('finman_data_migrated', 'v2.0')
    }

    // 检查是否已经迁移过
    const migrated = localStorage.getItem('finman_data_migrated')
    if (!migrated || migrated !== 'v2.0') {
      migrateData()
    }
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="budget" element={<Budget />} />
          <Route path="assets" element={<Assets />} />
          <Route path="investment" element={<Investment />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="goals" element={<Goals />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
