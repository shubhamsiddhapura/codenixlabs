import express from 'express';
import {
    createBlog,
    getAllBlogs,
    getBlogById,
    getBlogBySlug,
    updateBlog,
    deleteBlog,
    getBlogsByCategory,
    getBlogsByAuthor,
    getBlogsByTag,
    getFeaturedBlogs,
    searchBlogs,
    getCategories,
    getTags,
    getBlogStats
} from '../controllers/blogPost.js'; // Adjust path as needed

const router = express.Router();

// Basic CRUD Routes
router.post('/', createBlog);                    // POST /api/blogs
router.get('/', getAllBlogs);                    // GET /api/blogs
router.get('/:id', getBlogById);                 // GET /api/blogs/:id
router.put('/:id', updateBlog);                  // PUT /api/blogs/:id
router.delete('/:id', deleteBlog);               // DELETE /api/blogs/:id

// Special routes (should come before parameterized routes)
router.get('/featured/posts', getFeaturedBlogs); // GET /api/blogs/featured/posts
router.get('/search/posts', searchBlogs);        // GET /api/blogs/search/posts
router.get('/stats/analytics', getBlogStats);    // GET /api/blogs/stats/analytics

// Utility routes for categories and tags
router.get('/meta/categories', getCategories);   // GET /api/blogs/meta/categories
router.get('/meta/tags', getTags);               // GET /api/blogs/meta/tags

// Filtering routes
router.get('/category/:category', getBlogsByCategory); // GET /api/blogs/category/:category
router.get('/author/:author', getBlogsByAuthor);       // GET /api/blogs/author/:author
router.get('/tag/:tag', getBlogsByTag);                // GET /api/blogs/tag/:tag

// SEO-friendly slug route (should be last to avoid conflicts)
router.get('/slug/:slug', getBlogBySlug);        // GET /api/blogs/slug/:slug

export default router;