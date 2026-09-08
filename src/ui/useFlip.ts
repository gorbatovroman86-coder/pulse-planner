import { useLayoutEffect, useRef } from 'react'

/** FLIP: строки ведомости переезжают на новое место плавно,
 *  когда проект теплеет и уходит из полосы «остыли». */
export function useFlip(keys: string[]) {
  const nodes = useRef(new Map<string, HTMLElement>())
  const prev = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const next = new Map<string, number>()
    nodes.current.forEach((el, id) => {
      if (!el.isConnected) return
      const top = el.getBoundingClientRect().top
      next.set(id, top)
      const before = prev.current.get(id)
      if (before === undefined) return
      const delta = before - top
      if (Math.abs(delta) < 1) return
      el.style.transition = 'none'
      el.style.transform = `translateY(${delta}px)`
      // Вниз проект проваливается тяжелее, чем всплывает наверх.
      const sinking = delta < 0
      requestAnimationFrame(() => {
        el.style.transition = sinking
          ? 'transform 700ms cubic-bezier(0.55, 0.06, 0.68, 0.19)'
          : 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)'
        el.style.transform = ''
      })
    })
    prev.current = next
  }, [keys.join('|')])

  return (id: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(id, el)
    else nodes.current.delete(id)
  }
}
