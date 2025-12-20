import type { BlogPost, BlogCategory } from "../types/blog"

// API base URL - adjust this to match your backend
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/blogs`


// API helper function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "API request failed")
    }

    return data
  } catch (error) {
    console.error("API Error:", error)
    throw error
  }
}

// Transform backend data to frontend format
const transformBlogPost = (backendPost: any): BlogPost => {
  return {
    _id: backendPost._id,
    title: backendPost.title,
    slug: backendPost.slug,
    excerpt: backendPost.excerpt,
    content: backendPost.content,
    author: backendPost.author,
    category: backendPost.category,
    tags: backendPost.tags || [],
    featuredImage: backendPost.featuredImage,
    publishedAt: backendPost.publishedAt || backendPost.createdAt,
    readTime: backendPost.readTime || Math.ceil((backendPost.content?.length || 0) / 1000) || 5,
    isPublished: backendPost.isPublished !== false,
    seo: backendPost.SEO ||
      backendPost.seo || {
      metaTitle: backendPost.title,
      metaDescription: backendPost.excerpt,
      keywords: backendPost.tags || [],
    },
  }
}

// Mock categories - predefined categories as in original code
const mockCategories: BlogCategory[] = [
  {
    _id: "1",
    name: "Web Development",
    slug: "web-development",
    description: "Latest trends and tutorials in web development",
    color: "#8948FF",
  },
  {
    _id: "2",
    name: "Mobile Development",
    slug: "mobile-development",
    description: "Mobile app development guides and best practices",
    color: "#48A9FF",
  },
  {
    _id: "3",
    name: "Design",
    slug: "design",
    description: "UI/UX design principles and inspiration",
    color: "#00F5D4",
  },
  {
    _id: "4",
    name: "Cloud Computing",
    slug: "cloud-computing",
    description: "Cloud architecture and deployment strategies",
    color: "#00E676",
  },
  {
    _id: "5",
    name: "Artificial Intelligence",
    slug: "artificial-intelligence",
    description: "AI and machine learning in software development",
    color: "#FFD600",
  },
  {
    _id: "6",
    name: "Security",
    slug: "security",
    description: "Cybersecurity best practices and guides",
    color: "#FF5252",
  },
]

export class BlogService {
  static async getAllPosts(filters?: {
    category?: string
    search?: string
    limit?: number
    page?: number
  }): Promise<{ posts: BlogPost[]; total: number; pagination: any }> {
    try {
      const params = new URLSearchParams()

      if (filters?.limit) params.append("limit", filters.limit.toString())
      if (filters?.page) params.append("page", filters.page.toString())
      if (filters?.category && filters.category !== "all") {
        params.append("category", filters.category)
      }
      if (filters?.search) {
        params.append("search", filters.search)
      }

      const queryString = params.toString()
      const endpoint = queryString ? `?${queryString}` : ""

      const response = await apiCall(endpoint)

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch posts")
      }

      const posts = response.data.map(transformBlogPost)
      const total = response.pagination?.totalBlogs || posts.length

      return {
        posts,
        total,
        pagination: response.pagination,
      }
    } catch (error) {
      console.error("Error fetching posts:", error)
      return { posts: [], total: 0, pagination: null }
    }
  }

  static async getPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const response = await apiCall(`/slug/${slug}`)

      if (!response.success) {
        throw new Error(response.message || "Post not found")
      }

      return transformBlogPost(response.data)
    } catch (error) {
      console.error("Error fetching post by slug:", error)
      return null
    }
  }

  static async getFeaturedPosts(limit = 3): Promise<BlogPost[]> {
    try {
      const response = await apiCall(`/featured/posts?limit=${limit}`)

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch featured posts")
      }

      return response.data.map(transformBlogPost)
    } catch (error) {
      console.error("Error fetching featured posts:", error)
      return []
    }
  }

  static async getRelatedPosts(postId: string, limit = 3): Promise<BlogPost[]> {
    try {
      const currentPost = await this.getPostById(postId)
      if (!currentPost) return []

      const response = await apiCall(`/category/${encodeURIComponent(currentPost.category)}?limit=${limit + 1}`)

      if (!response.success) {
        return []
      }

      const relatedPosts = response.data
        .map(transformBlogPost)
        .filter((post: BlogPost) => post._id !== postId)
        .slice(0, limit)

      return relatedPosts
    } catch (error) {
      console.error("Error fetching related posts:", error)
      return []
    }
  }

  static async getPostById(id: string): Promise<BlogPost | null> {
    try {
      const response = await apiCall(`/${id}`)

      if (!response.success) {
        throw new Error(response.message || "Post not found")
      }

      return transformBlogPost(response.data)
    } catch (error) {
      console.error("Error fetching post by ID:", error)
      return null
    }
  }

  static async getAllCategories(): Promise<BlogCategory[]> {
    try {
      // Try to fetch categories from API first
      const response = await apiCall("/meta/categories")

      if (response.success && response.data.length > 0) {
        // If API returns categories, map them to our format but keep the predefined ones as fallback
        const apiCategories = response.data.map((category: string, index: number) => {
          const existingCategory = mockCategories.find((c) => c.name === category)
          return (
            existingCategory || {
              _id: (mockCategories.length + index + 1).toString(),
              name: category,
              slug: category
                .toLowerCase()
                .replace(/[^a-z0-9 -]/g, "")
                .replace(/\s+/g, "-"),
              description: `${category} related posts`,
              color: "#8948FF",
            }
          )
        })

        // Merge with predefined categories, avoiding duplicates
        const allCategories = [...mockCategories]
        apiCategories.forEach((apiCat: BlogCategory) => {
          if (!allCategories.find((c) => c.name === apiCat.name)) {
            allCategories.push(apiCat)
          }
        })

        return allCategories
      }
    } catch (error) {
      console.error("Error fetching categories from API:", error)
    }

    // Always return predefined categories as fallback
    return mockCategories
  }

  static async getAllTags(): Promise<string[]> {
    try {
      const response = await apiCall("/meta/tags")

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch tags")
      }

      return response.data
    } catch (error) {
      console.error("Error fetching tags:", error)
      return []
    }
  }

  static async createPost(postData: Omit<BlogPost, "_id">): Promise<BlogPost> {
    try {
      const backendData = {
        title: postData.title,
        slug: postData.slug,
        excerpt: postData.excerpt,
        content: postData.content,
        author: postData.author,
        category: postData.category,
        tags: postData.tags,
        featuredImage: postData.featuredImage,
        isPublished: postData.isPublished,
        SEO: {
          metaTitle: postData.seo?.metaTitle || postData.title,
          metaDescription: postData.seo?.metaDescription || postData.excerpt,
          keywords: postData.seo?.keywords || postData.tags,
        },
      }

      const response = await apiCall("", {
        method: "POST",
        body: JSON.stringify(backendData),
      })

      if (!response.success) {
        throw new Error(response.message || "Failed to create post")
      }

      return transformBlogPost(response.data)
    } catch (error) {
      console.error("Error creating post:", error)
      throw error
    }
  }

  static async updatePost(id: string, postData: Partial<BlogPost>): Promise<BlogPost | null> {
    try {
      const backendData: any = {}

      if (postData.title) backendData.title = postData.title
      if (postData.slug) backendData.slug = postData.slug
      if (postData.excerpt) backendData.excerpt = postData.excerpt
      if (postData.content) backendData.content = postData.content
      if (postData.author) backendData.author = postData.author
      if (postData.category) backendData.category = postData.category
      if (postData.tags) backendData.tags = postData.tags
      if (postData.featuredImage) backendData.featuredImage = postData.featuredImage
      if (postData.isPublished !== undefined) backendData.isPublished = postData.isPublished
      if (postData.seo) {
        backendData.SEO = {
          metaTitle: postData.seo.metaTitle,
          metaDescription: postData.seo.metaDescription,
          keywords: postData.seo.keywords,
        }
      }

      const response = await apiCall(`/${id}`, {
        method: "PUT",
        body: JSON.stringify(backendData),
      })

      if (!response.success) {
        throw new Error(response.message || "Failed to update post")
      }

      return transformBlogPost(response.data)
    } catch (error) {
      console.error("Error updating post:", error)
      throw error
    }
  }

  static async deletePost(id: string): Promise<boolean> {
    try {
      const response = await apiCall(`/${id}`, {
        method: "DELETE",
      })

      return response.success
    } catch (error) {
      console.error("Error deleting post:", error)
      return false
    }
  }

  static async searchPosts(
    query: string,
    limit = 10,
    page = 1,
  ): Promise<{ posts: BlogPost[]; total: number; pagination: any }> {
    try {
      const response = await apiCall(`/search/posts?q=${encodeURIComponent(query)}&limit=${limit}&page=${page}`)

      if (!response.success) {
        throw new Error(response.message || "Search failed")
      }

      const posts = response.data.map(transformBlogPost)

      return {
        posts,
        total: response.pagination?.totalBlogs || posts.length,
        pagination: response.pagination,
      }
    } catch (error) {
      console.error("Error searching posts:", error)
      return { posts: [], total: 0, pagination: null }
    }
  }

  static async getBlogStats() {
    try {
      const response = await apiCall("/stats/analytics")

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch stats")
      }

      return response.data
    } catch (error) {
      console.error("Error fetching blog stats:", error)
      return null
    }
  }

  static async getPostsByCategory(
    category: string,
    limit = 10,
    page = 1,
  ): Promise<{ posts: BlogPost[]; total: number; pagination: any }> {
    try {
      const response = await apiCall(`/category/${encodeURIComponent(category)}?limit=${limit}&page=${page}`)

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch posts by category")
      }

      const posts = response.data.map(transformBlogPost)

      return {
        posts,
        total: response.pagination?.totalBlogs || posts.length,
        pagination: response.pagination,
      }
    } catch (error) {
      console.error("Error fetching posts by category:", error)
      return { posts: [], total: 0, pagination: null }
    }
  }

  static async getPostsByAuthor(
    author: string,
    limit = 10,
    page = 1,
  ): Promise<{ posts: BlogPost[]; total: number; pagination: any }> {
    try {
      const response = await apiCall(`/author/${encodeURIComponent(author)}?limit=${limit}&page=${page}`)

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch posts by author")
      }

      const posts = response.data.map(transformBlogPost)

      return {
        posts,
        total: response.pagination?.totalBlogs || posts.length,
        pagination: response.pagination,
      }
    } catch (error) {
      console.error("Error fetching posts by author:", error)
      return { posts: [], total: 0, pagination: null }
    }
  }

  static async getPostsByTag(
    tag: string,
    limit = 10,
    page = 1,
  ): Promise<{ posts: BlogPost[]; total: number; pagination: any }> {
    try {
      const response = await apiCall(`/tag/${encodeURIComponent(tag)}?limit=${limit}&page=${page}`)

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch posts by tag")
      }

      const posts = response.data.map(transformBlogPost)

      return {
        posts,
        total: response.pagination?.totalBlogs || posts.length,
        pagination: response.pagination,
      }
    } catch (error) {
      console.error("Error fetching posts by tag:", error)
      return { posts: [], total: 0, pagination: null }
    }
  }
}
