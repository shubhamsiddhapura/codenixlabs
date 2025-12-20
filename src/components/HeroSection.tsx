import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import HeroCanvas from './HeroCanvas';

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

const HeroSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !headingRef.current) return;

    const words = headingRef.current.innerText.split(' ');
    headingRef.current.innerHTML = '';
    
    // Create spans for each word
    words.forEach((word, i) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'inline-block';
      
      // Split into letters
      Array.from(word).forEach((letter) => {
        const letterSpan = document.createElement('span');
        letterSpan.className = 'inline-block opacity-0';
        letterSpan.textContent = letter;
        wordSpan.appendChild(letterSpan);
      });
      
      headingRef.current?.appendChild(wordSpan);
      
      // Add space except for last word
      if (i < words.length - 1) {
        const space = document.createElement('span');
        space.innerHTML = '&nbsp;';
        headingRef.current?.appendChild(space);
      }
    });
    
    // Animate letters
    const letters = headingRef.current.querySelectorAll('span span');
    gsap.to(letters, {
      opacity: 1,
      duration: 0.05,
      stagger: 0.03,
      ease: 'power1.out',
      delay: 0.5
    });
    
    // Parallax effect on scroll
    gsap.fromTo(
      '.hero-content', 
      { y: 0 }, 
      {
        y: -100,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      }
    );
    
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden grid-bg"
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-glow opacity-50"></div>
      
      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <HeroCanvas />
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 hero-content">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 inline-block"
          >
            <span className="bg-primary/20 text-primary rounded-full px-4 py-1 text-sm font-medium">
              Future-Ready Digital Solutions
            </span>
          </motion.div>
          
          <h1 
            ref={headingRef}
            className="text-4xl sm:text-5xl md:text-6xl font-orbitron font-bold mb-6 leading-tight"
          >
            Transforming Ideas Into Digital Reality
          </h1>
          
          <motion.p 
            className="text-xl text-neutral-300 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            We craft cutting-edge web and mobile experiences that drive innovation 
            and deliver exceptional results for forward-thinking businesses.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Link to="/contact" className="btn btn-primary neon-border hover-effect">
              Start Your Project
            </Link>
            {/* <Link to="/portfolio" className="btn btn-outline hover-effect">
              Explore Our Work
            </Link> */}
          </motion.div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-10 bg-primary/50 relative overflow-hidden">
              <motion.div 
                className="absolute top-0 left-0 w-full h-full bg-primary"
                animate={{ 
                  y: ['-100%', '100%'], 
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 1.5, 
                  ease: 'linear'
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;