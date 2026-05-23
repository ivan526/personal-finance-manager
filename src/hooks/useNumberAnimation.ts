import { useState, useEffect, useRef } from 'react'

/**
 * 数字滚动动画hook
 * @param targetValue 目标数值
 * @param duration 动画时长(ms)，默认1500ms
 * @param formatter 格式化函数，默认返回数值toString()
 */
export function useNumberAnimation(
  targetValue: number, 
  duration: number = 1500,
  formatter?: (value: number) => string
): string {
  const [displayValue, setDisplayValue] = useState('0')
  const previousValue = useRef(0)
  const startTime = useRef<number | null>(null)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    if (targetValue === previousValue.current) {
      return
    }

    const startValue = previousValue.current
    const endValue = targetValue
    const difference = endValue - startValue

    const animate = (timestamp: number) => {
      if (!startTime.current) {
        startTime.current = timestamp
      }

      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      // 使用缓动函数：easeOutCubic
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + difference * easedProgress

      if (formatter) {
        setDisplayValue(formatter(currentValue))
      } else {
        setDisplayValue(Math.round(currentValue).toString())
      }

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      } else {
        previousValue.current = endValue
        startTime.current = null
      }
    }

    rafId.current = requestAnimationFrame(animate)

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [targetValue, duration, formatter])

  return displayValue
}

/**
 * 金额格式化函数，自动添加千分位分隔符
 */
export function formatCurrency(value: number): string {
  return Math.round(value).toLocaleString('zh-CN')
}

/**
 * 百分比格式化函数，保留1位小数
 */
export function formatPercent(value: number): string {
  return value.toFixed(1)
}
