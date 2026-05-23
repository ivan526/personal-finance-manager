import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // 从本地存储获取，默认跟随系统
    const saved = localStorage.getItem('theme') as Theme
    return saved || 'system'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }

    // 保存到本地存储
    localStorage.setItem('theme', theme)
  }, [theme])

  // 切换主题
  const toggleTheme = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  // 获取当前实际生效的主题（考虑系统跟随）
  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }

  return {
    theme,
    toggleTheme,
    isDark: getEffectiveTheme() === 'dark'
  }
}