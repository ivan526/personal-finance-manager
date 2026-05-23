import { useState } from 'react'
import zhCN from '../locales/zh-CN'
import enUS from '../locales/en-US'

type Locale = 'zh-CN' | 'en-US'
type Translation = typeof zhCN

const translations: Record<Locale, Translation> = {
  'zh-CN': zhCN,
  'en-US': enUS
}

// 获取浏览器默认语言
const getBrowserLocale = (): Locale => {
  const lang = navigator.language
  return lang.startsWith('zh') ? 'zh-CN' : 'en-US'
}

// 保存语言设置到localStorage
const STORAGE_KEY = 'finman_locale'

export const useI18n = () => {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    return saved || getBrowserLocale()
  })

  const t = translations[locale]

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
    // 可以在这里添加语言切换后的页面刷新逻辑
  }

  return {
    locale,
    t,
    changeLocale
  }
}

export default useI18n
