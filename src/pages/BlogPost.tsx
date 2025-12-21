import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Share2, 
  Facebook, 
  Twitter, 
  Linkedin,
  ArrowLeft,
  Tag
} from 'lucide-react';
import { BlogService } from '../services/blogService';
import { BlogPost as BlogPostType } from '../types/blog';
import BlogCard from '../components/BlogCard';

const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadPost(slug);
    }
  }, [slug]);

  const loadPost = async (postSlug: string) => {
    setLoading(true);
    try {
      const fetchedPost = await BlogService.getPostBySlug(postSlug);
      if (fetchedPost) {
        setPost(fetchedPost);
        // Load related posts
        const related = await BlogService.getRelatedPosts(fetchedPost._id);
        setRelatedPosts(related);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const shareUrl = window.location.href;
  const shareTitle = post?.title || '';

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link to="/blog" className="btn btn-primary">
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Section */}
      <section className="pt-32 pb-16 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link 
              to="/blog" 
              className="inline-flex items-center text-neutral-400 hover:text-primary transition-colors hover-effect"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back to Blog
            </Link>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            {/* Category Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-4"
            >
              <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">
                {post.category}
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-3xl sm:text-4xl md:text-5xl font-orbitron font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {post.title}
            </motion.h1>

            {/* Meta Information */}
            <motion.div
              className="flex flex-wrap items-center gap-6 text-neutral-400 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center gap-2">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-8 h-8 rounded-full"
                />
                <span>{post.author.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>{formatDate(post.publishedAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>{post.readTime} min read</span>
              </div>
            </motion.div>

            {/* Featured Image */}
            <motion.div
              className="aspect-video rounded-xl overflow-hidden mb-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Content */}
              <motion.article
                className="lg:col-span-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div 
                  className="prose prose-lg prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />

                {/* Tags */}
                <div className="mt-8 pt-8 border-t border-neutral-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag size={18} className="text-primary" />
                    <span className="font-medium">Tags:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-neutral-800 text-neutral-300 px-3 py-1 rounded-full text-sm hover:bg-primary hover:text-white transition-colors cursor-pointer"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.article>

              {/* Sidebar */}
              <motion.aside
                className="lg:col-span-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                {/* Share Buttons */}
                <div className="glass p-6 rounded-xl mb-6 sticky top-24">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Share2 size={18} className="text-primary" />
                    Share Article
                  </h3>
                  <div className="space-y-3">
                    <a
                      href={shareLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800 hover:bg-blue-600 transition-colors hover-effect"
                    >
                      <Facebook size={18} />
                      <span>Facebook</span>
                    </a>
                    <a
                      href={shareLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800 hover:bg-blue-400 transition-colors hover-effect"
                    >
                      <Twitter size={18} />
                      <span>Twitter</span>
                    </a>
                    <a
                      href={shareLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800 hover:bg-blue-700 transition-colors hover-effect"
                    >
                      <Linkedin size={18} />
                      <span>LinkedIn</span>
                    </a>
                  </div>
                </div>
              </motion.aside>
            </div>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-neutral-900 relative">
          <div className="absolute inset-0 bg-glow opacity-20"></div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-6xl mx-auto">
              <motion.h2
                className="text-3xl font-orbitron font-bold mb-8 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                Related Articles
              </motion.h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost, index) => (
                  <BlogCard key={relatedPost._id} post={relatedPost} index={index} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </motion.div>
  );
};

export default BlogPost;