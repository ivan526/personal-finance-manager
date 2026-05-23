import { preferences } from '@kit.ArkData'
import type { Transaction } from '../models/Transaction'
import type { Budget } from '../models/Budget'
import type { Account } from '../models/Account'
import { util } from '@kit.ArkTS'

const STORAGE_KEYS = {
  TRANSACTIONS: 'finman_transactions',
  BUDGETS: 'finman_budgets',
  ACCOUNTS: 'finman_accounts',
}

class StorageManager {
  private context?: Context
  private prefs?: preferences.Preferences

  init(context: Context): void {
    this.context = context
    this.prefs = preferences.getPreferencesSync(context, { name: 'finman_storage' })
  }

  private ensureInitialized(): void {
    if (!this.prefs) {
      throw new Error('StorageManager not initialized. Call init() first.')
    }
  }

  // 交易记录
  getTransactions(): Transaction[] {
    this.ensureInitialized()
    const data: string = this.prefs!.getSync(STORAGE_KEYS.TRANSACTIONS, '[]') as string
    return JSON.parse(data) as Transaction[]
  }

  saveTransactions(transactions: Transaction[]): void {
    this.ensureInitialized()
    this.prefs!.putSync(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions))
    this.prefs!.flushSync()
  }

  addTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions()
    transactions.unshift(transaction)
    this.saveTransactions(transactions)
  }

  updateTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions()
    const index = transactions.findIndex((t: Transaction): boolean => t.id === transaction.id)
    if (index !== -1) {
      transactions[index] = transaction
      this.saveTransactions(transactions)
    }
  }

  deleteTransaction(id: string): void {
    const transactions = this.getTransactions()
    this.saveTransactions(transactions.filter((t: Transaction): boolean => t.id !== id))
  }

  // 预算
  getBudgets(): Budget[] {
    this.ensureInitialized()
    const data: string = this.prefs!.getSync(STORAGE_KEYS.BUDGETS, '[]') as string
    return JSON.parse(data) as Budget[]
  }

  saveBudgets(budgets: Budget[]): void {
    this.ensureInitialized()
    this.prefs!.putSync(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets))
    this.prefs!.flushSync()
  }

  // 账户
  getAccounts(): Account[] {
    this.ensureInitialized()
    const data: string = this.prefs!.getSync(STORAGE_KEYS.ACCOUNTS, '[]') as string
    return JSON.parse(data) as Account[]
  }

  saveAccounts(accounts: Account[]): void {
    this.ensureInitialized()
    this.prefs!.putSync(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts))
    this.prefs!.flushSync()
  }

  // 导出数据
  exportData(): string {
    const data: Record<string, Object> = {
      transactions: this.getTransactions(),
      budgets: this.getBudgets(),
      accounts: this.getAccounts(),
      exportTime: Date.now(),
      version: '1.0'
    }
    return JSON.stringify(data, null, 2)
  }

  // 导入数据
  importData(jsonString: string): boolean {
    try {
      const data: Record<string, Object> = JSON.parse(jsonString) as Record<string, Object>
      if (data['transactions']) {
        this.saveTransactions(data['transactions'] as Transaction[])
      }
      if (data['budgets']) {
        this.saveBudgets(data['budgets'] as Budget[])
      }
      if (data['accounts']) {
        this.saveAccounts(data['accounts'] as Account[])
      }
      return true
    } catch (e) {
      console.error('Import failed:', e)
      return false
    }
  }

  // 清空所有数据
  clearAll(): void {
    this.ensureInitialized()
    this.prefs!.deleteSync(STORAGE_KEYS.TRANSACTIONS)
    this.prefs!.deleteSync(STORAGE_KEYS.BUDGETS)
    this.prefs!.deleteSync(STORAGE_KEYS.ACCOUNTS)
    this.prefs!.flushSync()
  }
}

export const storage = new StorageManager()
