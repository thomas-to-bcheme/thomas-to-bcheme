'use client';

import { MotionConfig } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * MotionProvider - Provides global Framer Motion configuration (A2)
 * Respects user's reduced motion preference
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
