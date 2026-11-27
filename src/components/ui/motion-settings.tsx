import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

const preference = matchMedia('(prefers-reduced-motion: reduce)')
const MotionSettings = createContext({ enabled: !preference.matches, toggle: () => {} })
export const useMotionSettings = () => useContext(MotionSettings)

export function MotionSettingsProvider({ children }: { children: ReactNode }) {
  const [systemReduced, setSystemReduced] = useState(preference.matches)
  const [choice, setChoice] = useState<boolean | null>(() => {
    try {
      const saved = localStorage.getItem('blueshells-motion')
      return saved === null ? null : saved === 'on'
    } catch { return null }
  })
  const enabled = choice ?? !systemReduced
  useLayoutEffect(() => {
    const sync = () => setSystemReduced(preference.matches)
    preference.addEventListener('change', sync)
    return () => preference.removeEventListener('change', sync)
  }, [])
  useLayoutEffect(() => {
    document.documentElement.dataset.motion = enabled ? 'on' : 'off'
  }, [enabled])
  function toggle() {
    setChoice(!enabled)
    try { localStorage.setItem('blueshells-motion', enabled ? 'off' : 'on') } catch { /* Keep the session choice. */ }
  }
  return <MotionSettings.Provider value={{ enabled, toggle }}>{children}</MotionSettings.Provider>
}

export function MotionToggle() {
  const { enabled, toggle } = useMotionSettings()
  return <button type="button" className="motion-toggle" aria-label="Animations" aria-pressed={enabled} onClick={toggle}>
    {enabled ? 'Pause animations' : 'Enable animations'}
  </button>
}
