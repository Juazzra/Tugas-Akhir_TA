import { defineStore } from 'pinia'
import api from '../api/api'

const TOKEN_KEY = 'wms_token'
const USER_KEY = 'wms_user'

const safeJsonParse = (value) => {
  try {
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const decodeJwtPayload = (token) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    )

    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || null,
    user: safeJsonParse(localStorage.getItem(USER_KEY)),
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    role: (state) => state.user?.role || null,
    isAdmin: (state) => state.user?.role === 'admin',
    isKaryawan: (state) => state.user?.role === 'karyawan',
  },

  actions: {
    async login(payload) {
      this.loading = true
      this.error = null

      try {
        const response = await api.post('/users/login', payload)

        const token = response.data.token
        const decodedPayload = decodeJwtPayload(token)
        const tokenUser = decodedPayload?.user || null

        this.token = token
        this.user = tokenUser

        localStorage.setItem(TOKEN_KEY, token)
        localStorage.setItem(USER_KEY, JSON.stringify(tokenUser))

        await this.fetchMe()

        return this.user
      } catch (error) {
        this.error =
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Login gagal. Periksa NIK dan PIN.'

        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchMe() {
      if (!this.token) return null

      try {
        const response = await api.get('/users/me')
        const profile = response.data

        this.user = {
          ...(this.user || {}),
          ...profile,
          nama: profile.nama,
          role: profile.role,
          nik: profile.nik,
        }

        localStorage.setItem(USER_KEY, JSON.stringify(this.user))
        return this.user
      } catch {
        this.logout()
        return null
      }
    },

    logout() {
      this.token = null
      this.user = null
      this.error = null

      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})
