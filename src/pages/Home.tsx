import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import { Smartphone, Globe, Palette, BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';

import HeroSection from '../components/HeroSection';
import ServiceCard from '../components/ServiceCard';
import BlogCard from '../components/BlogCard';
import TestimonialCard, { Testimonial } from '../components/TestimonialCard';
import { BlogService } from '../services/blogService';
import { BlogPost } from '../types/blog';

// Testimonials data
const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Jashank Desai",
    role: "CEO & Founder",
    company: "Protonix AI Pvt. Ltd.",
    location: "United States of America",
    image: "/jd.png",
    review: "Working with Codenix Labs was a great experience. They handled our entire UI/UX with clarity, creativity, and strong attention to detail. The team was responsive, open to feedback, and consistently delivered high-quality designs on time. Their sense of micro-interactions and smooth communication really stood out. I highly recommend Codenix Labs for top-tier UI/UX work and look forward to collaborating again.",
    rating: 5
  },
  {
    id: 2,
    name: "Dr. Priyanshi Pandya (PT)",
    role: "Founder",
    company: "Postura By Physio",
    location: "India",
    image: "/portfolio/testimonials/posturaByPhysio/postura_by-physio.png",
    review: "Working with Codenix Labs was a great experience. They designed our logo and flyers with clarity, creativity, and a strong sense of market understanding, using color palettes that perfectly balanced calmness and energy. The team took time to understand our domain, delivering modern, versatile designs that truly stand out. They were professional, responsive, open to feedback, and consistently delivered high-quality work ahead of schedule. I highly recommend Codenix Labs and look forward to collaborating again.",
    rating: 5
  }
];

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Interface for services
interface Service {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const services: Service[] = [
  {
    title: "Web Development",
    description: "We build responsive, high-performance websites using the latest technologies to deliver exceptional user experiences.",
    icon: <Globe size={24} />
  },
  {
    title: "Mobile App Development",
    description: "Native and cross-platform mobile applications that provide seamless experiences across all devices.",
    icon: <Smartphone size={24} />
  },
  {
    title: "UI/UX Design",
    description: "User-centered design solutions that combine aesthetics with functionality to create intuitive interfaces.",
    icon: <Palette size={24} />
  },
  {
    title: "AI Integration",
    description: "Harness the power of artificial intelligence and machine learning to automate processes, enhance customer experiences, and gain competitive advantage.",
    icon: <BrainCircuit size={24} />
  }
];

// FAQ data
const faqData = [
  {
    question: "How long does a typical project take?",
    answer: "Project timelines vary based on complexity and scope. A simple website typically takes 2-4 weeks, while complex web applications can take 2-6 months. We provide detailed timelines during our initial consultation and keep you updated throughout the development process."
  },
  {
    question: "What technologies do you specialize in?",
    answer: "We specialize in modern web technologies including React, Node.js, Python, Flutter for mobile apps, and cloud platforms like AWS. Our team stays current with the latest frameworks and tools to deliver cutting-edge solutions that meet your specific needs."
  },
  {
    question: "Do you provide ongoing support after launch?",
    answer: "Yes, we offer comprehensive post-launch support including maintenance, updates, security patches, and feature enhancements. We provide various support packages tailored to your needs, ensuring your digital solution continues to perform optimally."
  },
  {
    question: "How do you ensure project quality and deadlines?",
    answer: "We follow agile development methodologies with regular milestone reviews, automated testing, and continuous integration. Our project management approach includes clear communication, regular updates, and quality assurance at every stage to ensure timely delivery of high-quality solutions."
  }
];

// FAQ Accordion Component
const FAQAccordion: React.FC = () => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {faqData.map((faq, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="overflow-hidden glass rounded-xl hover-effect"
        >
          <button
            onClick={() => toggleAccordion(index)}
            className="flex items-center justify-between w-full p-6 text-left transition-colors duration-300 hover:bg-white/5"
          >
            <h3 className="pr-4 text-lg font-bold text-white font-orbitron">
              {faq.question}
            </h3>
            <div className="flex-shrink-0">
              {openIndex === index ? (
                <ChevronUp className="w-6 h-6 transition-transform duration-300 text-primary" />
              ) : (
                <ChevronDown className="w-6 h-6 transition-transform duration-300 text-primary" />
              )}
            </div>
          </button>

          <motion.div
            initial={false}
            animate={{
              height: openIndex === index ? "auto" : 0,
              opacity: openIndex === index ? 1 : 0
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">
              <div className="h-px mb-4 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20"></div>
              <p className="leading-relaxed text-neutral-300">
                {faq.answer}
              </p>
            </div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
};
const Home: React.FC = () => {
  const [featuredPosts, setFeaturedPosts] = React.useState<BlogPost[]>([]);

  useEffect(() => {
    // Load featured blog posts
    const loadFeaturedPosts = async () => {
      try {
        const posts = await BlogService.getFeaturedPosts(3);
        setFeaturedPosts(posts);
      } catch (error) {
        console.error('Error loading featured posts:', error);
      }
    };

    loadFeaturedPosts();

    // Parallax effect on scroll for featured projects
    gsap.utils.toArray('.project-card').forEach((element, i) => {
      gsap.fromTo(
        element,
        { y: i % 2 === 0 ? 100 : 0 },
        {
          y: i % 2 === 0 ? 0 : 100,
          ease: 'none',
          scrollTrigger: {
            trigger: element,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      );
    });

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
      <HeroSection />

      {/* Services Section */}
      <section className="relative py-20">
        <div className="container px-4 mx-auto sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <motion.h2
              className="section-title neon-text"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Our Services
            </motion.h2>
            <motion.p
              className="section-subtitle"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              We deliver cutting-edge solutions tailored to your business needs
            </motion.p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service, index) => (
              <ServiceCard
                key={service.title}
                title={service.title}
                description={service.description}
                icon={service.icon}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Showcase Section */}
      <section className="relative py-24 overflow-hidden grid-bg">
        <div className="absolute inset-0 bg-glow opacity-30"></div>

        <div className="container relative z-10 px-4 mx-auto sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto mb-16 text-center">
            <motion.h2
              className="text-4xl md:text-5xl font-orbitron font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Our Work <span className="text-primary">Speaks for Itself</span>
            </motion.h2>
            <motion.p
              className="text-xl text-neutral-300"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Transforming ideas into exceptional digital experiences
            </motion.p>
          </div>

          {/* Portfolio Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Website Development */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="group relative overflow-hidden rounded-2xl aspect-[4/3] cursor-pointer"
            >
              <Link to="/portfolio" className="block w-full h-full">
                <img
                  src="/portfolio/websites/ebuddy.png"
                  alt="Web Development"
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent"></div>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="text-primary" size={20} />
                    <span className="text-xs font-medium text-primary uppercase tracking-wider">Websites</span>
                  </div>
                  <h3 className="text-xl font-orbitron font-bold text-white mb-1">eBuddy Platform</h3>
                  <p className="text-sm text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Social networking platform
                  </p>
                </div>
              </Link>
            </motion.div>

            {/* UI/UX Design */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="group relative overflow-hidden rounded-2xl aspect-[4/3] cursor-pointer"
            >
              <Link to="/portfolio" className="block w-full h-full">
                <img
                  src="/portfolio/ui-ux/link-n-date/link-n-date-2.png"
                  alt="UI/UX Design"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent"></div>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="text-primary" size={20} />
                    <span className="text-xs font-medium text-primary uppercase tracking-wider">UI/UX Design</span>
                  </div>
                  <h3 className="text-xl font-orbitron font-bold text-white mb-1">Link N Date</h3>
                  <p className="text-sm text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Modern dating app interface
                  </p>
                </div>
              </Link>
            </motion.div>

            {/* Graphic Design */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="group relative overflow-hidden rounded-2xl aspect-[4/3] cursor-pointer"
            >
              <Link to="/portfolio" className="block w-full h-full">
                <img
                  src="/portfolio/graphicDesign/postura_logo/Postura_By_Physio_png.png"
                  alt="Graphic Design"
                  className="w-full h-full object-contain bg-neutral-900 transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent"></div>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="text-primary" size={20} />
                    <span className="text-xs font-medium text-primary uppercase tracking-wider">Graphic Design</span>
                  </div>
                  <h3 className="text-xl font-orbitron font-bold text-white mb-1">Postura Branding</h3>
                  <p className="text-sm text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Complete brand identity
                  </p>
                </div>
              </Link>
            </motion.div>
          </div>

          {/* CTA Button */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium bg-primary text-white rounded-full hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:scale-105"
            >
              View All Projects
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Blog Posts */}
      {featuredPosts.length > 0 && (
        <section className="relative py-20 bg-neutral-900">
          <div className="absolute inset-0 bg-glow opacity-20"></div>

          <div className="container relative z-10 px-4 mx-auto sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <motion.h2
                className="section-title neon-text"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                Latest Insights
              </motion.h2>
              <motion.p
                className="section-subtitle"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Stay updated with the latest trends and insights from our experts
              </motion.p>
            </div>

            <div className="grid grid-cols-1 gap-8 mb-12 md:grid-cols-2 lg:grid-cols-3">
              {featuredPosts.map((post, index) => (
                <BlogCard key={post._id} post={post} index={index} featured />
              ))}
            </div>

            <div className="text-center">
              <Link to="/blog" className="btn btn-outline neon-border hover-effect">
                View All Articles
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Technology Showcase */}
      <section className="relative py-20 overflow-hidden">
        <div className="container relative z-10 px-4 mx-auto sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <motion.h2
              className="section-title neon-text"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Technologies We Excel In
            </motion.h2>
            <motion.p
              className="section-subtitle"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Advanced tools and modern frameworks that drive our creative solutions
            </motion.p>
          </div>

          {/* Moving Technology Row */}
          <div className="relative">
            <div className="flex overflow-hidden">
              <div className="flex animate-scroll-left">
                {[
                  'React', 'Node.js', 'TypeScript', 'JavaScript',
                  'Angular', 'Next.js', 'Vue.js',
                  'React', 'Node.js', 'TypeScript', 'JavaScript',
                  'Angular', 'Next.js', 'Vue.js'
                ].map((tech, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 px-6 py-4 mx-4 transition-all duration-300 border glass rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 hover:border-primary/40"
                  >
                    <span className="text-lg font-medium text-white whitespace-nowrap">
                      {tech}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gradient overlays for smooth edges */}
            <div className="absolute top-0 left-0 z-10 w-32 h-full bg-gradient-to-r from-background to-transparent"></div>
            <div className="absolute top-0 right-0 z-10 w-32 h-full bg-gradient-to-l from-background to-transparent"></div>
          </div>

          {/* Second row moving in opposite direction */}
          <div className="relative mt-8">
            <div className="flex overflow-hidden">
              <div className="flex animate-scroll-right">
                {[
                  'MongoDB', 'Flutter', 'Firebase', 'Python', 'Django', 'Docker', 'AWS',
                  'MongoDB', 'Flutter', 'Firebase', 'Python', 'Django', 'Docker', 'AWS',
                ].map((tech, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 px-6 py-4 mx-4 transition-all duration-300 border glass rounded-xl bg-gradient-to-r from-secondary/10 to-accent/10 border-secondary/20 hover:border-secondary/40"
                  >
                    <span className="text-lg font-medium text-white whitespace-nowrap">
                      {tech}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gradient overlays for smooth edges */}
            <div className="absolute top-0 left-0 z-10 w-32 h-full bg-gradient-to-r from-background to-transparent"></div>
            <div className="absolute top-0 right-0 z-10 w-32 h-full bg-gradient-to-l from-background to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Animated Stars Background */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Animated Background Glow */}
        <motion.div
          className="absolute rounded-full top-1/3 left-1/4 w-96 h-96 bg-primary/12 blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute rounded-full bottom-1/3 right-1/4 w-96 h-96 bg-secondary/12 blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="container relative z-10 px-4 mx-auto sm:px-6 lg:px-8">

          {/* Heading */}
          <div className="mb-12 text-center">
            <motion.h2
              className="section-title neon-text"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              What Our Clients Say
            </motion.h2>

            <motion.p
              className="section-subtitle"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Trusted by founders and fast-growing companies worldwide
            </motion.p>
          </div>

          {/* Testimonial Card Component */}
          <TestimonialCard testimonials={testimonials} />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-20 bg-neutral-900">
        <div className="absolute inset-0 bg-glow opacity-20"></div>

        <div className="container relative z-10 px-4 mx-auto sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <motion.h2
              className="section-title neon-text"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Frequently Asked Questions
            </motion.h2>
            <motion.p
              className="section-subtitle"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Get answers to the most common questions about our services and process
            </motion.p>
          </div>

          <FAQAccordion />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20">
        <div className="absolute inset-0 bg-glow opacity-20"></div>

        <div className="container relative z-10 px-4 mx-auto sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="relative p-8 overflow-hidden glass md:p-12 rounded-xl">
              {/* Background decorative elements */}
              <div className="absolute w-40 h-40 rounded-full -top-20 -right-20 bg-primary/20 blur-3xl"></div>
              <div className="absolute w-40 h-40 rounded-full -bottom-20 -left-20 bg-secondary/20 blur-3xl"></div>

              <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
                <div className="text-center md:text-left">
                  <h2 className="mb-4 text-2xl font-bold md:text-3xl font-orbitron">
                    Ready to bring your ideas to life?
                  </h2>
                  <p className="mb-0 text-neutral-300 md:max-w-xl">
                    Let's collaborate to create a digital solution that exceeds your expectations
                    and helps your business thrive in the digital landscape.
                  </p>
                </div>

                <Link
                  to="/contact"
                  className="btn btn-primary neon-border whitespace-nowrap hover-effect"
                >
                  Get in Touch
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default Home;