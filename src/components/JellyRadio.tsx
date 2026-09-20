import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import './JellyRadio.css'

type JellyRadioProps = {
  items: string[]
  value: string
  onChange: (value: string, index: number) => void
  ariaLabel: string
  className?: string
  toneForItem?: (item: string) => string
  swell?: number
  barge?: number
  shrink?: number
  jelly?: number
  bounce?: number
  stiffness?: number
}

export default function JellyRadio({
  items,
  value,
  onChange,
  ariaLabel,
  className = '',
  toneForItem,
  swell = 0.2,
  barge = 6,
  shrink = 0.05,
  jelly = 1.3,
  bounce = 0.3,
  stiffness = 460,
}: JellyRadioProps) {
  const at = Math.max(0, items.indexOf(value))
  const reduceMotion = useReducedMotion()
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const selected = refs.current[at]
    if (!selected) return
    const measure = () => setWidth(selected.offsetWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(selected)
    document.fonts?.ready.then(measure)
    return () => observer.disconnect()
  }, [at, items])

  const choose = (index: number) => {
    if (index !== at) onChange(items[index], index)
    refs.current[index]?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % items.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return
    event.preventDefault()
    choose(next)
  }

  const damping = 2 * Math.sqrt(stiffness * 0.9) * (1 - bounce)
  const push = width * swell / 2 + barge

  return <div className={`jelly-radio ${className}`} role="radiogroup" aria-label={ariaLabel}>
    {items.map((item, index) => {
      const active = index === at
      const direction = Math.sign(index - at)
      const distance = Math.abs(index - at)
      const spring = { type: 'spring' as const, stiffness: stiffness * (1 - .1 * Math.min(distance, 3)), damping, mass: .9 }
      return <motion.button
        key={item}
        ref={element => { refs.current[index] = element }}
        type="button"
        role="radio"
        aria-checked={active}
        tabIndex={active ? 0 : -1}
        data-on={active}
        data-tone={toneForItem?.(item)}
        className="jelly-radio__chip"
        initial={false}
        animate={reduceMotion ? { x: 0, scaleX: 1, scaleY: 1 } : {
          x: direction * push,
          scaleX: active ? 1 + swell : 1 - shrink,
          scaleY: active ? 1 + swell : 1 - shrink,
        }}
        transition={reduceMotion ? { duration: 0 } : {
          x: { ...spring, delay: distance * .022 },
          scaleX: { ...spring, stiffness: spring.stiffness * (1 + .24 * jelly), damping: damping * .8, delay: distance * .022 },
          scaleY: { ...spring, stiffness: spring.stiffness * (1 - .14 * jelly), delay: distance * .022 + .05 * jelly },
        }}
        onClick={() => choose(index)}
        onKeyDown={event => onKeyDown(event, index)}
      ><span className="jelly-radio__skin">{item}</span></motion.button>
    })}
  </div>
}
