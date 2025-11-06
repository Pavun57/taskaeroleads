const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }))
        return {
          error: errorData.message || errorData.detail || `HTTP ${response.status}`,
        }
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
      }
    }
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string; message: string }>("/api/health")
  }

  // Configuration APIs
  async updateConfig(config: {
    gemini_api_key?: string
    linkedin_email?: string
    linkedin_password?: string
    twilio_account_sid?: string
    twilio_auth_token?: string
    twilio_from_number?: string
    gemini_model?: string
  }) {
    return this.request("/api/config", {
      method: "POST",
      body: JSON.stringify(config),
    })
  }

  async getConfigStatus() {
    return this.request<Record<string, string>>("/api/config/status")
  }

  async clearConfig(keys: string[]) {
    return this.request("/api/config/clear", {
      method: "POST",
      body: JSON.stringify({ keys }),
    })
  }

  // Task 1: LinkedIn Scraper
  async scrapeLeads(data: {
    prompt: string
    profile_count?: number
    gemini_api_key?: string
    linkedin_email?: string
    linkedin_password?: string
  }) {
    return this.request<{
      keywords: string[]
      profiles: Array<{
        name: string
        title: string
        company: string
        location?: string
      }>
      csv_path: string
      message: string
    }>("/task1/scrape-leads", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Task 2: Autodialer
  async uploadNumbers(data: {
    numbers: string[]
    twilio_account_sid?: string
    twilio_auth_token?: string
    twilio_from_number?: string
  }) {
    return this.request<{
      success: boolean
      message: string
      total_numbers: number
    }>("/task2/upload-numbers", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async uploadNumbersFile(file: File) {
    const formData = new FormData()
    formData.append("file", file)
    
    try {
      const url = `${this.baseUrl}/task2/upload-numbers-file`
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }))
        return {
          error: errorData.message || errorData.detail || `HTTP ${response.status}`,
        }
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
      }
    }
  }

  async callAll(data?: {
    twilio_account_sid?: string
    twilio_auth_token?: string
    twilio_from_number?: string
  }) {
    return this.request<{
      success: boolean
      message: string
      calls_initiated: number
    }>("/task2/call-all", {
      method: "POST",
      body: JSON.stringify(data || {}),
    })
  }

  async aiCommand(data: {
    command: string
    gemini_api_key?: string
    twilio_account_sid?: string
    twilio_auth_token?: string
    twilio_from_number?: string
  }) {
    return this.request<{
      success: boolean
      message: string
      action?: string
      result?: any
    }>("/task2/ai-command", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getCallLogs() {
    return this.request<Array<{
      phone_number: string
      status: string
      duration?: string
      timestamp: string
      notes?: string
      call_id?: string
      error_message?: string
      message?: string
    }>>("/task2/call-logs")
  }

  async getPhoneNumbers() {
    return this.request<{
      total: number
      phone_numbers: string[]
    }>("/task2/phone-numbers")
  }

  async deletePhoneNumber(phoneNumber: string) {
    return this.request<{
      success: boolean
      message: string
    }>(`/task2/phone-numbers/${encodeURIComponent(phoneNumber)}`, {
      method: "DELETE",
    })
  }

  async callNumber(phoneNumber: string, data?: {
    twilio_account_sid?: string
    twilio_auth_token?: string
    twilio_from_number?: string
  }) {
    return this.request<{
      call_id: string
      phone_number: string
      status: string
      message: string
    }>(`/task2/call-number/${encodeURIComponent(phoneNumber)}`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    })
  }

  // Task 3: Blog Generator
  async generateBlogs(data: {
    topics: string[]
    gemini_api_key?: string
  }) {
    return this.request<{
      success: boolean
      message: string
      blogs_generated: number
      blogs: Array<{
        blog_id: string
        title: string
        summary: string
        content: string
        topic: string
        created_at: string
      }>
    }>("/task3/generate-blogs", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getBlogs() {
    return this.request<Array<{
      blog_id: string
      title: string
      topic: string
      summary: string
      content: string
      created_at: string
    }>>("/task3/blogs")
  }

  async getBlogById(blogId: string) {
    return this.request<{
      blog_id: string
      title: string
      topic: string
      summary: string
      content: string
      created_at: string
    }>(`/task3/blog/${encodeURIComponent(blogId)}`)
  }

  async searchBlogs(query: string) {
    return this.request<Array<{
      blog_id: string
      title: string
      topic: string
      summary: string
      content: string
      created_at: string
    }>>(`/task3/blogs/search?query=${encodeURIComponent(query)}`)
  }

  async deleteBlog(blogId: string) {
    return this.request<{
      success: boolean
      message: string
    }>(`/task3/blog/${encodeURIComponent(blogId)}`, {
      method: "DELETE",
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

