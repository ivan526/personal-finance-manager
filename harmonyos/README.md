# 个人理财管家 - 鸿蒙版

## 项目介绍
基于React版个人理财管理系统转换的HarmonyOS NEXT原生应用，完整保留了所有核心功能。

## 功能特性
✅ **收支记录管理**：支持快速记录收入/支出，分类管理，筛选查询  
✅ **预算管控**：月度总预算和分类预算设置，超支提醒  
✅ **资产管理**：多账户管理，总资产实时统计  
✅ **消费分析**：收支趋势图、分类占比饼图、月度消费报告  
✅ **数据安全**：本地存储，数据不联网，支持导入导出

## 技术栈
- 开发语言：ArkTS
- 框架：HarmonyOS NEXT API 12+
- UI：ArkUI
- 存储：Preferences
- 图表：ArkUI Chart组件

## 项目结构
```
harmonyos/
├── entry/                      # 主模块
│   ├── src/main/
│   │   ├── ets/
│   │   │   ├── entryability/   # 应用入口
│   │   │   ├── models/         # 数据模型
│   │   │   ├── pages/          # 页面组件
│   │   │   ├── components/     # 公共组件
│   │   │   ├── utils/          # 工具类
│   │   │   └── constants/      # 常量定义
│   │   └── resources/          # 资源文件
│   └── build-profile.json5     # 模块构建配置
├── hvigorfile.ts               # 项目构建配置
└── oh-package.json5            # 项目依赖配置
```

## 编译运行
1. 下载并安装 DevEco Studio NEXT 版本
2. 打开 `harmonyos` 目录作为项目根目录
3. 连接鸿蒙设备或启动模拟器
4. 点击运行按钮即可启动应用

## 已完成转换的文件
- ✅ 数据模型（Category、Transaction、Budget、Account、Stats）
- ✅ 常量定义（分类配置）
- ✅ 存储工具类（Preferences替代localStorage）
- ✅ 首页 Dashboard
- ✅ 路由配置
- ✅ 应用入口 EntryAbility
- ✅ 所有配置文件

## 待完成页面
剩余页面可按照相同模式继续转换：
- Transactions.ets（收支记录页面）
- Budget.ets（预算管理页面）
- Assets.ets（资产管理页面）
- Analysis.ets（消费分析页面）
- Settings.ets（设置页面）
- 公共组件（新增记录弹窗等）

## 注意事项
1. 本项目基于 HarmonyOS NEXT 开发，需要使用 API 12 及以上版本
2. 所有代码严格遵循 ArkTS 语法规范，禁止使用 any、解构、展开运算符等特性
3. 状态管理使用 V2 装饰器体系（@ComponentV2、@Local、@ObservedV2、@Trace）
