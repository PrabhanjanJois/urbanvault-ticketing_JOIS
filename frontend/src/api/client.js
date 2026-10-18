import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach Bearer token from localStorage to every request
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('urbanvault_access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Intercept response errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if invalid/expired and not currently on public endpoint
      if (!error.config.url.includes('/auth/personas/')) {
        console.warn('Session expired or unauthorized request.')
      }
    }
    return Promise.reject(error)
  }
)

export default client
