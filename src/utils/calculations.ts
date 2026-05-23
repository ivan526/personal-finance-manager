import { storage } from './storage'
import { DEFAULT_EXCHANGE_RATES } from '../constants/currencies'
import type { InvestmentTransaction } from '../types'

/**
 * 计算投资持仓总市值（成本价计算）
 */
export const calculateInvestmentValue = (transactions?: InvestmentTransaction[]): number => {
  const investmentTransactions = transactions || storage.getInvestmentTransactions()
  const positionMap: Record<string, { quantity: number; cost: number }> = {}
  
  investmentTransactions.forEach(t => {
    const key = t.symbol || t.name
    if (!positionMap[key]) {
      positionMap[key] = { quantity: 0, cost: 0 }
    }
    if (t.type === 'buy' || t.type === 'transfer_in') {
      positionMap[key].quantity += t.quantity
      positionMap[key].cost += t.amount + t.fee
    } else if (t.type === 'sell' || t.type === 'transfer_out') {
      positionMap[key].quantity -= t.quantity
    }
  })

  // 持仓市值：用平均成本估算（实时净值需要接口查询，这里用成本价）
  return Object.values(positionMap).reduce((sum, pos) => {
    if (pos.quantity > 0 && pos.cost > 0) {
      return sum + pos.cost
    }
    return sum
  }, 0)
}

/**
 * 计算总资产（账户现金余额 + 投资持仓市值）
 */
export const getTotalAssets = (): number => {
  const accounts = storage.getAccounts()
  const investmentValue = calculateInvestmentValue()
  
  const cashTotal = accounts.reduce((sum, account) => {
    const rate = DEFAULT_EXCHANGE_RATES[account.currency || 'CNY'] || 1
    return sum + account.balance * rate
  }, 0)

  return cashTotal + investmentValue
}

/**
 * 计算总负债
 */
export const getTotalLiabilities = (): number => {
  const liabilities = storage.getLiabilities()
  return liabilities.reduce((sum, liability) => sum + liability.balance, 0)
}

/**
 * 计算净资产（总资产 - 总负债）
 */
export const getNetWorth = (): number => {
  return getTotalAssets() - getTotalLiabilities()
}