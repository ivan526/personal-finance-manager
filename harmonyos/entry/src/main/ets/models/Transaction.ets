import { ObservedV2, Trace } from '@kit.ArkUI'
import type { TransactionType } from './Category'

@ObservedV2
export class Transaction {
  @Trace id: string = ''
  @Trace type: TransactionType = 'expense'
  @Trace categoryId: string = ''
  @Trace amount: number = 0
  @Trace time: number = 0
  @Trace remark: string = ''

  constructor(id: string = '') {
    this.id = id
  }

  static create(id: string, type: TransactionType, categoryId: string, amount: number, time: number, remark: string = ''): Transaction {
    const transaction: Transaction = new Transaction(id)
    transaction.type = type
    transaction.categoryId = categoryId
    transaction.amount = amount
    transaction.time = time
    transaction.remark = remark
    return transaction
  }
}
