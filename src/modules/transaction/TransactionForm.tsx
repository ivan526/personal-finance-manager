import { useState } from 'react'
import type { Transaction, TransactionType } from '../../types'
import { loadState, saveState } from '../../store'
import { X } from 'lucide-react'

interface TransactionFormProps {
  onClose: () => void
  onSuccess: () => void
  editTransaction?: Transaction
}

const TransactionForm = ({ onClose, onSuccess, editTransaction }: TransactionFormProps) => {
  const state = loadState()
  const [type, setType] = useState<TransactionType>(editTransaction?.type || 'expense')
  const [categoryId, setCategoryId] = useState(editTransaction?.categoryId || '')
  const [amount, setAmount] = useState(editTransaction?.amount?.toString() || '')
  const [date, setDate] = useState(editTransaction?.date || new Date().toISOString().split('T')[0])
  const [remark, setRemark] = useState(editTransaction?.remark || '')

  const categories = state.categories.filter(c => c.type === type)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert('请填写完整有效的信息')
      return
    }

    const newTransaction: Transaction = editTransaction ? {
      ...editTransaction,
      type,
      categoryId,
      amount: Number(amount),
      date,
      remark
    } : {
      id: Date.now().toString(),
      type,
      categoryId,
      amount: Number(amount),
      date,
      remark,
      createdAt: new Date().toISOString()
    }

    const updatedTransactions = editTransaction
      ? state.transactions.map(t => t.id === editTransaction.id ? newTransaction : t)
      : [...state.transactions, newTransaction]

    saveState({ ...state, transactions: updatedTransactions })
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold">{editTransaction ? '编辑记录' : '新增收支记录'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="flex space-x-2">
            <button
              type="button"
              className={`flex-1 py-2 rounded font-medium ${type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
              onClick={() => setType('expense')}
            >
              支出
            </button>
            <button
              type="button"
              className={`flex-1 py-2 rounded font-medium ${type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
              onClick={() => setType('income')}
            >
              收入
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                    className={`p-2 rounded text-center text-sm ${categoryId === cat.id ? 'ring-offset-2' : 'hover:bg-gray-50'}`}
                    style={{ 
                      backgroundColor: cat.color + '20', 
                      color: cat.color, 
                      ...(categoryId === cat.id ? { boxShadow: `0 0 0 2px ${cat.color}` } : {}) 
                    }}
                  onClick={() => setCategoryId(cat.id)}
                >
                  <div className="text-lg">{cat.icon}</div>
                  <div className="text-xs">{cat.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">金额</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入金额"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注（可选）</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="添加备注"
            />
          </div>

          <div className="flex space-x-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded hover:bg-gray-50">
              取消
            </button>
            <button type="submit" className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TransactionForm
