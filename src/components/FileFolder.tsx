import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import './FileFolder.css'

export type FolderTone = 'blue' | 'violet' | 'green' | 'rose' | 'slate'

export default function FileFolder({ active = false, tone = 'blue' }: {
  active?: boolean
  tone?: FolderTone
}) {
  const [hovered, setHovered] = useState(false)
  const reduceMotion = useReducedMotion()
  const open = active
  const fan = hovered || open
  const spring = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 190, damping: 18 }

  return <div
    className={`rare-folder rare-folder-${tone}${open ? ' is-open' : ''}`}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    aria-hidden="true"
  >
    <span className="rare-folder-back" />
    <motion.span className="rare-folder-paper paper-one" animate={{ y: open ? -21 : fan ? -14 : -7, x: open ? 21 : fan ? 13 : 9, rotate: open ? 11 : fan ? 8 : 5 }} transition={spring}><i /><i /><i /></motion.span>
    <motion.span className="rare-folder-paper paper-two" animate={{ y: open ? -25 : fan ? -17 : -10, x: 0, rotate: open ? -1 : 1 }} transition={spring}><i /><i /><i /></motion.span>
    <motion.span className="rare-folder-paper paper-three" animate={{ y: open ? -22 : fan ? -15 : -8, x: open ? -21 : fan ? -13 : -9, rotate: open ? -11 : fan ? -8 : -4 }} transition={spring}><i /><i /><i /></motion.span>
    <motion.span
      className="rare-folder-flap"
      animate={{ rotateX: open ? -52 : fan ? -37 : -13, y: open ? 5 : 0 }}
      transition={spring}
    />
  </div>
}
