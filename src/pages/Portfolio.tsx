import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  ArrowRight
} from 'lucide-react';

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// ============== TYPES ==============
type ProjectCategory = 'All' | 'Websites' | 'UI / UX Design' | 'Graphic Design';

interface BaseProject {
  id: number;
  title: string;
  description: string;
  category: ProjectCategory;
}

interface WebsiteProject extends BaseProject {
  category: 'Websites';
  image: string;
  technologies: string[];
  link?: string;
  githubLink?: string;
}

interface UIUXProject extends BaseProject {
  category: 'UI / UX Design';
  images: string[];
  platform: 'Web' | 'Mobile' | 'Web & Mobile';
  tools: string[];
  projectGoal: string;
}

interface GraphicProject extends BaseProject {
  category: 'Graphic Design';
  images: string[]; // Support multiple images for flyers, visiting cards (front/back), etc.
  type: 'Flyer' | 'Poster' | 'Visiting Card' | 'Social Creative' | 'Branding' | 'Logo';
}

type Project = WebsiteProject | UIUXProject | GraphicProject;

// ============== SAMPLE DATA ==============
const projects: Project[] = [
  // Website Projects
  {
    id: 1,
    title: "eBuddy - Recommerce Platform",
    description: "Ebuddy turns your old electronics into new opportunities — get the best price from trusted shopkeepers in just a few clicks.",
    category: "Websites",
    image: "/portfolio/websites/ebuddy.png",
    technologies: ["React", "TypeScript", "Node.js", "MongoDB", "Socket.io"],
    link: "https://www.ebuddyy.com/",
  },
  // UI/UX Projects
  {
    id: 2,
    title: "Link N Date - Dating App",
    description: "Modern dating application UI/UX design focused on meaningful connections and user safety.",
    category: "UI / UX Design",
    images: [
      "/portfolio/ui-ux/link-n-date/link-n-date-1.jpeg",
      "/portfolio/ui-ux/link-n-date/link-n-date-2.png",
      "/portfolio/ui-ux/link-n-date/link-n-date-3.jpeg",
      "/portfolio/ui-ux/link-n-date/link-n-date-4.jpeg"
    ],
    platform: "Mobile",
    tools: ["Figma", "Adobe XD", "Principle"],
    projectGoal: "Create an intuitive and safe dating experience that focuses on genuine connections and user verification."
  },
  // Graphic Design Projects
  {
    id: 3,
    title: "Postura Brand Logo",
    description: "Professional logo design for Postura physiotherapy brand",
    category: "Graphic Design",
    images: ["/portfolio/graphicDesign/postura_logo/Postura_By_Physio_png.png"],
    type: "Logo"
  },
  {
    id: 4,
    title: "Postura Visiting Cards",
    description: "Premium visiting card design with front and back layouts for Postura physiotherapy clinic",
    category: "Graphic Design",
    images: [
      "/portfolio/graphicDesign/postura_visiting_card/visiting_card_front.png",
      "/portfolio/graphicDesign/postura_visiting_card/visting_card_back.png"
    ],
    type: "Visiting Card"
  },
  {
    id: 5,
    title: "Postura Marketing Flyers",
    description: "Creative promotional flyer designs for Postura physiotherapy services",
    category: "Graphic Design",
    images: [
      "/portfolio/graphicDesign/posture_flyers/postura_1.jpeg",
      "/portfolio/graphicDesign/posture_flyers/postura_2.jpeg"
    ],
    type: "Flyer"
  }
];

const categories: ProjectCategory[] = ['All', 'Websites', 'UI / UX Design', 'Graphic Design'];

// Helper function to get preview image
const getPreviewImage = (project: Project): string => {
  if (project.category === 'UI / UX Design' || project.category === 'Graphic Design') {
    return project.images[0];
  }
  return project.image;
};

// Helper function to get category label
const getCategoryLabel = (category: ProjectCategory): string => {
  if (category === 'UI / UX Design') return 'UI/UX';
  if (category === 'Graphic Design') return 'Graphic';
  return category;
};

// ============== UNIFIED PROJECT CARD ==============
const ProjectCard: React.FC<{
  project: Project;
  index: number;
  onClick: () => void;
}> = ({ project, index, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-xl cursor-pointer aspect-[4/3]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Project Image */}
      <motion.img
        src={getPreviewImage(project)}
        alt={project.title}
        className="absolute inset-0 w-full h-full object-cover"
        animate={{ scale: isHovered ? 1.05 : 1 }}
        transition={{ duration: 0.4 }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

      {/* Hover Overlay */}
      <motion.div
        className="absolute inset-0 bg-primary/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Category Tag */}
      <div className="absolute top-4 left-4">
        <span className="px-3 py-1 text-xs font-medium bg-neutral-900/80 backdrop-blur-sm rounded-full text-white border border-neutral-700">
          {getCategoryLabel(project.category)}
        </span>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="text-lg font-orbitron font-bold text-white mb-1 line-clamp-1">
          {project.title}
        </h3>

        {/* View indicator on hover */}
        <motion.div
          className="flex items-center gap-1 text-primary text-sm font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
          transition={{ duration: 0.2 }}
        >
          View Project <ArrowRight size={14} />
        </motion.div>
      </div>
    </motion.div>
  );
};

// ============== UI/UX PROJECT MODAL ==============
const UIUXModal: React.FC<{
  project: UIUXProject | null;
  onClose: () => void;
}> = ({ project, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = useCallback(() => {
    if (!project) return;
    setCurrentIndex((prev) => (prev === 0 ? project.images.length - 1 : prev - 1));
  }, [project]);

  const handleNext = useCallback(() => {
    if (!project) return;
    setCurrentIndex((prev) => (prev === project.images.length - 1 ? 0 : prev + 1));
  }, [project]);

  // Keyboard & scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    if (project) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [project, handlePrev, handleNext, onClose]);

  // Reset index when project changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [project]);

  if (!project) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 cursor-pointer"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-md" />

      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl glass cursor-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Inside Modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-neutral-800/90 backdrop-blur-sm flex items-center justify-center text-white hover:bg-neutral-700 transition-colors cursor-pointer shadow-lg"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
          {/* Image Carousel - Takes Priority */}
          <div className="relative w-full lg:w-3/5 h-72 sm:h-96 lg:h-[80vh] bg-neutral-900 flex-shrink-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentIndex}
                src={project.images[currentIndex]}
                alt={`${project.title} - Screen ${currentIndex + 1}`}
                className="w-full h-full object-contain"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </AnimatePresence>

            {/* Navigation Arrows */}
            {project.images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {project.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${currentIndex === i ? 'bg-primary w-6' : 'bg-white/50 hover:bg-white/80'
                    }`}
                />
              ))}
            </div>
          </div>

          {/* Project Info - Compact */}
          <div className="w-full lg:w-2/5 p-6 lg:p-8 overflow-y-auto">
            {/* Platform Badge */}
            <div className="flex items-center gap-2 mb-3">
              {project.platform.includes('Mobile') && <Smartphone size={16} className="text-primary" />}
              {project.platform.includes('Web') && <Monitor size={16} className="text-primary" />}
              <span className="text-sm text-primary font-medium">{project.platform}</span>
            </div>

            <h2 className="text-2xl lg:text-3xl font-orbitron font-bold mb-4">{project.title}</h2>

            <div className="space-y-5">
              {/* Problem → Solution */}
              <div>
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  The Challenge
                </h3>
                <p className="text-neutral-300 text-sm leading-relaxed">{project.projectGoal}</p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  The Solution
                </h3>
                <p className="text-neutral-300 text-sm leading-relaxed">{project.description}</p>
              </div>

              {/* Tools */}
              <div>
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Tools Used
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.tools.map((tool, i) => (
                    <span key={i} className="px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg text-xs">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Thumbnail Navigation */}
              <div>
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                  All Screens ({project.images.length})
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {project.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${currentIndex === i ? 'border-primary' : 'border-transparent hover:border-neutral-600'
                        }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============== WEBSITE PROJECT MODAL ==============
const WebsiteModal: React.FC<{
  project: WebsiteProject | null;
  onClose: () => void;
}> = ({ project, onClose }) => {

  // Keyboard & scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (project) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [project, onClose]);

  if (!project) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 cursor-pointer"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-md" />

      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl glass cursor-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Inside Modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-neutral-800/90 backdrop-blur-sm flex items-center justify-center text-white hover:bg-neutral-700 transition-colors cursor-pointer shadow-lg"
        >
          <X size={20} />
        </button>

        {/* Image */}
        <div className="relative w-full h-56 sm:h-72 md:h-80 lg:h-96 bg-neutral-900 flex-shrink-0">
          <img
            src="/portfolio/websites/ebuddy2.png"
            alt={project.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8">
          <span className="text-primary text-sm font-medium mb-2 block">Website</span>
          <h2 className="text-2xl lg:text-3xl font-orbitron font-bold mb-3">{project.title}</h2>

          <p className="text-neutral-300 mb-6 leading-relaxed">{project.description}</p>

          {/* Tech Stack */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Tech Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((tech, i) => (
                <span key={i} className="px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg text-sm">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-3">
            {project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary flex items-center hover-effect"
              >
                <ExternalLink size={16} className="mr-2" /> View Live
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============== GRAPHIC PROJECT MODAL ==============
const GraphicModal: React.FC<{
  project: GraphicProject | null;
  onClose: () => void;
}> = ({ project, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = useCallback(() => {
    if (!project) return;
    setCurrentIndex((prev) => (prev === 0 ? project.images.length - 1 : prev - 1));
  }, [project]);

  const handleNext = useCallback(() => {
    if (!project) return;
    setCurrentIndex((prev) => (prev === project.images.length - 1 ? 0 : prev + 1));
  }, [project]);

  // Keyboard & scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    if (project) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [project, handlePrev, handleNext, onClose]);

  // Reset index when project changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [project]);

  if (!project) return null;

  const hasMultipleImages = project.images.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-md" />

      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 max-w-5xl w-full max-h-[90vh] overflow-y-auto cursor-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Inside Modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-neutral-800/90 backdrop-blur-sm flex items-center justify-center text-white hover:bg-neutral-700 transition-colors cursor-pointer shadow-lg"
        >
          <X size={20} />
        </button>

        {/* Image Container with Carousel */}
        <div className="relative rounded-xl overflow-hidden bg-neutral-900 shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              src={project.images[currentIndex]}
              alt={`${project.title} - ${hasMultipleImages ? `Image ${currentIndex + 1}` : ''}`}
              className="w-full h-auto max-h-[70vh] md:max-h-[85vh] object-contain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </AnimatePresence>

          {/* Navigation Arrows - Larger for mobile */}
          {hasMultipleImages && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-12 h-12 md:w-10 md:h-10 rounded-full bg-neutral-900/90 backdrop-blur-sm flex items-center justify-center text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-lg"
              >
                <ChevronLeft size={24} className="md:w-5 md:h-5" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-12 h-12 md:w-10 md:h-10 rounded-full bg-neutral-900/90 backdrop-blur-sm flex items-center justify-center text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-lg"
              >
                <ChevronRight size={24} className="md:w-5 md:h-5" />
              </button>
            </>
          )}

          {/* Dots Indicator - Better positioned for mobile */}
          {hasMultipleImages && (
            <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-neutral-900/70 backdrop-blur-sm px-3 py-2 rounded-full">
              {project.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${currentIndex === i ? 'bg-primary w-6' : 'bg-white/50 hover:bg-white/80'
                    }`}
                />
              ))}
            </div>
          )}

          {/* Image Counter - Top left, smaller on mobile */}
          {hasMultipleImages && (
            <div className="absolute top-3 md:top-4 left-3 md:left-4 px-2.5 py-1.5 md:px-3 md:py-1.5 bg-neutral-900/80 backdrop-blur-sm rounded-full text-white text-xs md:text-sm">
              {currentIndex + 1} / {project.images.length}
              {project.type === 'Visiting Card' && (
                <span className="ml-1.5 md:ml-2 text-neutral-400 hidden sm:inline">
                  ({currentIndex === 0 ? 'Front' : 'Back'})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Title & Description - Below image on mobile, overlay on desktop */}
        <div className="block md:hidden p-4 bg-neutral-900">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-primary text-xs font-medium uppercase tracking-wider">
              {project.type}
            </span>
          </div>
          <h3 className="text-lg font-orbitron font-bold text-white mb-2">{project.title}</h3>
          <p className="text-sm text-neutral-300 leading-relaxed">{project.description}</p>
        </div>

        {/* Desktop overlay - Hidden on mobile */}
        <div className="hidden md:block absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-neutral-900/80 via-neutral-900/40 to-transparent pointer-events-none">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-primary text-xs font-medium uppercase tracking-wider">
                {project.type}
              </span>
            </div>
            <h3 className="text-xl font-orbitron font-bold text-white mb-1.5 drop-shadow-lg">{project.title}</h3>
            <p className="text-sm text-neutral-200 leading-relaxed drop-shadow-md">{project.description}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============== MAIN COMPONENT ==============
const Portfolio: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<ProjectCategory>('All');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Filter projects based on category
  const filteredProjects = activeFilter === 'All'
    ? projects
    : projects.filter(p => p.category === activeFilter);

  useEffect(() => {
    // Animate on scroll
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

  // Handle project click
  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
  };

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
              Explore our finest work — crafted with precision and passion.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="py-8 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category, index) => (
              <motion.button
                key={category}
                onClick={() => setActiveFilter(category)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${activeFilter === category
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Grid - Unified Cards */}
      <section className="py-12 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  onClick={() => handleProjectClick(project)}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Empty State */}
          {filteredProjects.length === 0 && (
            <div className="text-center py-20">
              <p className="text-neutral-400 text-lg">No projects found in this category.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-neutral-900 relative">
        <div className="absolute inset-0 bg-glow opacity-20"></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2
              className="text-3xl md:text-4xl lg:text-5xl font-orbitron font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Let's Build Something <span className="text-primary">Together</span>
            </motion.h2>

            <motion.p
              className="text-lg text-neutral-300 mb-10 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Ready to bring your vision to life? Let's collaborate to create
              innovative digital solutions that drive your business forward.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Link
                to="/contact"
                className="btn btn-primary neon-border hover-effect text-lg px-8 py-4"
              >
                Start a Project
              </Link>
              <Link
                to="/services"
                className="btn btn-outline hover-effect text-lg px-8 py-4"
              >
                Explore Services
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Modals */}
      <AnimatePresence>
        {selectedProject?.category === 'UI / UX Design' && (
          <UIUXModal
            project={selectedProject as UIUXProject}
            onClose={() => setSelectedProject(null)}
          />
        )}
        {selectedProject?.category === 'Websites' && (
          <WebsiteModal
            project={selectedProject as WebsiteProject}
            onClose={() => setSelectedProject(null)}
          />
        )}
        {selectedProject?.category === 'Graphic Design' && (
          <GraphicModal
            project={selectedProject as GraphicProject}
            onClose={() => setSelectedProject(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Portfolio;
