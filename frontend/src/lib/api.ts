const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      }

      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorText = await response.text()
        return { error: errorText || `HTTP ${response.status}` }
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' }
    }
  }

  // Settings API
  async getSystemPrompt() {
    return this.request<{ text: string; is_custom: boolean }>('/system-prompt')
  }

  async updateSystemPrompt(text: string) {
    return this.request('/system-prompt', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  }

  // Widget Config API
  async getWidgetConfig() {
    return this.request<{
      form_enabled: boolean
      fields: Array<{
        name: string
        label: string
        type: string
        required: boolean
        placeholder?: string
        order: number
      }>
      primary_color?: string
      avatar_url?: string
    }>('/widget-config')
  }

  async updateWidgetConfig(config: {
    form_enabled: boolean
    fields: Array<{
      name: string
      label: string
      type: string
      required: boolean
      placeholder?: string
      order: number
    }>
    primary_color?: string
    avatar_url?: string
  }) {
    return this.request('/widget-config', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  // Documents API
  async getDocuments() {
    return this.request<{
      documents: Array<{
        id: number
        filename: string
        document_type: string
        upload_date: string
        processed: boolean
        chunk_count: number
      }>
    }>('/documents')
  }

  async uploadDocument(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    return this.request('/documents/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    })
  }

  async deleteDocument(documentId: number) {
    return this.request(`/documents/${documentId}`, {
      method: 'DELETE',
    })
  }

  // FAQ API
  async getFAQs() {
    return this.request<Array<{
      id: number
      question: string
      answer: string
    }>>('/faqs')
  }

  async createFAQ(question: string, answer: string) {
    return this.request('/faqs', {
      method: 'POST',
      body: JSON.stringify({ question, answer }),
    })
  }

  async updateFAQ(id: number, question: string, answer: string) {
    return this.request(`/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ question, answer }),
    })
  }

  async deleteFAQ(id: number) {
    return this.request(`/faqs/${id}`, {
      method: 'DELETE',
    })
  }

  // Leads API
  async getLeads() {
    return this.request<Array<{
      id: number
      name: string
      email: string
      created_at: string
    }>>('/leads')
  }

  // Chat API (for testing)
  async sendTestMessage(message: string) {
    return this.request<{
      reply: string
      used_faq: boolean
      run_id?: string
    }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ 
        message,
        client_id: 'admin-test-' + Date.now()
      }),
    })
  }
}

export const apiClient = new ApiClient()