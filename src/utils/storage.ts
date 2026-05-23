import type { 
  Transaction, 
  Budget, 
  Account, 
  Liability, 
  InvestmentTransaction, 
  Position, 
  FinancialGoal, 
  AssetHistory,
  Category,
  FamilyMember
} from '../types'
import { DEFAULT_CATEGORIES } from '../constants/categories'

const STORAGE_KEYS = {
  TRANSACTIONS: 'finman_transactions',
  BUDGETS: 'finman_budgets',
  ACCOUNTS: 'finman_accounts',
  LIABILITIES: 'finman_liabilities',
  INVESTMENT_TRANSACTIONS: 'finman_investment_transactions',
  POSITIONS: 'finman_positions',
  FINANCIAL_GOALS: 'finman_financial_goals',
  ASSET_HISTORY: 'finman_asset_history',
  CUSTOM_CATEGORIES: 'finman_custom_categories',
  FAMILY_MEMBERS: 'finman_family_members',
  ACTIVE_MEMBER: 'finman_active_member',
}

export const storage = {
  // 交易记录
  getTransactions(): Transaction[] {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)
    return data ? JSON.parse(data) : []
  },

  saveTransactions(transactions: Transaction[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions))
  },

  addTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions()
    transactions.unshift(transaction)
    this.saveTransactions(transactions)
  },

  updateTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions()
    const index = transactions.findIndex(t => t.id === transaction.id)
    if (index !== -1) {
      transactions[index] = transaction
      this.saveTransactions(transactions)
    }
  },

  deleteTransaction(id: string): void {
    const transactions = this.getTransactions()
    this.saveTransactions(transactions.filter(t => t.id !== id))
  },

  // 预算
  getBudgets(): Budget[] {
    const data = localStorage.getItem(STORAGE_KEYS.BUDGETS)
    return data ? JSON.parse(data) : []
  },

  saveBudgets(budgets: Budget[]): void {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets))
  },

  // 账户
  getAccounts(): Account[] {
    const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS)
    return data ? JSON.parse(data) : []
  },

  saveAccounts(accounts: Account[]): void {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts))
  },

  addAccount(account: Account): void {
    const accounts = this.getAccounts()
    accounts.push(account)
    this.saveAccounts(accounts)
  },

  updateAccount(account: Account): void {
    const accounts = this.getAccounts()
    const index = accounts.findIndex(a => a.id === account.id)
    if (index !== -1) {
      accounts[index] = account
      this.saveAccounts(accounts)
    }
  },

  deleteAccount(id: string): void {
    const accounts = this.getAccounts()
    this.saveAccounts(accounts.filter(a => a.id !== id))
  },

  // 负债
  getLiabilities(): Liability[] {
    const data = localStorage.getItem(STORAGE_KEYS.LIABILITIES)
    return data ? JSON.parse(data) : []
  },

  saveLiabilities(liabilities: Liability[]): void {
    localStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(liabilities))
  },

  addLiability(liability: Liability): void {
    const liabilities = this.getLiabilities()
    liabilities.push(liability)
    this.saveLiabilities(liabilities)
  },

  updateLiability(liability: Liability): void {
    const liabilities = this.getLiabilities()
    const index = liabilities.findIndex(l => l.id === liability.id)
    if (index !== -1) {
      liabilities[index] = liability
      this.saveLiabilities(liabilities)
    }
  },

  deleteLiability(id: string): void {
    const liabilities = this.getLiabilities()
    this.saveLiabilities(liabilities.filter(l => l.id !== id))
  },

  // 投资交易
  getInvestmentTransactions(): InvestmentTransaction[] {
    const data = localStorage.getItem(STORAGE_KEYS.INVESTMENT_TRANSACTIONS)
    return data ? JSON.parse(data) : []
  },

  saveInvestmentTransactions(transactions: InvestmentTransaction[]): void {
    localStorage.setItem(STORAGE_KEYS.INVESTMENT_TRANSACTIONS, JSON.stringify(transactions))
  },

  addInvestmentTransaction(transaction: InvestmentTransaction): void {
    const transactions = this.getInvestmentTransactions()
    transactions.unshift(transaction)
    this.saveInvestmentTransactions(transactions)
  },

  updateInvestmentTransaction(transaction: InvestmentTransaction): void {
    const transactions = this.getInvestmentTransactions()
    const index = transactions.findIndex(t => t.id === transaction.id)
    if (index !== -1) {
      transactions[index] = transaction
      this.saveInvestmentTransactions(transactions)
    }
  },

  deleteInvestmentTransaction(id: string): void {
    const transactions = this.getInvestmentTransactions()
    this.saveInvestmentTransactions(transactions.filter(t => t.id !== id))
  },

  // 持仓信息
  getPositions(): Position[] {
    const data = localStorage.getItem(STORAGE_KEYS.POSITIONS)
    return data ? JSON.parse(data) : []
  },

  savePositions(positions: Position[]): void {
    localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions))
  },

  addPosition(position: Position): void {
    const positions = this.getPositions()
    positions.push(position)
    this.savePositions(positions)
  },

  updatePosition(position: Position): void {
    const positions = this.getPositions()
    const index = positions.findIndex(p => p.id === position.id)
    if (index !== -1) {
      positions[index] = position
      this.savePositions(positions)
    }
  },

  deletePosition(id: string): void {
    const positions = this.getPositions()
    this.savePositions(positions.filter(p => p.id !== id))
  },

  // 理财目标
  getFinancialGoals(): FinancialGoal[] {
    const data = localStorage.getItem(STORAGE_KEYS.FINANCIAL_GOALS)
    return data ? JSON.parse(data) : []
  },

  saveFinancialGoals(goals: FinancialGoal[]): void {
    localStorage.setItem(STORAGE_KEYS.FINANCIAL_GOALS, JSON.stringify(goals))
  },

  addFinancialGoal(goal: FinancialGoal): void {
    const goals = this.getFinancialGoals()
    goals.push(goal)
    this.saveFinancialGoals(goals)
  },

  updateFinancialGoal(goal: FinancialGoal): void {
    const goals = this.getFinancialGoals()
    const index = goals.findIndex(g => g.id === goal.id)
    if (index !== -1) {
      goals[index] = goal
      this.saveFinancialGoals(goals)
    }
  },

  deleteFinancialGoal(id: string): void {
    const goals = this.getFinancialGoals()
    this.saveFinancialGoals(goals.filter(g => g.id !== id))
  },

  // 资产历史记录
  getAssetHistory(): AssetHistory[] {
    const data = localStorage.getItem(STORAGE_KEYS.ASSET_HISTORY)
    return data ? JSON.parse(data) : []
  },

  saveAssetHistory(history: AssetHistory[]): void {
    localStorage.setItem(STORAGE_KEYS.ASSET_HISTORY, JSON.stringify(history))
  },

  addAssetHistory(record: AssetHistory): void {
    const history = this.getAssetHistory()
    history.push(record)
    this.saveAssetHistory(history)
  },

  // 导出数据
  exportData(): string {
    return JSON.stringify({
      transactions: this.getTransactions(),
      budgets: this.getBudgets(),
      accounts: this.getAccounts(),
      liabilities: this.getLiabilities(),
      investmentTransactions: this.getInvestmentTransactions(),
      positions: this.getPositions(),
      financialGoals: this.getFinancialGoals(),
      assetHistory: this.getAssetHistory(),
      exportTime: Date.now(),
      version: '2.0'
    }, null, 2)
  },

  // 导入数据
  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString)
      if (data.transactions) this.saveTransactions(data.transactions)
      if (data.budgets) this.saveBudgets(data.budgets)
      if (data.accounts) this.saveAccounts(data.accounts)
      if (data.liabilities) this.saveLiabilities(data.liabilities)
      if (data.investmentTransactions) this.saveInvestmentTransactions(data.investmentTransactions)
      if (data.positions) this.savePositions(data.positions)
      if (data.financialGoals) this.saveFinancialGoals(data.financialGoals)
      if (data.assetHistory) this.saveAssetHistory(data.assetHistory)
      return true
    } catch (e) {
      console.error('Import failed:', e)
      return false
    }
  },

  // 分类管理
  getCategories(): Category[] {
    const customCategories: Category[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES) || '[]')
    return [...DEFAULT_CATEGORIES, ...customCategories]
  },

  getCustomCategories(): Category[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES) || '[]')
  },

  saveCustomCategories(categories: Category[]): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(categories))
  },

  addCustomCategory(category: Category): void {
    const categories = this.getCustomCategories()
    categories.push({
      ...category,
      isCustom: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    this.saveCustomCategories(categories)
  },

  updateCustomCategory(category: Category): void {
    const categories = this.getCustomCategories()
    const index = categories.findIndex(c => c.id === category.id)
    if (index !== -1) {
      categories[index] = {
        ...category,
        updatedAt: Date.now()
      }
      this.saveCustomCategories(categories)
    }
  },

  deleteCustomCategory(id: string): void {
    const categories = this.getCustomCategories()
    this.saveCustomCategories(categories.filter(c => c.id !== id))
  },

  // 家庭成员管理
  getFamilyMembers(): FamilyMember[] {
    const data = localStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS)
    const members = data ? JSON.parse(data) : []
    // 默认创建一个所有者成员
    if (members.length === 0) {
      const defaultMember: FamilyMember = {
        id: 'default',
        name: '我',
        avatar: '👨',
        role: 'owner',
        createdAt: Date.now()
      }
      this.saveFamilyMembers([defaultMember])
      return [defaultMember]
    }
    return members
  },

  saveFamilyMembers(members: FamilyMember[]): void {
    localStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(members))
  },

  addFamilyMember(member: Omit<FamilyMember, 'id' | 'createdAt'>): void {
    const members = this.getFamilyMembers()
    const newMember: FamilyMember = {
      ...member,
      id: `member_${Date.now()}`,
      createdAt: Date.now()
    }
    members.push(newMember)
    this.saveFamilyMembers(members)
  },

  updateFamilyMember(member: FamilyMember): void {
    const members = this.getFamilyMembers()
    const index = members.findIndex(m => m.id === member.id)
    if (index !== -1) {
      members[index] = member
      this.saveFamilyMembers(members)
    }
  },

  deleteFamilyMember(id: string): void {
    const members = this.getFamilyMembers()
    // 不能删除最后一个成员
    if (members.length <= 1) return
    this.saveFamilyMembers(members.filter(m => m.id !== id && m.role !== 'owner'))
  },

  getActiveMember(): string {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_MEMBER) || 'default'
  },

  setActiveMember(memberId: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_MEMBER, memberId)
  },

  // 清空所有数据
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS)
    localStorage.removeItem(STORAGE_KEYS.BUDGETS)
    localStorage.removeItem(STORAGE_KEYS.ACCOUNTS)
    localStorage.removeItem(STORAGE_KEYS.LIABILITIES)
    localStorage.removeItem(STORAGE_KEYS.INVESTMENT_TRANSACTIONS)
    localStorage.removeItem(STORAGE_KEYS.POSITIONS)
    localStorage.removeItem(STORAGE_KEYS.FINANCIAL_GOALS)
    localStorage.removeItem(STORAGE_KEYS.ASSET_HISTORY)
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_CATEGORIES)
    localStorage.removeItem(STORAGE_KEYS.FAMILY_MEMBERS)
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_MEMBER)
  }
}
