import * as React from "react"

const MOBILE_BREAKPOINT = 768

const getServerSnapshot = () => false

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
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
