import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from "../Asset/codenix.svg"
import { 
  Code2, 
  Mail, 
  MapPin, 
  Phone, 
  Instagram, 
  Twitter, 
  Linkedin, 
  ArrowRight,
  MessageCircle
} from 'lucide-react';

const Footer: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
    // Scroll to top after navigation
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleWhatsAppClick = () => {
    const phoneNumber = '+918488080162';
    const message = 'Hello! I would like to know more about your services.';
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <footer className="pt-16 pb-8 bg-neutral-900">
      <div className="container px-4 mx-auto sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div>
            <Link to="/" className="items-center inline-block mb-4 space-x-2 hover-effect">
              <span className="text-xl font-bold font-orbitron">
                CODENIX<span className="text-primary ms-0.5">LABS</span>
              </span>
            </Link>
            <p className="mb-6 text-neutral-300">
              Transforming ideas into exceptional digital experiences through innovative technology solutions.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/codenixlabs/" className="transition-colors text-neutral-300 hover:text-primary hover-effect">
                <Instagram size={20} />
              </a>
              <a href="https://x.com/codenixlabs" className="transition-colors text-neutral-300 hover:text-primary hover-effect">
                <Twitter size={20} />
              </a>
              <a href="https://www.linkedin.com/company/codenixlabs/" className="transition-colors text-neutral-300 hover:text-primary hover-effect">
                <Linkedin size={20} />
              </a>
              <button 
                onClick={handleWhatsAppClick}
                className="transition-colors text-neutral-300 hover:text-primary hover-effect"
              >
                <MessageCircle size={20} />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-lg font-bold text-white font-orbitron">Quick Links</h3>
            <ul className="space-y-3">
              {['Home', 'Services','About', 'Blog', 'Contact'].map((item) => (
                <li key={item}>
                  <button 
                    onClick={() => handleNavigation(item === 'Home' ? '/' : `/${item.toLowerCase()}`)}
                    className="flex items-center transition-colors text-neutral-300 hover:text-primary hover-effect group text-left"
                  >
                    <ArrowRight size={16} className="mr-2 transition-opacity opacity-0 group-hover:opacity-100" />
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-4 text-lg font-bold text-white font-orbitron">Services</h3>
            <ul className="space-y-3">
              {[
                'Web Development', 
                'Mobile App Development', 
                'UI/UX Design', 
                'Cloud Solutions', 
                'AI Integration'
              ].map((service) => (
                <li key={service}>
                  <span className="flex items-center text-neutral-300 cursor-default">
                    <ArrowRight size={16} className="mr-2 opacity-0" />
                    {service}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-lg font-bold text-white font-orbitron">Contact Us</h3>
            <ul className="space-y-4">
              
              <li className="flex items-center">
                <Phone size={20} className="mr-3 text-primary shrink-0" />
                <a href="tel:+91 8488080162" className="transition-colors text-neutral-300 hover:text-primary hover-effect">
                  +91 8488080162
                </a>
              </li>
              <li className="flex items-center">
                <Mail size={20} className="mr-3 text-primary shrink-0" />
                <a href="mailto:codenixlabs@gmail.com" className="transition-colors text-neutral-300 hover:text-primary hover-effect">
                  codenixlabs@gmail.com
                </a>
              </li>
              <li className="flex items-center">
                <MessageCircle size={20} className="mr-3 text-primary shrink-0" />
                <button 
                  onClick={handleWhatsAppClick}
                  className="transition-colors text-neutral-300 hover:text-primary hover-effect text-left"
                >
                  WhatsApp Chat
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px my-8 bg-neutral-800"></div>

        {/* Copyright */}
        <div className="flex flex-col items-center justify-between md:flex-row">
          <p className="mb-4 text-sm text-neutral-400 md:mb-0">
            &copy; {new Date().getFullYear()} CODENIX LABS. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <button 
              onClick={() => handleNavigation('/privacy-policy')}
              className="text-sm transition-colors text-neutral-400 hover:text-primary hover-effect"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => handleNavigation('/terms-of-service')}
              className="text-sm transition-colors text-neutral-400 hover:text-primary hover-effect"
            >
              Terms of Service
            </button>
            <button 
              onClick={() => handleNavigation('/cookie-policy')}
              className="text-sm transition-colors text-neutral-400 hover:text-primary hover-effect"
            >
              Cookie Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;