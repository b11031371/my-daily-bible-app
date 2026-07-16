import type { Locale } from '@/lib/i18n'

// 果子的穩定 key／排序（內部識別用，非顯示文字）。
export const FRUITS = ['仁愛', '喜樂', '和平', '忍耐', '恩慈', '良善', '信實', '溫柔', '節制'] as const
export type FruitKey = (typeof FRUITS)[number]

export interface LocalizedFruit {
  name: string
  verse: string
}

// 聖靈九果各語言的名稱與經文，皆用公版譯本：中文＝和合本 (CUV)、English＝KJV。
export const FRUIT_I18N: Record<Locale, Record<FruitKey, LocalizedFruit>> = {
  zh: {
    '仁愛': { name: '仁愛', verse: '你們要彼此相愛，像我愛你們一樣。\n— 約翰福音 15:12' },
    '喜樂': { name: '喜樂', verse: '你們要靠主常常喜樂，我再說，你們要喜樂！\n— 腓立比書 4:4' },
    '和平': { name: '和平', verse: '我留下平安給你們，我將我的平安賜給你們。\n— 約翰福音 14:27' },
    '忍耐': { name: '忍耐', verse: '患難生忍耐，忍耐生老練，老練生盼望。\n— 羅馬書 5:3–4' },
    '恩慈': { name: '恩慈', verse: '要以恩慈相待，存憐憫的心，彼此饒恕。\n— 以弗所書 4:32' },
    '良善': { name: '良善', verse: '你們要嘗嘗主恩的滋味，便知道他是美善。\n— 詩篇 34:8' },
    '信實': { name: '信實', verse: '那召你們的本是信實的，他必成就這事。\n— 帖撒羅尼迦前書 5:24' },
    '溫柔': { name: '溫柔', verse: '溫柔的人有福了，因為他們必承受地土。\n— 馬太福音 5:5' },
    '節制': { name: '節制', verse: '凡較力爭勝的，諸事都有節制。\n— 哥林多前書 9:25' },
  },
  en: {
    '仁愛': { name: 'Love', verse: 'This is my commandment, That ye love one another, as I have loved you.\n— John 15:12' },
    '喜樂': { name: 'Joy', verse: 'Rejoice in the Lord alway: and again I say, Rejoice.\n— Philippians 4:4' },
    '和平': { name: 'Peace', verse: 'Peace I leave with you, my peace I give unto you.\n— John 14:27' },
    '忍耐': { name: 'Patience', verse: 'Tribulation worketh patience; and patience, experience; and experience, hope.\n— Romans 5:3–4' },
    '恩慈': { name: 'Kindness', verse: 'And be ye kind one to another, tenderhearted, forgiving one another.\n— Ephesians 4:32' },
    '良善': { name: 'Goodness', verse: 'O taste and see that the Lord is good: blessed is the man that trusteth in him.\n— Psalm 34:8' },
    '信實': { name: 'Faithfulness', verse: 'Faithful is he that calleth you, who also will do it.\n— 1 Thessalonians 5:24' },
    '溫柔': { name: 'Gentleness', verse: 'Blessed are the meek: for they shall inherit the earth.\n— Matthew 5:5' },
    '節制': { name: 'Self-control', verse: 'And every man that striveth for the mastery is temperate in all things.\n— 1 Corinthians 9:25' },
  },
}

export const TREE_CONFIG = {
  maxMembers: 5,
  minMembers: 2,
  maxGroups: 3,
  fullGrowthPoints: 350,
  stages: [
    { min: 0,   max: 49,  stage: 1 },
    { min: 50,  max: 149, stage: 2 },
    { min: 150, max: 249, stage: 3 },
    { min: 250, max: 349, stage: 4 },
    { min: 350, max: Infinity, stage: 5 },
  ] as const,
  fruit: {
    start: 350,
    interval: 15,
    max: 9,
  },
} as const

export function getTreeStage(points: number): 1 | 2 | 3 | 4 | 5 {
  for (const s of TREE_CONFIG.stages) {
    if (points >= s.min && points <= s.max) return s.stage
  }
  return 5
}

export function getFruitCount(points: number): number {
  if (points < TREE_CONFIG.fruit.start) return 0
  return Math.min(
    Math.floor((points - TREE_CONFIG.fruit.start) / TREE_CONFIG.fruit.interval),
    TREE_CONFIG.fruit.max
  )
}

export function getTreeProgress(points: number): number {
  return Math.min(points / TREE_CONFIG.fullGrowthPoints, 1)
}

export function randomFruitOrder(): string[] {
  const arr = [...FRUITS]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
