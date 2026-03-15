import sharp from 'sharp';
import Blog from '../models/blog.js';

// Generate OG Image for blog posts
export const generateBlogOGImage = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Fetch blog post
    const post = await Blog.findOne({ slug });
    
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Create SVG with blog post data
    const title = post.title || 'CodeNix Labs';
    const excerpt = (post.excerpt || post.seo?.metaDescription || '').substring(0, 80);
    const author = post.author?.name || 'CodeNix Labs';
    
    // SVG template for OG image
    const svg = Buffer.from(`
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <!-- Base with gradient -->
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1a202c;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <rect width="1200" height="630" fill="url(#grad)"/>
        
        <!-- Decorative elements -->
        <circle cx="1050" cy="100" r="200" fill="#60a5fa" opacity="0.1"/>
        <circle cx="150" cy="530" r="180" fill="#60a5fa" opacity="0.1"/>
        
        <!-- Top accent bar -->
        <rect width="1200" height="8" fill="#60a5fa"/>
        
        <!-- Title -->
        <text x="60" y="120" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="72" font-weight="700" fill="#ffffff" font-smoothing="antialiased">
          <tspan>${escapeXml(title.substring(0, 60))}</tspan>
        </text>
        
        <!-- Excerpt -->
        <text x="60" y="260" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="400" fill="#d1d5db">
          <tspan>${escapeXml(excerpt)}...</tspan>
        </text>
        
        <!-- Category badge -->
        <rect x="60" y="320" width="auto" height="50" fill="#60a5fa" opacity="0.2" rx="4"/>
        <text x="75" y="348" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="600" fill="#60a5fa">
          ${escapeXml(post.category || 'Blog')}
        </text>
        
        <!-- Bottom bar -->
        <rect y="580" width="1200" height="50" fill="#60a5fa"/>
        
        <!-- Author and site -->
        <text x="60" y="612" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="600" fill="#0f172a">
          ${escapeXml(author)} • codenixlabs.com
        </text>
      </svg>
    `);

    // Convert SVG to PNG
    const image = await sharp(svg, { density: 150 })
      .png()
      .toBuffer();

    res.type('image/png');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(image);
  } catch (error) {
    console.error('Error generating OG image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
};

// Helper to escape XML characters
function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate OG image for homepage
export const generateHomeOGImage = async (req, res) => {
  try {
    const svg = Buffer.from(`
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1a202c;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <rect width="1200" height="630" fill="url(#grad)"/>
        
        <!-- Decorative circles -->
        <circle cx="1050" cy="100" r="200" fill="#60a5fa" opacity="0.15"/>
        <circle cx="150" cy="530" r="180" fill="#60a5fa" opacity="0.15"/>
        
        <!-- Bottom accent bar -->
        <rect y="580" width="1200" height="50" fill="#60a5fa"/>
        
        <!-- Main title -->
        <text x="60" y="160" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="100" font-weight="700" fill="#ffffff">
          Codenix Labs
        </text>
        
        <!-- Subtitle -->
        <text x="60" y="280" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="50" font-weight="600" fill="#60a5fa">
          Web Development & UI/UX Design
        </text>
        
        <!-- Description -->
        <text x="60" y="360" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="400" fill="#d1d5db">
          Expert solutions for your digital future
        </text>
        
        <!-- Website URL at bottom -->
        <text x="60" y="615" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="40" font-weight="600" fill="#0f172a">
          codenixlabs.com
        </text>
      </svg>
    `);

    const image = await sharp(svg, { density: 150 })
      .png()
      .toBuffer();

    res.type('image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(image);
  } catch (error) {
    console.error('Error generating home OG image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
};
