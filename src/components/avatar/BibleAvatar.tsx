import { cn } from '@/lib/utils'

const C = '#4A3728'

type AvatarConfig = { bg: string; el: React.ReactNode }

const AVATARS: Record<string, AvatarConfig> = {
  alpha: {
    bg: '#FFE4E8',
    el: <path d="M16 23 C16 23 7 17.5 7 11.5 C7 8 9.5 5.5 13 5.5 C14.5 5.5 15.5 6.5 16 7.5 C16.5 6.5 17.5 5.5 19 5.5 C22.5 5.5 25 8 25 11.5 C25 17.5 16 23 16 23Z" fill={C}/>,
  },
  beta: {
    bg: '#FFF4B0',
    el: <polygon points="16,6 18.5,13.5 26,13.5 20,18 22,25.5 16,21 10,25.5 12,18 6,13.5 13.5,13.5" fill={C}/>,
  },
  gamma: {
    bg: '#D8F0E4',
    el: (
      <>
        <ellipse cx="14" cy="16" rx="7" ry="5.5" fill={C}/>
        <polygon points="21,16 27.5,11 27.5,21" fill={C}/>
        <circle cx="10.5" cy="14" r="1.5" fill="white"/>
      </>
    ),
  },
  delta: {
    bg: '#D4EDCC',
    el: (
      <>
        <path d="M16 6 C24 7 27 14 16 26 C5 14 8 7 16 6Z" fill={C}/>
        <line x1="16" y1="9" x2="16" y2="24" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      </>
    ),
  },
  epsilon: {
    bg: '#FFE4D0',
    el: <path d="M16 7 C16 7 23 15 23 20 C23 23.9 19.9 27 16 27 C12.1 27 9 23.9 9 20 C9 15 16 7 16 7Z" fill={C}/>,
  },
  zeta: {
    bg: '#FFF0B0',
    el: (
      <>
        <circle cx="16" cy="16" r="5.5" fill={C}/>
        <line x1="16" y1="5.5" x2="16" y2="8.5" stroke={C} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="23.5" y1="8.5" x2="21.4" y2="10.6" stroke={C} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="26.5" y1="16" x2="23.5" y2="16" stroke={C} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="23.5" y1="23.5" x2="21.4" y2="21.4" stroke={C} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="16" y1="26.5" x2="16" y2="23.5" stroke={C} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="8.5" y1="23.5" x2="10.6" y2="21.4" stroke={C} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="5.5" y1="16" x2="8.5" y2="16" stroke={C} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="8.5" y1="8.5" x2="10.6" y2="10.6" stroke={C} strokeWidth="2.5" strokeLinecap="round"/>
      </>
    ),
  },
  eta: {
    bg: '#C8E8FF',
    el: <path d="M16 6 C16 6 9 15 9 20 C9 23.9 12.1 27 16 27 C19.9 27 23 23.9 23 20 C23 15 16 6 16 6Z" fill={C}/>,
  },
  theta: {
    bg: '#EEE8FF',
    el: (
      <g fill={C}>
        <ellipse cx="15.5" cy="19" rx="6.5" ry="4.5"/>
        <circle cx="22" cy="14" r="4"/>
        <path d="M9 16 C10 12 14 13 16 16Z"/>
      </g>
    ),
  },
  iota: {
    bg: '#F0E4FF',
    el: (
      <>
        <rect x="14" y="7" width="4" height="18" rx="2" fill={C}/>
        <rect x="8" y="12" width="16" height="4" rx="2" fill={C}/>
      </>
    ),
  },
  kappa: {
    bg: '#C4DCFF',
    el: (
      <g stroke={C} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M5 13 C8 10 10 10 13 13 C16 16 18 16 21 13 C24 10 26 10 27 13"/>
        <path d="M5 20 C8 17 10 17 13 20 C16 23 18 23 21 20 C24 17 26 17 27 20"/>
      </g>
    ),
  },
  lambda: {
    bg: '#E4E0F8',
    el: <path d="M21 7 C15 7 10 11.5 10 18 C10 24 15 28 21 28 C18 26.5 15.5 22.5 15.5 18 C15.5 13 18 9 21 7Z" fill={C}/>,
  },
  mu: {
    bg: '#DCE8D4',
    el: (
      <>
        <polygon points="16,7 27,26 5,26" fill={C}/>
        <polygon points="13.5,15 16,7 18.5,15" fill="white" fillOpacity="0.4"/>
      </>
    ),
  },
  anon: {
    bg: '#EEE8E0',
    el: (
      <g fill={C} opacity="0.4">
        <circle cx="16" cy="12" r="5.5"/>
        <path d="M6 30 Q6 20 16 20 Q26 20 26 30Z"/>
      </g>
    ),
  },
}

interface Props {
  seed: string
  className?: string
}

export default function BibleAvatar({ seed, className }: Props) {
  const config = AVATARS[seed] ?? AVATARS.alpha
  return (
    <div
      className={cn('rounded-full flex items-center justify-center shrink-0 overflow-hidden', className)}
      style={{ backgroundColor: config.bg }}
    >
      <svg viewBox="0 0 32 32" className="w-[72%] h-[72%]" xmlns="http://www.w3.org/2000/svg">
        {config.el}
      </svg>
    </div>
  )
}
