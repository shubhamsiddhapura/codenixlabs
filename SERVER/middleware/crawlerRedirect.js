import Blog from '../models/blog.js';

// Middleware to detect and serve proper meta tags to crawlers
export const crawlerMetaTagsMiddleware = async (req, res, next) => {
  // Detect if request is from a crawler/bot
  const userAgent = req.headers['user-agent'] || '';
  const isCrawler = /bot|crawler|spider|linkedin|facebook|twitter|whatsapp|slack|telegram|x\.com/i.test(userAgent);
  
  if (!isCrawler) {
    return next();
  }

  // Check if it's a blog post request
  const blogMatch = req.url.match(/\/blog\/([a-z0-9-]+)/i);
  if (!blogMatch) {
    return next();
  }

  const slug = blogMatch[1];

  try {
    // Fetch blog post
    const post = await Blog.findOne({ slug, isPublished: true });
    
    if (!post) {
      return next();
    }

    // Generate meta tags HTML
    const ogImage = `https://api.codenixlabs.com/api/og/blog/${slug}`;
    const title = post.seo?.metaTitle || post.title || 'CodeNix Labs Blog';
    const description = post.seo?.metaDescription || post.excerpt || '';
    const url = `https://codenixlabs.com/blog/${slug}`;

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)} | CodeNix Labs Blog</title>
      <meta name="description" content="${escapeHtml(description)}" />
      
      <!-- Open Graph Meta Tags -->
      <meta property="og:type" content="article" />
      <meta property="og:title" content="${escapeHtml(title)}" />
      <meta property="og:description" content="${escapeHtml(description)}" />
      <meta property="og:image" content="${ogImage}" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:url" content="${url}" />
      <meta property="og:site_name" content="CodeNix Labs" />
      
      <!-- Twitter Card Meta Tags -->
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${escapeHtml(title)}" />
      <meta name="twitter:description" content="${escapeHtml(description)}" />
      <meta name="twitter:image" content="${ogImage}" />
      
      <!-- Article Meta Tags -->
      <meta property="article:published_time" content="${post.publishedAt}" />
      <meta property="article:author" content="${escapeHtml(post.author?.name || 'CodeNix Labs')}" />
      <meta property="article:section" content="${escapeHtml(post.category || 'Blog')}" />
      
      <!-- Redirect to actual page -->
      <meta http-equiv="refresh" content="0; url=${url}" />
      <link rel="canonical" href="${url}" />
    </head>
    <body>
      <p>Redirecting to <a href="${url}">${escapeHtml(title)}</a>...</p>
    </body>
    </html>
    `;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(html);
  } catch (error) {
    console.error('Error in crawler middleware:', error);
    next();
  }
};

// Helper function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

export default crawlerMetaTagsMiddleware;
