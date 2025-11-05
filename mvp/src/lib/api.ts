import { API_BASE_URL } from './utils'

class ApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL
  }

  private getApiKey(): string {
    const apiKey = localStorage.getItem('dory_api_key')
    if (!apiKey) {
      throw new Error('Not authenticated. Please log in.')
    }
    return apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.getApiKey(),
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(errorData.error || `API Error: ${response.statusText}`)
    }

    return response.json()
  }

  // Memory operations
  async getMemories(limit = 10) {
    return this.request(`/memories?limit=${limit}`)
  }

  async createMemory(content: string, contentType = 'text') {
    return this.request('/memories', {
      method: 'POST',
      body: JSON.stringify({ content, content_type: contentType }),
    })
  }

  async getMemory(id: string) {
    return this.request(`/memories/${id}`)
  }

  async deleteMemory(id: string) {
    return this.request(`/memories/${id}`, {
      method: 'DELETE',
    })
  }

  // Graph operations
  async getMemoryGraph() {
    return this.request('/memories/graph/view')
  }

  // Stats
  async getStats() {
    return this.request('/memories/stats/overview')
  }

  // Chat operations
  async askQuestion(question: string) {
    return this.request('/chat/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    })
  }

  // Search
  async searchMemories(query: string, limit = 10) {
    return this.request('/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    })
  }
}

export const api = new ApiClient()
