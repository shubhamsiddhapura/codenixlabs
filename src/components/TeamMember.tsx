import React from 'react';
import { motion } from 'framer-motion';
import { Twitter, Linkedin, Github } from 'lucide-react';

interface TeamMemberProps {
  name: string;
  position: string;
  image: string;
  bio: string;
  social: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  index: number;
}

const TeamMember: React.FC<TeamMemberProps> = ({
  name,
  position,
  image,
  bio,
  social,
  index
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <div className="glass rounded-xl overflow-hidden relative group hover-effect">
        {/* Image */}
        <div className="aspect-[4/5] overflow-hidden">
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/90 via-neutral-900/50 to-transparent p-6 flex flex-col justify-end">
          <h3 className="text-xl font-orbitron font-bold mb-1 group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-primary mb-2">{position}</p>
          <p className="text-neutral-300 text-sm mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-3">
            {bio}
          </p>
          
          {/* Social Icons */}
          <div className="flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {social.twitter && (
              <a 
                href={social.twitter} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-white transition-colors hover-effect"
              >
                <Twitter size={16} />
              </a>
            )}
            
            {social.linkedin && (
              <a 
                href={social.linkedin} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-white transition-colors hover-effect"
              >
                <Linkedin size={16} />
              </a>
            )}
            
            {social.github && (
              <a 
                href={social.github} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-white transition-colors hover-effect"
              >
                <Github size={16} />
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TeamMember;