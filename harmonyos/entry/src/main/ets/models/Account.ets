import { ObservedV2, Trace } from '@kit.ArkUI'

export type AccountType = 'cash' | 'bank' | 'alipay' | 'wechat' | 'investment' | 'other'

@ObservedV2
export class Account {
  @Trace id: string = ''
  @Trace name: string = ''
  @Trace type: AccountType = 'other'
  @Trace balance: number = 0
  @Trace icon: string = ''
  @Trace color: string = ''

  constructor(id: string = '') {
    this.id = id
  }

  static create(id: string, name: string, type: AccountType, balance: number, icon: string, color: string): Account {
    const account: Account = new Account(id)
    account.name = name
    account.type = type
    account.balance = balance
    account.icon = icon
    account.color = color
    return account
  }
}
