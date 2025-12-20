import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const Cursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const cursor = cursorRef.current;
    
    if (!cursor) return;
    
    let mouseX = 0;
    let mouseY = 0;
    
    // Initial position
    gsap.set(cursor, {
      x: mouseX,
      y: mouseY,
      backgroundColor: '#8948FF'
    });
    
    // Follow mouse with smooth animation
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      gsap.to(cursor, {
        x: mouseX,
        y: mouseY,
        duration: 0.15,
        ease: 'power2.out'
      });
    };
    
    // Handle hover effects
    const handleHover = () => {
      gsap.to(cursor, {
        width: 'var(--cursor-size-hover, 64px)',
        height: 'var(--cursor-size-hover, 64px)',
        opacity: 0.5,
        duration: 0.3
      });
    };
    
    const handleLeave = () => {
      gsap.to(cursor, {
        width: 'var(--cursor-size)',
        height: 'var(--cursor-size)',
        opacity: 1,
        duration: 0.3
      });
    };
    
    // Apply hover effect to all links and buttons
    const links = document.querySelectorAll('a, button, .hover-effect');
    
    links.forEach(link => {
      link.addEventListener('mouseenter', handleHover);
      link.addEventListener('mouseleave', handleLeave);
    });
    
    // Only add cursor on desktop devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    
    if (!isMobile) {
      cursor.style.display = 'block';
      document.addEventListener('mousemove', handleMouseMove);
    }
    
    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      
      links.forEach(link => {
        link.removeEventListener('mouseenter', handleHover);
        link.removeEventListener('mouseleave', handleLeave);
      });
    };
  }, []);
  
  return (
    <div
      ref={cursorRef}
      className="custom-cursor"
      style={{ display: 'none' }}
    />
  );
};

export default Cursor;