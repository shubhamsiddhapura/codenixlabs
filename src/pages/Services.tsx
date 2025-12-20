import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import {
  Smartphone,
  Globe,
  Palette,
  LineChart,
  Cloud,
  BrainCircuit,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Interface for service
interface Service {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  color: string;
  image: string;
}

// Main services data
const services: Service[] = [
  {
    id: 'web-development',
    title: "Web Development",
    description: "We build responsive, high-performance websites and applications using cutting-edge technologies that deliver exceptional user experiences and drive business growth.",
    icon: <Globe size={36} />,
    features: [
      "Custom web application development",
      "Progressive Web Apps (PWA)",
      "E-commerce solutions",
      "Content Management Systems",
      "API development and integration",
      "Performance optimization"
    ],
    color: "primary",
    image: "https://blog.zegocloud.com/wp-content/uploads/2024/03/types-of-web-development-services.jpg"
  },
  {
    id: 'mobile-development',
    title: "Mobile App Development",
    description: "Native and cross-platform mobile applications that provide seamless experiences across all devices, helping you reach your audience wherever they are.",
    icon: <Smartphone size={36} />,
    features: [
      "iOS & Android native development",
      "Cross-platform solutions (React Native, Flutter)",
      "App store optimization",
      "Mobile UI/UX design",
      "Ongoing maintenance and support",
      "Integration with existing systems"
    ],
    color: "primary",
    image: "https://media.istockphoto.com/id/1174690086/photo/software-developer-freelancer-working-at-home.jpg?s=612x612&w=0&k=20&c=loFqul06ggwtkwqSmzZnYfA72Vk7nFQOvDSzAN6YbtQ="
  },
  {
    id: 'ui-ux-design',
    title: "UI/UX Design",
    description: "User-centered design solutions that combine aesthetics with functionality to create intuitive interfaces that delight users and achieve business objectives.",
    icon: <Palette size={36} />,
    features: [
      "User research and persona development",
      "Information architecture",
      "Wireframing and prototyping",
      "Visual design and branding",
      "Usability testing",
      "Design systems"
    ],
    color: "primary",
    image: "https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
  },
  {
    id: 'cloud-solutions',
    title: "Cloud Solutions",
    description: "Scalable and secure cloud infrastructure that provides the foundation for your digital transformation, enabling agility, reliability, and cost-efficiency.",
    icon: <Cloud size={36} />,
    features: [
      "Cloud migration strategy",
      "Infrastructure as Code (IaC)",
      "Serverless architecture",
      "DevOps automation",
      "Monitoring and optimization",
      "Multi-cloud management"
    ],
    color: "primary",
    image: "https://www.turningcloud.com/blog/wp-content/uploads/2021/09/all-about-cloud-computing.jpeg"
  },
  {
    id: 'data-analytics',
    title: "Data Analytics",
    description: "Transform your raw data into valuable insights that drive informed decision-making and uncover new opportunities for your business.",
    icon: <LineChart size={36} />,
    features: [
      "Business intelligence dashboards",
      "Data visualization",
      "Predictive analytics",
      "Custom reporting solutions",
      "Data integration and ETL",
      "Performance metrics and KPIs"
    ],
    color: "primary",
    image: "https://images.pexels.com/photos/669610/pexels-photo-669610.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
  },
  {
    id: 'ai-solutions',
    title: "AI Integration",
    description: "Harness the power of artificial intelligence and machine learning to automate processes, enhance customer experiences, and gain competitive advantage.",
    icon: <BrainCircuit size={36} />,
    features: [
      "Machine learning models",
      "Natural language processing",
      "Computer vision solutions",
      "Recommendation systems",
      "AI chatbots and virtual assistants",
      "Predictive maintenance"
    ],
    color: "primary",
    image: "https://media.licdn.com/dms/image/v2/D5612AQFtdcGgjx_-AA/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1696185088456?e=2147483647&v=beta&t=BfwixiTAF6cRvyEih49osqN6nsL52X3HsSGal-g0FXA"
  }
];

const Services: React.FC = () => {
  useEffect(() => {
    // Animate section headers on scroll
    const sections = document.querySelectorAll('.service-section');

    sections.forEach((section) => {
      gsap.fromTo(
        section.querySelector('.section-line'),
        { width: 0 },
        {
          width: '100%',
          duration: 1.5,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            once: true
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
      <section className="pt-32 pb-20 relative grid-bg">
        <div className="absolute inset-0 bg-glow opacity-40"></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl font-orbitron font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Our <span className="text-primary">Services</span>
            </motion.h1>

            <motion.p
              className="text-xl text-neutral-300 mb-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              We offer end-to-end digital solutions that help businesses thrive
              in today's technology-driven world.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-16 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass p-6 rounded-xl group hover-effect"
              >
                {/* Icon */}
                <div className={`w-16 h-16 rounded-lg bg-${service.color}/20 flex items-center justify-center mb-5 text-${service.color} group-hover:scale-110 transition-transform duration-300`}>
                  {service.icon}
                </div>

                {/* Title and Description */}
                <h3 className="text-2xl font-orbitron font-bold mb-3 group-hover:text-primary transition-colors">
                  {service.title}
                </h3>
                <p className="text-neutral-300 mb-5">
                  {service.description}
                </p>

                {/* View More Button */}
                <a
                  href={`#${service.id}`}
                  className="inline-flex items-center text-primary hover:text-white transition-colors font-medium group"
                >
                  View Details
                  <ArrowRight
                    size={16}
                    className="ml-1 group-hover:ml-2 transition-all duration-300"
                  />
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Service Sections */}
      {services.map((service, index) => (
        <section
          key={service.id}
          id={service.id}
          className={`py-20 ${index % 2 === 0 ? 'bg-neutral-900' : ''} service-section relative`}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Service Info */}
              <div className={`w-[90%] md:w-full ${index % 2 !== 0 ? 'lg:order-2' : 'lg:order-1'}`}>
                <motion.div
                  className="relative z-10"
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                >
                  <div className={`text-${service.color} mb-2 flex items-center`}>
                    <div className="mr-3">{service.icon}</div>
                    <div className="h-px bg-primary section-line w-0"></div>
                  </div>

                  <h2 className="text-3xl font-orbitron font-bold mb-4">
                    {service.title}
                  </h2>

                  <p className="text-lg text-neutral-300 mb-6">
                    {service.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                    {service.features.map((feature, i) => (
                      <div key={i} className="flex items-start">
                        <CheckCircle size={18} className="text-primary shrink-0 mt-1 mr-2" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/contact"
                    className="btn btn-primary neon-border hover-effect inline-block relative z-20"
                    style={{
                      position: 'relative',
                      zIndex: 20,
                      pointerEvents: 'auto'
                    }}
                  >
                    Get Started
                  </Link>
                </motion.div>
              </div>

              {/* Image/Illustration */}
              <div className={`w-[90%] md:w-full ${index % 2 !== 0 ? 'lg:order-1' : 'lg:order-2'}`}>
                <motion.div
                  className="relative"
                  initial={{ opacity: 0, x: index % 2 === 0 ? 50 : -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="aspect-video rounded-xl overflow-hidden glass">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                  </div>


                </motion.div>
              </div>
            </div>
          </div>

          {/* Background glow */}
          {/* {index % 2 === 0 && <div className="absolute inset-0 bg-glow opacity-20"></div>} */}
        </section>
      ))}

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-glow opacity-30"></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="glass p-8 md:p-12 rounded-xl relative overflow-hidden text-center">
              {/* Background decorative elements */}
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/20 blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-secondary/20 blur-3xl"></div>

              <motion.h2
                className="text-3xl md:text-4xl font-orbitron font-bold mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                Need a custom solution?
              </motion.h2>

              <motion.p
                className="text-lg text-neutral-300 mb-8 max-w-2xl mx-auto"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                We understand that every business has unique requirements. Our team is ready to create
                a tailored solution that perfectly aligns with your goals and challenges.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Link to="/contact" className="btn btn-primary neon-border hover-effect">
                  Schedule a Consultation
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default Services;