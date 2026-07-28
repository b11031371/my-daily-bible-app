'use client'
import { useState, useEffect } from 'react'
import { Shuffle } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'

const STORAGE_KEY = 'bible-theme'
const MODE_KEY = 'bible-mode'
const RANDOM_KEY = 'bible-random'

// 清單驅動：加主題 = 這裡加一列 + globals.css 一組 :root[data-theme] 變數。
const THEMES = [
  { code: 'gold',    labelKey: 'settings.themeGold',    swatch: ['#FFD880', '#FFB85A'] },
  { code: 'forest',  labelKey: 'settings.themeForest',  swatch: ['#8CE8C0', '#35BCB0'] },
  { code: 'ocean',   labelKey: 'settings.themeOcean',   swatch: ['#A2DBFA', '#3AACD6'] },
  { code: 'indigo',  labelKey: 'settings.themeIndigo',  swatch: ['#BEB2FA', '#AC5AD8'] },
  { code: 'rose',    labelKey: 'settings.themeRose',    swatch: ['#FFC2D8', '#F88A72'] },
  { code: 'teal',    labelKey: 'settings.themeTeal',    swatch: ['#8FEAE4', '#34AEBE'] },
  { code: 'slate',   labelKey: 'settings.themeSlate',   swatch: ['#BECEE0', '#6E88A8'] },
] as const

// 隨機主題只覆蓋「品牌色」變數（不含 surface / bg / primary-light），
// 讓它與深色模式相容（深色的底/灰階/淡底仍由 data-mode 決定）。
const RANDOM_KEYS = [
  '--color-primary', '--color-primary-dark',
  '--color-grad-from', '--color-grad-mid', '--color-grad-to',
  '--color-accent', '--color-glow',
] as const

function randomThemeVars(): Record<string, string> {
  const h = Math.floor(Math.random() * 360)
  return {
    '--color-primary':      `hsl(${h} 68% 62%)`,
    '--color-primary-dark': `hsl(${h} 55% 42%)`,
    '--color-grad-from':    `hsl(${h} 80% 68%)`,
    '--color-grad-mid':     `hsl(${(h + 15) % 360} 74% 64%)`,
    '--color-grad-to':      `hsl(${(h + 35) % 360} 70% 60%)`,   // 位移色相 → 雙色調
    '--color-accent':       `hsl(${(h + 180) % 360} 60% 60%)`,  // 互補色
    '--color-glow':         `hsla(${h} 70% 60% / 0.4)`,
  }
}

// 同步手機狀態列/底部顏色（PWA theme-color）：深色模式用深底，否則用當前主題主色。
function syncThemeColorMeta() {
  const root = document.documentElement
  const dark = root.getAttribute('data-mode') === 'dark'
  const col = dark
    ? '#15120D'
    : getComputedStyle(root).getPropertyValue('--color-primary').trim() || '#FFCC66'
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', col)
}

export default function ThemeSwitcher() {
  const { t } = useI18n()
  const [current, setCurrent] = useState<string>('gold')
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setCurrent(
      document.documentElement.getAttribute('data-theme') ||
        localStorage.getItem(STORAGE_KEY) ||
        'gold',
    )
    setDark(
      document.documentElement.getAttribute('data-mode') === 'dark' ||
        localStorage.getItem(MODE_KEY) === 'dark',
    )
  }, [])

  function select(code: string) {
    const root = document.documentElement
    RANDOM_KEYS.forEach((k) => root.style.removeProperty(k)) // 清掉隨機的 inline 覆蓋
    try { localStorage.removeItem(RANDOM_KEY) } catch {}
    setCurrent(code)
    try { localStorage.setItem(STORAGE_KEY, code) } catch {}
    root.setAttribute('data-theme', code)
    syncThemeColorMeta()
  }

  function applyRandom() {
    const root = document.documentElement
    const vars = randomThemeVars()
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
    const cssText = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')
    try {
      localStorage.setItem(RANDOM_KEY, cssText)
      localStorage.setItem(STORAGE_KEY, 'random')
    } catch {}
    root.setAttribute('data-theme', 'random')
    setCurrent('random')
    syncThemeColorMeta()
  }

  function toggleDark() {
    const next = !dark
    setDark(next)
    try { localStorage.setItem(MODE_KEY, next ? 'dark' : 'light') } catch {}
    if (next) document.documentElement.setAttribute('data-mode', 'dark')
    else document.documentElement.removeAttribute('data-mode')
    syncThemeColorMeta()
  }

  // 固定 px 尺寸：色票不隨字級（rem）放大，避免特大字級時擠在一起
  const ringCls = (active: boolean) =>
    `flex h-[28px] w-[28px] shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 transition ${
      active ? 'ring-gray-800' : 'ring-gray-200 hover:ring-gray-300 active:scale-90'
    }`

  return (
    <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
      <div className="section-band px-4 py-3">
        <p className="text-base font-bold text-gray-900">{t('settings.theme')}</p>
      </div>

      {/* 色票（純 icon 點選）+ 隨機：固定尺寸、必要時換行不重疊 */}
      <div className="p-4 flex flex-wrap items-center gap-2.5">
        {THEMES.map((th) => (
          <button
            key={th.code}
            onClick={() => select(th.code)}
            aria-label={t(th.labelKey)}
            title={t(th.labelKey)}
            className={ringCls(current === th.code)}
          >
            {th.swatch.map((c, i) => (
              <span key={i} className="h-full flex-1" style={{ background: c }} />
            ))}
          </button>
        ))}
        {/* 隨機選色：每次點都產生新的協調配色 */}
        <button
          onClick={applyRandom}
          aria-label={t('settings.themeRandom')}
          title={t('settings.themeRandom')}
          className={ringCls(current === 'random')}
          style={{
            background:
              'conic-gradient(from 0deg, #FF5F6D, #FFC371, #8CE99A, #22D3EE, #8B7CE8, #EC6F9E, #FF5F6D)',
          }}
        >
          <Shuffle size={13} weight="bold" className="text-white drop-shadow" />
        </button>
      </div>

      {/* 深色模式開關（與顏色主題正交） */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
        <span className="text-sm font-medium text-gray-800">{t('settings.darkMode')}</span>
        <button
          role="switch"
          aria-checked={dark}
          aria-label={t('settings.darkMode')}
          onClick={toggleDark}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            dark ? 'bg-primary' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform ${
              dark ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
