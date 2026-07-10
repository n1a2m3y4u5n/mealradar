import { useState, useEffect, useRef } from 'react'

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function useAnimatedNumber(target, duration = 800, decimals = 0) {
  const [value, setValue] = useState(0)
  const startTime = useRef(null)
  const rafId = useRef(null)
  const startValue = useRef(0)

  useEffect(() => {
    startValue.current = 0
    startTime.current = null

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp
      const elapsed = timestamp - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(progress)
      const current = startValue.current + (target - startValue.current) * eased
      setValue(parseFloat(current.toFixed(decimals)))
      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      } else {
        setValue(target)
      }
    }

    rafId.current = requestAnimationFrame(animate)
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [target, duration, decimals])

  return value
}
