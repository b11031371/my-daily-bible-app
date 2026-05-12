export const FRUITS = ['仁愛', '喜樂', '和平', '忍耐', '恩慈', '良善', '信實', '溫柔', '節制'] as const

export const FRUIT_VERSES: Record<string, string> = {
  '仁愛': '你們要彼此相愛，像我愛你們一樣。\n— 約翰福音 15:12',
  '喜樂': '你們要靠主常常喜樂，我再說，你們要喜樂！\n— 腓立比書 4:4',
  '和平': '我留下平安給你們，我將我的平安賜給你們。\n— 約翰福音 14:27',
  '忍耐': '患難生忍耐，忍耐生老練，老練生盼望。\n— 羅馬書 5:3–4',
  '恩慈': '要以恩慈相待，存憐憫的心，彼此饒恕。\n— 以弗所書 4:32',
  '良善': '你們要嘗嘗主恩的滋味，便知道他是美善。\n— 詩篇 34:8',
  '信實': '那召你們的本是信實的，他必成就這事。\n— 帖撒羅尼迦前書 5:24',
  '溫柔': '溫柔的人有福了，因為他們必承受地土。\n— 馬太福音 5:5',
  '節制': '凡較力爭勝的，諸事都有節制。\n— 哥林多前書 9:25',
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
