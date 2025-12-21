"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Search } from "lucide-react"
import { BlogService } from "../services/blogService"
import type { BlogPost, BlogCategory, Pagination } from "../types/blog"
import BlogCard from "../components/BlogCard"

const Blog: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination | null>(null)

  const postsPerPage = 6

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await BlogService.getAllPosts({
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        search: searchTerm || undefined,
        limit: postsPerPage,
        page: currentPage,
      })

      setPosts(result.posts)
      setPagination(result.pagination)
    } catch (error) {
      console.error("Error loading posts:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchTerm, currentPage, postsPerPage])

  const loadCategories = useCallback(async () => {
    try {
      const fetchedCategories = await BlogService.getAllCategories()
      setCategories(fetchedCategories)
    } catch (error) {
      console.error("Error loading categories:", error)
    }
  }, [])

  useEffect(() => {
    loadPosts()
    loadCategories()
  }, [loadPosts, loadCategories])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadPosts()
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      {/* Hero Section */}
      <section className="pt-32 pb-20 relative grid-bg">
        <div className="absolute inset-0 bg-glow opacity-40"></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl font-orbitron font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Our <span className="text-primary">Blog</span>
            </motion.h1>

            <motion.p
              className="text-xl text-neutral-300 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Insights, tutorials, and industry trends from our team of experts. Stay updated with the latest in
              technology and development.
            </motion.p>

            {/* Search Bar */}
            <motion.form
              onSubmit={handleSearch}
              className="max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white placeholder-neutral-500 transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-sm"
                />
              </div>
            </motion.form>
          </div>
        </div>
      </section>

      {/* Filters and Content */}
      <section className="py-16 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <button
              onClick={() => handleCategoryChange("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover-effect ${
                selectedCategory === "all"
                  ? "bg-primary text-white"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              All Posts
            </button>
            {categories.map((category) => (
              <button
                key={category._id}
                onClick={() => handleCategoryChange(category.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover-effect ${
                  selectedCategory === category.name
                    ? "bg-primary text-white"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Blog Posts Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : posts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {posts.map((post, index) => (
                  <BlogCard key={post._id} post={post} index={index} />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>

                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    let page
                    if (pagination.totalPages <= 5) {
                      page = i + 1
                    } else if (currentPage <= 3) {
                      page = i + 1
                    } else if (currentPage >= pagination.totalPages - 2) {
                      page = pagination.totalPages - 4 + i
                    } else {
                      page = currentPage - 2 + i
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          currentPage === page
                            ? "bg-primary text-white"
                            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}

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
                <p>Try adjusting your search terms or category filter.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-20 bg-neutral-900 relative">
        <div className="absolute inset-0 bg-glow opacity-20"></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <motion.h2
              className="text-3xl font-orbitron font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Stay Updated
            </motion.h2>

            <motion.p
              className="text-neutral-300 mb-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Subscribe to our newsletter to get the latest articles and insights delivered directly to your inbox.
            </motion.p>

            <motion.form
              className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-neutral-800/50 border border-neutral-700 focus:border-primary rounded-lg text-white placeholder-neutral-500 transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-sm"
              />
              <button type="submit" className="btn btn-primary neon-border hover-effect whitespace-nowrap">
                Subscribe
              </button>
            </motion.form>
          </div>
        </div>
      </section>
    </motion.div>
  )
}

export default Blog
