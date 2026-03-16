import React from 'react';
import { motion } from 'motion/react';

/**
 * Nút có hiệu ứng scale nhẹ khi hover/tap (theo Animate UI Button).
 * hoverScale mặc định 1.02, tapScale 0.98.
 * Dùng forwardRef để tương thích với Tooltip (cần ref tới phần tử DOM).
 */
export const MotionButton = React.forwardRef(function MotionButton(
  {
    children,
    className = '',
    hoverScale = 1.02,
    tapScale = 0.98,
    asChild = false,
    ...props
  },
  ref
) {
  const Component = motion.button;
  return (
    <Component
      ref={ref}
      className={className}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: tapScale }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...props}
    >
      {children}
    </Component>
  );
});

export default MotionButton;
