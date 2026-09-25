import { useEffect, useRef, type ChangeEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'
import './CodeSlots.css'

type Status = 'idle' | 'error' | 'success'

export default function CodeSlots({
  value,
  onChange,
  onComplete,
  status = 'idle',
  disabled = false,
  length = 6,
}: {
  value: string
  onChange: (code: string) => void
  onComplete: (code: string) => void
  status?: Status
  disabled?: boolean
  length?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const reduceMotion = useReducedMotion()
  const digits = value.replace(/\D/g, '').slice(0, length)

  useEffect(() => {
    if (!disabled && status !== 'success') inputRef.current?.focus()
  }, [disabled, status])

  const update = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value.replace(/\D/g, '').slice(0, length)
    if (next === digits) return
    onChange(next)
    if (next.length === length) onComplete(next)
  }

  return <div className="auth-code-slots" data-status={status} data-disabled={disabled || undefined} onClick={() => inputRef.current?.focus()}>
    <input
      ref={inputRef}
      className="auth-code-input"
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={length}
      value={digits}
      onChange={update}
      aria-label="Six-digit sign-in code"
      aria-invalid={status === 'error'}
      disabled={disabled || status === 'success'}
    />
    {Array.from({ length }, (_, index) => <span className="auth-code-slot" key={index} data-filled={Boolean(digits[index]) || undefined} data-active={index === digits.length && status === 'idle' || undefined}>
      <AnimatePresence mode="wait">
        {digits[index] && <motion.span
          key={digits[index] + index}
          className="auth-code-digit"
          initial={reduceMotion ? false : { opacity: 0, y: 8, scale: .76 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -5, scale: .8 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 470, damping: 25, delay: index * .018 }}
        >{digits[index]}</motion.span>}
      </AnimatePresence>
    </span>)}
    {status === 'success' && <motion.span className="auth-code-success" initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }}><Check size={25} strokeWidth={2.5} /></motion.span>}
  </div>
}
