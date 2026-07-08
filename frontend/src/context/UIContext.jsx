import { createContext, useContext, useState, useCallback, useMemo } from "react"

const UIContext = createContext(null)

const STORAGE_KEY = "dms_ui_prefs"

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore storage failures
  }
}

/**
 * Global UI Preferences Provider
 * Manages table density, sidebar state, and other UI-wide settings.
 */
export function UIProvider({ children }) {
  const [prefs, setPrefs] = useState(() => loadPrefs())

  const density = prefs.density || "standard" // "compact" | "standard" | "comfortable"

  const setDensity = useCallback((d) => {
    setPrefs((prev) => {
      const next = { ...prev, density: d }
      savePrefs(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({
    density,
    setDensity,
    densityClass: density === "compact" ? "density-compact" : density === "comfortable" ? "density-comfortable" : "density-standard",
  }), [density, setDensity])

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) {
    throw new Error("useUI must be used within UIProvider")
  }
  return ctx
}

export default UIContext
