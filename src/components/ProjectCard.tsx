import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Github } from 'lucide-react';

export interface ProjectCardProps {
  id: number;
  title: string;
  description: string;
  category: string;
  image: string;
  technologies: string[];
  link?: string;
  githubLink?: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  description,
  category,
  image,
  technologies,
  link,
  githubLink
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
      className="group relative overflow-hidden rounded-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Project Image */}
      <div className="aspect-[4/3] overflow-hidden">
        <motion.img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
          animate={{ 
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ duration: 0.4 }}
        />
      </div>
      
      {/* Overlay */}
      <motion.div 
        className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm flex flex-col justify-end p-6"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <span className="text-primary text-sm font-medium mb-2 block">
            {category}
          </span>
          <h3 className="text-xl font-orbitron font-bold mb-2">
            {title}
          </h3>
          <p className="text-neutral-300 text-sm mb-4 line-clamp-3">
            {description}
          </p>
          
          {/* Technologies */}
          <div className="flex flex-wrap gap-2 mb-4">
            {technologies.map((tech, index) => (
              <span 
                key={index} 
                className="text-xs bg-neutral-800 text-neutral-300 px-2 py-1 rounded"
              >
                {tech}
              </span>
            ))}
          </div>
          
          {/* Links */}
          <div className="flex gap-3">
            {link && (
              <a 
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary py-2 px-4 flex items-center text-sm hover-effect"
              >
                <ExternalLink size={14} className="mr-1" /> View Project
              </a>
            )}
            
            {githubLink && (
              <a 
                href={githubLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline py-2 px-4 flex items-center text-sm hover-effect"
              >
                <Github size={14} className="mr-1" /> Source Code
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProjectCard;