// hooks/use-mobile.ts
import * as React from "react"

const MOBILE_BREAKPOINT = 768 // Use 768px for md breakpoint

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      // Ensure window is defined (for SSR safety, though less critical here)
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      }
    }

    // Check on mount
    onChange();

    mql.addEventListener("change", onChange)

    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Return false during SSR or initial client render before useEffect runs
  return isMobile === undefined ? false : isMobile;
}