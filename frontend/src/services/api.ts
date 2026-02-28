import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_CONFIG, AUTH_CONFIG } from '@/config'

// User-friendly error messages
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Please check your input and try again.',
  401: 'Invalid email or password. Please try again.',
  403: 'You don\'t have permission to do that.',
  404: 'The requested resource was not found.',
  409: 'This email is already registered.',
  422: 'Please check your input and try again.',
  429: 'Too many attempts. Please wait a moment.',
  500: 'Something went wrong on our end. Please try again.',
  502: 'Server is temporarily unavailable. Please try again.',
  503: 'Service is temporarily unavailable. Please try again.',
}

export class ApiError extends Error {
  status: number
  originalMessage: string

  constructor(status: number, message: string, originalMessage: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.originalMessage = originalMessage
  }
}

function getErrorMessage(status: number, detail?: string): string {
  // Check for specific error messages from the backend
  if (detail) {
    const lowerDetail = detail.toLowerCase()
    if (lowerDetail.includes('email already registered')) {
      return 'This email is already registered. Try logging in instead.'
    }
    if (lowerDetail.includes('incorrect email or password') || lowerDetail.includes('incorrect password')) {
      return 'Incorrect email or password. Please try again.'
    }
    if (lowerDetail.includes('email not verified')) {
      return 'Email not verified. Please check your inbox for the verification link.'
    }
    if (lowerDetail.includes('inactive') || lowerDetail.includes('disabled')) {
      return 'Your account has been disabled. Please contact support.'
    }
    if (lowerDetail.includes('not found')) {
      return 'Account not found. Please check your email or sign up.'
    }
  }

  return ERROR_MESSAGES[status] || 'An unexpected error occurred. Please try again.'
}

export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: API_CONFIG.WITH_CREDENTIALS,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(AUTH_CONFIG.ACCESS_TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string }>) => {
    const originalRequest = error.config
    const status = error.response?.status || 500
    const detail = error.response?.data?.detail

    // If 401 and not already retrying, try to refresh token
    if (
      status === 401 &&
      originalRequest &&
      !(originalRequest as InternalAxiosRequestConfig & { _retry?: boolean })._retry &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      (originalRequest as InternalAxiosRequestConfig & { _retry?: boolean })._retry = true

      try {
        const refreshToken = localStorage.getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY)
        if (refreshToken) {
          const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })

          const { access_token } = response.data
          localStorage.setItem(AUTH_CONFIG.ACCESS_TOKEN_KEY, access_token)

          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        }
      } catch {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem(AUTH_CONFIG.ACCESS_TOKEN_KEY)
        localStorage.removeItem(AUTH_CONFIG.REFRESH_TOKEN_KEY)
        window.location.href = '/login'
      }
    }

    // Create user-friendly error
    const friendlyMessage = getErrorMessage(status, detail)
    const apiError = new ApiError(status, friendlyMessage, detail || 'Unknown error')

    return Promise.reject(apiError)
  }
)

export default api
