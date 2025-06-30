// Debug helpers for development
export const debugAuth = () => {
  console.log('=== Authentication Debug Info ===')
  console.log('localStorage token:', localStorage.getItem('token'))
  console.log('localStorage refreshToken:', localStorage.getItem('refreshToken'))
  console.log('localStorage keys:', Object.keys(localStorage))
  
  // Check Redux state
  const state = window.__REDUX_DEVTOOLS_EXTENSION__ ? 
    window.__REDUX_DEVTOOLS_EXTENSION__.getState() : 
    'Redux DevTools not available'
  console.log('Redux state:', state)
}

export const clearAllCache = () => {
  console.log('🧹 Clearing all cache and storage...')
  
  // Clear localStorage
  localStorage.clear()
  
  // Clear sessionStorage
  sessionStorage.clear()
  
  // Clear any service worker cache if present
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name)
      })
    })
  }
  
  console.log('✅ All cache cleared')
}

export const logUserSwitch = (fromUser, toUser) => {
  console.log(`🔄 User switch detected:`)
  console.log(`  From: ${fromUser?.email || 'none'} (${fromUser?.role || 'none'})`)
  console.log(`  To: ${toUser?.email || 'none'} (${toUser?.role || 'none'})`)
  console.log(`  Timestamp: ${new Date().toISOString()}`)
}

// Add to window for easy access in dev console
if (process.env.NODE_ENV === 'development') {
  window.debugAuth = debugAuth
  window.clearAllCache = clearAllCache
  window.logUserSwitch = logUserSwitch
} 