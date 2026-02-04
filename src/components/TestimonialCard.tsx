import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Testimonial interface
export interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  location: string;
  image: string;
  review: string;
  rating: number;
}

interface TestimonialCardProps {
  testimonials: Testimonial[];
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ testimonials }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
    );
  }, [testimonials.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1
    );
  }, [testimonials.length]);

  // Auto-slide every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      goToNext();
    }, 6000);

    return () => clearInterval(interval);
  }, [goToNext]);

  const currentTestimonial = testimonials[currentIndex];

  const slideVariants = {
    enter: {
      opacity: 0,
    },
    center: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
    },
  };

  return (
    <div className="relative max-w-5xl mx-auto">
      {/* Floating Avatars */}
      {[
        { top: "top-6 left-12", size: "w-14 h-14", seed: "client1" },
        { top: "top-20 left-36", size: "w-12 h-12", seed: "client2" },
        { top: "top-10 right-36", size: "w-14 h-14", seed: "client3" },
        { top: "top-24 right-12", size: "w-12 h-12", seed: "client4" },
        { top: "bottom-16 right-20", size: "w-14 h-14", seed: "client5" },
        { top: "bottom-20 left-20", size: "w-12 h-12", seed: "client6" },
        { top: "bottom-8 left-1/3", size: "w-10 h-10", seed: "client7" },
      ].map((item, i) => (
        <motion.img
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.seed}&smile=1`}
          alt="Happy Client"
          className={`absolute hidden md:flex z-20 rounded-full border-2 border-primary/40 shadow-lg ${item.size} ${item.top}`}
        />
      ))}

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative px-8 py-8 border glass rounded-3xl border-primary/20 md:px-16 group"
      >
        {/* Glow */}
        <div className="absolute transition-opacity duration-500 opacity-0 -inset-1 group-hover:opacity-100 bg-gradient-to-r from-primary/10 to-secondary/10 blur-2xl rounded-3xl -z-10" />

        {/* Row with navigation buttons and content */}
        <div className="flex items-center justify-between gap-2">
          {/* LEFT BUTTON */}
          <motion.button
            whileHover={{ scale: 1.1, x: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToPrev}
            className="items-center justify-center hidden w-12 h-12 border rounded-full md:flex border-primary/40 bg-gradient-to-r from-primary/20 to-secondary/20 text-primary hover:border-primary/70 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>

          {/* CENTER CONTENT */}
          <motion.div 
            className="flex-1"
            layout
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentIndex}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ 
                  duration: 0.3,
                  ease: "easeInOut"
                }}
                className="flex flex-col items-center max-w-3xl mx-auto text-center px-4"
              >
                {/* Main Avatar */}
                <motion.div whileHover={{ scale: 1.08 }} className="relative mb-2">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-2xl" />
                  <img
                    src={currentTestimonial.image}
                    alt={currentTestimonial.name}
                    className="relative z-10 object-cover w-48 h-48 border-2 rounded-full shadow-2xl border-primary"
                  />
                </motion.div>

                {/* Author */}
                <h4 className="text-2xl font-bold text-white font-orbitron">
                  {currentTestimonial.name}
                </h4>
                <p className="text-lg font-semibold text-primary">
                  {currentTestimonial.role}
                </p>
                <p className="text-[16px] mb-1 bg-purple-100 py-1 px-4 font-orbitron rounded-2xl text-black font-bold">
                  {currentTestimonial.company}
                </p>
                <p className="mb-1 text-[16px] py-1 px-4 rounded-2xl font-orbitron text-white font-bold">
                  {currentTestimonial.location}
                </p>

                {/* Review */}
                <p className="mb-3 text-base italic leading-relaxed md:text-lg text-neutral-200 max-w-2xl">
                  "{currentTestimonial.review}"
                </p>

                {/* Rating */}
                <div className="flex justify-center gap-1">
                  {[...Array(currentTestimonial.rating)].map((_, i) => (
                    <span key={i} className="text-3xl text-yellow-400">★</span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* RIGHT BUTTON */}
          <motion.button
            whileHover={{ scale: 1.1, x: 4 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToNext}
            className="items-center justify-center hidden w-12 h-12 border rounded-full md:flex border-primary/40 bg-gradient-to-r from-primary/20 to-secondary/20 text-primary hover:border-primary/70 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>

        {/* Mobile Navigation Buttons */}
        <div className="flex justify-center gap-4 mt-6 md:hidden">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToPrev}
            className="flex items-center justify-center w-12 h-12 border rounded-full border-primary/40 bg-gradient-to-r from-primary/20 to-secondary/20 text-primary hover:border-primary/70"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToNext}
            className="flex items-center justify-center w-12 h-12 border rounded-full border-primary/40 bg-gradient-to-r from-primary/20 to-secondary/20 text-primary hover:border-primary/70"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>

        {/* Dot Indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
              }}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-primary w-8'
                  : 'bg-primary/30 hover:bg-primary/50'
              }`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default TestimonialCard;
