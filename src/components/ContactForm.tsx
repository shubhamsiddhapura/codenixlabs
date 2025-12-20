  import React, { useState } from 'react';
  import { motion } from 'framer-motion';
  import { Send, Loader2, CheckCircle, MessageCircle } from 'lucide-react';
  import emailjs from 'emailjs-com';

  const ContactForm = () => {
    const [formState, setFormState] = useState({
      name: '',
      email: '',
      subject: '',
      message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const EMAILJS_CONFIG = {
      serviceId: import.meta.env.VITE_EMAIL_JS_SERVICE_ID,
      templateId: import.meta.env.VITE_EMAIL_JS_TEMPLATE_ID,
      publicKey: import.meta.env.VITE_EMAIL_JS_PUBLIC_KEY,
    };


const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  setFormState(prev => ({ ...prev, [name]: value }));
};


    const validateForm = () => {
      const { name, email, subject, message } = formState;

      if (!name.trim()) {
        setSubmitError('Please enter your name');
        return false;
      }

      if (!email.trim()) {
        setSubmitError('Please enter your email');
        return false;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setSubmitError('Please enter a valid email address');
        return false;
      }

      if (!subject) {
        setSubmitError('Please select a subject');
        return false;
      }

      if (!message.trim()) {
        setSubmitError('Please enter your message');
        return false;
      }

      if (message.trim().length < 10) {
        setSubmitError('Message should be at least 10 characters long');
        return false;
      }

      return true;
    };

   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setSubmitError('');

  if (!validateForm()) return;

  setIsSubmitting(true);

  try {
    const templateParams = {
      from_name: formState.name,
      from_email: formState.email,
      to_name: 'Codenix Labs',
      subject: formState.subject,
      message: formState.message,
      reply_to: formState.email,
      sent_date: new Date().toLocaleDateString(),
      sent_time: new Date().toLocaleTimeString(),
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    );

    console.log('Email sent successfully:', response);

    setSubmitSuccess(true);
    setFormState({ name: '', email: '', subject: '', message: '' });

    setTimeout(() => setSubmitSuccess(false), 5000);
  } catch (error) {
    console.error('Email sending error:', error);

    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof (error as { status: unknown }).status === 'number'
    ) {
      const status = (error as { status: number }).status;

      switch (status) {
        case 400:
          setSubmitError('Invalid request. Please check your information and try again.');
          break;
        case 401:
          setSubmitError('Authentication failed. Please contact support.');
          break;
        case 402:
          setSubmitError('Service quota exceeded. Please try again later.');
          break;
        case 404:
          setSubmitError('Service not found. Please contact support.');
          break;
        default:
          setSubmitError('An unknown error occurred. Please try again.');
      }
    } else {
      setSubmitError('Failed to send message. Please check your internet connection and try again.');
    }
  } finally {
    setIsSubmitting(false);
  }
};


    const resetForm = () => {
      setFormState({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
      setSubmitSuccess(false);
      setSubmitError('');
    };

    const handleWhatsAppClick = () => {
      const phoneNumber = '+918488080162';
      const message = 'Hello! I would like to know more about your services.';
      const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl p-8 mx-auto glass rounded-xl"
      >
        {submitSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
          >
            <div className="flex items-center justify-center w-20 h-20 p-4 mx-auto mb-6 text-green-400 rounded-full bg-green-500/20">
              <CheckCircle size={32} />
            </div>
            <h3 className="mb-4 text-2xl font-bold text-white font-orbitron">
              Message Sent Successfully!
            </h3>
            <p className="mb-2 text-neutral-300">
              Thank you for contacting us, <strong>{formState.name || 'there'}</strong>!
            </p>
            <p className="mb-6 text-sm text-neutral-400">
              We've received your message and will get back to you within 24 hours.
              A confirmation email has been sent to your inbox.
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 transition-all duration-300 border rounded-lg btn btn-outline border-primary text-primary hover:bg-primary hover:text-white"
              >
                Send Another Message
              </button>
              <button
                type="button"
                onClick={handleWhatsAppClick}
                className="flex items-center gap-2 px-6 py-2 transition-all duration-300 bg-green-600 rounded-lg btn btn-primary hover:bg-green-700"
              >
                <MessageCircle size={16} />
                WhatsApp Chat
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="mb-8 text-center">
              <h3 className="mb-2 text-3xl font-bold text-white font-orbitron">
                Get In Touch
              </h3>
              <p className="text-neutral-400">
                Ready to start your project? Let's discuss your ideas! You can also reach us on WhatsApp for quick support.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleWhatsAppClick}
                  className="flex items-center gap-2 mx-auto text-green-600 transition-all duration-300 border-green-600 btn btn-outline hover:bg-green-600 hover:text-white"
                >
                  <MessageCircle size={16} />
                  Chat on WhatsApp
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Name Field */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="form-group"
              >
                <label htmlFor="name" className="block mb-2 text-sm font-medium text-neutral-200">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formState.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 text-white transition-all duration-300 border rounded-lg bg-neutral-800/50 border-neutral-700 focus:border-primary placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-sm"
                  placeholder="Enter your full name"
                />
              </motion.div>

              {/* Email Field */}
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="form-group"
              >
                <label htmlFor="email" className="block mb-2 text-sm font-medium text-neutral-200">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formState.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 text-white transition-all duration-300 border rounded-lg bg-neutral-800/50 border-neutral-700 focus:border-primary placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-sm"
                  placeholder="Enter your email address"
                />
              </motion.div>
            </div>

            {/* Subject Field */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="form-group"
            >
              <label htmlFor="subject" className="block mb-2 text-sm font-medium text-neutral-200">
                Subject *
              </label>
              <select
                id="subject"
                name="subject"
                value={formState.subject}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 text-white transition-all duration-300 border rounded-lg bg-neutral-800/50 border-neutral-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-sm"
              >
                <option value="" disabled className="text-neutral-500">
                  Choose a subject
                </option>
                <option value="General Inquiry">General Inquiry</option>
                <option value="Web Development">Web Development</option>
                <option value="Mobile App Development">Mobile App Development</option>
                <option value="UI/UX Design">UI/UX Design</option>
                <option value="Project Proposal">Project Proposal</option>
                <option value="Partnership">Partnership Opportunity</option>
                <option value="Support Request">Technical Support</option>
                <option value="Other">Other</option>
              </select>
            </motion.div>

            {/* Message Field */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="form-group"
            >
              <label htmlFor="message" className="block mb-2 text-sm font-medium text-neutral-200">
                Your Message *
              </label>
              <textarea
                id="message"
                name="message"
                value={formState.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-3 text-white transition-all duration-300 border rounded-lg resize-none bg-neutral-800/50 border-neutral-700 focus:border-primary placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-sm"
                placeholder="Tell us about your project, requirements, timeline, budget, or any questions you have..."
              />
              <div className="mt-1 text-xs text-neutral-500">
                {formState.message.length}/500 characters (minimum 10 required)
              </div>
            </motion.div>

            {/* Error Message */}
            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3 text-sm text-red-400 border rounded-lg bg-red-500/10 border-red-500/30"
              >
                {submitError}
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex items-center justify-center px-6 py-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-[1.02] ${isSubmitting
                  ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/25'
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="mr-2 animate-spin" />
                    Sending Message...
                  </>
                ) : (
                  <>
                    <Send size={20} className="mr-2" />
                    Send Message
                  </>
                )}
              </button>
            </motion.div>

            {/* Additional Info */}
            <div className="mt-4 text-xs text-center text-neutral-500">
              We typically respond within 24 hours. Your information is secure and will not be shared. For immediate assistance, contact us on WhatsApp.
            </div>
          </form>
        )}
      </motion.div>
    );
  };

  export default ContactForm;
