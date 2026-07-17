// 標題下方的流線分隔線：一條 SVG 路徑（直線 + 右端向下彎角），
// 用同一條「會流動的漸層」描邊 → 流動連續穿過彎角，沒有接縫。
// 淡出（右端）由 .title-divider 的 CSS mask 處理。
export default function TitleDivider() {
  return (
    <div className="title-divider" aria-hidden="true">
      <svg width="100%" height="10" viewBox="0 0 300 10" preserveAspectRatio="none">
        <defs>
          <linearGradient
            id="td-flow"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="140"
            y2="0"
            spreadMethod="repeat"
          >
            <stop offset="0" style={{ stopColor: 'var(--color-grad-to)' }} />
            <stop offset="0.5" style={{ stopColor: 'var(--color-grad-from)' }} />
            <stop offset="1" style={{ stopColor: 'var(--color-grad-to)' }} />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              from="0 0"
              to="140 0"
              dur="3s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>
        {/* 直線到右端，再以扁橢圓弧向下彎（幅度小、平滑收尾） */}
        <path
          d="M1 2 H280 Q299 2 299 6"
          fill="none"
          stroke="url(#td-flow)"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}
