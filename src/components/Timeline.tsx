import React, { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

interface TimelineEvent {
  year: string;
  title: string;
  description: string;
}

const timelineEvents: TimelineEvent[] = [
  {
    year: "2015",
    title: "Company Founded",
    description: "NEXUSTECH was established with a vision to transform how businesses leverage technology."
  },
  {
    year: "2017",
    title: "First Major Client",
    description: "Secured our first enterprise client and expanded our team to 10 talented professionals."
  },
  {
    year: "2019",
    title: "Mobile Division Launch",
    description: "Expanded our services to include mobile app development and grew our client base by 200%."
  },
  {
    year: "2021",
    title: "International Expansion",
    description: "Opened our first international office and began serving clients across the globe."
  },
  {
    year: "2023",
    title: "AI & Innovation Lab",
    description: "Launched our dedicated AI and innovation lab focused on cutting-edge technologies."
  },
  {
    year: "2025",
    title: "Where We Are Today",
    description: "Now a team of 50+ experts serving clients worldwide with future-focused digital solutions."
  }
];

const Timeline: React.FC = () => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(timelineRef, { once: true, margin: "-100px" });
  
  useEffect(() => {
    if (!timelineRef.current) return;
    
    // Animate the timeline line
    gsap.fromTo(
      '.timeline-line',
      { height: 0 },
      {
        height: '100%',
        duration: 2,
        ease: 'power3.inOut',
        scrollTrigger: {
          trigger: timelineRef.current,
          start: 'top 80%',
          end: 'bottom 60%',
          scrub: 1
        }
      }
    );
    
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);
  
  return (
    <div ref={timelineRef} className="relative py-10">
      {/* Timeline center line */}
      <div className="absolute left-1/2 transform -translate-x-px top-0 bottom-0 w-0.5 bg-neutral-700">
        <div className="timeline-line absolute inset-0 bg-primary w-full h-0"></div>
      </div>
      
      {/* Timeline events */}
      {timelineEvents.map((event, index) => (
        <motion.div 
          key={index}
          className={`relative z-10 flex items-center mb-16 last:mb-0 ${
            index % 2 === 0 ? 'justify-end' : 'justify-start flex-row-reverse'
          }`}
          initial={{ opacity: 0, x: index % 2 === 0 ? 50 : -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: index * 0.2 }}
        >
          {/* Timeline content */}
          <div className={`w-full md:w-5/12 ${index % 2 === 0 ? 'text-right pr-8' : 'text-left pl-8'}`}>
            <div className="glass p-6 rounded-xl relative overflow-hidden">
              <span className="text-primary font-orbitron font-bold text-lg block mb-2">
                {event.year}
              </span>
              <h3 className="text-xl font-bold mb-2">{event.title}</h3>
              <p className="text-neutral-300">{event.description}</p>
            </div>
          </div>
          
          {/* Center dot */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-primary"></div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default Timeline;