import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ProjectCard, { ProjectCardProps } from '../components/ProjectCard';

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Sample project data
const projects: ProjectCardProps[] = [
  {
    id: 1,
    title: "Fintech Dashboard",
    description: "A comprehensive financial analytics platform with real-time data visualization, transaction management, and investment tracking.",
    category: "Web Application",
    image: "https://images.pexels.com/photos/7433823/pexels-photo-7433823.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    technologies: ["React", "TypeScript", "D3.js", "Node.js", "MongoDB"],
    link: "#",
    githubLink: "#"
  },
  {
    id: 2,
    title: "E-Commerce Platform",
    description: "A fully responsive e-commerce solution with inventory management, secure payment processing, and customer relationship tools.",
    category: "Web & Mobile",
    image: "https://images.pexels.com/photos/8386365/pexels-photo-8386365.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    technologies: ["React", "Redux", "Node.js", "Express", "PostgreSQL", "Stripe"],
    link: "#",
    githubLink: "#"
  },
  {
    id: 3,
    title: "Health & Fitness App",
    description: "A mobile application for tracking fitness goals, nutrition, and personal wellness with customized workout plans and progress analytics.",
    category: "Mobile Application",
    image: "https://images.pexels.com/photos/7948063/pexels-photo-7948063.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    technologies: ["React Native", "Firebase", "Redux", "GraphQL"],
    link: "#",
    githubLink: "#"
  },
  {
    id: 4,
    title: "Smart Home IoT System",
    description: "An integrated IoT platform connecting smart home devices with an intuitive dashboard for monitoring and controlling all aspects of home automation.",
    category: "IoT Solution",
    image: "https://images.pexels.com/photos/1181316/pexels-photo-1181316.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    technologies: ["Arduino", "Raspberry Pi", "MQTT", "React", "Node.js"],
    link: "#"
  },
  {
    id: 5,
    title: "Corporate Branding Suite",
    description: "A complete brand identity redesign including logo, style guide, marketing materials, and website for a corporate client in the technology sector.",
    category: "UI/UX Design",
    image: "https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    technologies: ["Figma", "Adobe CC", "Webflow", "Brand Strategy"],
    link: "#"
  },
  {
    id: 6,
    title: "Logistics Management System",
    description: "An enterprise solution for logistics companies to optimize routes, track shipments, and manage inventory across multiple warehouses.",
    category: "Web Application",
    image: "https://images.pexels.com/photos/7648066/pexels-photo-7648066.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    technologies: ["Angular", "Java Spring Boot", "PostgreSQL", "Docker", "AWS"],
    link: "#"
  },
  {
    id: 7,
    title: "AR Retail Experience",
    description: "An augmented reality application allowing customers to visualize products in their own space before making purchase decisions.",
    category: "AR/VR",
    image: "https://images.pexels.com/photos/8728388/pexels-photo-8728388.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    technologies: ["Unity", "ARKit", "ARCore", "C#", "3D Modeling"],
    link: "#"
  },
  {
    id: 8,
    title: "Educational Learning Platform",
    description: "A comprehensive e-learning platform with course management, interactive lessons, assessment tools, and student progress tracking.",
    category: "Web Application",
    image: "https://images.pexels.com/photos/5428830/pexels-photo-5428830.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    technologies: ["React", "Node.js", "MongoDB", "Socket.io", "AWS"],
    link: "#",
    githubLink: "#"
  },
  {
    id: 9,
    title: "Crypto Wallet & Exchange",
    description: "A secure cryptocurrency wallet and exchange platform with real-time price tracking, portfolio management, and trading capabilities.",
    category: "Web & Mobile",
    image: "https://images.pexels.com/photos/8358095/pexels-photo-8358095.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    technologies: ["React Native", "Node.js", "Blockchain API", "WebSockets"],
    link: "#"
  }
];

const Portfolio: React.FC = () => {
  const [filteredProjects, setFilteredProjects] = useState(projects);
  const [activeFilter, setActiveFilter] = useState("All");
  
  // Get unique categories for filter buttons
  const categories = ["All", ...Array.from(new Set(projects.map(item => item.category)))];
  
  // Filter projects based on selected category
  const handleFilterClick = (category: string) => {
    setActiveFilter(category);
    
    if (category === "All") {
      setFilteredProjects(projects);
      return;
    }
    
    const filtered = projects.filter(project => project.category === category);
    setFilteredProjects(filtered);
  };
  
  useEffect(() => {
    // Animate section headers on scroll
    gsap.fromTo(
      '.portfolio-title',
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.portfolio-title',
          start: 'top 80%',
          once: true
        }
      }
    );
    
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Section */}
      <section className="pt-32 pb-20 relative grid-bg">
        <div className="absolute inset-0 bg-glow opacity-40"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-orbitron font-bold mb-6 leading-tight portfolio-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Our <span className="text-primary">Portfolio</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-neutral-300 mb-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Explore our latest projects showcasing our expertise and creativity
              in delivering exceptional digital solutions.
            </motion.p>
          </div>
        </div>
      </section>
      
      {/* Portfolio Gallery */}
      <section className="py-16 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((category, index) => (
              <motion.button
                key={index}
                onClick={() => handleFilterClick(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover-effect ${
                  activeFilter === category 
                    ? 'bg-primary text-white' 
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {category}
              </motion.button>
            ))}
          </div>
          
          {/* Projects Grid */}
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} {...project} />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-neutral-900 relative">
        <div className="absolute inset-0 bg-glow opacity-20"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <motion.h2
              className="text-3xl md:text-4xl font-orbitron font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Ready to build something amazing?
            </motion.h2>
            
            <motion.p
              className="text-lg text-neutral-300 mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Let's collaborate to create innovative digital solutions that
              drive your business forward.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Link to="/contact" className="btn btn-primary neon-border hover-effect">
                Start a Project
              </Link>
              <Link to="/services" className="btn btn-outline hover-effect">
                Explore Our Services
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default Portfolio;