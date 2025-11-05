"use client"

import { Trash2, Copy, Eye, EyeOff } from "lucide-react"
import { useState } from "react"

interface ApiKeyCardProps {
  apiKey: {
    id: string
    name: string
    service: string
    value: string
    createdAt: string
    lastUsed?: string
  }
  onDelete: () => void
}

export function ApiKeyCard({ apiKey, onDelete }: ApiKeyCardProps) {
  const [showValue, setShowValue] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${apiKey.name}"?`)) {
      onDelete()
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">{apiKey.name}</h3>
          <p className="text-sm text-muted-foreground">{apiKey.service}</p>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowValue(!showValue)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title={showValue ? "Hide value" : "Show value"}
          >
            {showValue ? (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Eye className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
            title="Delete key"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </div>

      {/* Value Display */}
      <div className="mb-4 p-3 bg-secondary/30 rounded-lg border border-border">
        {showValue ? (
          <code className="text-xs text-foreground break-all">{apiKey.value}</code>
        ) : (
          <code className="text-xs text-muted-foreground">••••••••••••••••••••••••••••••</code>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          <span>Created: {apiKey.createdAt}</span>
          {apiKey.lastUsed && <span className="ml-4">Used: {apiKey.lastUsed}</span>}
        </div>
        {copied && <span className="text-green-600 font-medium">Copied!</span>}
      </div>
    </div>
  )
}
