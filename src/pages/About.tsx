import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import {
  Award,
  Users,
  Lightbulb,
  Target,
  CheckCircle
} from 'lucide-react';

import Timeline from '../components/Timeline';
import TeamMember from '../components/TeamMember';

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Sample team members data
const teamMembers = [
  {
    name: "Alex Morgan",
    position: "Founder & CEO",
    image: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    bio: "With over 15 years of experience in the tech industry, Alex leads our company vision and strategy.",
    social: {
      twitter: "#",
      linkedin: "#",
      github: "#"
    }
  },
  {
    name: "Sarah Chen",
    position: "CTO",
    image: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    bio: "Sarah oversees our technology direction and ensures we stay at the cutting edge of innovation.",
    social: {
      twitter: "#",
      linkedin: "#",
      github: "#"
    }
  },
  {
    name: "Michael Rodriguez",
    position: "Lead Designer",
    image: "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    bio: "Michael brings creativity and user-centered design principles to every project we undertake.",
    social: {
      twitter: "#",
      linkedin: "#",
      github: "#"
    }
  },
  {
    name: "Emma Johnson",
    position: "Development Lead",
    image: "https://images.pexels.com/photos/3771839/pexels-photo-3771839.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    bio: "Emma leads our development team, ensuring we deliver high-quality code and exceptional user experiences.",
    social: {
      twitter: "#",
      linkedin: "#",
      github: "#"
    }
  }
];

// Values data
const values = [
  {
    icon: <Lightbulb size={32} />,
    title: "Innovation",
    description: "We continuously explore new technologies and approaches to solve complex problems in creative ways."
  },
  {
    icon: <Target size={32} />,
    title: "Excellence",
    description: "We are committed to delivering exceptional quality in everything we do, from code to client relationships."
  },
  {
    icon: <Users size={32} />,
    title: "Collaboration",
    description: "We believe in the power of teamwork, both internally and with our clients, to achieve extraordinary results."
  },
  {
    icon: <Award size={32} />,
    title: "Integrity",
    description: "We operate with transparency, honesty, and a commitment to doing what's right for our clients and team."
  }
];

const About: React.FC = () => {
  useEffect(() => {
    // Animation for values section
    gsap.fromTo(
      '.value-card',
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.2,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.values-section',
          start: 'top 70%',
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
              className="text-4xl sm:text-5xl md:text-6xl font-orbitron font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              About <span className="text-primary">Us</span>
            </motion.h1>

            <motion.p
              className="text-xl text-neutral-300 mb-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              We're a team of forward-thinking technologists passionate about
              creating innovative solutions for the digital age.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <motion.div
              className="w-full lg:w-1/2"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-orbitron font-bold mb-6">Our Story</h2>

              <div className="space-y-4 text-lg">
                <p>
                  At Codenix Labs, we are passionate technologists, creators, and problem-solvers committed to delivering innovative IT solutions that drive growth and digital transformation for businesses of all sizes
                </p>
                <p>
                  Founded with a vision to simplify technology and empower progress, Codenix Labs brings together a team of skilled professionals with expertise across software development, web & mobile app development, cloud solutions, UI/UX design, and IT consulting. Whether you're a startup looking for a powerful digital presence or an enterprise in need of scalable solutions, we provide tailor-made services designed to meet your specific goals.
                </p>
                <p>
                  Today, we're proud to work with clients ranging from ambitious startups to established
                  enterprises, helping them navigate the ever-changing digital landscape and transform their
                  ideas into reality.
                </p>
              </div>
            </motion.div>

            <motion.div
              className="w-[80%] md:w-full lg:w-1/2 relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="rounded-xl overflow-hidden glass">
                <img
                  src="https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                  alt="Our Team"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Decorative elements */}
              <div className="absolute -z-10 w-full h-full bg-primary/20 rounded-xl -top-4 -left-4"></div>
            </motion.div>
          </div>
        </div>
      </section>



      {/* Our Values */}
      <section className="py-20 values-section relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2
              className="section-title neon-text"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Our Values
            </motion.h2>
            <motion.p
              className="section-subtitle"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              The principles that guide our work and culture
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div key={index} className="value-card glass p-6 rounded-xl opacity-0 hover-effect">
                <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center mb-5 text-primary">
                  {value.icon}
                </div>

                <h3 className="text-xl font-orbitron font-bold mb-3">
                  {value.title}
                </h3>

                <p className="text-neutral-300">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      {/*       <section className="py-20 bg-neutral-900 relative">
        <div className="absolute inset-0 bg-glow opacity-20"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <motion.h2 
              className="section-title neon-text"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Meet Our Team
            </motion.h2>
            <motion.p 
              className="section-subtitle"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              The talented individuals who bring our vision to life
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member, index) => (
              <TeamMember 
                key={index}
                name={member.name}
                position={member.position}
                image={member.image}
                bio={member.bio}
                social={member.social}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>
      
      <section className="py-20 bg-neutral-900 relative">
  <div className="absolute inset-0 bg-glow opacity-20"></div>
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
    <div className="text-center mb-16">
      <motion.h2
        className="section-title neon-text"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        Mission & Vision
      </motion.h2>
      <motion.p
        className="section-subtitle"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        What drives us and where we're headed
      </motion.p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <motion.div
        className="glass p-6 rounded-xl"
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-xl font-bold mb-3">Our Mission</h3>
        <p className="text-neutral-300">
          To deliver cutting-edge digital solutions that drive innovation, boost efficiency, and empower businesses globally.
        </p>
      </motion.div>
      <motion.div
        className="glass p-6 rounded-xl"
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-xl font-bold mb-3">Our Vision</h3>
        <p className="text-neutral-300">
          To be the most trusted and sought-after technology partner, transforming industries through innovation and excellence.
        </p>
      </motion.div>
    </div>
  </div>
</section> */}

      {/* Technologies Section */}
      <section className="py-20 relative values-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2
              className="section-title neon-text"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Technologies We Use
            </motion.h2>
            <motion.p
              className="section-subtitle"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Our modern tech stack powers real-world impact
            </motion.p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 text-center">
            {['React', 'Flutter', 'Node.js', 'Spring Boot', 'Python', 'AWS', 'Docker', 'PostgreSQL', 'MongoDB', 'TypeScript', 'Tailwind CSS', 'Firebase'].map((tech, idx) => (
              <motion.div
                key={idx}
                className="glass py-4 rounded-xl text-primary font-semibold text-lg hover:scale-105 transition-transform duration-300"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * idx, duration: 0.4 }}
              >
                {tech}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-neutral-900 relative">
        <div className="absolute inset-0 bg-glow opacity-30"></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <motion.h2
              className="text-3xl md:text-4xl font-orbitron font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Join Our Team
            </motion.h2>

            <motion.p
              className="text-lg text-neutral-300 mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              We're always looking for talented individuals to join our team. If you're passionate about
              technology and innovation, we'd love to hear from you.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link to="/contact" className="btn btn-primary neon-border hover-effect">
                View Open Positions
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default About;
