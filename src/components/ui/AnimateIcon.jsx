import React from 'react';
import { motion } from 'motion/react';

/**
 * Wrapper theo phong cách Animate UI (animate-ui.com):
 * bọc icon (Lucide hoặc React node) với hiệu ứng hover/tap nhẹ.
 */
export function AnimateIcon({
  children,
  className = '',
  animateOnHover = true,
  animateOnTap = true,
  size = 20,
  ...props
}) {
  return (
    <motion.span
      className={`inline-flex items-center justify-center [&>svg]:shrink-0 ${className}`}
      style={{ width: size, height: size }}
      whileHover={animateOnHover ? { scale: 1.15 } : undefined}
      whileTap={animateOnTap ? { scale: 0.9 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...props}
    >
      {children}
    </motion.span>
  );
}

export default AnimateIcon;
