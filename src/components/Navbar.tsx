import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logo from "../Asset/codenix.svg"

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Nav items with animations
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'About', path: '/about' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' },
  ];

  const variants = {
    open: { opacity: 1, x: 0 },
    closed: { opacity: 0, x: 20 },
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'py-3 bg-neutral-900/90 backdrop-blur-lg' : 'py-5 bg-transparent'
        }`}
    >
      <div className="container px-4 mx-auto sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover-effect">
            <motion.div
              whileHover={{ rotate: 0 }}
              transition={{ duration: 0.5 }}
              className="text-primary"
            >
              <span className="text-2xl font-bold text-white font-orbitron">
                CODENIX<span className="text-primary pl-2 ms-0.5">LABS</span>
              </span>
            </motion.div>
          </Link>

          {/* Desktop Menu */}
          <div className="items-center hidden space-x-8 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`relative hover-effect font-medium transition-colors hover:text-primary ${location.pathname === item.path ? 'text-primary' : 'text-white'
                  }`}
              >
                {item.name}
                {location.pathname === item.path && (
                  <motion.div
                    className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary"
                    layoutId="navbar-indicator"
                    initial={false}
                  />
                )}
              </Link>
            ))}
            <Link to="/contact" className="btn btn-primary neon-border hover-effect">
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white transition-colors hover:text-primary hover-effect"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className=" md:hidden bg-neutral-900/95 backdrop-blur-lg"
          >
            <div className="container px-4 py-4 mx-auto">
              <div className="flex flex-col space-y-4">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.name}
                    variants={variants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      to={item.path}
                      className={`block py-2 font-medium hover:pl-2 transition-all hover:text-primary ${location.pathname === item.path ? 'text-primary' : 'text-white'
                        }`}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  variants={variants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  transition={{ duration: 0.3, delay: navItems.length * 0.1 }}
                  className="pt-2"
                >
                  <Link to="/contact" className="block w-full text-center btn btn-primary">
                    Get Started
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;