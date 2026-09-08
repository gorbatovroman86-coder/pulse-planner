import type { Project, Task } from '../types'
import { uid } from '../lib/id'

/** Пигментная палитра: девять приглушённых красок одной светлоты.
 *  Цвет проекта — единственное яркое пятно в интерфейсе. */
export const PIGMENTS = [
  '#A8452F', // жжёная охра
  '#B57A1F', // янтарь
  '#6E7C22', // олива
  '#2E7D5B', // хвоя
  '#2A6E86', // морская волна
  '#3B5EA6', // индиго
  '#6B4E9B', // фиалка
  '#A03A6B', // слива
  '#5E5A52', // графит
]

const SEED_PROJECTS: { name: string; description: string; budget: number; emoji: string }[] = [
  { name: 'МЭЗ Карасук/Бийск', description: 'Оценка площадок под маслоэкстракционный завод', budget: 8, emoji: '🏭' },
  { name: 'Кукуруза', description: 'Сырьевые зоны под площадки приёмки', budget: 5, emoji: '🌽' },
  { name: 'Пульт «Ядро + Масло»', description: 'Модель накопления складов и работы завода', budget: 6, emoji: '🫒' },
  { name: 'БДР (мотивация)', description: 'Сравнение технологий переработки', budget: 4, emoji: '⚖️' },
  { name: 'Агроаналитика Китай — РФ', description: 'Районные балансы НСО и Алтайского края', budget: 6, emoji: '🗺️' },
  { name: 'Договоры НПК', description: 'Правовая работа по поставкам', budget: 3, emoji: '📄' },
  { name: 'Мониторинг рынка', description: 'Сбор новостей зернового рынка', budget: 3, emoji: '📰' },
]

/** Демонстрационные задачи — по одной на проект, помечены как пример.
 *  Никакой выдуманной истории работы: касаний нет, лента пустая. */
const SEED_TASKS: Record<string, { title: string; minutes: number; priority: 1 | 2 | 3 }> = {
  'МЭЗ Карасук/Бийск': { title: 'Пример: свести капзатраты по двум площадкам', minutes: 120, priority: 1 },
  'Кукуруза': { title: 'Пример: собрать посевные по районам зоны приёмки', minutes: 90, priority: 2 },
  'Пульт «Ядро + Масло»': { title: 'Пример: проверить баланс склада за месяц', minutes: 60, priority: 2 },
  'БДР (мотивация)': { title: 'Пример: сравнить выход масла по двум технологиям', minutes: 90, priority: 2 },
  'Агроаналитика Китай — РФ': { title: 'Пример: обновить районный баланс НСО', minutes: 120, priority: 1 },
  'Договоры НПК': { title: 'Пример: вычитать спорный пункт по срокам поставки', minutes: 45, priority: 2 },
  'Мониторинг рынка': { title: 'Пример: пробежать сводку по экспортным ценам', minutes: 30, priority: 3 },
}

export function buildSeed(): { projects: Project[]; tasks: Task[] } {
  const now = new Date().toISOString()
  const projects: Project[] = SEED_PROJECTS.map((p, i) => ({
    id: uid(),
    name: p.name,
    color: PIGMENTS[i % PIGMENTS.length],
    emoji: p.emoji,
    description: p.description,
    status: 'active',
    weekly_budget_hours: p.budget,
    cooldown_days: 2,
    last_touch_at: null,
    updated_at: now,
    deleted_at: null,
  }))

  const tasks: Task[] = projects.map((p, i) => {
    const spec = SEED_TASKS[p.name]
    return {
      id: uid(),
      project_id: p.id,
      title: spec.title,
      priority: spec.priority,
      due_date: null,
      estimate_minutes: spec.minutes,
      status: 'inbox',
      done_at: null,
      sort_order: i,
      note: '',
      subtasks: [],
      is_example: true,
      updated_at: now,
      deleted_at: null,
    }
  })

  return { projects, tasks }
}
