import Blog from '../models/blog.js';

export const createBlog = async (req, res) => {
    try {
        const {
            title,
            slug,
            excerpt,
            content,
            author,
            category,
            tags,
            featuredImage,
            SEO
        } = req.body;

        const existingBlog = await Blog.findOne({ slug });
        if (existingBlog) {
            return res.status(400).json({
                success: false,
                message: 'Blog with this slug already exists'
            });
        }

        const newBlog = new Blog({
            title,
            slug,
            excerpt,
            content,
            author,
            category,
            tags,
            featuredImage,
            SEO
        });

        const savedBlog = await newBlog.save();

        res.status(201).json({
            success: true,
            message: 'Blog created successfully',
            data: savedBlog
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating blog',
            error: error.message
        });
    }
};

// Get all blog posts with pagination and filtering
export const getAllBlogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const { category, author, tags, search } = req.query;

        // Build filter object
        let filter = {};

        if (category) {
            filter.category = { $regex: category, $options: 'i' };
        }

        if (author) {
            filter['author.name'] = { $regex: author, $options: 'i' };
        }

        if (tags) {
            filter.tags = { $in: tags.split(',') };
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        const blogs = await Blog.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Blog.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: blogs,
            pagination: {
                currentPage: page,
                totalPages,
                totalBlogs: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blogs',
            error: error.message
        });
    }
};

// Get a single blog post by ID
export const getBlogById = async (req, res) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findById(id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        res.status(200).json({
            success: true,
            data: blog
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blog',
            error: error.message
        });
    }
};

// Get a single blog post by slug
export const getBlogBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const blog = await Blog.findOne({ slug });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        res.status(200).json({
            success: true,
            data: blog
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blog',
            error: error.message
        });
    }
};

// Update a blog post
export const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // If slug is being updated, check if it already exists
        if (updateData.slug) {
            const existingBlog = await Blog.findOne({
                slug: updateData.slug,
                _id: { $ne: id }
            });

            if (existingBlog) {
                return res.status(400).json({
                    success: false,
                    message: 'Blog with this slug already exists'
                });
            }
        }

        const updatedBlog = await Blog.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedBlog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Blog updated successfully',
            data: updatedBlog
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating blog',
            error: error.message
        });
    }
};

// Delete a blog post
export const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedBlog = await Blog.findByIdAndDelete(id);

        if (!deletedBlog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Blog deleted successfully',
            data: deletedBlog
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting blog',
            error: error.message
        });
    }
};

// Get blogs by category
export const getBlogsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const blogs = await Blog.find({
            category: { $regex: category, $options: 'i' }
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Blog.countDocuments({
            category: { $regex: category, $options: 'i' }
        });

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: blogs,
            pagination: {
                currentPage: page,
                totalPages,
                totalBlogs: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blogs by category',
            error: error.message
        });
    }
};

// Get blogs by author
export const getBlogsByAuthor = async (req, res) => {
    try {
        const { author } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const blogs = await Blog.find({
            'author.name': { $regex: author, $options: 'i' }
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Blog.countDocuments({
            'author.name': { $regex: author, $options: 'i' }
        });

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: blogs,
            pagination: {
                currentPage: page,
                totalPages,
                totalBlogs: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blogs by author',
            error: error.message
        });
    }
};

// Get blogs by tags
export const getBlogsByTag = async (req, res) => {
    try {
        const { tag } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const blogs = await Blog.find({
            tags: { $in: [tag] }
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Blog.countDocuments({
            tags: { $in: [tag] }
        });

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: blogs,
            pagination: {
                currentPage: page,
                totalPages,
                totalBlogs: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blogs by tag',
            error: error.message
        });
    }
};

// Get featured/recent blogs
export const getFeaturedBlogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;

        const blogs = await Blog.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('title slug excerpt author category featuredImage createdAt');

        res.status(200).json({
            success: true,
            data: blogs
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching featured blogs',
            error: error.message
        });
    }
};

// Search blogs
export const searchBlogs = async (req, res) => {
    try {
        const { q } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const searchFilter = {
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { excerpt: { $regex: q, $options: 'i' } },
                { content: { $regex: q, $options: 'i' } },
                { category: { $regex: q, $options: 'i' } },
                { tags: { $in: [new RegExp(q, 'i')] } },
                { 'author.name': { $regex: q, $options: 'i' } }
            ]
        };

        const blogs = await Blog.find(searchFilter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Blog.countDocuments(searchFilter);
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: blogs,
            searchQuery: q,
            pagination: {
                currentPage: page,
                totalPages,
                totalBlogs: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching blogs',
            error: error.message
        });
    }
};

// Get all categories
export const getCategories = async (req, res) => {
    try {
        const categories = await Blog.distinct('category');

        res.status(200).json({
            success: true,
            data: categories
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
};

// Get all tags
export const getTags = async (req, res) => {
    try {
        const tags = await Blog.distinct('tags');

        res.status(200).json({
            success: true,
            data: tags
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching tags',
            error: error.message
        });
    }
};

// Get blog statistics
export const getBlogStats = async (req, res) => {
    try {
        const totalBlogs = await Blog.countDocuments();
        const totalCategories = (await Blog.distinct('category')).length;
        const totalTags = (await Blog.distinct('tags')).length;
        const totalAuthors = (await Blog.distinct('author.name')).length;

        // Get most popular categories
        const popularCategories = await Blog.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Get most active authors
        const activeAuthors = await Blog.aggregate([
            { $group: { _id: '$author.name', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalBlogs,
                totalCategories,
                totalTags,
                totalAuthors,
                popularCategories,
                activeAuthors
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blog statistics',
            error: error.message
        });
    }
};

// Helper function to escape HTML entities for XSS prevention
const escapeHtml = (text) => {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

// Get Open Graph data as HTML page for social crawlers
export const getBlogOG = async (req, res) => {
    try {
        const { slug } = req.params;

        const blog = await Blog.findOne({ slug, isPublished: true });

        if (!blog) {
            res.status(404);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>Post Not Found</title>
                </head>
                <body>
                    <h1>Post Not Found</h1>
                </body>
                </html>
            `);
        }

        // Extract OG data with proper fallbacks
        const title = escapeHtml(blog.SEO?.metaTitle || blog.title || 'CodeNix Labs Blog');
        const description = escapeHtml(blog.SEO?.metaDescription || blog.excerpt || 'Discover innovative web development solutions');
        // Use featured image or fallback to dynamic OG image
        const image = blog.featuredImage ? escapeHtml(blog.featuredImage) : `https://api.codenixlabs.com/api/og/blog/${escapeHtml(slug)}`;
        const url = `https://www.codenixlabs.com/blog/${escapeHtml(blog.slug)}`;
        const authorName = escapeHtml(blog.author?.name || 'CodeNix Labs');

        // Build complete HTML response with OG/Twitter tags
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0; url=${escapeHtml(url)}" />
    
    <title>${title} | CodeNix Labs</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${url}" />
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="CodeNix Labs" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:url" content="${url}" />
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:site" content="@codenixlabs" />
    
    <!-- Article Meta Tags -->
    <meta property="article:published_time" content="${blog.publishedAt || blog.createdAt}" />
    <meta property="article:modified_time" content="${blog.updatedAt || blog.createdAt}" />
    <meta property="article:author" content="${authorName}" />
    <meta property="article:section" content="${escapeHtml(blog.category || 'Technology')}" />
    ${(blog.tags || []).map(tag => `<meta property="article:tag" content="${escapeHtml(tag)}" />`).join('\n    ')}
    
    <!-- Additional SEO Tags -->
    <meta name="keywords" content="${escapeHtml((blog.tags || []).join(', '))}" />
</head>
<body>
    <h1>${title}</h1>
    <p>${description}</p>
</body>
</html>`;

        // Set response headers for caching
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        res.setHeader('ETag', `"${blog._id}"`);
        res.status(200).send(htmlContent);

    } catch (error) {
        console.error('Error in getBlogOG:', error);
        res.status(500);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Error</title>
            </head>
            <body>
                <h1>Error generating preview</h1>
            </body>
            </html>
        `);
    }
};
                <title>Server Error</title>
            </head>
            <body>
                <h1>Server Error</h1>
                <p>Error: ${escapeHtml(error.message)}</p>
            </body>
            </html>
        `);
    }
};