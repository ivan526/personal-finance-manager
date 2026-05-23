import { Download, Upload, Trash2, FileText, PieChart, Plus, Edit2, Import, AlertCircle, Moon, Sun, Monitor, Shield, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { storage } from '../utils/storage'
import { DEFAULT_CATEGORIES } from '../constants/categories'
import type { Category, TransactionType, Transaction, FamilyMember } from '../types'
import { useTheme } from '../hooks/useTheme'

// 风险测评问题
const RISK_QUESTIONS = [
  {
    id: 1,
    question: '您的投资经验如何？',
    options: [
      { score: 1, text: '没有任何投资经验' },
      { score: 2, text: '只有银行理财/余额宝等保本产品经验' },
      { score: 3, text: '有基金/股票等投资经验，2年以内' },
      { score: 4, text: '有丰富的基金/股票投资经验，2年以上' },
      { score: 5, text: '有专业投资知识，擅长主动投资' },
    ]
  },
  {
    id: 2,
    question: '您的投资期限是多久？',
    options: [
      { score: 1, text: '1年以内，随时可能需要取用' },
      { score: 2, text: '1-3年' },
      { score: 3, text: '3-5年' },
      { score: 4, text: '5-10年' },
      { score: 5, text: '10年以上，长期投资' },
    ]
  },
  {
    id: 3,
    question: '您能接受的最大投资回撤是多少？',
    options: [
      { score: 1, text: '不能接受任何亏损，只想要保本' },
      { score: 2, text: '最多接受5%以内的亏损' },
      { score: 3, text: '最多接受15%以内的亏损' },
      { score: 4, text: '最多接受30%以内的亏损' },
      { score: 5, text: '可以接受30%以上的亏损，追求高收益' },
    ]
  },
  {
    id: 4,
    question: '您的家庭收入状况如何？',
    options: [
      { score: 1, text: '收入不稳定，生活开支压力较大' },
      { score: 2, text: '收入基本稳定，刚好覆盖开支' },
      { score: 3, text: '收入稳定，每年有一定结余' },
      { score: 4, text: '收入较高，结余充足，没有负债压力' },
      { score: 5, text: '财务自由，投资资金占资产比例很小' },
    ]
  },
  {
    id: 5,
    question: '您的投资目标是什么？',
    options: [
      { score: 1, text: '资产保本，跑赢通胀即可' },
      { score: 2, text: '稳健增值，追求较低风险' },
      { score: 3, text: '平衡收益和风险，追求长期稳健收益' },
      { score: 4, text: '追求较高收益，可以承受一定波动' },
      { score: 5, text: '追求高收益，愿意承担较大风险' },
    ]
  }
]

// 风险等级对应
const RISK_LEVELS = [
  { level: '保守型', minScore: 5, maxScore: 8, color: '#10b981', desc: '适合低风险产品，如货币基金、银行理财' },
  { level: '稳健型', minScore: 9, maxScore: 12, color: '#3b82f6', desc: '适合中低风险产品，如债券基金、固收+' },
  { level: '平衡型', minScore: 13, maxScore: 16, color: '#8b5cf6', desc: '适合均衡配置，股债平衡' },
  { level: '成长型', minScore: 17, maxScore: 20, color: '#f59e0b', desc: '适合中高风险产品，偏股基金、股票为主' },
  { level: '进取型', minScore: 21, maxScore: 25, color: '#ef4444', desc: '适合高风险产品，股票、行业基金、衍生品等' },
]

interface Props {
  className?: string
}

// 可用图标列表
const CATEGORY_ICONS = [
  '🍽️', '🚗', '🛍️', '🎮', '🏥', '📚', '🏠', '📱', '🎁', '🏃', 
  '💼', '🎊', '📈', '🧧', '💸', '✈️', '🎟️', '💅', '🐶', '🌱',
  '🎓', '💍', '🎂', '🍺', '🎮', '📱', '💻', '🎨', '🎵', '📝'
] as const

// 可用颜色列表
const CATEGORY_COLORS = [
  '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#10b981', 
  '#f97316', '#06b6d4', '#f43f5e', '#22c55e', '#0ea5e9', '#65a30d',
  '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#ef4444', '#10b981'
] as const

export default function Settings({ className }: Props) {
  const { theme, toggleTheme } = useTheme()
  const [categories, setCategories] = useState<Category[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'expense' as TransactionType,
    icon: CATEGORY_ICONS[0],
    color: CATEGORY_COLORS[0]
  })
  const [importType, setImportType] = useState<'alipay' | 'wechat'>('alipay')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importPreview, setImportPreview] = useState<Transaction[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  // 加密备份相关
  const [showEncryptExportModal, setShowEncryptExportModal] = useState(false)
  const [exportPassword, setExportPassword] = useState('')
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState('')
  const [showEncryptImportModal, setShowEncryptImportModal] = useState(false)
  const [importPassword, setImportPassword] = useState('')
  const [encryptedImportFile, setEncryptedImportFile] = useState<File | null>(null)

  // 家庭账户相关
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    avatar: '👩',
    role: 'member' as const
  })

  // 家庭成员头像列表
  const AVATAR_LIST = ['👨', '👩', '👦', '👧', '👴', '👵', '🧑', '🧒', '👶', '🐱', '🐶']

  // 加载家庭成员
  useEffect(() => {
    setFamilyMembers(storage.getFamilyMembers())
  }, [])

  // 风险测评相关
  const [showRiskAssessment, setShowRiskAssessment] = useState(false)
  const [riskAnswers, setRiskAnswers] = useState<Record<number, number>>({})
  const [riskResult, setRiskResult] = useState<{
    score: number
    level: string
    desc: string
    color: string
  } | null>(null)

  // 加载保存的风险测评结果
  useEffect(() => {
    const saved = localStorage.getItem('risk_assessment_result')
    if (saved) {
      setRiskResult(JSON.parse(saved))
    }
  }, [])

  // 计算风险等级
  const calculateRiskLevel = () => {
    const totalScore = Object.values(riskAnswers).reduce((sum, score) => sum + score, 0)
    const level = RISK_LEVELS.find(l => totalScore >= l.minScore && totalScore <= l.maxScore) || RISK_LEVELS[0]
    
    const result = {
      score: totalScore,
      level: level.level,
      desc: level.desc,
      color: level.color
    }
    
    setRiskResult(result)
    localStorage.setItem('risk_assessment_result', JSON.stringify(result))
    setShowRiskAssessment(false)
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = () => {
    setCategories(storage.getCategories())
  }

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryForm.name.trim()) {
      alert('请输入分类名称')
      return
    }

    if (editingCategory) {
      // 编辑自定义分类
      if (!editingCategory.isCustom) {
        alert('系统默认分类无法编辑')
        return
      }
      storage.updateCustomCategory({
        ...editingCategory,
        ...categoryForm
      })
    } else {
      // 新增自定义分类
      const newCategory: Category = {
        id: `custom_${Date.now()}`,
        ...categoryForm,
        isCustom: true
      }
      storage.addCustomCategory(newCategory)
    }

    loadCategories()
    setShowCategoryModal(false)
    setEditingCategory(null)
    resetCategoryForm()
  }

  const handleEditCategory = (category: Category) => {
    if (!category.isCustom) {
      alert('系统默认分类无法编辑')
      return
    }
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color
    })
    setShowCategoryModal(true)
  }

  const handleDeleteCategory = (id: string) => {
    if (confirm('确定要删除这个分类吗？删除后已使用该分类的记录不会受影响。')) {
      storage.deleteCustomCategory(id)
      loadCategories()
    }
  }

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      type: 'expense',
      icon: CATEGORY_ICONS[0],
      color: CATEGORY_COLORS[0]
    })
  }

  // 解析支付宝CSV账单
  const parseAlipayCSV = (content: string): Transaction[] => {
    const lines = content.split('\n').filter(line => line.trim() !== '')
    const transactions: Transaction[] = []
    const categories = storage.getCategories()
    const defaultCategory = categories.find(c => c.id === 'other_expense') || categories[0]

    // 支付宝账单格式：从第5行开始是数据，格式：交易时间,交易分类,交易对方,对方账号,商品说明,金额,收/支,交易状态,交易流水号,商家订单号,备注
    for (let i = 4; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      // 处理CSV引号嵌套
      const columns: string[] = []
      let current = ''
      let inQuotes = false
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          columns.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      columns.push(current.trim())

      if (columns.length < 7) continue

      const timeStr = columns[0]
      const typeStr = columns[6]
      const amountStr = columns[5]
      const remark = columns[4] || columns[2]

      // 只处理成功的交易
      if (columns[7] && !columns[7].includes('成功')) continue

      // 解析时间
      const time = new Date(timeStr).getTime()
      if (isNaN(time)) continue

      // 解析金额
      const amount = parseFloat(amountStr.replace(/[^\d.]/g, ''))
      if (isNaN(amount) || amount <= 0) continue

      // 交易类型
      const type: TransactionType = typeStr.includes('支出') ? 'expense' : 'income'

      // 匹配分类
      const categoryName = columns[1]
      let category = categories.find(c => 
        c.type === type && 
        (c.name.includes(categoryName) || categoryName.includes(c.name))
      ) || defaultCategory

      transactions.push({
        id: `import_alipay_${Date.now()}_${i}`,
        type,
        categoryId: category.id,
        amount,
        time,
        remark: remark || category.name
      })
    }

    return transactions
  }

  // 解析微信CSV账单
  const parseWechatCSV = (content: string): Transaction[] => {
    const lines = content.split('\n').filter(line => line.trim() !== '')
    const transactions: Transaction[] = []
    const categories = storage.getCategories()
    const defaultCategory = categories.find(c => c.id === 'other_expense') || categories[0]

    // 微信账单格式：从第17行开始是数据，格式：交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注
    for (let i = 16; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const columns: string[] = []
      let current = ''
      let inQuotes = false
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          columns.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      columns.push(current.trim())

      if (columns.length < 8) continue

      const timeStr = columns[0]
      const typeStr = columns[4]
      const amountStr = columns[5]
      const remark = columns[3] || columns[2]

      // 只处理支付成功的交易
      if (columns[7] && !columns[7].includes('支付成功') && !columns[7].includes('收入成功')) continue

      // 解析时间
      const time = new Date(timeStr).getTime()
      if (isNaN(time)) continue

      // 解析金额
      const amount = parseFloat(amountStr.replace(/[^\d.]/g, ''))
      if (isNaN(amount) || amount <= 0) continue

      // 交易类型
      const type: TransactionType = typeStr.includes('支出') ? 'expense' : 'income'

      // 匹配分类
      const categoryName = columns[1]
      let category = categories.find(c => 
        c.type === type && 
        (c.name.includes(categoryName) || categoryName.includes(c.name))
      ) || defaultCategory

      transactions.push({
        id: `import_wechat_${Date.now()}_${i}`,
        type,
        categoryId: category.id,
        amount,
        time,
        remark: remark || category.name
      })
    }

    return transactions
  }

  // 处理文件上传
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        setImportErrors([])
        
        let transactions: Transaction[] = []
        if (importType === 'alipay') {
          transactions = parseAlipayCSV(content)
        } else {
          transactions = parseWechatCSV(content)
        }

        if (transactions.length === 0) {
          setImportErrors(['未找到有效交易记录，请确认账单格式是否正确'])
          setImportPreview([])
          return
        }

        setImportPreview(transactions)
      } catch (error) {
        console.error('导入失败:', error)
        setImportErrors([`解析失败：${error instanceof Error ? error.message : '未知错误'}`])
        setImportPreview([])
      }
    }
    reader.readAsText(file, importType === 'alipay' ? 'gbk' : 'utf-8')
  }

  // 确认导入
  const confirmImport = () => {
    if (importPreview.length === 0) return

    importPreview.forEach(transaction => {
      storage.addTransaction(transaction)
    })

    alert(`成功导入 ${importPreview.length} 条交易记录`)
    setShowImportModal(false)
    setImportPreview([])
    setImportErrors([])
  }

  const handleExport = () => {
    const data = storage.exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finman-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    alert('数据导出成功')
  }

  // 导出收支明细表CSV
  const exportTransactionCSV = () => {
    const transactions = storage.getTransactions()
    const accounts = storage.getAccounts()
    const accountMap = new Map(accounts.map(acc => [acc.id, acc.name]))
    
    const headers = ['时间', '类型', '分类', '金额', '账户', '备注']
    const rows = transactions.map(t => {
      const category = DEFAULT_CATEGORIES.find(c => c.id === t.categoryId)
      return [
        new Date(t.time).toLocaleString('zh-CN'),
        t.type === 'income' ? '收入' : '支出',
        category?.name || '未知',
        t.amount.toFixed(2),
        accountMap.get(t.accountId || '') || '无',
        t.remark || ''
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `收支明细表-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    alert('收支明细表导出成功')
  }

  // 导出资产负债表CSV
  const exportBalanceSheetCSV = () => {
    const accounts = storage.getAccounts()
    const liabilities = storage.getLiabilities()
    const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0)
    const totalLiabilities = liabilities.reduce((sum, liab) => sum + liab.balance, 0)
    const netWorth = totalAssets - totalLiabilities

    const headers = ['类型', '名称', '余额/待还', '币种', '备注']
    const rows = [
      // 资产部分
      ...accounts.map(acc => [
        '资产',
        acc.name,
        acc.balance.toFixed(2),
        acc.currency || 'CNY',
        ''
      ]),
      // 负债部分
      ...liabilities.map(liab => [
        '负债',
        liab.name,
        liab.balance.toFixed(2),
        'CNY',
        `总额: ${liab.amount.toFixed(2)}, 利率: ${liab.interestRate}%`
      ]),
      // 汇总
      ['汇总', '总资产', totalAssets.toFixed(2), 'CNY', ''],
      ['汇总', '总负债', totalLiabilities.toFixed(2), 'CNY', ''],
      ['汇总', '净资产', netWorth.toFixed(2), 'CNY', '']
    ]

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `资产负债表-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    alert('资产负债表导出成功')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (storage.importData(content)) {
        alert('数据导入成功，页面将刷新')
        window.location.reload()
      } else {
        alert('数据导入失败，请检查文件格式')
      }
    }
    reader.readAsText(file)
  }

  // 从密码派生AES密钥
  const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const enc = new TextEncoder()
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }

  // 加密数据
  const encryptData = async (data: string, password: string): Promise<string> => {
    const enc = new TextEncoder()
    const salt = crypto.getRandomValues(new Uint8Array(16)) // 16字节盐
    const iv = crypto.getRandomValues(new Uint8Array(12)) // 12字节IV（GCM推荐）
    const key = await deriveKey(password, salt)
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      enc.encode(data)
    )

    // 组合salt + iv + 加密数据，转换为base64
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
    result.set(salt, 0)
    result.set(iv, salt.length)
    result.set(new Uint8Array(encrypted), salt.length + iv.length)
    
    return btoa(String.fromCharCode(...result))
  }

  // 解密数据
  const decryptData = async (encryptedData: string, password: string): Promise<string> => {
    const enc = new TextDecoder()
    const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    
    const salt = data.slice(0, 16) // 前16字节是盐
    const iv = data.slice(16, 28) // 接下来12字节是IV
    const ciphertext = data.slice(28) // 剩下的是加密数据
    
    const key = await deriveKey(password, salt)
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    )
    
    return enc.decode(decrypted)
  }

  // 加密导出
  const handleEncryptedExport = async () => {
    if (!exportPassword || exportPassword.length < 6) {
      alert('密码长度至少6位')
      return
    }
    if (exportPassword !== exportPasswordConfirm) {
      alert('两次输入的密码不一致')
      return
    }

    try {
      const data = storage.exportData()
      const encrypted = await encryptData(data, exportPassword)
      
      // 导出加密文件，添加.enc后缀
      const blob = new Blob([encrypted], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finman-encrypted-backup-${new Date().toISOString().slice(0, 10)}.enc`
      a.click()
      URL.revokeObjectURL(url)
      
      alert('加密备份导出成功，请牢记您的密码，忘记密码将无法恢复数据！')
      setShowEncryptExportModal(false)
      setExportPassword('')
      setExportPasswordConfirm('')
    } catch (error) {
      console.error('加密导出失败:', error)
      alert('加密导出失败，请重试')
    }
  }

  // 加密导入
  const handleEncryptedImport = async () => {
    if (!encryptedImportFile || !importPassword) {
      alert('请选择加密文件并输入密码')
      return
    }

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const encryptedData = event.target?.result as string
          const decryptedData = await decryptData(encryptedData, importPassword)
          
          if (storage.importData(decryptedData)) {
            alert('加密备份导入成功，页面将刷新')
            window.location.reload()
          } else {
            alert('数据导入失败，请检查文件格式或密码是否正确')
          }
        } catch (error) {
          console.error('解密失败:', error)
          alert('解密失败，请检查密码是否正确，或文件是否损坏')
        }
      }
      reader.readAsText(encryptedImportFile)
    } catch (error) {
      console.error('加密导入失败:', error)
      alert('导入失败，请重试')
    }
  }

  // 家庭成员管理
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberForm.name.trim()) {
      alert('请输入成员姓名')
      return
    }

    storage.addFamilyMember(newMemberForm)
    setFamilyMembers(storage.getFamilyMembers())
    setShowAddMemberModal(false)
    setNewMemberForm({ name: '', avatar: '👩', role: 'member' })
  }

  const handleDeleteMember = (id: string) => {
    const member = familyMembers.find(m => m.id === id)
    if (member?.role === 'owner') {
      alert('管理员角色不能删除')
      return
    }
    if (confirm(`确定要删除成员 ${member?.name} 吗？相关数据不会被删除，只会解除关联。`)) {
      storage.deleteFamilyMember(id)
      setFamilyMembers(storage.getFamilyMembers())
    }
  }

  const handleClear = () => {
    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
      storage.clearAll()
      alert('数据已清空，页面将刷新')
      window.location.reload()
    }
  }

  return (
    <div className={`animate-fade-in ${className || ''}`}>
      {/* 数据管理 */}
      <div className="bg-white border rounded-[13px] p-8 mt-8" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
        <h3 className="text-xl font-extrabold mb-6" style={{color: 'var(--text)'}}>数据管理</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
          <div className="p-6 border rounded-[14px] hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer" style={{borderColor: 'var(--border)'}} onClick={handleExport}>
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4" style={{color: 'var(--primary)'}}>
              <Download size={32} />
            </div>
            <h4 className="font-semibold text-lg mb-2">导出备份</h4>
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>导出完整JSON备份文件</p>
          </div>

          <label className="p-6 border rounded-[14px] hover:border-green-300 hover:bg-green-50 transition-all cursor-pointer" style={{borderColor: 'var(--border)'}}>
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mb-4" style={{color: 'var(--success)'}}>
              <Upload size={32} />
            </div>
            <h4 className="font-semibold text-lg mb-2">导入备份</h4>
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>从JSON备份文件恢复数据</p>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>

          <div className="p-6 border rounded-[14px] hover:border-cyan-300 hover:bg-cyan-50 transition-all cursor-pointer" style={{borderColor: 'var(--border)'}} onClick={() => setShowImportModal(true)}>
            <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-600 flex items-center justify-center mb-4">
              <Import size={32} />
            </div>
            <h4 className="font-semibold text-lg mb-2">账单导入</h4>
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>导入支付宝/微信账单CSV</p>
          </div>
        </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
           <div className="p-6 border rounded-[14px] hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer" style={{borderColor: 'var(--border)'}} onClick={exportTransactionCSV}>
             <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 flex items-center justify-center mb-4">
               <FileText size={32} />
             </div>
             <h4 className="font-semibold text-lg mb-2">收支明细</h4>
             <p className="text-sm" style={{color: 'var(--text-muted)'}}>导出收支明细表CSV</p>
           </div>

           <div className="p-6 border rounded-[14px] hover:border-amber-300 hover:bg-amber-50 transition-all cursor-pointer" style={{borderColor: 'var(--border)'}} onClick={exportBalanceSheetCSV}>
             <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center mb-4" style={{color: 'var(--warning)'}}>
               <PieChart size={32} />
             </div>
             <h4 className="font-semibold text-lg mb-2">资产负债</h4>
             <p className="text-sm" style={{color: 'var(--text-muted)'}}>导出资产负债表CSV</p>
           </div>

           <div className="p-6 border rounded-[14px] hover:border-red-300 hover:bg-red-50 transition-all cursor-pointer" style={{borderColor: 'var(--border)'}} onClick={handleClear}>
             <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center mb-4" style={{color: 'var(--danger)'}}>
               <Trash2 size={32} />
             </div>
             <h4 className="font-semibold text-lg mb-2">清空数据</h4>
             <p className="text-sm" style={{color: 'var(--text-muted)'}}>删除所有记录，不可恢复</p>
           </div>

           <div className="p-6 border rounded-[14px] hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer" style={{borderColor: 'var(--border)'}} onClick={() => setShowEncryptExportModal(true)}>
             <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
               <Shield size={32} />
             </div>
             <h4 className="font-semibold text-lg mb-2">加密导出</h4>
             <p className="text-sm" style={{color: 'var(--text-muted)'}}>AES-256加密备份，更高安全性</p>
           </div>

           <label className="p-6 border rounded-[14px] hover:border-teal-300 hover:bg-teal-50 transition-all cursor-pointer" style={{borderColor: 'var(--border)'}}>
             <div className="w-[66px] h-[66px] rounded-[14px] bg-gradient-to-br from-teal-50 to-teal-100 text-teal-600 flex items-center justify-center mb-4">
               <Shield size={32} />
             </div>
             <h4 className="font-semibold text-lg mb-2">加密导入</h4>
             <p className="text-sm" style={{color: 'var(--text-muted)'}}>从加密备份文件恢复数据</p>
             <input 
               type="file" 
               accept=".enc" 
               onChange={(e) => {
                 const file = e.target.files?.[0]
                 if (file) {
                   setEncryptedImportFile(file)
                   setShowEncryptImportModal(true)
                 }
               }}
               className="hidden" 
             />
           </label>
         </div>
       </div>

      {/* 主题设置 */}
      <div className="bg-white border rounded-[13px] p-8 mt-6" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
        <h3 className="text-xl font-extrabold mb-6" style={{color: 'var(--text)'}}>外观设置</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => toggleTheme('light')}
            className={`-4 border rounded-[14px] transition-all flex flex-col items-center gap-3 hover:border-blue-300 hover:bg-blue-50/50 ${ 
              theme === 'light' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : ' '}`}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 grid place-items-center">
              <Sun size={24} className="text-orange-500" />
            </div>
            <div>
              <div className="font-medium" style={{color: 'var(--text)'}}>亮色模式</div>
            </div>
          </button>

          <button
            onClick={() => toggleTheme('dark')}
            className={`-4 border rounded-[14px] transition-all flex flex-col items-center gap-3 hover:border-blue-300 hover:bg-blue-50/50 ${ 
              theme === 'dark' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : ' '}`}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 grid place-items-center">
              <Moon size={24} className="text-indigo-600" />
            </div>
            <div>
              <div className="font-medium" style={{color: 'var(--text)'}}>暗黑模式</div>
            </div>
          </button>

          <button
            onClick={() => toggleTheme('system')}
            className={`-4 border rounded-[14px] transition-all flex flex-col items-center gap-3 hover:border-blue-300 hover:bg-blue-50/50 ${ 
              theme === 'system' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : ' '}`}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-slate-100 grid place-items-center">
              <Monitor size={24} className="text-gray-600" />
            </div>
            <div>
              <div className="font-medium" style={{color: 'var(--text)'}}>跟随系统</div>
            </div>
          </button>
        </div>
       </div>

       {/* 家庭账户管理 */}
       <div className="bg-white border rounded-[13px] p-8 mt-6" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
         <div className="flex items-center justify-between mb-6">
           <div>
             <h3 className="text-xl font-extrabold" style={{color: 'var(--text)'}}>家庭账户管理</h3>
             <p className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>管理家庭成员，支持多成员收支统计和资产合并查看</p>
           </div>
           <button
             onClick={() => setShowAddMemberModal(true)}
             className="h-[42px] px-6 rounded-lg border-0 text-white bg-gradient-to-b from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/25 flex items-center gap-2 text-base font-bold"
           >
             <Plus size={18} />
             添加成员
           </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {familyMembers.map(member => (
             <div key={member.id} className="p-4 border rounded-[14px] hover:border-blue-300 transition-all" style={{borderColor: 'var(--border)'}}>
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-full text-3xl grid place-items-center bg-gradient-to-br from-blue-50 to-purple-50">
                     {member.avatar}
                   </div>
                   <div>
                     <div className="font-semibold" style={{color: 'var(--text)'}}>{member.name}</div>
                     <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                       member.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                     }`}>
                       {member.role === 'owner' ? '管理员' : '普通成员'}
                     </span>
                   </div>
                 </div>
                 {member.role !== 'owner' && (
                   <button
                     onClick={() => handleDeleteMember(member.id)}
                     className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded transition-all"
                   >
                     <X size={16} />
                   </button>
                 )}
               </div>
               <div className="text-xs" style={{color: 'var(--text-muted)'}}>
                 加入时间：{new Date(member.createdAt).toLocaleDateString('zh-CN')}
               </div>
             </div>
           ))}
         </div>

         <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
           <div className="flex items-start gap-3">
             <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
             <div className="text-sm text-blue-800">
               <p className="font-medium mb-1">功能说明</p>
               <p>添加家庭成员后，您可以在记录收支、添加账户时选择所属成员，支持按成员筛选查看统计数据，同时支持查看家庭整体资产和收支情况。</p>
             </div>
           </div>
         </div>
       </div>

       {/* 风险测评 */}
       <div className="bg-white border rounded-[13px] p-8 mt-6" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-extrabold" style={{color: 'var(--text)'}}>风险承受能力测评</h3>
            <p className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>评估您的风险等级，获取个性化资产配置建议</p>
          </div>
          {!riskResult ? (
            <button
              onClick={() => setShowRiskAssessment(true)}
              className="h-[42px] px-6 rounded-lg border-0 text-white bg-gradient-to-b from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25 flex items-center gap-2 text-base font-bold"
            >
              <Shield size={18} />
              开始测评
            </button>
          ) : (
            <div 
              className="px-6 py-3 rounded-lg flex items-center gap-3 font-medium"
              style={{ backgroundColor: `${riskResult.color}20`, color: riskResult.color }}
            >
              <Shield size={20} />
              <span>您的风险等级：{riskResult.level}（{riskResult.score}分）</span>
              <button
                onClick={() => setShowRiskAssessment(true)}
                className="ml-4 text-sm underline "
              >
                重新测评
              </button>
            </div>
          )}
        </div>

        {riskResult && (
          <div className="border rounded-lg p-4" style={{backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)'}}>
            <div className="flex items-start gap-3">
              <div 
                className="w-12 h-12 rounded-full grid place-items-center text-white font-bold text-xl flex-shrink-0"
                style={{ backgroundColor: riskResult.color }}
              >
                {riskResult.level.charAt(0)}
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-1" style={{color: 'var(--text)'}}>{riskResult.level}投资者</h4>
                <p className="text-sm" style={{color: 'var(--text-muted)'}}>{riskResult.desc}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 分类管理 */}
      <div className="bg-white border rounded-[13px] p-8 mt-6" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-extrabold" style={{color: 'var(--text)'}}>分类管理</h3>
          <button
            onClick={() => {
              resetCategoryForm()
              setEditingCategory(null)
              setShowCategoryModal(true)
            }}
            className="h-[42px] px-6 rounded-lg border-0 text-white bg-gradient-to-b from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 flex items-center gap-2 text-base font-bold"
          >
            <Plus size={18} />
            新增分类
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 支出分类 */}
          <div>
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{color: 'var(--text)'}}>
              <span className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--danger)'}}></span>
              支出分类
            </h4>
            <div className="space-y-2">
              {categories.filter(c => c.type === 'expense').map(category => (
                <div 
                  key={category.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-200 transition-all" style={{borderColor: 'var(--border)'}}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full text-xl grid place-items-center"
                      style={{ backgroundColor: `${category.color}20`, color: category.color }}
                    >
                      {category.icon}
                    </div>
                    <div>
                      <div className="font-medium" style={{color: 'var(--text)'}}>{category.name}</div>
                      {category.isCustom && (
                        <div className="text-xs" style={{color: 'var(--text-muted)'}}>自定义</div>
                      )}
                    </div>
                  </div>
                  {category.isCustom && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-blue-50 rounded transition-all" style={{color: 'var(--primary)'}}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded transition-all" style={{color: 'var(--danger)'}}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 收入分类 */}
          <div>
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{color: 'var(--text)'}}>
              <span className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--success)'}}></span>
              收入分类
            </h4>
            <div className="space-y-2">
              {categories.filter(c => c.type === 'income').map(category => (
                <div 
                  key={category.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-200 transition-all" style={{borderColor: 'var(--border)'}}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full text-xl grid place-items-center"
                      style={{ backgroundColor: `${category.color}20`, color: category.color }}
                    >
                      {category.icon}
                    </div>
                    <div>
                      <div className="font-medium" style={{color: 'var(--text)'}}>{category.name}</div>
                      {category.isCustom && (
                        <div className="text-xs" style={{color: 'var(--text-muted)'}}>自定义</div>
                      )}
                    </div>
                  </div>
                  {category.isCustom && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-blue-50 rounded transition-all" style={{color: 'var(--primary)'}}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded transition-all" style={{color: 'var(--danger)'}}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

       {/* 关于 */}
       <div className="bg-white border rounded-[13px] p-8 mt-6" style={{borderColor: 'var(--border)', boxShadow: 'var(--shadow)'}}>
         <h3 className="text-xl font-extrabold mb-6" style={{color: 'var(--text)'}}>关于</h3>
         <div className="space-y-3 text-base" style={{color: 'var(--text)'}}>
           <p>版本：v1.1.0</p>
           <p>特性：支持收支记录、预算管理、资产统计、消费分析、投资交易管理、理财目标追踪</p>
           <p>数据存储：所有数据仅保存在本地浏览器中，不会上传到任何服务器，保障隐私安全</p>
           <p>技术栈：React + TypeScript + TailwindCSS + ECharts</p>
         </div>
       </div>

       {/* 加密导出弹窗 */}
       {showEncryptExportModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
           <div className="bg-white rounded-lg max-w-md w-full p-6 animate-slide-up" style={{boxShadow: 'var(--shadow-lg)'}}>
             <h3 className="text-xl font-bold mb-4" style={{color: 'var(--text)'}}>加密导出备份</h3>
             <p className="text-sm mb-4" style={{color: 'var(--text-muted)'}}>
               您的备份文件将使用AES-256算法加密，只有输入正确密码才能解密恢复。请牢记您的密码，忘记密码将无法恢复数据！
             </p>
             <form onSubmit={(e) => { e.preventDefault(); handleEncryptedExport(); }} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                   设置密码（至少6位）
                 </label>
                 <input
                   type="password"
                   required
                   minLength={6}
                   value={exportPassword}
                   onChange={(e) => setExportPassword(e.target.value)}
                   className="input-glass w-full"
                   placeholder="请输入加密密码"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                   确认密码
                 </label>
                 <input
                   type="password"
                   required
                   minLength={6}
                   value={exportPasswordConfirm}
                   onChange={(e) => setExportPasswordConfirm(e.target.value)}
                   className="input-glass w-full"
                   placeholder="请再次输入密码"
                 />
               </div>
               <div className="flex gap-3 pt-4">
                 <button
                   type="button"
                   onClick={() => {
                     setShowEncryptExportModal(false)
                     setExportPassword('')
                     setExportPasswordConfirm('')
                   }}
                   className="flex-1 px-4 py-2.5 border rounded-sm  transition-all" style={{borderColor: 'var(--border)', color: 'var(--text)'}}
                 >
                   取消
                 </button>
                 <button
                   type="submit"
                   className="flex-1 btn-primary"
                 >
                   导出加密备份
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* 加密导入弹窗 */}
       {showEncryptImportModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
           <div className="bg-white rounded-lg max-w-md w-full p-6 animate-slide-up" style={{boxShadow: 'var(--shadow-lg)'}}>
             <h3 className="text-xl font-bold mb-4" style={{color: 'var(--text)'}}>导入加密备份</h3>
             <p className="text-sm mb-4" style={{color: 'var(--text-muted)'}}>
               已选择文件：{encryptedImportFile?.name}
             </p>
             <form onSubmit={(e) => { e.preventDefault(); handleEncryptedImport(); }} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                   输入解密密码
                 </label>
                 <input
                   type="password"
                   required
                   value={importPassword}
                   onChange={(e) => setImportPassword(e.target.value)}
                   className="input-glass w-full"
                   placeholder="请输入备份文件的加密密码"
                 />
               </div>
               <div className="flex gap-3 pt-4">
                 <button
                   type="button"
                   onClick={() => {
                     setShowEncryptImportModal(false)
                     setImportPassword('')
                     setEncryptedImportFile(null)
                   }}
                   className="flex-1 px-4 py-2.5 border rounded-sm  transition-all" style={{borderColor: 'var(--border)', color: 'var(--text)'}}
                 >
                   取消
                 </button>
                 <button
                   type="submit"
                   className="flex-1 btn-primary"
                 >
                   解密并导入
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

      {/* 分类编辑弹窗 */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg max-w-md w-full p-6 animate-slide-up" style={{boxShadow: 'var(--shadow-lg)'}}>
            <h3 className="text-xl font-bold mb-4" style={{color: 'var(--text)'}}>
              {editingCategory ? '编辑分类' : '新增分类'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                  分类类型
                </label>
                <select
                  value={categoryForm.type}
                  onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value as TransactionType })}
                  className="input-glass w-full"
                  disabled={!!editingCategory} // 编辑时不能修改类型
                >
                  <option value="expense">支出分类</option>
                  <option value="income">收入分类</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                  分类名称 *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="input-glass w-full"
                  placeholder="例如：宠物消费"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                  选择图标
                </label>
                <div className="grid grid-cols-10 gap-2">
                  {CATEGORY_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, icon })}
                      className={`w-10 h-10 rounded-full text-xl grid place-items-center transition-all ${
                        categoryForm.icon === icon 
                          ? 'bg-blue-100 border-2 border-blue-500' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                  选择颜色
                </label>
                <div className="grid grid-cols-9 gap-2">
                  {CATEGORY_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, color })}
                      className={`w-8 h-8 rounded-full transition-all ${
                        categoryForm.color === color 
                          ? 'ring-2 ring-offset-2 ring-gray-400' 
                          : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false)
                    setEditingCategory(null)
                  }}
                  className="flex-1 px-4 py-2.5 border rounded-sm  transition-all" style={{borderColor: 'var(--border)', color: 'var(--text)'}}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  {editingCategory ? '保存修改' : '添加分类'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 账单导入弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 animate-slide-up max-h-[90vh] overflow-y-auto" style={{boxShadow: 'var(--shadow-lg)'}}>
            <h3 className="text-xl font-bold mb-4" style={{color: 'var(--text)'}}>
              导入账单
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                  账单类型
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setImportType('alipay')
                      setImportPreview([])
                      setImportErrors([])
                    }}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      importType === 'alipay' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' 
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    支付宝账单
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportType('wechat')
                      setImportPreview([])
                      setImportErrors([])
                    }}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      importType === 'wechat' 
                        ? 'bg-green-50 border-green-500 text-green-700 font-medium' 
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    微信账单
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                  选择CSV文件
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-1 text-sm text-gray-600">
                      <span className="font-semibold">点击上传文件</span> 或拖拽文件到此处
                    </p>
                    <p className="text-xs text-gray-500">
                      支持 {importType === 'alipay' ? '支付宝导出的CSV账单' : '微信导出的CSV账单'}
                    </p>
                  </div>
                  <input 
                    type="file" 
                    accept=".csv" 
                    className="hidden" 
                    onChange={handleImportFile}
                  />
                </label>
              </div>

              {/* 错误信息 */}
              {importErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={18} className="text-red-600" />
                    <h4 className="font-medium text-red-800">导入失败</h4>
                  </div>
                  <ul className="text-sm text-red-700 space-y-1">
                    {importErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 预览信息 */}
              {importPreview.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium" style={{color: 'var(--text)'}}>
                      找到 {importPreview.length} 条有效交易记录
                    </h4>
                    <div className="text-sm" style={{color: 'var(--text-muted)'}}>
                      收入：¥{importPreview.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                      <span className="mx-2">|</span>
                      支出：¥{importPreview.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto" style={{borderColor: 'var(--border)'}}>
                    <table className="w-full text-sm">
                      <thead className="sticky top-0" style={{backgroundColor: 'var(--bg-soft)'}}>
                        <tr>
                          <th className="text-left px-3 py-2 border-b" style={{borderColor: 'var(--border)', color: 'var(--text-muted)'}}>时间</th>
                          <th className="text-left px-3 py-2 border-b" style={{borderColor: 'var(--border)', color: 'var(--text-muted)'}}>类型</th>
                          <th className="text-left px-3 py-2 border-b" style={{borderColor: 'var(--border)', color: 'var(--text-muted)'}}>分类</th>
                          <th className="text-right px-3 py-2 border-b" style={{borderColor: 'var(--border)', color: 'var(--text-muted)'}}>金额</th>
                          <th className="text-left px-3 py-2 border-b" style={{borderColor: 'var(--border)', color: 'var(--text-muted)'}}>备注</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.slice(0, 10).map((transaction, index) => {
                          const category = storage.getCategories().find(c => c.id === transaction.categoryId)
                          return (
                            <tr key={index} className="border-b" style={{borderColor: 'var(--border)'}}>
                              <td className="px-3 py-2" style={{color: 'var(--text-muted)'}}>
                                {new Date(transaction.time).toLocaleString('zh-CN')}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  transaction.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                  {transaction.type === 'income' ? '收入' : '支出'}
                                </span>
                              </td>
                              <td className="px-3 py-2" style={{color: 'var(--text)'}}>
                                {category?.name || '其他'}
                              </td>
                              <td className={`px-3 py-2 text-right font-medium number ${
                                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 truncate max-w-xs" style={{color: 'var(--text-muted)'}}>
                                {transaction.remark || '-'}
                              </td>
                            </tr>
                          )
                        })}
                        {importPreview.length > 10 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-2 text-center" style={{color: 'var(--text-muted)'}}>
                              仅显示前10条，共 {importPreview.length} 条记录
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t" style={{borderColor: 'var(--border)'}}>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false)
                  setImportPreview([])
                  setImportErrors([])
                }}
                className="flex-1 px-4 py-2.5 border rounded-sm  transition-all" style={{borderColor: 'var(--border)', color: 'var(--text)'}}
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={importPreview.length === 0}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认导入 {importPreview.length > 0 ? `(${importPreview.length}条)` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

       {/* 添加家庭成员弹窗 */}
       {showAddMemberModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
           <div className="bg-white rounded-lg max-w-md w-full p-6 animate-slide-up" style={{boxShadow: 'var(--shadow-lg)'}}>
             <h3 className="text-xl font-bold mb-4" style={{color: 'var(--text)'}}>
               添加家庭成员
             </h3>
             <form onSubmit={handleAddMember} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                   成员姓名 *
                 </label>
                 <input
                   type="text"
                   required
                   value={newMemberForm.name}
                   onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                   className="input-glass w-full"
                   placeholder="例如：妻子、儿子、爸爸"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                   选择头像
                 </label>
                 <div className="grid grid-cols-6 gap-2">
                   {AVATAR_LIST.map(avatar => (
                     <button
                       key={avatar}
                       type="button"
                       onClick={() => setNewMemberForm({ ...newMemberForm, avatar })}
                       className={`w-12 h-12 rounded-full text-2xl grid place-items-center transition-all ${
                         newMemberForm.avatar === avatar 
                           ? 'bg-blue-100 border-2 border-blue-500' 
                           : 'bg-gray-50 hover:bg-gray-100'
                       }`}
                     >
                       {avatar}
                     </button>
                   ))}
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
                   角色
                 </label>
                 <select
                   value={newMemberForm.role}
                   onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value as 'member' })}
                   className="input-glass w-full"
                 >
                   <option value="member">普通成员</option>
                 </select>
                 <p className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>管理员角色只能有一个，为默认创建的账户</p>
               </div>

               <div className="flex gap-3 pt-4">
                 <button
                   type="button"
                   onClick={() => {
                     setShowAddMemberModal(false)
                     setNewMemberForm({ name: '', avatar: '👩', role: 'member' })
                   }}
                   className="flex-1 px-4 py-2.5 border rounded-sm  transition-all" style={{borderColor: 'var(--border)', color: 'var(--text)'}}
                 >
                   取消
                 </button>
                 <button
                   type="submit"
                   className="flex-1 btn-primary"
                 >
                   添加成员
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* 风险测评弹窗 */}
       {showRiskAssessment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 animate-slide-up max-h-[90vh] overflow-y-auto" style={{boxShadow: 'var(--shadow-lg)'}}>
            <h3 className="text-xl font-bold mb-4" style={{color: 'var(--text)'}}>
              风险承受能力测评
            </h3>

            <div className="space-y-6 mb-6">
              {RISK_QUESTIONS.map((q, index) => (
                <div key={q.id} className="space-y-3">
                  <h4 className="font-medium" style={{color: 'var(--text)'}}>
                    {index + 1}. {q.question}
                  </h4>
                  <div className="space-y-2">
                    {q.options.map((option, optIndex) => (
                      <label
                        key={optIndex}
                        className={`lex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${ 
                          riskAnswers[q.id] === option.score 
                            ? 'border-blue-500 bg-blue-50' : ' hover:border-blue-200 hover:bg-blue-50/30'}`}
                      >
                        <input
                          type="radio"
                          name={`question_${q.id}`}
                          checked={riskAnswers[q.id] === option.score}
                          onChange={() => setRiskAnswers(prev => ({ ...prev, [q.id]: option.score }))}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span style={{color: 'var(--text)'}}>{option.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t" style={{borderColor: 'var(--border)'}}>
              <button
                type="button"
                onClick={() => setShowRiskAssessment(false)}
                className="flex-1 px-4 py-2.5 border rounded-sm  transition-all" style={{borderColor: 'var(--border)', color: 'var(--text)'}}
              >
                取消
              </button>
              <button
                type="button"
                onClick={calculateRiskLevel}
                disabled={Object.keys(riskAnswers).length < RISK_QUESTIONS.length}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                完成测评
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
