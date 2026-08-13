import React from 'react';
import { motion } from 'framer-motion';
import { GRADE_COLOUR, type Grade } from '../../types/aiReadiness';

/**
 * The score as a ring that draws itself.
 *
 * A flat letter in a coloured box states the result; a ring that fills to the
 * score *shows* it, and the drawing motion is what makes a visitor stop and
 * read. It is the first thing on screen after a fifteen-second wait, so it has
 * to earn that wait.
 */
export const GradeRing: React.FC<{ grade: Grade; score: number; size?: number }> = ({
  grade,
  score,
  size = 168,
}) => {
  const stroke = size * 0.055;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const colour = GRADE_COLOUR[grade];

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Grade ${grade}, ${score} out of 100`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 }}
          style={{ filter: `drop-shadow(0 0 10px ${colour}66)` }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-orbitron font-bold leading-none"
          style={{ color: colour, fontSize: size * 0.34, textShadow: `0 0 22px ${colour}55` }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.35 }}
        >
          {grade}
        </motion.span>
        <span className="mt-1 text-xs tracking-widest uppercase text-neutral-400">{score}/100</span>
      </div>
    </div>
  );
};

export default GradeRing;
