import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const SIZE = {
  lg: 'rounded-xl py-3.5 font-semibold',
  md: 'rounded-xl py-3 text-sm font-medium',
  sm: 'rounded-xl px-4 py-2 text-sm font-medium',
} as const

export type ButtonSize = keyof typeof SIZE

/**
 * 主要動作按鈕（主題漸層底）。尺寸：lg 表單送出、md 卡片裡的次要送出、sm 跟輸入框並排的小按鈕。
 * 寬度不內建，要滿版的自己加 w-full。
 * 外觀是 <Link> 的時候改用這個函式拿 className。
 */
export function buttonClass({ size = 'lg', className }: { size?: ButtonSize; className?: string } = {}) {
  return cn('btn-gradient text-gray-900 hover:brightness-95 transition-[filter] disabled:opacity-50', SIZE[size], className)
}

export default function Button({ size, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { size?: ButtonSize }) {
  return <button className={buttonClass({ size, className })} {...props} />
}
