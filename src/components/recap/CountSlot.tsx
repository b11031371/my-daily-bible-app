import type { ReactNode } from 'react'

/**
 * t() 只做字串插值，塞不進 React 元素。先用一個不會出現在文案裡的哨兵字元佔位，
 * 再從那裡切開把節點放回去——中英文語序不同（「讀完了 N 章經文」vs「You read N
 * chapters」）也各自落在對的位置。
 *
 * 用法：withSlot(t('recap.xxx', { count: COUNT_SLOT }), <BigNumber />)
 */
export const COUNT_SLOT = '\u0000'

export function withSlot(text: string, node: ReactNode): ReactNode {
  const [before, after] = text.split(COUNT_SLOT)
  return <>{before}{node}{after ?? ''}</>
}
