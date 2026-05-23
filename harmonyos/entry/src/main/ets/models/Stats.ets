import { ObservedV2, Trace } from '@kit.ArkUI'

@ObservedV2
export class MonthData {
  @Trace month: string = ''
  @Trace income: number = 0
  @Trace expense: number = 0

  constructor(month: string = '') {
    this.month = month
  }
}

@ObservedV2
export class CategoryStats {
  @Trace categoryId: string = ''
  @Trace amount: number = 0
  @Trace count: number = 0

  constructor(categoryId: string = '') {
    this.categoryId = categoryId
  }
}
