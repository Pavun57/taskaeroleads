"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { FileText, Wand2, BookOpen, TrendingUp, AlertCircle } from "lucide-react"
import { BlogPreview } from "@/components/blog-preview"
import { apiClient } from "@/lib/api"

interface BlogPost {
  id: string
  title: string
  topic: string
  tone: string
  wordCount: number
  status: "draft" | "published"
  seoScore: number
  createdAt: string
  content?: string
  summary?: string
}

export default function BlogWriterPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    topic: "",
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [geminiApiKey, setGeminiApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    loadBlogs()
    // Check if Gemini API key is configured
    apiClient.getConfigStatus().then((response) => {
      if (response.data) {
        const status = response.data
        if (status.gemini_api_key === "configured") {
          setShowApiKey(false)
        } else {
          setShowApiKey(true)
        }
      }
    })
  }, [])

  const loadBlogs = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getBlogs()
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        const loadedPosts = response.data.map((blog) => {
          const wordCount = blog.content ? blog.content.split(/\s+/).length : 0
          return {
            id: blog.blog_id,
            title: blog.title,
            topic: blog.topic,
            tone: "professional", // Default tone since API doesn't provide it
            wordCount,
            status: "draft" as const,
            seoScore: calculateSEOScore(blog.content, wordCount),
            createdAt: blog.created_at.split("T")[0],
            content: blog.content,
            summary: blog.summary,
          }
        })
        setPosts(loadedPosts)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blogs")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateSEOScore = (content: string, wordCount: number): number => {
    let score = 50 // Base score
    
    // Word count score (2000+ words is ideal)
    if (wordCount >= 2000) score += 20
    else if (wordCount >= 1500) score += 15
    else if (wordCount >= 1000) score += 10
    else if (wordCount >= 500) score += 5
    
    // Content quality indicators
    if (content.includes("#")) score += 10 // Has headings
    if (content.includes("**") || content.includes("*")) score += 5 // Has formatting
    if (content.split("\n").length > 10) score += 5 // Has structure
    
    return Math.min(100, score)
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.topic.trim()) {
      setError("Please provide a topic or title")
      return
    }

    // Check if API key is required but not provided
    if (showApiKey && !geminiApiKey.trim()) {
      setError("Gemini API key is required to generate blog posts")
      return
    }

    setIsGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await apiClient.generateBlogs({
        topics: [formData.topic.trim()],
        ...(geminiApiKey && { gemini_api_key: geminiApiKey }),
      })

      if (response.error) {
        const errorMsg = typeof response.error === 'string' 
          ? response.error 
          : (response.error as any)?.message || (response.error as any)?.detail || 'Failed to generate blog'
        setError(errorMsg)
      } else if (response.data && response.data.blogs && response.data.blogs.length > 0) {
        const generatedBlog = response.data.blogs[0]
        const wordCount = generatedBlog.content ? generatedBlog.content.split(/\s+/).length : 0
        
        const newPost: BlogPost = {
          id: generatedBlog.blog_id,
          title: generatedBlog.title,
          topic: generatedBlog.topic,
          tone: "professional",
          wordCount,
          status: "draft",
          seoScore: calculateSEOScore(generatedBlog.content, wordCount),
          createdAt: generatedBlog.created_at.split("T")[0],
          content: generatedBlog.content,
          summary: generatedBlog.summary,
        }

        setPosts([newPost, ...posts])
        setSuccess(`Successfully generated blog: ${generatedBlog.title}`)
        setTimeout(() => {
          setSuccess(null)
          loadBlogs() // Reload to get latest blogs from API
        }, 2000)
        
        setFormData({
          topic: "",
        })
        setShowForm(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate blog")
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePublish = (id: string) => {
    setPosts(posts.map((post) => (post.id === id ? { ...post, status: "published" } : post)))
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return

    setIsLoading(true)
    try {
      const response = await apiClient.deleteBlog(id)
      if (response.error) {
        setError(response.error)
      } else {
        setPosts(posts.filter((post) => post.id !== id))
        setSelectedPost(null)
        setSuccess("Blog deleted successfully")
        setTimeout(() => {
          setSuccess(null)
          loadBlogs() // Reload to get latest blogs from API
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete blog")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = (id: string) => {
    const post = posts.find((p) => p.id === id)
    if (post && post.content) {
      const element = document.createElement("a")
      element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(post.content))
      element.setAttribute("download", `${post.title.toLowerCase().replace(/ /g, "-")}.txt`)
      element.style.display = "none"
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    }
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-12 fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-600 to-purple-400 p-3 rounded-xl">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground">Blog Writer</h1>
                  <p className="text-muted-foreground">AI-powered content generation with SEO optimization</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowForm(!showForm)
                  setSelectedPost(null)
                }}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Wand2 className="w-4 h-4" />
                Generate Post
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Error/Success Messages */}
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
                  <p className="text-sm font-medium text-green-600">{success}</p>
                </div>
              )}

              {/* Gemini API Key Section */}
              {showApiKey && (
                <div className="bg-card border border-border rounded-xl p-6 fade-in">
                  <h2 className="text-2xl font-semibold mb-4">Gemini API Configuration</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Gemini API key is required for blog generation.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Gemini API Key</label>
                      <input
                        type="password"
                        placeholder="Your Gemini API key"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          if (geminiApiKey) {
                            const response = await apiClient.updateConfig({
                              gemini_api_key: geminiApiKey,
                            })
                            if (response.data) {
                              // Refresh config status
                              const statusResponse = await apiClient.getConfigStatus()
                              if (statusResponse.data) {
                                const status = statusResponse.data
                                if (status.gemini_api_key === "configured") {
                                  setShowApiKey(false)
                                }
                              }
                              setSuccess("Gemini API key configured successfully")
                              setTimeout(() => setSuccess(null), 3000)
                            } else if (response.error) {
                              setError(response.error)
                            }
                          }
                        }}
                        disabled={!geminiApiKey.trim()}
                        className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50"
                      >
                        Save API Key
                      </button>
                      <button
                        onClick={() => setShowApiKey(false)}
                        className="flex-1 bg-secondary text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-all duration-200"
                      >
                        Skip for Now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Generation Form */}
              {showForm && (
                <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 fade-in">
                  <h2 className="text-2xl font-semibold mb-6">Generate New Blog Post</h2>
                  <form onSubmit={handleGenerate} className="space-y-6">
                    {showApiKey && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <label className="block text-sm font-medium mb-2 text-foreground">
                          Gemini API Key <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Enter your Gemini API key (required)"
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
                          required={showApiKey}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Gemini API key is required to generate blog posts.
                        </p>
                      </div>
                    )}
                    {!showApiKey && (
                      <div className="p-4 bg-secondary/30 border border-border rounded-lg">
                        <label className="block text-sm font-medium mb-2">Gemini API Key (Optional - override)</label>
                        <input
                          type="password"
                          placeholder="Leave empty to use saved key"
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-2">Blog Topic or Title</label>
                      <input
                        type="text"
                        placeholder="e.g., Introduction to Python Programming"
                        value={formData.topic}
                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter a topic or title. The AI will generate a complete blog article based on this.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={isGenerating || (showApiKey && !geminiApiKey.trim())}
                        className="flex-1 bg-gradient-to-br from-purple-600 to-purple-400 text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isGenerating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4" />
                            Generate Post
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="flex-1 bg-secondary text-foreground px-4 py-3 rounded-lg hover:bg-muted transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Blog Posts List */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">Your Posts ({posts.length})</h2>
                  <button
                    onClick={loadBlogs}
                    disabled={isLoading}
                    className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
                  >
                    {isLoading ? "Loading..." : "Refresh"}
                  </button>
                </div>
                <div className="space-y-4">
                  {isLoading && posts.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-muted-foreground">Loading blogs...</p>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border rounded-xl">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground mb-4">No blog posts yet</p>
                      <button onClick={() => setShowForm(true)} className="text-primary hover:underline font-medium">
                        Generate your first post
                      </button>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className="bg-card border border-border rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                              {post.title}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                              <span>{post.topic}</span>
                              <span>•</span>
                              <span suppressHydrationWarning>
                                {isClient ? post.wordCount.toLocaleString() : post.wordCount} words
                              </span>
                              <span>•</span>
                              <span className="capitalize">{post.tone}</span>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-4 ${
                              post.status === "published"
                                ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                : "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                            }`}
                          >
                            {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                          </span>
                        </div>

                        {/* SEO Score */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">SEO Score</span>
                            <span className="text-sm font-bold text-foreground">{post.seoScore}/100</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-600 to-emerald-400 h-2 rounded-full"
                              style={{ width: `${post.seoScore}%` }}
                            />
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span suppressHydrationWarning>Created {post.createdAt}</span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {post.status === "draft" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePublish(post.id)
                                }}
                                className="px-3 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded hover:bg-green-500/30 transition-colors text-xs font-medium"
                              >
                                Publish
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleExport(post.id)
                              }}
                              className="px-3 py-1 bg-secondary rounded hover:bg-muted transition-colors text-xs font-medium"
                            >
                              Export
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(post.id)
                              }}
                              className="px-3 py-1 bg-destructive/20 text-destructive rounded hover:bg-destructive/30 transition-colors text-xs font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Preview & Stats Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {selectedPost && <BlogPreview post={selectedPost} />}

              {/* Content Stats */}
              {!selectedPost && (
                <div className="bg-card border border-border rounded-xl p-6 sticky top-20">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Statistics
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Blogs</p>
                      <p className="text-3xl font-bold text-foreground">{posts.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="bg-secondary/30 border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-3">Content Tips</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Aim for 2000+ words for better SEO</li>
                  <li>• Use 3-5 target keywords</li>
                  <li>• Include a clear call-to-action</li>
                  <li>• Optimize heading structure</li>
                  <li>• Review SEO score before publishing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
