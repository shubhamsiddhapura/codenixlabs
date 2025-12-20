import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Clock, User, ArrowRight } from 'lucide-react';
import { BlogPost } from '../types/blog';

interface BlogCardProps {
  post: BlogPost;
  index?: number;
  featured?: boolean;
}

const BlogCard: React.FC<BlogCardProps> = ({ post, index = 0, featured = false }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`group relative overflow-hidden rounded-xl ${
        featured ? 'glass' : 'bg-neutral-900'
      } hover-effect`}
    >
      <Link to={`/blog/${post.slug}`} className="block">
        {/* Featured Image */}
        <div className="relative overflow-hidden aspect-[16/10]">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Category Badge */}
          <div className="absolute top-4 left-4">
            <span className="bg-primary/90 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
              {post.category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Meta Information */}
          <div className="flex items-center gap-4 text-sm text-neutral-400 mb-3">
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{formatDate(post.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{post.readTime} min read</span>
            </div>
            <div className="flex items-center gap-1">
              <User size={14} />
              <span>{post.author.name}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className={`font-orbitron font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2 ${
            featured ? 'text-xl md:text-2xl' : 'text-lg'
          }`}>
            {post.title}
          </h3>

          {/* Excerpt */}
          <p className="text-neutral-300 mb-4 line-clamp-3">
            {post.excerpt}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.slice(0, 3).map((tag, tagIndex) => (
              <span
                key={tagIndex}
                className="text-xs bg-neutral-800 text-neutral-300 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Read More */}
          <div className="flex items-center text-primary font-medium group-hover:text-white transition-colors">
            Read More
            <ArrowRight size={16} className="ml-1 group-hover:ml-2 transition-all duration-300" />
          </div>
        </div>
      </Link>
    </motion.article>
  );
};

export default BlogCard;
