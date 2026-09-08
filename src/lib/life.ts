import type { Pulse } from './derive'

/**
 * Степень жизни проекта. Порог задаётся у проекта (по умолчанию два дня):
 * если за это время ни одна задача не закрыта и касаний не было — проект умер.
 */
export type Life = 'new' | 'fire' | 'cooling' | 'dead'

export interface LifeLook {
  id: Life
  title: string
  emoji: string
  hint: string
  ink: string
  soft: string
  /** Класс анимации стикера. */
  anim: string
}

export const LIFE_ORDER: Life[] = ['fire', 'cooling', 'dead', 'new']

export const LIFE: Record<Life, LifeLook> = {
  fire: {
    id: 'fire',
    title: 'Горит',
    emoji: '🔥',
    hint: 'сегодня к ним прикасались',
    ink: '#B45309',
    soft: '#FEF3E2',
    anim: 'sticker-fire',
  },
  cooling: {
    id: 'cooling',
    title: 'Стынет',
    emoji: '🌡️',
    hint: 'день без закрытых задач — ещё можно спасти',
    ink: '#0F5F4F',
    soft: '#EAF2EF',
    anim: 'sticker-cool',
  },
  dead: {
    id: 'dead',
    title: 'Умер',
    emoji: '💀',
    hint: 'порог пройден, работа встала',
    ink: '#C2410C',
    soft: '#FBEDE6',
    anim: 'sticker-dead',
  },
  new: {
    id: 'new',
    title: 'Ещё не начат',
    emoji: '🌱',
    hint: 'выбери один и назначь первый шаг',
    ink: '#57626E',
    soft: '#F2F5F6',
    anim: 'sticker-new',
  },
}

export function lifeOf(pulse: Pulse): Life {
  const d = pulse.daysSinceTouch
  if (d === null) return 'new'
  if (d === 0) return 'fire'
  if (d < pulse.project.cooldown_days) return 'cooling'
  return 'dead'
}

/** Насколько проект «жив» от 0 до 1 — для полосы и насыщенности стикера. */
export function vitality(pulse: Pulse): number {
  const d = pulse.daysSinceTouch
  if (d === null) return 0
  const cd = Math.max(1, pulse.project.cooldown_days)
  return Math.max(0, Math.min(1, 1 - d / (cd + 1)))
}

/** Набор значков для стикеров: владелец выбирает свой. */
export const EMOJI_CHOICES = [
  '🌾', '🌽', '🌻', '🫒', '🚜', '🏭', '⚓', '🚂',
  '📊', '📈', '🧮', '🗺️', '⚖️', '📄', '🔬', '🧪',
  '💰', '🤝', '📰', '🛰️', '🧊', '🔥', '⚡', '🧭',
]
