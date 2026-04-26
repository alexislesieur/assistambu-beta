import { useState, useEffect } from 'react'
import { authApi } from '../lib/api'

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenFromUrl = params.get('token')

    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl)
      window.history.replaceState({}, '', window.location.pathname)
    }

    const token = localStorage.getItem('token')

    if (!token) {
      window.location.href = import.meta.env.VITE_AUTH_URL || 'https://auth.assist-ambu.fr/login'
      return
    }

    authApi.me()
      .then(data => {
        if (!['beta', 'admin', 'superadmin'].includes(data.role)) {
          localStorage.removeItem('token')
          window.location.href = import.meta.env.VITE_AUTH_URL || 'https://auth.assist-ambu.fr/login'
          return
        }
        setUser(data)
      })
      .catch(() => {
        localStorage.removeItem('token')
        window.location.href = import.meta.env.VITE_AUTH_URL || 'https://auth.assist-ambu.fr/login'
      })
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    try { await authApi.logout() } catch {}
    localStorage.removeItem('token')
    window.location.href = import.meta.env.VITE_AUTH_URL || 'https://auth.assist-ambu.fr/login'
  }

  return { user, loading, logout }
}