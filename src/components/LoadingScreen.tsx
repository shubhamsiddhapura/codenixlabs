import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';

const LoadingScreen: React.FC = () => {
  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();
    
    tl.to('.loading-progress', {
      width: '100%',
      duration: 2,
      ease: 'power2.inOut'
    });
    
    tl.to('.loading-text', {
      opacity: 0,
      y: -20,
      duration: 0.5
    }, "-=0.5");
    
    tl.to('.loading-logo', {
      scale: 1.2,
      duration: 0.5,
      ease: 'back.out(1.7)'
    }, "-=0.5");
    
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div 
      ref={loadingRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
    >
      <motion.div 
        className="loading-logo text-primary"
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: 0.2 
        }}
      >
      </motion.div>
      
      <motion.h1 
        className="mt-6 text-4xl font-bold loading-text font-orbitron"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        CODENIX<span className="text-primary ms-0.5">LABS</span>
      </motion.h1>
      
      <div className="w-64 h-1 mt-8 overflow-hidden rounded-full bg-neutral-800">
        <div className="w-0 h-full rounded-full loading-progress bg-primary"></div>
      </div>
      
      <motion.p 
        className="mt-4 loading-text text-neutral-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Future. Innovation. Technology.
      </motion.p>
    </div>
  );
};

export default LoadingScreen;
