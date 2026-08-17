import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Cursor from './components/Cursor';
import LoadingScreen from './components/LoadingScreen';

// Pages
import Home from './pages/Home';
import Services from './pages/Services';
import Portfolio from './pages/Portfolio';
import About from './pages/About';
import Contact from './pages/Contact';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import AdminBlog from './pages/AdminBlog';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import DemoShowcase from './pages/DemoShowcase';
import AiReadiness from './pages/AiReadiness';
import { Analytics } from '@vercel/analytics/react';

function App() {
  const location = useLocation();
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen text-white bg-background">
      <Cursor />
      <Navbar />
      {/*
        The <main> landmark our own scanner flagged as missing.

        Without it an assistant cannot tell page content apart from the nav and
        the footer, so it quotes all three together. We already had <nav> and
        <footer>; this was the one landmark absent, and it costs nothing to add
        because every route already renders inside this wrapper.
      */}
      <main id="main-content">
        <AnimatePresence mode="wait">
          <ScrollToTop />
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/ai-readiness" element={<AiReadiness />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/admin/blog" element={<AdminBlog />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/_internal/demo-showcase" element={<DemoShowcase />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
      <Analytics />
    </div>
  );
}

export default App;

// Scroll to Top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};
