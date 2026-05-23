import { ObservedV2, Trace } from '@kit.ArkUI'

export type TransactionType = 'income' | 'expense'

@ObservedV2
export class Category {
  @Trace id: string = ''
  @Trace name: string = ''
  @Trace type: TransactionType = 'expense'
  @Trace icon: string = ''
  @Trace color: string = ''

  constructor(id: string = '') {
    this.id = id
  }

  static create(id: string, name: string, type: TransactionType, icon: string, color: string): Category {
    const category: Category = new Category(id)
    category.name = name
    category.type = type
    category.icon = icon
    category.color = color
    return category
  }
}
