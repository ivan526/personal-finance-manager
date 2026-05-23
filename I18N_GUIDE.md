# 多语言支持使用指南

FinSpace Pro 已支持中英文界面切换，基于轻量级国际化实现。

## 启用多语言功能

### 1. 添加语言切换UI
在设置页面添加语言切换选项：

```tsx
import useI18n from '../hooks/useI18n'

// 在设置页面中添加：
const { locale, changeLocale } = useI18n()

// 在外观设置部分添加：
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
  <h4 className="font-semibold text-lg mb-4 text-[var(--text)]">语言设置</h4>
  <div className="grid grid-cols-2 gap-4">
    <button
      onClick={() => changeLocale('zh-CN')}
      className={`p-4 border rounded-[14px] transition-all flex flex-col items-center gap-3 hover:border-blue-300 hover:bg-blue-50/50 ${
        locale === 'zh-CN' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-[var(--border)]'
      }`}
    >
      <div className="text-xl">🇨🇳</div>
      <div className="font-medium">简体中文</div>
    </button>

    <button
      onClick={() => changeLocale('en-US')}
      className={`p-4 border rounded-[14px] transition-all flex flex-col items-center gap-3 hover:border-blue-300 hover:bg-blue-50/50 ${
        locale === 'en-US' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-[var(--border)]'
      }`}
    >
      <div className="text-xl">🇺🇸</div>
      <div className="font-medium">English</div>
    </button>
  </div>
</div>
```

### 2. 使用翻译文本
在组件中使用 `useI18n` hook 获取翻译：

```tsx
import useI18n from '../hooks/useI18n'

function MyComponent() {
  const { t } = useI18n()
  
  return (
    <div>
      <h1>{t.dashboard.total_assets}</h1>
      <button>{t.common.confirm}</button>
    </div>
  )
}
```

### 3. 翻译文件结构
所有翻译文件位于 `src/locales/` 目录：
- `zh-CN.ts` - 简体中文翻译
- `en-US.ts` - 英文翻译

### 4. 扩展翻译
添加新的翻译词条时，需要在两个翻译文件中同步添加：

1. 在 `zh-CN.ts` 中添加中文翻译
2. 在 `en-US.ts` 中添加对应的英文翻译
3. TypeScript 会自动推导类型，提供完整的类型提示

## 语言特性
- ✅ 自动跟随浏览器默认语言
- ✅ 语言选择持久化存储
- ✅ 完整 TypeScript 类型支持
- ✅ 支持嵌套翻译结构
- ✅ 轻量化实现，无额外依赖

## 扩展更多语言
要添加新的语言支持：
1. 在 `src/locales/` 目录下创建新的语言文件，例如 `ja-JP.ts`
2. 在 `src/hooks/useI18n.ts` 中添加对应的语言类型和翻译配置
3. 在设置页面添加新语言的切换选项
