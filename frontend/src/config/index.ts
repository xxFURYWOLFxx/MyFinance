/**
 * Application Configuration
 *
 * This file contains all configurable settings for the frontend application.
 * Adjust these values to match your deployment environment.
 */

// Environment detection
const isDevelopment = import.meta.env.DEV
const isProduction = import.meta.env.PROD

/**
 * API Configuration
 *
 * API_BASE_URL: The base URL for all API requests
 * - In development, this typically proxies to the backend server
 * - In production, change this to your actual API domain
 *
 * Examples:
 * - Local development with Vite proxy: '/api'
 * - Local backend direct: 'http://localhost:8000/api/v1'
 * - Production domain: 'https://api.yourfinance.com/api/v1'
 * - Production IP: 'http://123.45.67.89:8000/api/v1'
 */
export const API_CONFIG = {
  // Base URL for API requests
  // Change this to your backend URL in production
  BASE_URL: import.meta.env.VITE_API_URL || '/api',

  // API version prefix (appended to BASE_URL if using direct backend URL)
  VERSION: 'v1',

  // Request timeout in milliseconds
  TIMEOUT: 30000,

  // Whether to include credentials (cookies) in requests
  WITH_CREDENTIALS: true,
}

/**
 * Authentication Configuration
 */
export const AUTH_CONFIG = {
  // Local storage keys for tokens
  ACCESS_TOKEN_KEY: 'access_token',
  REFRESH_TOKEN_KEY: 'refresh_token',

  // Token refresh settings
  REFRESH_BEFORE_EXPIRY_MS: 60000, // Refresh 1 minute before expiry
}

/**
 * Application Settings
 */
export const APP_CONFIG = {
  // Application name
  APP_NAME: 'MyFinance',

  // Default currency
  DEFAULT_CURRENCY: 'USD',

  // Default timezone
  DEFAULT_TIMEZONE: 'UTC',

  // Date format
  DATE_FORMAT: 'yyyy-MM-dd',

  // Currency display format
  CURRENCY_LOCALE: 'en-US',

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
}

/**
 * Feature Flags
 */
export const FEATURES = {
  // Enable/disable features
  ENABLE_DARK_MODE: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_EXPORT: true,
  ENABLE_FORECASTING: true,
  ENABLE_ADMIN_PANEL: true,

  // Debug settings (only in development)
  DEBUG_MODE: isDevelopment,
  SHOW_API_ERRORS: isDevelopment,
}

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  // Toast notification duration (ms)
  TOAST_DURATION: 5000,

  // Animation durations (ms)
  ANIMATION_DURATION: 200,

  // Chart colors
  CHART_COLORS: {
    income: '#22c55e',
    expense: '#ef4444',
    savings: '#a855f7',
    primary: '#6366f1',
    secondary: '#8b5cf6',
  },
}

/**
 * Helper function to get the full API URL
 */
export function getApiUrl(endpoint: string): string {
  const base = API_CONFIG.BASE_URL
  // Remove leading slash from endpoint if base doesn't end with one
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  return `${base}/${cleanEndpoint}`
}

// Export environment info
export const ENV = {
  isDevelopment,
  isProduction,
}

export default {
  API_CONFIG,
  AUTH_CONFIG,
  APP_CONFIG,
  FEATURES,
  UI_CONFIG,
  ENV,
}
