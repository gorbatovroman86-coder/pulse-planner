import type { Task } from '../types'
import type { Pulse } from './derive'
import { fmtHours, plural } from './dates'
import { lifeOf } from './life'

export interface Advice {
  id: string
  emoji: string
  /** Что происходит — одной фразой. */
  text: string
  /** Готовая задача: подставится в поле, останется нажать. */
  suggest?: string
  minutes?: number
}

const short = (s: string, n = 46) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

/**
 * Подсказчик разбирает состояние проекта и его собственную историю
 * и предлагает конкретный следующий шаг. Это правила по твоим данным,
 * а не языковая модель: работает офлайн и ничего никуда не отправляет.
 */
export function adviseProject(pulse: Pulse, allTasks: Task[]): Advice[] {
  const p = pulse.project
  const life = lifeOf(pulse)
  const mine = allTasks.filter((t) => !t.deleted_at && t.project_id === p.id)
  const doneTasks = mine
    .filter((t) => t.status === 'done' && t.done_at)
    .sort((a, b) => (a.done_at! < b.done_at! ? 1 : -1))
  const open = pulse.openTasks
  const out: Advice[] = []

  // 1. Пусто внутри — главное, что чинить.
  if (open.length === 0) {
    if (doneTasks.length > 0) {
      const last = doneTasks[0]
      out.push({
        id: 'repeat',
        emoji: '♻️',
        text: `Задач нет, а в прошлый раз ты закрывал «${short(last.title)}». Обычно за этим следует продолжение.`,
        suggest: `Продолжить: ${short(last.title, 60)}`,
        minutes: last.estimate_minutes || 60,
      })
    }
    out.push({
      id: 'first-step',
      emoji: '🧩',
      text:
        'Проект провисает: нет ни одной открытой задачи. Самый дешёвый способ сдвинуть — назначить один маленький шаг на полчаса.',
      suggest: `Разобраться, что дальше по «${short(p.name, 40)}»`,
      minutes: 30,
    })
  }

  // 2. Просрочка важнее всего остального.
  if (pulse.overdue > 0) {
    out.push({
      id: 'overdue',
      emoji: '⏰',
      text: `${pulse.overdue} ${plural(pulse.overdue, 'задача просрочена', 'задачи просрочены', 'задач просрочено')}. Либо сделать сегодня, либо честно перенести срок.`,
    })
  }

  // 3. Умер или ещё не начат — как оживить.
  if (life === 'dead' || life === 'new') {
    out.push({
      id: 'revive',
      emoji: life === 'new' ? '🌱' : '🫀',
      text:
        pulse.daysSinceTouch === null
          ? 'К проекту ещё не подходили. Начни с самого мелкого — пятнадцать минут снимают ступор.'
          : `${pulse.daysSinceTouch} ${plural(pulse.daysSinceTouch, 'день', 'дня', 'дней')} без закрытых задач. Возьми одну мелочь на 15 минут — она вернёт проект к жизни.`,
      suggest: `Пятнадцать минут по «${short(p.name, 40)}»`,
      minutes: 15,
    })
    if (open.length > 3) {
      out.push({
        id: 'too-many',
        emoji: '🧹',
        text: `Открытых задач ${open.length}, а движения нет. Обычно мешает не нехватка времени, а длинный список: выбери одну на сегодня, остальные не трогай.`,
      })
    }
  }

  // 4. Бюджет недели не выбран.
  const budget = pulse.budgetMinutes
  if (budget > 0 && life !== 'new') {
    const share = pulse.investedMinutes / budget
    if (share < 0.25 && life !== 'fire') {
      out.push({
        id: 'budget',
        emoji: '⏳',
        text: `За неделю вложено ${fmtHours(pulse.investedMinutes)} из ${fmtHours(budget)} ч. Либо ставь час в план, либо снизь бюджет — иначе цифра врёт каждую неделю.`,
      })
    } else if (share > 1.4) {
      out.push({
        id: 'over',
        emoji: '🔋',
        text: `Вложено ${fmtHours(pulse.investedMinutes)} ч при бюджете ${fmtHours(budget)} — проект съедает больше, чем ты планировал. Проверь, не в ущерб ли остальным.`,
      })
    }
  }

  // 5. Слишком крупные задачи — их не берут в работу.
  const heavy = open.filter((t) => t.estimate_minutes >= 180)
  if (heavy.length > 0 && life !== 'fire') {
    out.push({
      id: 'split',
      emoji: '🪓',
      text: `«${short(heavy[0].title)}» весит ${fmtHours(heavy[0].estimate_minutes)} ч. Такие не начинают: отрежь от неё кусок на 30–45 минут.`,
      suggest: `Первый кусок: ${short(heavy[0].title, 50)}`,
      minutes: 45,
    })
  }

  // 6. Задачи без оценок — день не посчитать.
  const noEstimate = open.filter((t) => t.estimate_minutes === 0)
  if (noEstimate.length >= 2) {
    out.push({
      id: 'estimate',
      emoji: '🧮',
      text: `У ${noEstimate.length} ${plural(noEstimate.length, 'задачи', 'задач', 'задач')} нет оценки времени — день по ним не посчитаешь. Проставь хотя бы грубо.`,
    })
  }

  // 7. Ничего не сломано — сказать и это.
  if (out.length === 0) {
    out.push({
      id: 'ok',
      emoji: '👌',
      text:
        life === 'fire'
          ? 'Сегодня по проекту уже закрыто. Ничего чинить не нужно.'
          : 'Проект в порядке: задачи есть, сроки не горят, бюджет в норме.',
    })
  }

  return out.slice(0, 3)
}
