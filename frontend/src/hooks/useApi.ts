import { useState, useEffect } from 'react'
import { apiClient, ApiResponse } from '@/lib/api'

export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      const response = await apiCall()
      
      if (!mounted) return

      if (response.error) {
        setError(response.error)
        setData(null)
      } else {
        setData(response.data || null)
        setError(null)
      }
      
      setLoading(false)
    }

    fetchData()

    return () => {
      mounted = false
    }
  }, dependencies)

  return { data, loading, error, refetch: () => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      const response = await apiCall()
      
      if (response.error) {
        setError(response.error)
        setData(null)
      } else {
        setData(response.data || null)
        setError(null)
      }
      
      setLoading(false)
    }

    fetchData()
  }}
}

export function useAsyncAction<T extends any[], R>(
  action: (...args: T) => Promise<ApiResponse<R>>
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (...args: T): Promise<R | null> => {
    setLoading(true)
    setError(null)

    const response = await action(...args)
    
    setLoading(false)

    if (response.error) {
      setError(response.error)
      return null
    }

    return response.data || null
  }

  return { execute, loading, error }
}