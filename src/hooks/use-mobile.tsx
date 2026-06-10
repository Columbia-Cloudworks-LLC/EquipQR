import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

const getServerSnapshot = () => false

function getSnapshot() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false
  }
  return window.matchMedia(MOBILE_QUERY).matches
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined
  }
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

/**
 * Returns true when viewport width is below MOBILE_BREAKPOINT (768px).
 * Uses useSyncExternalStore so the value is correct on the first client render
 * (avoids the initial false that occurred with useState + useEffect), preventing
 * mobile users from briefly seeing desktop-only UI (e.g. dashboard edit-mode toggle).
 */
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
