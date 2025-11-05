"use client"

import { Copy } from "lucide-react"
import { useState } from "react"

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
}

interface BlogPreviewProps {
  post: BlogPost
}

export function BlogPreview({ post }: BlogPreviewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyContent = () => {
    if (post.content) {
      navigator.clipboard.writeText(post.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-20">
      <div className="bg-gradient-to-r from-purple-600 to-purple-400 p-4 text-white">
        <h3 className="font-semibold truncate">{post.title}</h3>
      </div>

      <div className="p-6 space-y-4">
        {/* Content Preview */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Preview</p>
          <p className="text-sm text-foreground line-clamp-4 leading-relaxed">
            {post.content || "No content generated yet"}
          </p>
        </div>

        {/* Stats */}
        <div className="border-t border-border pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Word Count</span>
            <span className="font-medium text-foreground">{post.wordCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">SEO Score</span>
            <span className="font-medium text-foreground">{post.seoScore}/100</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span
              className={`font-medium capitalize ${post.status === "published" ? "text-green-600" : "text-blue-600"}`}
            >
              {post.status}
            </span>
          </div>
        </div>

        {/* Copy Button */}
        {post.content && (
          <button
            onClick={handleCopyContent}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-muted transition-all duration-200 font-medium text-sm"
          >
            <Copy className="w-4 h-4" />
            {copied ? "Copied!" : "Copy Content"}
          </button>
        )}
      </div>
    </div>
  )
}
