"use client"
import { ExternalLink } from "lucide-react"

interface Result {
  id: number
  name: string
  title: string
  company: string
  location: string
}

interface ScraperResultsProps {
  results: Result[]
}

export function ScraperResults({ results }: ScraperResultsProps) {
  return (
    <div className="space-y-4">
      {results.map((result) => (
        <div
          key={result.id}
          className="bg-card border border-border rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all duration-200 group"
        >
          <div className="flex items-start gap-4">
            {/* Profile Avatar */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white font-semibold">
                {result.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{result.name}</h3>
                  <p className="text-sm text-primary font-medium">{result.title}</p>
                </div>
                <button className="p-2 hover:bg-secondary rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Details */}
              <div className="grid sm:grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="text-muted-foreground">Company</span>
                  <p className="font-medium text-foreground">{result.company}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Location</span>
                  <p className="font-medium text-foreground">{result.location}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
