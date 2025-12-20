import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Users, AlertTriangle, Scale, Mail, Phone } from 'lucide-react';

const TermsOfService: React.FC = () => {
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
                <FileText size={32} />
              </div>
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl font-orbitron font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Terms of <span className="text-primary">Service</span>
            </motion.h1>

            <motion.p
              className="text-xl text-neutral-300 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Please read these terms carefully before using our services.
              By using our services, you agree to these terms.
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

              {/* Acceptance of Terms */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <div className="flex items-center mb-4">
                  <Scale className="text-primary mr-3" size={24} />
                  <h2 className="text-2xl font-orbitron font-bold mb-0">Acceptance of Terms</h2>
                </div>

                <p>By accessing and using the Codenix Labs website and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>

                <p>These Terms of Service ("Terms") govern your use of our website located at codenixlabs.com (the "Service") operated by Codenix Labs ("us", "we", or "our").</p>
              </motion.div>

              {/* Services Description */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <div className="flex items-center mb-4">
                  <Users className="text-primary mr-3" size={24} />
                  <h2 className="text-2xl font-orbitron font-bold mb-0">Services Description</h2>
                </div>

                <p>Codenix Labs provides the following services:</p>
                <ul>
                  <li><strong>Web Development:</strong> Custom website and web application development</li>
                  <li><strong>Mobile App Development:</strong> Native and cross-platform mobile applications</li>
                  <li><strong>UI/UX Design:</strong> User interface and user experience design services</li>
                  <li><strong>Cloud Solutions:</strong> Cloud infrastructure and deployment services</li>
                  <li><strong>Consulting:</strong> Technology consulting and advisory services</li>
                  <li><strong>Maintenance:</strong> Ongoing support and maintenance services</li>
                </ul>
              </motion.div>

              {/* User Responsibilities */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <h2 className="text-2xl font-orbitron font-bold mb-4">User Responsibilities</h2>

                <p>As a user of our services, you agree to:</p>
                <ul>
                  <li>Provide accurate and complete information when requested</li>
                  <li>Maintain the confidentiality of any account credentials</li>
                  <li>Use our services only for lawful purposes</li>
                  <li>Not interfere with or disrupt our services or servers</li>
                  <li>Not attempt to gain unauthorized access to our systems</li>
                  <li>Respect intellectual property rights</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </motion.div>

              {/* Project Terms */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <h2 className="text-2xl font-orbitron font-bold mb-4">Project Terms</h2>

                <h3>Project Scope and Timeline</h3>
                <ul>
                  <li>Project scope will be defined in a separate project agreement</li>
                  <li>Timelines are estimates and may vary based on project complexity</li>
                  <li>Changes to project scope may affect timeline and cost</li>
                  <li>Client approval is required at designated project milestones</li>
                </ul>

                <h3>Payment Terms</h3>
                <ul>
                  <li>Payment terms will be specified in the project agreement</li>
                  <li>Late payments may incur additional charges</li>
                  <li>Refunds are subject to the terms outlined in the project agreement</li>
                  <li>All prices are exclusive of applicable taxes unless stated otherwise</li>
                </ul>

                <h3>Intellectual Property</h3>
                <ul>
                  <li>Upon full payment, clients receive ownership of custom-developed code</li>
                  <li>Third-party components remain subject to their respective licenses</li>
                  <li>Codenix Labs retains the right to use general methodologies and know-how</li>
                  <li>Portfolio rights may be retained for marketing purposes</li>
                </ul>
              </motion.div>

              {/* Limitations and Disclaimers */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <div className="flex items-center mb-4">
                  <AlertTriangle className="text-primary mr-3" size={24} />
                  <h2 className="text-2xl font-orbitron font-bold mb-0">Limitations and Disclaimers</h2>
                </div>

                <h3>Service Availability</h3>
                <p>While we strive to maintain high availability, we do not guarantee that our services will be uninterrupted or error-free. We reserve the right to modify, suspend, or discontinue services with reasonable notice.</p>

                <h3>Limitation of Liability</h3>
                <p>To the maximum extent permitted by law, Codenix Labs shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities.</p>

                <h3>Warranty Disclaimer</h3>
                <p>Our services are provided "as is" without warranties of any kind, either express or implied. We disclaim all warranties, including but not limited to merchantability, fitness for a particular purpose, and non-infringement.</p>
              </motion.div>

              {/* Termination */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <h2 className="text-2xl font-orbitron font-bold mb-4">Termination</h2>

                <p>Either party may terminate the service agreement with appropriate notice as specified in the project agreement. Upon termination:</p>
                <ul>
                  <li>All outstanding payments become immediately due</li>
                  <li>Access to services and deliverables may be suspended</li>
                  <li>Confidentiality obligations continue to apply</li>
                  <li>Data retention policies will be followed as outlined in our Privacy Policy</li>
                </ul>
              </motion.div>

              {/* Governing Law */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <h2 className="text-2xl font-orbitron font-bold mb-4">Governing Law</h2>

                <p>These Terms shall be interpreted and governed by the laws of India. Any disputes arising from these terms or our services shall be subject to the exclusive jurisdiction of the courts in Gujarat, India.</p>
              </motion.div>

              {/* Contact Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="glass p-8 rounded-xl"
              >
                <h2 className="text-2xl font-orbitron font-bold mb-4">Contact Us</h2>

                <p>If you have any questions about these Terms of Service, please contact us:</p>

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

export default TermsOfService;