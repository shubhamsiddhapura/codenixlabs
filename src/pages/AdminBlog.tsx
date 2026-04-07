"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, Edit, Trash2, Eye, Search, Save, X, AlertCircle } from "lucide-react"
import { BlogService } from "../services/blogService"
import type { BlogPost, BlogCategory } from "../types/blog"

const AdminBlog: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState<"all" | "draft" | "published">("all")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)

  // AI Generation state
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateTopic, setGenerateTopic] = useState("")
  const [generateCategory, setGenerateCategory] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [showAnglePicker, setShowAnglePicker] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "",
    tags: "",
    featuredImage: "",
    status: "draft" as "draft" | "published",
    author: {
      name: "Admin",
      avatar:
        "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2",
    },
    seo: {
      metaTitle: "",
      metaDescription: "",
      keywords: [] as string[],
    },
  })

   const handleRegenerateBlog = async (angle: string) => {
  setShowAnglePicker(false)
  setRegenerating(true)
  setError(null)

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"}/api/blogs/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formData.title || generateTopic,  // use current title as topic
          category: formData.category,
          angle,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to regenerate blog")
    }

    const data = await response.json()
    if (data.success && data.data) {
      const g = data.data
      setFormData((prev) => ({
        ...prev,
        title: g.title,
        slug: g.slug,
        excerpt: g.excerpt,
        content: g.content,
        tags: (g.tags || []).join(", "),
        seo: {
          metaTitle: g.SEO?.metaTitle || g.title,
          metaDescription: g.SEO?.metaDescription || g.excerpt,
          keywords: g.SEO?.keywords || [],
        },
      }))
    }
  } catch (error: any) {
    setError(error.message || "Failed to regenerate. Please try again.")
  } finally {
    setRegenerating(false)
  }
}

  useEffect(() => {
    loadPosts()
    loadCategories()
  }, [selectedCategory, selectedStatus, searchTerm, currentPage])

  const loadPosts = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await BlogService.getAllPosts({
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        search: searchTerm || undefined,
        limit: 10,
        page: currentPage,
        admin: true, // Admin sees all statuses
      })

      // Filter by status on frontend if needed
      let filteredPosts = result.posts
      if (selectedStatus !== "all") {
        filteredPosts = result.posts.filter((post) => {
          // Treat missing status as "published" for backward compatibility
          const postStatus = post.status || "published"
          return postStatus === selectedStatus
        })
      }

      setPosts(filteredPosts)
      setPagination(result.pagination)
    } catch (error) {
      console.error("Error loading posts:", error)
      setError("Failed to load posts. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const fetchedCategories = await BlogService.getAllCategories()
      setCategories(fetchedCategories)
    } catch (error) {
      console.error("Error loading categories:", error)
    }
  }

  const handleCreatePost = () => {
    setEditingPost(null)
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: "",
      tags: "",
      featuredImage: "",
      status: "draft",
      author: {
        name: "Admin",
        avatar:
          "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2",
      },
      seo: {
        metaTitle: "",
        metaDescription: "",
        keywords: [] as string[],
      },
    })
    setShowEditor(true)
  }

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post)
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
      featuredImage: post.featuredImage || "",
      status: post.status,
      author: post.author,
      seo: {
        metaTitle: post.seo?.metaTitle || post.title,
        metaDescription: post.seo?.metaDescription || post.excerpt,
        keywords: post.seo?.keywords || [],
      },
    })
    setShowEditor(true)
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError("Title is required")
      return false
    }
    if (!formData.slug.trim()) {
      setError("Slug is required")
      return false
    }
    if (!formData.excerpt.trim()) {
      setError("Excerpt is required")
      return false
    }
    if (!formData.content.trim()) {
      setError("Content is required")
      return false
    }
    if (!formData.category.trim()) {
      setError("Category is required")
      return false
    }
    if (!formData.featuredImage.trim()) {
      setError("Featured image URL is required")
      return false
    }
    return true
  }

  const handleSavePost = async () => {
    if (!validateForm()) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const postData = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        excerpt: formData.excerpt.trim(),
        content: formData.content.trim(),
        category: formData.category.trim(),
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        featuredImage: formData.featuredImage.trim(),
        status: formData.status,
        author: formData.author,
        publishedAt: editingPost?.publishedAt || new Date().toISOString(),
        readTime: Math.ceil(formData.content.length / 1000) || 5,
        seo: {
          metaTitle: formData.seo.metaTitle || formData.title,
          metaDescription: formData.seo.metaDescription || formData.excerpt,
          keywords: formData.seo.metaDescription
            ? formData.seo.metaDescription.split(" ").slice(0, 10)
            : formData.excerpt.split(" ").slice(0, 10),
        },
      }

      if (editingPost) {
        await BlogService.updatePost(editingPost._id, postData)
      } else {
        await BlogService.createPost(postData)
      }

      setShowEditor(false)
      setCurrentPage(1) // Reset to first page after creating/updating
      loadPosts()
    } catch (error: any) {
      console.error("Error saving post:", error)
      setError(error.message || (editingPost ? "Failed to update post" : "Failed to create post"))
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        const success = await BlogService.deletePost(postId)
        if (success) {
          loadPosts()
        } else {
          setError("Failed to delete post")
        }
      } catch (error) {
        console.error("Error deleting post:", error)
        setError("Failed to delete post")
      }
    }
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
  }

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: generateSlug(title),
      seo: {
        ...prev.seo,
        metaTitle: title,
      },
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const closeEditor = () => {
    setShowEditor(false)
    setError(null)
  }

  const handleSearch = () => {
    setCurrentPage(1)
    loadPosts()
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setCurrentPage(1)
  }

  const handleStatusChange = (status: "all" | "draft" | "published") => {
    setSelectedStatus(status)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleGenerateBlog = async () => {
    if (!generateTopic.trim()) {
      setGenerateError("Topic is required")
      return
    }
    if (!generateCategory.trim()) {
      setGenerateError("Category is required")
      return
    }

    setGenerating(true)
    setGenerateError(null)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"}/api/blogs/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: generateTopic.trim(),
            category: generateCategory.trim(),
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to generate blog")
      }

      const data = await response.json()

      if (data.success && data.data) {
        const generatedBlog = data.data

        // Auto-fill form with generated data
        setFormData((prev) => ({
          ...prev,
          title: generatedBlog.title,
          slug: generatedBlog.slug,
          excerpt: generatedBlog.excerpt,
          content: generatedBlog.content,
          category: generatedBlog.category,
          tags: (generatedBlog.tags || []).join(", "),
          featuredImage: generatedBlog.featuredImage || "",
          seo: {
            metaTitle: generatedBlog.SEO?.metaTitle || generatedBlog.title,
            metaDescription: generatedBlog.SEO?.metaDescription || generatedBlog.excerpt,
            keywords: generatedBlog.SEO?.keywords || [],
          },
        }))

        // Close generate modal and open editor
        setShowGenerateModal(false)
        setGenerateTopic("")
        setGenerateCategory("")
        setEditingPost(null) // Ensure we're creating new post
        setError(null)
      }
    } catch (error: any) {
      console.error("Error generating blog:", error)
      setGenerateError(error.message || "Failed to generate blog. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen pt-24 pb-16"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-orbitron font-bold mb-2">Blog Administration</h1>
            <p className="text-neutral-400">Manage your blog posts and content</p>
          </div>
          <button
            onClick={handleCreatePost}
            className="btn btn-primary neon-border hover-effect flex items-center gap-2 mt-4 md:mt-0"
          >
            <Plus size={20} />
            New Post
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2"
          >
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto hover:text-red-300">
              <X size={16} />
            </button>
          </motion.div>
        )}

        {/* Filters */}
        <div className="glass p-6 rounded-xl mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-10 pr-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white placeholder-neutral-500 transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value as "all" | "draft" | "published")}
              className="px-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            <button onClick={handleSearch} className="btn btn-primary neon-border hover-effect">
              Search
            </button>
          </div>
        </div>

        {/* Posts Table */}
        <div className="glass rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : posts.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-800/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Title</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Author</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post, index) => (
                      <motion.tr
                        key={post._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="border-t border-neutral-800 hover:bg-neutral-800/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {post.featuredImage && (
                              <img
                                src={post.featuredImage || "/placeholder.svg"}
                                alt={post.title}
                                className="w-12 h-12 rounded-lg object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none"
                                }}
                              />
                            )}
                            <div>
                              <h3 className="font-medium line-clamp-1">{post.title}</h3>
                              <p className="text-sm text-neutral-400 line-clamp-1">{post.excerpt}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="bg-primary/20 text-primary px-2 py-1 rounded text-sm">{post.category}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <img
                              src={post.author.avatar || "/placeholder.svg"}
                              alt={post.author.name}
                              className="w-6 h-6 rounded-full"
                              onError={(e) => {
                                e.currentTarget.src = "https://via.placeholder.com/24x24/8948ff/ffffff?text=A"
                              }}
                            />
                            <span className="text-sm">{post.author.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-neutral-400">{formatDate(post.publishedAt || new Date().toISOString())}</td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded text-sm ${(post.status || "published") === "published" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                              }`}
                          >
                            {(post.status || "published") === "published" ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => window.open(`/blog/${post.slug}`, "_blank")}
                              className="p-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 transition-colors hover-effect"
                              title="View Post"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEditPost(post)}
                              className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors hover-effect"
                              title="Edit Post"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeletePost(post._id)}
                              className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors hover-effect"
                              title="Delete Post"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 p-6 border-t border-neutral-800">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>

                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-lg transition-colors ${currentPage === page
                          ? "bg-primary text-white"
                          : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <div className="text-neutral-400 mb-4">
                <Search size={48} className="mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No posts found</h3>
                <p>
                  {searchTerm || selectedCategory !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Create your first blog post to get started."}
                </p>
              </div>
              <button onClick={handleCreatePost} className="btn btn-primary neon-border hover-effect">
                Create First Post
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Editor Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-orbitron font-bold">{editingPost ? "Edit Post" : "Create New Post"}</h2>
                {!editingPost && (
                  <button
                    onClick={() => setShowGenerateModal(true)}
                    className="btn neon-border hover-effect text-sm py-2 px-3 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 flex items-center gap-2"
                    disabled={saving}
                  >
                    ✨ Generate with AI
                  </button>
                )}
              </div>
              <button
                onClick={closeEditor}
                className="p-2 rounded-lg hover:bg-neutral-800 transition-colors hover-effect"
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            {/* Editor Form */}
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter post title"
                  disabled={saving}
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Slug <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="post-url-slug"
                  disabled={saving}
                />
              </div>

              {/* Category and Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary"
                    disabled={saving}
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tags</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="tag1, tag2, tag3"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Featured Image */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Featured Image URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={formData.featuredImage}
                  onChange={(e) => setFormData((prev) => ({ ...prev, featuredImage: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="https://example.com/image.jpg"
                  disabled={saving}
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Excerpt <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Brief description of the post"
                  disabled={saving}
                />
              </div>

{/* Content — replace lines 781–850 with this */}
<div className="relative">
  <div className="flex items-center justify-between mb-2">
    <label className="block text-sm font-medium">
      Content <span className="text-red-400">*</span>
    </label>
    {formData.content && (
      <button
        type="button"
        onClick={() => setShowAnglePicker((v) => !v)}
        disabled={regenerating || saving}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
      >
        {regenerating ? (
          <div className="animate-spin rounded-full h-3 w-3 border-b border-primary" />
        ) : (
          <span>🔄</span>
        )}
        {regenerating ? "Regenerating..." : "Regenerate"}
      </button>
    )}
  </div>

  {/* Angle picker dropdown */}
  {showAnglePicker && (
    <div className="absolute right-0 top-8 z-20 bg-neutral-900 border border-neutral-700 rounded-xl p-3 w-72 shadow-2xl">
      <p className="text-xs text-neutral-400 mb-3">Pick a different angle for fresh content:</p>
      <div className="space-y-1.5">
        {[
          { key: "contrarian", label: "🎯 Contrarian Take", desc: "Challenge popular opinions" },
          { key: "datadriven", label: "📊 Data-Driven", desc: "Stats and research heavy" },
          { key: "storytelling", label: "📖 Storytelling", desc: "Narrative and case study first" },
          { key: "beginner", label: "🔰 Beginner's Guide", desc: "Simple, step-by-step" },
          { key: "futurist", label: "🔥 Bold & Futurist", desc: "Predictions and trend-based" },
        ].map((a) => (
          <button
            key={a.key}
            onClick={() => handleRegenerateBlog(a.key)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 transition-colors group"
          >
            <span className="text-sm font-medium">{a.label}</span>
            <p className="text-xs text-neutral-500 group-hover:text-neutral-400">{a.desc}</p>
          </button>
        ))}
      </div>
      <button
        onClick={() => setShowAnglePicker(false)}
        className="mt-2 w-full text-xs text-neutral-500 hover:text-neutral-300 py-1"
      >
        Cancel
      </button>
    </div>
  )}

  <textarea
    value={formData.content}
    onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
    rows={12}
    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
    placeholder="Write your post content here (HTML supported)"
    disabled={saving || regenerating}  // also disable during regenerating
  />
</div>

              {/* SEO */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">SEO Settings</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Meta Description</label>
                  <textarea
                    value={formData.seo.metaDescription}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        seo: { ...prev.seo, metaDescription: e.target.value },
                      }))
                    }
                    rows={2}
                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    placeholder="SEO meta description"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Publish Status */}
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      value="draft"
                      checked={formData.status === "draft"}
                      onChange={() => setFormData((prev) => ({ ...prev, status: "draft" }))}
                      className="w-4 h-4 accent-primary"
                      disabled={saving}
                    />
                    <span className="text-sm">Draft</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      value="published"
                      checked={formData.status === "published"}
                      onChange={() => setFormData((prev) => ({ ...prev, status: "published" }))}
                      className="w-4 h-4 accent-primary"
                      disabled={saving}
                    />
                    <span className="text-sm">Published</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Editor Footer */}
            <div className="flex items-center justify-end gap-4 p-6 border-t border-neutral-800">
              <button onClick={closeEditor} className="btn btn-outline hover-effect" disabled={saving}>
                Cancel
              </button>
              <button
                onClick={handleSavePost}
                className="btn btn-primary neon-border hover-effect flex items-center gap-2"
                disabled={saving}
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save size={16} />
                )}
                {saving ? "Saving..." : editingPost ? "Update Post" : "Create Post"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900 rounded-xl w-full max-w-md"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <h2 className="text-xl font-orbitron font-bold">Generate with AI</h2>
              </div>
              <button
                onClick={() => {
                  setShowGenerateModal(false)
                  setGenerateError(null)
                  setGenerateTopic("")
                  setGenerateCategory("")
                }}
                className="p-2 rounded-lg hover:bg-neutral-800 transition-colors hover-effect"
                disabled={generating}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {generateError && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2"
                >
                  <AlertCircle size={16} />
                  <span>{generateError}</span>
                </motion.div>
              )}

              {/* Topic Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Topic <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={generateTopic}
                  onChange={(e) => setGenerateTopic(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="e.g., The future of React 19 in web development and best practices"
                  disabled={generating}
                />
              </div>

              {/* Category Select */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={generateCategory}
                  onChange={(e) => setGenerateCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={generating}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-4 p-6 border-t border-neutral-800">
              <button
                onClick={() => {
                  setShowGenerateModal(false)
                  setGenerateError(null)
                  setGenerateTopic("")
                  setGenerateCategory("")
                }}
                className="btn btn-outline hover-effect"
                disabled={generating}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateBlog}
                className="btn btn-primary neon-border hover-effect flex items-center gap-2"
                disabled={generating}
              >
                {generating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <span>✨</span>
                )}
                {generating ? "Generating..." : "Generate"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}

export default AdminBlog
