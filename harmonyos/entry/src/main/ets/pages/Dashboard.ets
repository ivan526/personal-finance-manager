import { ComponentV2, Local, Entry } from '@kit.ArkUI'
import { storage } from '../utils/storage'
import { MonthData } from '../models/Stats'
import { router } from '@kit.ArkUI'

@Entry
@ComponentV2
struct Dashboard {
  @Local totalIncome: number = 0
  @Local totalExpense: number = 0
  @Local totalBalance: number = 0
  @Local monthData: MonthData[] = []

  aboutToAppear(): void {
    this.calculateStats()
  }

  calculateStats(): void {
    const transactions = storage.getTransactions()
    const now = new Date()

    let income: number = 0
    let expense: number = 0

    // 月度数据
    const months: Record<string, { income: number; expense: number }> = {}
    for (let i: number = 5; i >= 0; i--) {
      const d: Date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key: string = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months[key] = { income: 0, expense: 0 }
    }

    transactions.forEach((t): void => {
      const date: Date = new Date(t.time)
      const monthKey: string = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (t.type === 'income') {
        income += t.amount
        if (months[monthKey]) {
          months[monthKey].income += t.amount
        }
      } else {
        expense += t.amount
        if (months[monthKey]) {
          months[monthKey].expense += t.amount
        }
      }
    })

    this.totalIncome = income
    this.totalExpense = expense
    this.totalBalance = income - expense

    const data: MonthData[] = []
    Object.entries(months).forEach((entry): void => {
      const month: string = entry[0]
      const values: { income: number; expense: number } = entry[1] as { income: number; expense: number }
      const monthData: MonthData = new MonthData(month)
      monthData.income = values.income
      monthData.expense = values.expense
      data.push(monthData)
    })
    this.monthData = data
  }

  build() {
    Column({ space: 24 }) {
      // 统计卡片
      Grid() {
        GridItem() {
          this.StatCard(
            '总资产',
            `¥${this.totalBalance.toLocaleString()}`,
            '总收入 - 总支出',
            '#3b82f6',
            '💰'
          )
        }
        GridItem() {
          this.StatCard(
            '累计收入',
            `¥${this.totalIncome.toLocaleString()}`,
            '所有记录的收入总和',
            '#10b981',
            '📈'
          )
        }
        GridItem() {
          this.StatCard(
            '总支出',
            `¥${this.totalExpense.toLocaleString()}`,
            '所有记录的支出总和',
            '#8b5cf6',
            '📉'
          )
        }
        GridItem() {
          const savingRate: number = this.totalIncome > 0 ? (this.totalBalance / this.totalIncome) * 100 : 0
          this.StatCard(
            '结余率',
            `${savingRate.toFixed(1)}%`,
            '建议结余率 ≥ 30%',
            savingRate >= 30 ? '#10b981' : '#f59e0b',
            '📊'
          )
        }
      }
      .columnsTemplate('1fr 1fr 1fr 1fr')
      .columnsGap(16)
      .rowsGap(16)
      .width('100%')

      // 快速操作
      Column() {
        Text('快速操作')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .margin({ bottom: 16 })

        Grid() {
          GridItem() {
            this.QuickActionButton(
              '➕ 记一笔',
              '快速记录收支',
              '#3b82f6',
              (): void => {
                // 打开新增记录弹窗
              }
            )
          }
          GridItem() {
            this.QuickActionButton(
              '📊 查看报告',
              '月度消费分析',
              '#10b981',
              (): void => {
                router.pushUrl({ url: 'pages/Analysis' })
              }
            )
          }
          GridItem() {
            this.QuickActionButton(
              '💰 账户管理',
              '添加资产账户',
              '#8b5cf6',
              (): void => {
                router.pushUrl({ url: 'pages/Assets' })
              }
            )
          }
          GridItem() {
            this.QuickActionButton(
              '⚙️ 设置预算',
              '管控月度支出',
              '#f59e0b',
              (): void => {
                router.pushUrl({ url: 'pages/Budget' })
              }
            )
          }
        }
        .columnsTemplate('1fr 1fr')
        .columnsGap(16)
        .rowsGap(16)
        .width('100%')
      }
      .width('100%')
      .padding(20)
      .backgroundColor('#ffffff')
      .borderRadius(24)
      .shadow({ radius: 10, color: '#00000010', offsetX: 0, offsetY: 2 })
    }
    .width('100%')
    .height('100%')
    .padding(20)
    .backgroundColor('#f8fafc')
  }

  @Builder
  StatCard(title: string, value: string, desc: string, color: string, icon: string) {
    Column() {
      Row() {
        Text(icon)
          .fontSize(24)
        Blank()
        Text(title)
          .fontSize(12)
          .fontColor(color)
          .backgroundColor(`${color}10`)
          .padding({ left: 8, right: 8, top: 4, bottom: 4 })
          .borderRadius(12)
      }
      .width('100%')
      .margin({ bottom: 12 })

      Text(value)
        .fontSize(28)
        .fontWeight(FontWeight.Bold)
        .fontColor(color)
        .margin({ bottom: 4 })

      Text(desc)
        .fontSize(12)
        .fontColor('#64748b')
    }
    .width('100%')
    .padding(20)
    .backgroundColor('#ffffff')
    .borderRadius(20)
    .shadow({ radius: 8, color: '#00000008', offsetX: 0, offsetY: 2 })
  }

  @Builder
  QuickActionButton(title: string, desc: string, color: string, onClick: () => void) {
    Column() {
      Text(title)
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor(color)
        .margin({ bottom: 4 })

      Text(desc)
        .fontSize(12)
        .fontColor(`${color}aa`)
    }
    .width('100%')
    .padding(20)
    .backgroundColor(`${color}10`)
    .border({ width: 1, color: `${color}30` })
    .borderRadius(16)
    .onClick(onClick)
  }
}
