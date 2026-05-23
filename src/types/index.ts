export type TransactionType = 'income' | 'expense'

// 资产账户类型
export type AccountType = 
  | 'cash'        // 现金
  | 'bank'        // 银行卡
  | 'alipay'      // 支付宝
  | 'wechat'      // 微信钱包
  | 'stock'       // 股票
  | 'fund'        // 基金
  | 'bond'        // 债券
  | 'real_estate' // 房产
  | 'gold'        // 贵金属
  | 'cryptocurrency' // 加密货币
  | 'other'       // 其他

// 负债类型
export type LiabilityType =
  | 'credit_card' // 信用卡
  | 'mortgage'    // 房贷
  | 'car_loan'    // 车贷
  | 'personal_loan' // 个人贷款
  | 'other_loan'  // 其他贷款

// 投资交易类型
export type InvestmentTransactionType =
  | 'buy'         // 买入
  | 'sell'        // 卖出
  | 'dividend'    // 分红
  | 'interest'    // 利息
  | 'transfer_in' // 转入
  | 'transfer_out' // 转出
  | 'invest'      // 定投

export interface Category {
  id: string
  name: string
  type: TransactionType
  icon: string
  color: string
  isCustom?: boolean // 是否为用户自定义分类
  createdAt?: number
  updatedAt?: number
}

export interface Transaction {
  id: string
  type: TransactionType
  categoryId: string
  amount: number
  time: number
  remark?: string
  accountId?: string // 关联账户ID
  memberId?: string // 关联家庭成员ID
}

export interface Budget {
  id: string
  categoryId?: string
  amount: number
  month: string // YYYY-MM
  carryOverFrom?: string // 从哪个月结转过来的
  carryOverAmount?: number // 结转金额
  createdAt?: number
  updatedAt?: number
}

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  icon: string
  color: string
  currency?: string // 币种，默认CNY
  isInvestment?: boolean // 是否为投资类账户
  memberId?: string // 关联家庭成员ID
  createdAt: number
  updatedAt: number
}

// 负债
export interface Liability {
  id: string
  name: string
  type: LiabilityType
  amount: number // 负债总额
  balance: number // 剩余待还金额
  interestRate: number // 年利率
  startDate: number // 借款日期
  dueDate?: number // 到期日期
  description?: string
  memberId?: string // 关联家庭成员ID
  createdAt: number
  updatedAt: number
}

// 投资交易记录
export interface InvestmentTransaction {
  id: string
  accountId: string // 关联投资账户
  type: InvestmentTransactionType
  symbol?: string // 标的代码/符号
  name: string // 标的名称
  quantity: number // 数量
  price: number // 单价
  amount: number // 总金额
  fee: number // 手续费/佣金
  time: number // 交易时间
  remark?: string
  memberId?: string // 关联家庭成员ID
  // 定投相关字段
  isScheduled?: boolean // 是否为定投计划生成的记录
  scheduledId?: string // 所属定投计划ID
  scheduledIndex?: number // 定投期数序号
}

// 持仓信息
export interface Position {
  id: string
  accountId: string
  symbol?: string
  name: string
  quantity: number // 持有数量
  averageCost: number // 平均成本
  currentPrice: number // 当前价格
  currentValue: number // 总市值
  totalValue?: number // 兼容字段
  profit: number // 持仓收益
  profitRate: number // 持仓收益率
  firstBuyDate: number // 首次买入时间
  updatedAt: number
  // 基金专属信息
  fundInfo?: {
    fundCode?: string; // 基金代码
    fundName?: string; // 基金名称
    fundType?: string; // 基金类型
    fundCompany?: string; // 基金公司
    lastNav: number; // 最新净值
    lastNavDate: string; // 最新净值日期
    dayGrowth?: number; // 日涨跌幅
  }
}

// 理财目标
export interface FinancialGoal {
  id: string
  name: string
  targetAmount: number // 目标金额
  currentAmount: number // 当前金额
  targetDate: number // 目标完成日期
  description?: string
  icon: string
  color: string
  isCompleted: boolean
  createdAt: number
  updatedAt: number
}

// 资产历史记录（用于生成净值曲线）
export interface AssetHistory {
  id: string
  date: string // YYYY-MM-DD
  totalAssets: number // 总资产
  totalLiabilities: number // 总负债
  netWorth: number // 净资产
  createdAt: number
}

export interface MonthData {
  month: string
  income: number
  expense: number
}

export interface CategoryStats {
  categoryId: string
  amount: number
  count: number
}

// 资产配置统计
export interface AssetAllocation {
  type: AccountType
  name: string
  amount: number
  percentage: number
  color: string
}

// 风险测评结果
export interface RiskAssessmentResult {
  riskLevel: number // 1-5级
  riskProfile: '保守型' | '稳健型' | '平衡型' | '成长型' | '进取型'
  score: number
  completedAt: number
  answers: Record<string, number> // 存储用户的答案
}

// 家庭成员
export interface FamilyMember {
  id: string
  name: string
  avatar: string // emoji头像
  role: 'owner' | 'member' // 角色：所有者/成员
  createdAt: number
}
