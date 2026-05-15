
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import TransactionList from './modules/transaction/TransactionList'
import BudgetPage from './modules/budget/BudgetPage'
import { Wallet, PiggyBank, Home, BarChart3, Download, Upload, Lock } from 'lucide-react'
import { exportData, importData } from './store'
import { ThemeToggle } from './components/ThemeToggle'
import { useTheme } from './hooks/useTheme'

const pageTitles: Record<string, string> = {
  '/': '总览仪表盘',
  '/transaction': '收支记录',
  '/budget': '预算管控',
  '/analysis': '消费分析'
}

function Sidebar() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: '总览仪表盘', icon: <Home size={18} /> },
    { path: '/transaction', label: '收支记录', icon: <Wallet size={18} /> },
    { path: '/budget', label: '预算管控', icon: <PiggyBank size={18} /> },
    { path: '/analysis', label: '消费分析', icon: <BarChart3 size={18} /> },
  ]

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">F</div>
        <div>
          <div className="brand-title">FinSpace</div>
          <div className="brand-sub">个人理财资产中枢</div>
        </div>
      </div>
      <nav className="nav">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={location.pathname === item.path ? 'active' : ''}
          >
            <span className="icon">{item.icon}</span>
            <span className="label">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="side-card">
        <div className="mini-icon">
          <Lock size={18} />
        </div>
        <p className="t">本地优先存储</p>
        <p className="d">用户数据默认本地存储。云同步需用户授权，并启用强加密。</p>
      </div>
    </aside>
  )
}

function Topbar() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || '总览仪表盘'

  return (
    <header className="topbar">
      <div>
        <div className="crumb">本地资产管理 · 数据安全可靠</div>
        <h1>{title}</h1>
      </div>
      <div className="actions flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.json'
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) {
                importData(file).then(() => {
                  alert('数据导入成功')
                  window.location.reload()
                }).catch(() => {
                  alert('数据导入失败，请检查文件格式')
                })
              }
            }
            input.click()
          }}
          className="btn"
        >
          <Upload size={16} />
          导入
        </button>
        <button
          onClick={exportData}
          className="btn"
        >
          <Download size={16} />
          导出
        </button>
      </div>
    </header>
  )
}

function HomePage() {
  return (
    <div className="content">
      <div className="card mb-6">
        <div className="card-body">
          <div className="tag">⚑ 一站式个人理财资产管理工具</div>
          <h2 className="text-3xl font-bold mb-4">一个平台，管全量理财资产。</h2>
          <p className="text-gray-600 mb-8">轻松管理您的收支、预算、资产，清晰掌握财务状况</p>
          <div className="grid-4 grid grid-cols-2 md:grid-cols-4 gap-6">
            <Link to="/transaction" className="p-6 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <Wallet size={48} className="mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-semibold mb-2">收支记录</h3>
              <p className="text-sm text-gray-600">快速记录收入支出，分类管理，智能筛选</p>
            </Link>
            <Link to="/budget" className="p-6 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <PiggyBank size={48} className="mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-semibold mb-2">预算管控</h3>
              <p className="text-sm text-gray-600">设置月度预算，实时监控进度，超支提醒</p>
            </Link>
            <div className="p-6 bg-purple-50 rounded-lg opacity-60">
              <Home size={48} className="mx-auto mb-4 text-purple-600" />
              <h3 className="text-lg font-semibold mb-2">资产管理</h3>
              <p className="text-sm text-gray-600">多账户统一管理，总资产一目了然</p>
              <p className="text-xs text-gray-500 mt-2">开发中...</p>
            </div>
            <div className="p-6 bg-orange-50 rounded-lg opacity-60">
              <BarChart3 size={48} className="mx-auto mb-4 text-orange-600" />
              <h3 className="text-lg font-semibold mb-2">消费分析</h3>
              <p className="text-sm text-gray-600">可视化图表分析，掌握消费趋势</p>
              <p className="text-xs text-gray-500 mt-2">开发中...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <div className="app-shell">
        <Sidebar />
        <main className="main">
          <Topbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/transaction" element={<TransactionList />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/analysis" element={
              <div className="content">
                <div className="card">
                  <div className="card-body text-center py-12">
                    <h3 className="text-xl font-semibold text-gray-500">消费分析模块开发中，敬请期待~</h3>
                  </div>
                </div>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
