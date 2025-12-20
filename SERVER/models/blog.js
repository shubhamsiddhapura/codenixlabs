import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true
    },
    excerpt: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        avatar: {
            type: String,
        }
    },
    category: {
        type: String,
        required: true,
    },
    tags: [{
        type: String,
    }],
    featuredImage: {
        type: String
    },
    SEO: {
        metaTitle: {
            type: String,
        },
        metaDescription: {
            type: String,
        },
        keywords: [{
            type: String
        }]
    }
},
    { timestamps: true });

const Blog = mongoose.model('Blog', blogSchema);

export default Blog;