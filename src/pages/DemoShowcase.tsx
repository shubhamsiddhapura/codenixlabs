import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';

// Demo categories configuration
interface DemoCategory {
  title: string;
  description: string;
  image: string;
  demoUrl: string;
}

// Graphic Design categories configuration
interface GraphicCategory {
  title: string;
  images: string[];
}

const demoCategories: DemoCategory[] = [
  {
    title: 'Fitness & Gym Website',
    description: 'Modern fitness centers & personal training studios',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
    demoUrl: 'https://fitness-repo.vercel.app/'
  },
  {
    title: 'Clothing & Fashion Brand',
    description: 'E-commerce for apparel & lifestyle brands',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&auto=format&fit=crop&q=80',
    demoUrl: 'https://clothing-repo.vercel.app/'
  },
  {
    title: 'Luxury & Wedding Business',
    description: 'Premium wedding planning & event services',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80',
    demoUrl: 'https://luxurywedding2.vercel.app/'
  },
  {
    title: 'Restaurant & Café Website',
    description: 'Dining experiences & culinary excellence',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
    demoUrl: 'https://restaurant-landingpage-sepia.vercel.app/'
  },
  {
    title: 'Resort & Hospitality',
    description: 'Luxury resorts & vacation destinations',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop&q=80',
    demoUrl: 'https://resort-repo.vercel.app/'
  },
  {
    title: 'Hotel & Travel Website',
    description: 'Boutique hotels & travel accommodations',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80',
    demoUrl: 'https://hotels-travels-repo.vercel.app/'
  }
];

const graphicCategories: GraphicCategory[] = [
  {
    title: 'Festival Cards',
    images: [
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    title: 'Custom Flyers',
    images: [
      '/portfolio/graphicDesign/posture_flyers/postura_1.jpeg',
      '/portfolio/graphicDesign/posture_flyers/postura_2.jpeg'
    ]
  },
  {
    title: 'Logo Design',
    images: [
      '/portfolio/graphicDesign/postura_logo/Postura_By_Physio_png.png'
    ]
  },
  {
    title: 'Visiting Cards',
    images: [
      '/portfolio/graphicDesign/postura_visiting_card/visiting_card_front.png',
      '/portfolio/graphicDesign/postura_visiting_card/visting_card_back.png'
    ]
  }
];

const DemoShowcase: React.FC = () => {
  const [selectedGallery, setSelectedGallery] = useState<GraphicCategory | null>(null);
  const [activeTab, setActiveTab] = useState<'demos' | 'designs'>('demos');

  return (
    <div className="min-h-screen bg-background py-20 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <section className="py-8 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center ">
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-orbitron font-bold mb-6 tracking-tight"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Demo Showcase
            </motion.h1>
            <motion.p
              className="text-xl text-neutral-300 mb-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Explore our portfolio of work across websites and graphic design
            </motion.p>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="py-8 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            <motion.button
              onClick={() => setActiveTab('demos')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === 'demos'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Live Demos
            </motion.button>
            <motion.button
              onClick={() => setActiveTab('designs')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === 'designs'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Designs
            </motion.button>
          </div>
        </div>
      </section>

      {/* Website Demo Section */}
      {activeTab === 'demos' && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto mb-32"
        >
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-block mb-3">
              <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 tracking-wide">
                LIVE DEMOS
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-orbitron font-semibold mb-4 tracking-tight">
              Website Demo Showcase
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
              Explore our portfolio of professional websites across different industries
            </p>
          </motion.div>

          {/* Demo Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {demoCategories.map((category, index) => (
              <WebsiteDemoCard key={index} category={category} index={index} />
            ))}
          </div>
        </motion.section>
      )}

      {/* Graphic Design Section */}
      {activeTab === 'designs' && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto mb-20"
        >
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block mb-3">
              <span className="px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium border border-secondary/20 tracking-wide">
                DESIGN PORTFOLIO
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-orbitron font-semibold mb-4 tracking-tight">
              Graphic Design Works
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
              Custom visuals crafted for branding, promotions, and marketing
            </p>
          </motion.div>

          {/* Graphic Design Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {graphicCategories.map((category, index) => (
              <GraphicDesignCard
                key={index}
                category={category}
                index={index}
                onClick={() => setSelectedGallery(category)}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        gallery={selectedGallery}
        onClose={() => setSelectedGallery(null)}
      />

      {/* Footer Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="max-w-7xl mx-auto mt-20 text-center"
      >
        <p className="text-neutral-400 text-sm">
          Internal Demo Page • Not for public distribution
        </p>
      </motion.div>
    </div>
  );
};

// Website Demo Card Component
interface WebsiteDemoCardProps {
  category: DemoCategory;
  index: number;
}

const WebsiteDemoCard: React.FC<WebsiteDemoCardProps> = ({ category, index }) => {
  const handleClick = () => {
    window.open(category.demoUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true, margin: "-100px" }}
      whileHover={{ y: -8 }}
      onClick={handleClick}
      className="group relative overflow-hidden rounded-xl cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={`View ${category.title} demo`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Card Container with Glass Effect */}
      <div className="relative h-[400px] overflow-hidden rounded-xl glass border border-neutral-700/50 group-hover:border-primary/50 transition-all duration-300">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={category.image}
            alt={category.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background/95"></div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>

        {/* Content */}
        <div className="relative z-20 h-full flex flex-col justify-end p-6">
          {/* Category Badge */}
          <div className="mb-4 inline-flex">
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium border border-primary/30">
              Live Demo
            </span>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-orbitron font-bold mb-2 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-secondary group-hover:bg-clip-text transition-all duration-300">
            {category.title}
          </h3>

          {/* Description */}
          <p className="text-neutral-300 mb-4 text-sm">
            {category.description}
          </p>

          {/* CTA - Appears on Hover */}
          <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <span className="text-white font-medium flex items-center gap-2">
              View Live Demo
              <ExternalLink size={18} className="text-primary" />
            </span>
          </div>
        </div>

        {/* Glow Effect on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0">
          <div className="absolute inset-0 bg-glow"></div>
        </div>

        {/* Border Glow Effect */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 pointer-events-none">
          <div className="absolute inset-0 rounded-xl border border-primary opacity-50 blur-sm"></div>
        </div>
      </div>

      {/* Bottom Shadow on Hover */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4/5 h-4 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
    </motion.div>
  );
};

// Graphic Design Card Component
interface GraphicDesignCardProps {
  category: GraphicCategory;
  index: number;
  onClick: () => void;
}

const GraphicDesignCard: React.FC<GraphicDesignCardProps> = ({ category, index, onClick }) => {
  const previewImage = category.images[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true, margin: "-100px" }}
      whileHover={{ y: -8 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={`View ${category.title} gallery`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Card Container with Glass Effect */}
      <div className="relative h-[350px] overflow-hidden rounded-xl glass border border-neutral-700/50 group-hover:border-secondary/50 transition-all duration-300">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={previewImage}
            alt={category.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background/90"></div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>

        {/* Content */}
        <div className="relative z-20 h-full flex flex-col justify-end p-5">
          {/* Image Count Badge */}
          <div className="mb-3 inline-flex">
            <span className="px-2.5 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-medium border border-secondary/30">
              {category.images.length} {category.images.length === 1 ? 'Image' : 'Images'}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xl font-orbitron font-bold mb-3 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-secondary group-hover:to-accent group-hover:bg-clip-text transition-all duration-300">
            {category.title}
          </h3>

          {/* CTA - Appears on Hover */}
          <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <span className="text-white font-medium text-sm">
              View Gallery
            </span>
            <div className="w-8 h-8 rounded-full bg-secondary/20 border border-secondary/30 flex items-center justify-center">
              <ExternalLink size={14} className="text-secondary" />
            </div>
          </div>
        </div>

        {/* Glow Effect on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0">
          <div className="absolute inset-0 bg-glow"></div>
        </div>

        {/* Border Glow Effect */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 pointer-events-none">
          <div className="absolute inset-0 rounded-xl border border-secondary opacity-50 blur-sm"></div>
        </div>
      </div>

      {/* Bottom Shadow on Hover */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4/5 h-4 bg-secondary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
    </motion.div>
  );
};

// Image Gallery Modal Component
interface ImageGalleryModalProps {
  gallery: GraphicCategory | null;
  onClose: () => void;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ gallery, onClose }) => {
  if (!gallery) return null;

  const imageCount = gallery.images.length;
  
  // Determine modal width based on image count
  const getModalWidthClass = () => {
    if (imageCount === 1) return 'max-w-fit';
    if (imageCount === 2) return 'max-w-5xl';
    return 'max-w-6xl';
  };

  // Determine grid layout based on image count
  const getGridClass = () => {
    if (imageCount === 1) return 'flex justify-center';
    if (imageCount === 2) return 'grid grid-cols-1 md:grid-cols-2';
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/95 backdrop-blur-md"></div>

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`relative z-10 w-auto max-h-[90vh] overflow-y-auto cursor-auto ${getModalWidthClass()}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Container */}
          <div className="glass rounded-2xl p-6 sm:p-8 border border-neutral-700/50 min-w-[300px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-orbitron font-bold text-white mb-2">
                  {gallery.title}
                </h3>
                <p className="text-neutral-400 text-sm">
                  {gallery.images.length} {gallery.images.length === 1 ? 'Image' : 'Images'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700/50 hover:border-primary/50 flex items-center justify-center transition-all duration-300 group"
                aria-label="Close gallery"
              >
                <X size={20} className="text-neutral-400 group-hover:text-primary transition-colors" />
              </button>
            </div>

            {/* Image Grid */}
            <div className={`gap-6 ${getGridClass()}`}>
              {gallery.images.map((image, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="relative group overflow-hidden rounded-xl"
                >
                  <div className="relative overflow-hidden rounded-xl border border-neutral-700/50 hover:border-primary/30 transition-all duration-300">
                    <img
                      src={image}
                      alt={`${gallery.title} ${index + 1}`}
                      className={`h-auto object-contain transition-transform duration-500 group-hover:scale-105 ${
                        imageCount === 1 ? 'max-h-[70vh] w-auto' : 'w-full max-h-[60vh]'
                      }`}
                    />
                    {/* Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Close Button (Mobile) */}
            <div className="mt-6 text-center md:hidden">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary font-medium transition-all duration-300"
              >
                Close Gallery
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DemoShowcase;
