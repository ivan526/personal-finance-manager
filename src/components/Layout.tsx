import { Outlet, useLocation, Link } from 'react-router-dom'
import { Home, List, PieChart, Wallet, TrendingUp, BarChart3, Settings, Target, Calendar, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import AddTransactionModal from './AddTransactionModal'

const menuItems = [
  { path: '/', label: '总览', icon: <Home size={20} aria-hidden="true" className="icon-scale-hover" /> },
  { path: '/transactions', label: '收支记录', icon: <List size={20} aria-hidden="true" className="icon-scale-hover" /> },
  { path: '/budget', label: '预算管理', icon: <PieChart size={20} aria-hidden="true" className="icon-scale-hover" /> },
  { path: '/assets', label: '资产统计', icon: <Wallet size={20} aria-hidden="true" className="icon-scale-hover" /> },
  { path: '/investment', label: '投资交易', icon: <TrendingUp size={20} aria-hidden="true" className="icon-scale-hover" /> },
  { path: '/calendar', label: '投资日历', icon: <Calendar size={20} aria-hidden="true" className="icon-scale-hover" /> },
  { path: '/goals', label: '理财目标', icon: <Target size={20} aria-hidden="true" className="icon-scale-hover" /> },
  { path: '/analysis', label: '消费分析', icon: <BarChart3 size={20} aria-hidden="true" className="icon-scale-hover" /> },
  { path: '/settings', label: '系统设置', icon: <Settings size={20} aria-hidden="true" className="icon-spin-hover" /> },
]

export default function Layout() {
  const location = useLocation()
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    const handleOpenAddModal = () => setShowAddModal(true)
    window.addEventListener('openAddTransactionModal', handleOpenAddModal)
    return () => window.removeEventListener('openAddTransactionModal', handleOpenAddModal)
  }, [])

  return (
    <div className="app-shell min-h-screen grid grid-cols-[300px_1fr]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        跳转到主要内容
      </a>

      <aside className="sidebar border-r bg-white/82 backdrop-blur-lg p-5 sticky top-0 h-screen transition-all" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow-nav)'}}>
        <div className="brand flex items-center gap-3.5 pb-7.5 px-3">
          <div className="w-[47px] h-[47px] rounded-[9px] bg-gradient-to-br from-[#126aff] to-[#4b8eff] text-white grid place-items-center font-extrabold text-2xl shadow-[0_8px_18px_rgba(29,110,255,.22)] relative overflow-hidden">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="relative z-10">
              <path d="M7 7h10v3H10v3h5v3h-5v7H7V7Z" fill="white" />
              <path d="M18 20l4-5 2 2-6 7-3-3 2-2 1 1z" fill="url(#brand-gradient)" />
              <defs>
                <linearGradient id="brand-gradient" x1="18" y1="15" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7dd3fc" />
                  <stop offset="1" stopColor="#bae6fd" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute top-[-10px] right-[-10px] w-[20px] h-[20px] rounded-full bg-white/20 blur-md"></div>
            <div className="absolute bottom-[-5px] left-[-5px] w-[15px] h-[15px] rounded-full bg-white/15 blur-sm"></div>
          </div>
          <div>
            <div className="font-extrabold text-2xl text-[#111827] tracking-[.2px]">FinSpace</div>
            <div className="text-sm text-[#64748b] mt-1.5 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-green-500 animate-pulse"></span>
              个人理财管家
            </div>
          </div>
        </div>

        <nav className="nav grid gap-2 pt-0.5">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full flex items-center gap-3.25 px-4.5 py-3 rounded-[8px] transition-all h-[50px] no-underline ${
                location.pathname === item.path
                  ? 'text-[#0b6cff] font-bold bg-gradient-to-r from-[#eaf4ff] to-[#f3f8ff]'
                  : 'text-[#26364d] font-medium'
              }`}
            >
              <span className="w-5.5 text-center">{item.icon}</span>
              <span className="text-lg">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-[70px] mx-2 rounded-[8px] bg-gradient-to-br from-[#eef6ff] to-[#f8fbff] border border-[#edf5ff] p-5 min-h-[150px]" style={{boxShadow: 'var(--shadow-soft)'}}>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.25 font-extrabold text-[#17345c] text-lg">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d="M12 3 20 6v5c0 5.1-3.45 8.8-8 10-4.55-1.2-8-4.9-8-10V6l8-3Z" fill="#1d6eff"/>
                <path d="m8.5 12 2.1 2.1 4.9-5.1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>本地优先存储</span>
            </div>
            <span style={{color:'#2774ff',fontSize:'28px',fontWeight:400,lineHeight:'.8'}}>›</span>
          </div>
          <p className="text-[#475569] font-medium text-[15px] leading-relaxed m-0">
            所有数据仅保存在本地浏览器中，<br/>不会上传到任何服务器，保障隐私<br/>安全。
          </p>
        </div>

        <div className="mt-6 px-4 text-center">
          <div className="text-xs" style={{color: 'var(--text-muted)'}}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="font-semibold" style={{color: 'var(--primary)'}}>FinSpace</span>
              <span>© 2026</span>
            </div>
            <div className="opacity-70">个人理财管理专家</div>
          </div>
        </div>
      </aside>

      <main id="main-content" className="min-w-0 ml-4">
        <header className="topbar sticky top-0 z-10 min-h-[75px] border-b bg-white flex items-center justify-between gap-4 px-8 py-3 shadow-sm" style={{borderColor: 'var(--border)'}}>
          <div>
            <div className="text-[#61738b] text-lg font-medium mt-3.75">
              {(() => {
                const page = menuItems.find(item => item.path === location.pathname)?.label || '总览'
                if (page === '总览') return '全面了解您的财务状况'
                if (page === '资产统计') return '全面了解您的资产状况'
                if (page === '收支记录') return '管理您的收入和支出记录'
                if (page === '预算管理') return '规划您的月度消费预算'
                if (page === '投资交易') return '管理您的投资交易记录'
                if (page === '理财目标') return '追踪您的理财目标完成进度'
                if (page === '消费分析') return '多维度分析您的消费行为'
                if (page === '系统设置') return '配置系统参数和数据管理'
                return ''
              })()}
            </div>
            <h1 className="text-[34px] font-black mt-0 mb-0 text-[#0f172a] tracking-[-1px] leading-[1.12]">
              {menuItems.find(item => item.path === location.pathname)?.label || '总览'}
            </h1>
          </div>
          <div className="actions flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              aria-label="添加收支记录"
              className="h-[44px] px-5.5 rounded-[7px] bg-gradient-to-b from-[#1d74ff] to-[#075ff0] text-white font-bold text-base flex items-center gap-2 hover:translate-y-[-1px] transition-all min-w-[100px] md:flex hidden" style={{boxShadow: 'var(--shadow-btn)'}}
            >
              <span aria-hidden="true" style={{fontSize:'23px',fontWeight:400,marginTop:'-2px'}}>＋</span>
              记一笔
            </button>
          </div>
        </header>

        <section className="content px-12 pt-8 pb-24 md:pb-10">
          <Outlet />
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" style={{borderColor: 'var(--border)'}}>
        <div className="grid grid-cols-5 h-16">
          {menuItems.slice(0, 5).map(item => (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center gap-0.5 transition-all"
              style={{color: location.pathname === item.path ? 'var(--primary)' : 'var(--text-muted)'}}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex flex-col items-center justify-center" style={{color: 'var(--primary)'}}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#1d74ff] to-[#075ff0] text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Plus size={20} />
            </div>
            <span className="text-xs font-medium mt-0.5">记账</span>
          </button>
        </div>
      </nav>

      {showAddModal && <AddTransactionModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
