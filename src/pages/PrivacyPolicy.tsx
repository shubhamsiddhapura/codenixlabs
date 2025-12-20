import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, Database, Lock, Mail, Phone } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-4 inline-block"
            >
              <div className="bg-primary/20 text-primary rounded-full p-3">
                <Shield size={32} />
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-orbitron font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Privacy <span className="text-primary">Policy</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-neutral-300 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Your privacy is important to us. This policy explains how we collect, 
              use, and protect your personal information.
            </motion.p>
            
            <motion.p 
              className="text-sm text-neutral-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Last updated: December 2024
            </motion.p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg prose-invert max-w-none">
              
              {/* Information We Collect */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <div className="flex items-center mb-4">
                  <Database className="text-primary mr-3" size={24} />
                  <h2 className="text-2xl font-orbitron font-bold mb-0">Information We Collect</h2>
                </div>
                
                <h3>Personal Information</h3>
                <p>We may collect the following personal information when you interact with our services:</p>
                <ul>
                  <li><strong>Contact Information:</strong> Name, email address, phone number, and mailing address</li>
                  <li><strong>Professional Information:</strong> Company name, job title, and business requirements</li>
                  <li><strong>Communication Data:</strong> Messages, feedback, and correspondence with our team</li>
                  <li><strong>Project Information:</strong> Details about your project requirements and specifications</li>
                </ul>

                <h3>Automatically Collected Information</h3>
                <p>We automatically collect certain information when you visit our website:</p>
                <ul>
                  <li><strong>Usage Data:</strong> Pages visited, time spent, and navigation patterns</li>
                  <li><strong>Device Information:</strong> Browser type, operating system, and device characteristics</li>
                  <li><strong>Location Data:</strong> General geographic location based on IP address</li>
                  <li><strong>Cookies and Tracking:</strong> Information collected through cookies and similar technologies</li>
                </ul>
              </motion.div>

              {/* How We Use Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <div className="flex items-center mb-4">
                  <Eye className="text-primary mr-3" size={24} />
                  <h2 className="text-2xl font-orbitron font-bold mb-0">How We Use Your Information</h2>
                </div>
                
                <p>We use the collected information for the following purposes:</p>
                <ul>
                  <li><strong>Service Delivery:</strong> To provide, maintain, and improve our services</li>
                  <li><strong>Communication:</strong> To respond to inquiries and provide customer support</li>
                  <li><strong>Project Management:</strong> To understand requirements and deliver customized solutions</li>
                  <li><strong>Marketing:</strong> To send relevant updates about our services (with your consent)</li>
                  <li><strong>Analytics:</strong> To analyze usage patterns and improve user experience</li>
                  <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                </ul>
              </motion.div>

              {/* Information Sharing */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <div className="flex items-center mb-4">
                  <Lock className="text-primary mr-3" size={24} />
                  <h2 className="text-2xl font-orbitron font-bold mb-0">Information Sharing and Disclosure</h2>
                </div>
                
                <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
                <ul>
                  <li><strong>Service Providers:</strong> With trusted third-party vendors who assist in our operations</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                  <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
                  <li><strong>Consent:</strong> When you have given explicit consent for sharing</li>
                </ul>

                <h3>Third-Party Services</h3>
                <p>Our website may use third-party services including:</p>
                <ul>
                  <li>Google Analytics for website analytics</li>
                  <li>EmailJS for contact form functionality</li>
                  <li>Cloud hosting providers for website infrastructure</li>
                </ul>
              </motion.div>

              {/* Data Security */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <h2 className="text-2xl font-orbitron font-bold mb-4">Data Security</h2>
                
                <p>We implement appropriate technical and organizational measures to protect your personal information:</p>
                <ul>
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security assessments and updates</li>
                  <li>Access controls and authentication measures</li>
                  <li>Employee training on data protection practices</li>
                </ul>
              </motion.div>

              {/* Your Rights */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <h2 className="text-2xl font-orbitron font-bold mb-4">Your Rights</h2>
                
                <p>You have the following rights regarding your personal information:</p>
                <ul>
                  <li><strong>Access:</strong> Request access to your personal data</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                  <li><strong>Portability:</strong> Request transfer of your data</li>
                  <li><strong>Objection:</strong> Object to processing of your data</li>
                  <li><strong>Withdrawal:</strong> Withdraw consent at any time</li>
                </ul>
              </motion.div>

              {/* Contact Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="glass p-8 rounded-xl"
              >
                <h2 className="text-2xl font-orbitron font-bold mb-4">Contact Us</h2>
                
                <p>If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="flex items-center">
                    <Mail className="text-primary mr-3" size={20} />
                    <div>
                      <p className="font-medium mb-0">Email</p>
                      <a href="mailto:codenixlabs@gmail.com" className="text-primary hover:text-white transition-colors">
                        codenixlabs@gmail.com
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Phone className="text-primary mr-3" size={20} />
                    <div>
                      <p className="font-medium mb-0">Phone</p>
                      <a href="tel:+917405950263" className="text-primary hover:text-white transition-colors">
                        +91 7405950263
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default PrivacyPolicy;