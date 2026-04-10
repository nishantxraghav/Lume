import { useEffect, useRef } from 'react'

export default function Cursor() {
  const dotRef  = useRef(null)
  const ringRef = useRef(null)
  const pos     = useRef({ x: 0, y: 0 })
  const ring    = useRef({ x: 0, y: 0 })
  const raf     = useRef(null)

  useEffect(() => {
    const dot  = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let rx = 0, ry = 0

    function onMove(e) {
      pos.current = { x: e.clientX, y: e.clientY }
      dot.style.left = e.clientX + 'px'
      dot.style.top  = e.clientY + 'px'

      // State from target
      const el = e.target
      const isClickable = el.closest('button, a, [role="button"], input[type="range"], .trackCard, .exercise-card, .mood-emoji-btn, .nav-item, .goal-btn')
      const isText      = el.closest('input[type="text"], input[type="email"], input[type="password"], textarea')

      dot.className  = isText ? 'text' : isClickable ? 'hover' : ''
      ring.className = isText ? 'text' : isClickable ? 'hover' : ''
    }

    function onDown() {
      dot.classList.add('click'); ring.classList.add('click')
    }
    function onUp() {
      dot.classList.remove('click'); ring.classList.remove('click')
    }

    function animate() {
      rx += (pos.current.x - rx) * 0.12
      ry += (pos.current.y - ry) * 0.12
      ring.style.left = rx + 'px'
      ring.style.top  = ry + 'px'
      raf.current = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup',   onUp)
    raf.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup',   onUp)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <>
      <div id="lume-cursor"      ref={dotRef}  />
      <div id="lume-cursor-ring" ref={ringRef} />
    </>
  )
}
