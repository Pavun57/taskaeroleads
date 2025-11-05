"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Linkedin, Search, Download, TrendingUp, AlertCircle } from "lucide-react"
import { ScraperResults } from "@/components/scraper-results"
import { apiClient } from "@/lib/api"

interface Profile {
  id: number
  name: string
  title: string
  company: string
  location: string
}

export default function LinkedInScraperPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [profileCount, setProfileCount] = useState(20)
  const [isScanning, setIsScanning] = useState(false)
  const [results, setResults] = useState<Profile[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [responseMessage, setResponseMessage] = useState<string | null>(null)
  const [csvPath, setCsvPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState({
    gemini_api_key: "",
    linkedin_email: "",
    linkedin_password: "",
  })
  const [showApiKeys, setShowApiKeys] = useState(false)

  useEffect(() => {
    // Load config status
    apiClient.getConfigStatus().then((response) => {
      if (response.data) {
        // Check if keys are already configured
        const status = response.data
        const geminiConfigured = status.gemini_api_key === "configured"
        const linkedinConfigured = status.linkedin_email === "configured" && status.linkedin_password === "configured"
        
        // Show API keys section if either Gemini or LinkedIn credentials are not configured
        setShowApiKeys(!geminiConfigured || !linkedinConfigured)
      }
    })
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      setError("Please enter a search query")
      return
    }

    // Check if required API keys are provided when not configured
    if (showApiKeys) {
      if (!apiKeys.gemini_api_key.trim()) {
        setError("Gemini API key is required for keyword extraction")
        return
      }
      if (!apiKeys.linkedin_email.trim() || !apiKeys.linkedin_password.trim()) {
        setError("LinkedIn credentials are required for scraping")
        return
      }
    }

    setIsScanning(true)
    setError(null)
    setResponseMessage(null)
    setKeywords([])
    setCsvPath(null)

    try {
      const response = await apiClient.scrapeLeads({
        prompt: searchQuery.trim(),
        profile_count: profileCount,
        ...(apiKeys.gemini_api_key && { gemini_api_key: apiKeys.gemini_api_key }),
        ...(apiKeys.linkedin_email && { linkedin_email: apiKeys.linkedin_email }),
        ...(apiKeys.linkedin_password && { linkedin_password: apiKeys.linkedin_password }),
      })

      if (response.error) {
        setError(response.error)
        setResults([])
        setKeywords([])
        setResponseMessage(null)
        setCsvPath(null)
      } else if (response.data) {
        // Map profiles with proper ID
        const profiles = response.data.profiles.map((profile, index) => ({
          id: index + 1,
          name: profile.name || "N/A",
          title: profile.title || "N/A",
          company: profile.company || "N/A",
          location: profile.location || "N/A",
        }))
        setResults(profiles)
        setKeywords(response.data.keywords || [])
        setResponseMessage(response.data.message || null)
        setCsvPath(response.data.csv_path || null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setResults([])
      setKeywords([])
      setResponseMessage(null)
      setCsvPath(null)
    } finally {
      setIsScanning(false)
    }
  }

  const handleExport = () => {
    if (results.length === 0) return

    const csv = [
      ["Name", "Title", "Company", "Location"].join(","),
      ...results.map((r) => [
        r.name,
        r.title,
        r.company,
        r.location,
      ].join(",")),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "linkedin-results.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-12 fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-400 p-3 rounded-xl">
                <Linkedin className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-foreground">LinkedIn Scraper</h1>
            </div>
            <p className="text-lg text-muted-foreground">Advanced profile extraction and lead generation tool</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Search Section */}
              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
                <h2 className="text-2xl font-semibold mb-6">Search Parameters</h2>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">{error}</p>
                    </div>
                  </div>
                )}

                {/* API Keys Section */}
                {showApiKeys && (
                  <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground">API Configuration Required</h3>
                      <button
                        type="button"
                        onClick={() => setShowApiKeys(false)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Hide
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      These credentials are required for LinkedIn scraping. You can also configure them in the{" "}
                      <a href="/configuration" className="text-primary hover:underline">
                        Configuration page
                      </a>
                      .
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Gemini API Key <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Your Gemini API key"
                          value={apiKeys.gemini_api_key}
                          onChange={(e) => setApiKeys({ ...apiKeys, gemini_api_key: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
                          required={showApiKeys}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          LinkedIn Email <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="your-email@example.com"
                          value={apiKeys.linkedin_email}
                          onChange={(e) => setApiKeys({ ...apiKeys, linkedin_email: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
                          required={showApiKeys}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          LinkedIn Password <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Your LinkedIn password"
                          value={apiKeys.linkedin_password}
                          onChange={(e) => setApiKeys({ ...apiKeys, linkedin_password: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
                          required={showApiKeys}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSearch} className="space-y-6">
                  {/* Main Search */}
                  <div>
                    <label className="block text-sm font-medium mb-3">Search Query (Natural Language)</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="e.g., i want the leads they are doing the Business Development in Dubai"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                      <button
                        type="submit"
                        disabled={isScanning || !searchQuery.trim()}
                        className="px-6 py-3 bg-gradient-to-br from-blue-600 to-blue-400 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 flex items-center gap-2"
                      >
                        {isScanning ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Scanning...
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            Search
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Enter a natural language query. The AI will extract keywords and search LinkedIn profiles.
                    </p>
                  </div>

                  {/* Profile Count */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Profiles to Scrape</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={profileCount}
                      onChange={(e) => setProfileCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 20 profiles. Maximum: 100 profiles.
                    </p>
                  </div>
                </form>
              </div>

              {/* Success Message */}
              {responseMessage && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg fade-in">
                  <p className="text-sm font-medium text-green-600">{responseMessage}</p>
                  {csvPath && (
                    <p className="text-xs text-muted-foreground mt-1">CSV saved to: {csvPath}</p>
                  )}
                </div>
              )}

              {/* Keywords */}
              {keywords.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6 fade-in">
                  <h3 className="text-lg font-semibold mb-4">Extracted Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-4 fade-in">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">Results ({results.length})</h2>
                    <button
                      onClick={handleExport}
                      className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-muted transition-all duration-200 font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>
                  <ScraperResults results={results} />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Stats Card */}
              <div className="bg-card border border-border rounded-xl p-6 sticky top-20">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Search Statistics
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Profiles Found</p>
                    <p className="text-2xl font-bold text-foreground">{results.length}</p>
                  </div>
                  {keywords.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground mb-1">Keywords Extracted</p>
                      <p className="text-2xl font-bold text-foreground">{keywords.length}</p>
                    </div>
                  )}
                  {csvPath && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground mb-1">CSV Generated</p>
                      <p className="text-sm font-medium text-green-600">✓ Saved</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tips Card */}
              <div className="bg-secondary/30 border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-3">Pro Tips</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Use specific job titles for better results</li>
                  <li>• Include location in your search query</li>
                  <li>• Be specific about industry or company type</li>
                  <li>• Export regularly for backup</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
