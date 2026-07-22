// 四個選項除了顏色還各有一個形狀，色盲的人也分得出來，
// 主持人喊「三角形那個」時大家也對得上。
const PATHS: Record<string, string> = {
  triangle: 'M12 3 L22 20 L2 20 Z',
  diamond: 'M12 2 L22 12 L12 22 L2 12 Z',
  circle: 'M12 2 A10 10 0 1 0 12 22 A10 10 0 1 0 12 2 Z',
  square: 'M3 3 H21 V21 H3 Z',
}

export default function AnswerShape({ shape, className }: { shape: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d={PATHS[shape] ?? PATHS.circle} fill="currentColor" />
    </svg>
  )
}
