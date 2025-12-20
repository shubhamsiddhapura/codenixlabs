import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface CounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  title: string;
}

const Counter: React.FC<CounterProps> = ({ 
  end, 
  duration = 2, 
  suffix = "", 
  title 
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  useEffect(() => {
    if (!isInView) return;
    
    let startTime: number;
    let animationFrame: number;
    
    const startAnimation = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / (duration * 1000);
      
      if (progress < 1) {
        const value = Math.floor(end * progress);
        setCount(value);
        animationFrame = requestAnimationFrame(startAnimation);
      } else {
        setCount(end);
      }
    };
    
    animationFrame = requestAnimationFrame(startAnimation);
    
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isInView]);
  
  return (
    <div ref={ref} className="text-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h3 className="text-4xl sm:text-5xl font-orbitron font-bold text-primary mb-2">
          {count}{suffix}
        </h3>
        <p className="text-neutral-300">{title}</p>
      </motion.div>
    </div>
  );
};

const StatsCounter: React.FC = () => {
  return (
    <section className="py-16 bg-neutral-900 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-8 md:gap-0">
          <div className="w-full md:w-1/4">
            <Counter end={10} suffix="+" title="Years Experience" />
          </div>
          <div className="w-full md:w-1/4">
            <Counter end={250} suffix="+" title="Projects Completed" />
          </div>
          <div className="w-full md:w-1/4">
            <Counter end={50} suffix="+" title="Team Members" />
          </div>
          <div className="w-full md:w-1/4">
            <Counter end={100} suffix="%" title="Client Satisfaction" />
          </div>
        </div>
      </div>
      
      {/* Background glow */}
      <div className="absolute inset-0 bg-glow opacity-30"></div>
    </section>
  );
};

export default StatsCounter;