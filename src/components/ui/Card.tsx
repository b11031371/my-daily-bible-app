import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
} as const

export type CardPadding = keyof typeof PADDING

/**
 * 全站卡片的外觀（白底、圓角、淡陰影）只寫在這裡：要調整圓角或陰影時改這一處就好。
 * 卡片本身是 <Link> 或 <button> 時沒辦法用 <Card>，改用這個函式拿 className。
 * className 放最後，同類的樣式（例如 rounded-3xl）會蓋掉預設值。
 */
export function cardClass({ padding = 'md', className }: { padding?: CardPadding; className?: string } = {}) {
  return cn('bg-surface rounded-2xl shadow-sm', PADDING[padding], className)
}

export default function Card({ padding, className, ...props }: HTMLAttributes<HTMLDivElement> & { padding?: CardPadding }) {
  return <div className={cardClass({ padding, className })} {...props} />
}
