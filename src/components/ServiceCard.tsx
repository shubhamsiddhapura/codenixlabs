import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ServiceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ title, description, icon, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true, margin: "-100px" }}
      className="glass p-6 rounded-xl relative group hover-effect"
    >
      {/* Gradient Border Hover Effect */}
      <Link to="/services">
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 rounded-xl border border-primary opacity-75 blur-[2px]"></div>
          <div className="absolute inset-0 rounded-xl border border-primary"></div>
        </div>

        <div className="relative z-10">
          {/* Icon Container */}
          <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center mb-4 text-primary">
            {icon}
          </div>

          <h3 className="text-xl font-orbitron font-bold mb-3">{title}</h3>

          <p className="text-neutral-300 mb-5">{description}</p>

          <Link
            to="/services"
            className="inline-flex items-center text-primary hover:text-white transition-colors font-medium group"
          >
            Learn More
            <ArrowRight
              size={16}
              className="ml-1 group-hover:ml-2 transition-all duration-300"
            />
          </Link>
        </div></Link>
    </motion.div>
  );
};

export default ServiceCard;