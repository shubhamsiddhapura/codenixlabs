// import Blog from '../models/blog.js';
import { generateBlogWithGemini } from '../services/aiService.js';
// import { generateBlogImage } from "../services/imageService.js";
// import { uploadImageToCloudinary } from "../services/cloudinaryService.js";

export const generateBlog = async (req, res) => {
  try {
    const { topic, category, angle } = req.body;

    // Validate input
    if (!topic || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required',
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category is required',
      });
    }

    // Generate blog content using Gemini
    let generatedData;
    try {
      generatedData = await generateBlogWithGemini(topic.trim(), category.trim(), angle || null);
    } catch (aiError) {
      // Handle AI service specific errors
      if (aiError.message.includes('GROQ_API_KEY')) {
        return res.status(500).json({
          success: false,
          message: 'AI service not configured. Please set GROQ_API_KEY.',
        });
      }
      if (aiError.message.includes('timeout') || aiError.message.includes('ECONNREFUSED')) {
        return res.status(504).json({
          success: false,
          message: 'AI service timeout. Please try again.',
        });
      }
      throw aiError;
    }
    // Generate Image
    // const generatedImage = await generateBlogImage(
    // generatedData.title,
    // category
    // );

    // Upload to Cloudinary
    // const uploadedImage = await uploadImageToCloudinary(generatedImage);
    
    // Return generated data without saving
    // The frontend will fill the form, admin edits, then manually saves
    res.status(200).json({
      success: true,
      message: 'Blog content generated successfully. Review and edit before saving.',
      data: {
        title: generatedData.title,
        slug: generatedData.slug,
        excerpt: generatedData.excerpt,
        content: generatedData.content,
        category: generatedData.category || category,
        tags: generatedData.tags || [],
        // featuredImage: uploadedImage,
        SEO: {
          metaTitle: generatedData.seo?.metaTitle || generatedData.title,
          metaDescription: generatedData.seo?.metaDescription || generatedData.excerpt,
          keywords: generatedData.seo?.keywords || [],
        },
      },
    });
  } catch (error) {
    console.error('Error generating blog:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating blog',
      error: error.message,
    });
  }
};

