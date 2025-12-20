import React from 'react';
import { motion } from 'framer-motion';
import { Cookie, Settings, BarChart3, Shield, Mail, Phone } from 'lucide-react';

const CookiePolicy: React.FC = () => {
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
                <Cookie size={32} />
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-orbitron font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Cookie <span className="text-primary">Policy</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-neutral-300 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Learn about how we use cookies and similar technologies to improve 
              your experience on our website.
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
              
              {/* What Are Cookies */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <div className="flex items-center mb-4">
                  <Cookie className="text-primary mr-3" size={24} />
                  <h2 className="text-2xl font-orbitron font-bold mb-0">What Are Cookies?</h2>
                </div>
                
                <p>Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners.</p>
                
                <p>Cookies allow websites to:</p>
                <ul>
                  <li>Remember your preferences and settings</li>
                  <li>Improve your browsing experience</li>
                  <li>Analyze how you use the website</li>
                  <li>Provide personalized content and advertisements</li>
                  <li>Enable certain website functionality</li>
                </ul>
              </motion.div>

              {/* Types of Cookies */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <div className="flex items-center mb-4">
                  <Settings className="text-primary mr-3" size={24} />
                  <h2 className="text-2xl font-orbitron font-bold mb-0">Types of Cookies We Use</h2>
                </div>
                
                <h3>Essential Cookies</h3>
                <p>These cookies are necessary for the website to function properly. They enable basic functions like page navigation and access to secure areas of the website. The website cannot function properly without these cookies.</p>
                <ul>
                  <li>Session management cookies</li>
                  <li>Security cookies</li>
                  <li>Load balancing cookies</li>
                </ul>

                <h3>Performance Cookies</h3>
                <p>These cookies collect information about how visitors use our website, such as which pages are visited most often. This data helps us improve how our website works.</p>
                <ul>
                  <li>Google Analytics cookies</li>
                  <li>Page load time tracking</li>
                  <li>Error reporting cookies</li>
                </ul>

                <h3>Functional Cookies</h3>
                <p>These cookies allow the website to remember choices you make and provide enhanced, more personal features.</p>
                <ul>
                  <li>Language preference cookies</li>
                  <li>Theme selection cookies</li>
                  <li>Form data retention cookies</li>
                </ul>

                <h3>Targeting Cookies</h3>
                <p>These cookies may be set through our site by our advertising partners to build a profile of your interests and show you relevant adverts on other sites.</p>
                <ul>
                  <li>Social media integration cookies</li>
                  <li>Marketing campaign tracking</li>
                  <li>Retargeting cookies</li>
                </ul>
              </motion.div>

              {/* Third-Party Cookies */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <div className="flex items-center mb-4">
                  <BarChart3 className="text-primary mr-3" size={24} />
                  <h2 className="text-2xl font-orbitron font-bold mb-0">Third-Party Cookies</h2>
                </div>
                
                <p>We may use third-party services that set cookies on our website. These services include:</p>
                
                <h3>Google Analytics</h3>
                <p>We use Google Analytics to analyze website traffic and user behavior. Google Analytics uses cookies to collect information such as:</p>
                <ul>
                  <li>Number of visitors to our site</li>
                  <li>Pages visited and time spent on each page</li>
                  <li>Geographic location of visitors</li>
                  <li>Device and browser information</li>
                </ul>
                <p>You can opt out of Google Analytics by installing the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-white">Google Analytics Opt-out Browser Add-on</a>.</p>

                <h3>Social Media Platforms</h3>
                <p>Our website may include social media features that set cookies to:</p>
                <ul>
                  <li>Enable social sharing functionality</li>
                  <li>Track social media interactions</li>
                  <li>Provide personalized content</li>
                </ul>

                <h3>EmailJS</h3>
                <p>We use EmailJS for our contact forms, which may set cookies to:</p>
                <ul>
                  <li>Prevent spam and abuse</li>
                  <li>Ensure form functionality</li>
                  <li>Track form submissions</li>
                </ul>
              </motion.div>

              {/* Managing Cookies */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <div className="flex items-center mb-4">
                  <Shield className="text-primary mr-3" size={24} />
                  <h2 className="text-2xl font-orbitron font-bold mb-0">Managing Your Cookie Preferences</h2>
                </div>
                
                <h3>Browser Settings</h3>
                <p>Most web browsers allow you to control cookies through their settings. You can:</p>
                <ul>
                  <li>View what cookies are stored on your device</li>
                  <li>Delete existing cookies</li>
                  <li>Block cookies from being set</li>
                  <li>Set preferences for specific websites</li>
                </ul>

                <h3>Browser-Specific Instructions</h3>
                <ul>
                  <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                  <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
                  <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                  <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
                </ul>

                <h3>Impact of Disabling Cookies</h3>
                <p>Please note that disabling cookies may affect the functionality of our website. Some features may not work properly or at all if cookies are disabled.</p>
              </motion.div>

              {/* Cookie Retention */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <h2 className="text-2xl font-orbitron font-bold mb-4">Cookie Retention</h2>
                
                <h3>Session Cookies</h3>
                <p>These cookies are temporary and are deleted when you close your browser.</p>

                <h3>Persistent Cookies</h3>
                <p>These cookies remain on your device for a set period or until you delete them. The retention period varies:</p>
                <ul>
                  <li><strong>Functional cookies:</strong> Up to 1 year</li>
                  <li><strong>Analytics cookies:</strong> Up to 2 years</li>
                  <li><strong>Marketing cookies:</strong> Up to 1 year</li>
                </ul>
              </motion.div>

              {/* Updates to Policy */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="glass p-8 rounded-xl mb-8"
              >
                <h2 className="text-2xl font-orbitron font-bold mb-4">Updates to This Policy</h2>
                
                <p>We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on our website.</p>
                
                <p>We encourage you to review this policy periodically to stay informed about how we use cookies.</p>
              </motion.div>

              {/* Contact Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="glass p-8 rounded-xl"
              >
                <h2 className="text-2xl font-orbitron font-bold mb-4">Contact Us</h2>
                
                <p>If you have any questions about this Cookie Policy or our use of cookies, please contact us:</p>
                
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

export default CookiePolicy;