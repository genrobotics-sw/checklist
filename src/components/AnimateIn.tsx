'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export function AnimateIn({ 
  children, 
  delay = 0,
  className = ''
}: { 
  children: ReactNode, 
  delay?: number,
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
