import express from 'express';
import {
    createBlog,
    getAllBlogs,
    getBlogById,
    getBlogBySlug,
    getBlogOG,
    getHomeOG,
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
} from '../controllers/blogPost.js';
import { generateBlog } from '../controllers/blogGenerate.js';

const router = express.Router();

// 1. Static/specific routes FIRST
router.get('/featured/posts', getFeaturedBlogs);
router.get('/search/posts', searchBlogs);
router.get('/stats/analytics', getBlogStats);
router.get('/meta/categories', getCategories);
router.get('/meta/tags', getTags);
router.get('/og/home', getHomeOG);
router.get('/og/:slug', getBlogOG);
router.get('/category/:category', getBlogsByCategory);
router.get('/author/:author', getBlogsByAuthor);
router.get('/tag/:tag', getBlogsByTag);
router.get('/slug/:slug', getBlogBySlug);

// 2. Parameterized routes LAST
router.post('/', createBlog);
router.get('/', getAllBlogs);
router.get('/:id', getBlogById);     // ← must be last among GETs
router.put('/:id', updateBlog);
router.delete('/:id', deleteBlog);

// POST /generate also needs to be before /:id but it's POST so no conflict
router.post('/generate', generateBlog);

export default router;