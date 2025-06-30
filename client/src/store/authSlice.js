import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      localStorage.setItem('token', action.payload.token)
      if (action.payload.refreshToken) {
        localStorage.setItem('refreshToken', action.payload.refreshToken)
      }
    },
    logout: (state) => {
      // Complete logout with full state reset
      state.user = null
      state.token = null
      state.isAuthenticated = false
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      
      // Clear any other potential cached data
      localStorage.removeItem('persist:root')
      localStorage.removeItem('user')
    },
    clearStateOnLogout: (state) => {
      // Complete state reset - more thorough than regular logout
      Object.assign(state, initialState)
      state.token = null
      state.isAuthenticated = false
      
      // Clear all localStorage items related to authentication
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('persist:root')
      localStorage.removeItem('user')
      
      // Force a clean slate
      localStorage.removeItem('redux-state')
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload }
    },
  },
})

export const { loginSuccess, logout, clearStateOnLogout, updateUser } = authSlice.actions

// Selectors
export const selectCurrentUser = (state) => state.auth.user
export const selectToken = (state) => state.auth.token
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated

export default authSlice.reducer 