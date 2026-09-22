import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import './FileFolder.css'

export type FolderTone = 'blue' | 'violet' | 'green' | 'rose' | 'slate'

export default function FileFolder({ active = false, tone = 'blue', hovered: controlledHover }: {
  active?: boolean
  tone?: FolderTone
  hovered?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const reduceMotion = useReducedMotion()
  const open = active
  const fan = (controlledHover ?? hovered) || open
  const spring = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 150, damping: 22, mass: .9 }

  return <div
    className={`rare-folder rare-folder-${tone}${open ? ' is-open' : ''}`}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    aria-hidden="true"
  >
    <span className="rare-folder-back" />
    <motion.span initial={false} className="rare-folder-paper paper-one" animate={{ y: open ? -21 : fan ? -10 : -7, x: open ? 21 : fan ? 11 : 9, rotate: open ? 11 : fan ? 6 : 5 }} transition={spring}><i /><i /><i /></motion.span>
    <motion.span initial={false} className="rare-folder-paper paper-two" animate={{ y: open ? -25 : fan ? -12 : -10, x: 0, rotate: open ? -1 : fan ? .5 : 1 }} transition={spring}><i /><i /><i /></motion.span>
    <motion.span initial={false} className="rare-folder-paper paper-three" animate={{ y: open ? -22 : fan ? -10 : -8, x: open ? -21 : fan ? -11 : -9, rotate: open ? -11 : fan ? -6 : -4 }} transition={spring}><i /><i /><i /></motion.span>
    <motion.span
      initial={false}
      className="rare-folder-flap"
      animate={{ rotateX: open ? -52 : fan ? -25 : -13, y: open ? 5 : 0 }}
      transition={spring}
    />
  </div>
}
