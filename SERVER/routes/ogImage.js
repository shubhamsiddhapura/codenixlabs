import express from 'express';
import { generateBlogOGImage, generateHomeOGImage } from '../controllers/ogImage.js';

const router = express.Router();

// Generate OG image for blog post
router.get('/blog/:slug', generateBlogOGImage);

// Generate OG image for homepage
router.get('/home', generateHomeOGImage);

export default router;
