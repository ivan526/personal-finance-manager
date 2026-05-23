import { ObservedV2, Trace } from '@kit.ArkUI'

@ObservedV2
export class Budget {
  @Trace id: string = ''
  @Trace categoryId?: string
  @Trace amount: number = 0
  @Trace month: string = '' // YYYY-MM

  constructor(id: string = '') {
    this.id = id
  }

  static create(id: string, amount: number, month: string, categoryId?: string): Budget {
    const budget: Budget = new Budget(id)
    budget.amount = amount
    budget.month = month
    budget.categoryId = categoryId
    return budget
  }
}
